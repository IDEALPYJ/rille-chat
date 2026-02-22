import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { unauthorizedResponse, badRequestResponse, createErrorResponse } from "@/lib/api-error";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import JSZip from "jszip";
import { logger } from "@/lib/logger";

/**
 * 导入用户数据
 * 从 ZIP 文件导入数据，包括：
 * - 用户信息（部分字段）
 * - 设置
 * - 项目
 * - 会话
 * - 消息
 * - 文件
 * - 附件
 * - 记忆
 * - 提示词
 * - MCP 插件
 * - 会话与 MCP 插件关联
 * - 技能
 * - 会话与技能关联
 * - 文档切片
 */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return unauthorizedResponse();
  }

  const userId = session.user.id;

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return badRequestResponse("未提供导入文件");
    }

    // 验证文件类型
    if (!file.name.endsWith(".zip") && file.type !== "application/zip") {
      return badRequestResponse("文件必须是 ZIP 格式");
    }

    // 读取 ZIP 文件
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // 1. 读取 manifest.json
    const manifestFile = zip.file("manifest.json");
    if (!manifestFile) {
      return badRequestResponse("ZIP 文件缺少 manifest.json");
    }

    const manifestContent = await manifestFile.async("string");
    interface ManifestData {
      dataVersion?: string;
      exportedAt?: string;
      version?: string;
      [key: string]: unknown;
    }
    let manifest: ManifestData;
    try {
      const parsed = JSON.parse(manifestContent);
      if (typeof parsed !== 'object' || parsed === null) {
        return badRequestResponse("manifest.json 格式错误");
      }
      manifest = parsed as ManifestData;
    } catch (error: unknown) {
      logger.error("Failed to parse manifest.json", error, { userId });
      return badRequestResponse("manifest.json 格式错误");
    }

    // 验证版本兼容性（支持向后兼容）
    const dataVersion = manifest.dataVersion || "1.0.0";
    if (typeof dataVersion !== 'string' || !dataVersion.startsWith("1.")) {
      return badRequestResponse(`不支持的数据版本: ${dataVersion}`);
    }

    // 2. 读取 data.json
    const dataFile = zip.file("data.json");
    if (!dataFile) {
      return badRequestResponse("ZIP 文件缺少 data.json");
    }

    const dataContent = await dataFile.async("string");
    interface ExportData {
      user?: Record<string, unknown>;
      userSetting?: {
        config?: Record<string, unknown>;
        [key: string]: unknown;
      };
      settings?: Record<string, unknown>;
      projects?: Array<Record<string, unknown>>;
      sessions?: Array<Record<string, unknown>>;
      messages?: Array<Record<string, unknown>>;
      files?: Array<Record<string, unknown>>;
      attachments?: Array<Record<string, unknown>>;
      memories?: Array<Record<string, unknown>>;
      prompts?: Array<Record<string, unknown>>;
      mcpPlugins?: Array<Record<string, unknown>>;
      sessionMcpPlugins?: Array<Record<string, unknown>>;
      skills?: Array<Record<string, unknown>>;
      sessionSkills?: Array<Record<string, unknown>>;
      documentChunks?: Array<Record<string, unknown>>;
      [key: string]: unknown;
    }
    let exportData: ExportData;
    try {
      const parsed = JSON.parse(dataContent);
      if (typeof parsed !== 'object' || parsed === null) {
        return badRequestResponse("data.json 格式错误");
      }
      exportData = parsed as ExportData;
    } catch {
      return badRequestResponse("data.json 格式错误");
    }

    // 3. 开始导入数据（使用事务）
    // 定义文件 ID 映射（在事务外部定义，以便后续使用）
    const fileIdMap = new Map<string, string>();
    // 记录原附件ID到新附件ID的映射（用于后续文件恢复时的匹配）
    const attachmentIdMap = new Map<string, string>();
    await db.$transaction(async (tx) => {
      // 3.1 更新用户信息（仅更新允许的字段，不更新密码）
      if (exportData.user) {
        await tx.user.update({
          where: { id: userId },
          data: {
            image: exportData.user.image || undefined,
            // 不更新 username 和 password，保持当前账户
          },
        });
      }

      // 3.2 导入用户设置
      if (exportData.userSetting) {
        await tx.userSetting.upsert({
          where: { userId },
          create: {
            userId,
            config: (exportData.userSetting.config || {}) as unknown as Prisma.InputJsonValue,
          },
          update: {
            config: (exportData.userSetting.config || {}) as unknown as Prisma.InputJsonValue,
          },
        });
      }

      // 3.3 导入项目（创建新项目，避免 ID 冲突）
      const projectIdMap = new Map<string, string>();
      if (exportData.projects && Array.isArray(exportData.projects)) {
        for (const project of exportData.projects) {
          const newProject = await tx.project.create({
            data: {
              name: String(project.name || "New Project"),
              icon: project.icon ? String(project.icon) : null,
              description: project.description ? String(project.description) : null,
              memoryIsolated: Boolean(project.memoryIsolated),
              userId,
            },
          });
          projectIdMap.set(String(project.id || ""), newProject.id);
        }
      }

      // 3.4 导入会话（创建新会话）
      const sessionIdMap = new Map<string, string>();
      if (exportData.sessions && Array.isArray(exportData.sessions)) {
        for (const session of exportData.sessions) {
          const projectIdStr = session.projectId ? String(session.projectId) : null;
          const newProjectId = projectIdStr
            ? projectIdMap.get(projectIdStr) || null
            : null;

          const newSession = await tx.session.create({
            data: {
              title: String(session.title || "New Chat"),
              userId,
              projectId: newProjectId,
              isImageGeneration: Boolean(session.isImageGeneration),
              currentLeafId: null, // 将在导入消息后更新
              messageCount: 0,
            },
          });
          sessionIdMap.set(String(session.id || ""), newSession.id);
        }
      }

      // 3.5 导入消息（需要处理树状结构）
      const messageIdMap = new Map<string, string>();
      if (exportData.messages && Array.isArray(exportData.messages)) {
        // 先按创建时间排序，确保父消息先创建
        const sortedMessages = [...exportData.messages].sort(
          (a, b) => {
            const aTime = a.createdAt ? new Date(String(a.createdAt)).getTime() : 0;
            const bTime = b.createdAt ? new Date(String(b.createdAt)).getTime() : 0;
            return aTime - bTime;
          }
        );

        for (const message of sortedMessages) {
          const sessionIdStr = String(message.sessionId || "");
          const newSessionId = sessionIdMap.get(sessionIdStr);
          if (!newSessionId) {
            logger.warn("Session not found for message", { messageId: String(message.id || "") });
            continue;
          }

          // 处理父消息 ID 映射
          let newParentId: string | null = null;
          if (message.parentId) {
            newParentId = messageIdMap.get(String(message.parentId)) || null;
          }

          // 创建消息
          const newMessage = await tx.message.create({
            data: {
              role: String(message.role || "user"),
              content: String(message.content || ""),
              reasoningContent: message.reasoningContent ? String(message.reasoningContent) : null,
              searchResults: message.searchResults ? (message.searchResults as any) : null,
              isVoiceInput: Boolean(message.isVoiceInput),
              audioUrl: message.audioUrl ? String(message.audioUrl) : null,
              audioDuration: typeof message.audioDuration === 'number' ? message.audioDuration : null,
              parentId: newParentId,
              sessionId: newSessionId,
              provider: message.provider ? String(message.provider) : null,
              model: message.model ? String(message.model) : null,
              inputTokens: typeof message.inputTokens === 'number' ? message.inputTokens : 0,
              outputTokens: typeof message.outputTokens === 'number' ? message.outputTokens : 0,
              inputCacheTokens: typeof message.inputCacheTokens === 'number' ? message.inputCacheTokens : 0,
              outputCacheTokens: typeof message.outputCacheTokens === 'number' ? message.outputCacheTokens : 0,
              totalTokens: typeof message.totalTokens === 'number' ? message.totalTokens : 0,
              cost: typeof message.cost === 'number' ? message.cost : 0,
              status: String(message.status || "completed"),
              error: message.error ? String(message.error) : null,
              duration: typeof message.duration === 'number' ? message.duration : null,
              firstTokenAt: message.firstTokenAt ? new Date(String(message.firstTokenAt)) : null,
              finishReason: message.finishReason ? String(message.finishReason) : null,
              traceId: message.traceId ? String(message.traceId) : null,
              requestParams: message.requestParams ? (message.requestParams as any) : null,
              feedback: message.feedback ? (message.feedback as any) : null,
            },
          });

          messageIdMap.set(String(message.id || ""), newMessage.id);

          // 导入附件（记录原附件ID到新附件ID的映射）
          if (message.attachments && Array.isArray(message.attachments)) {
            for (const attachment of message.attachments) {
              const oldAttachmentId = String(attachment.id || "");
              const newAttachment = await tx.attachment.create({
                data: {
                  name: String(attachment.name || ""),
                  url: String(attachment.url || ""), // URL 将在文件恢复后更新
                  type: String(attachment.type || ""),
                  size: typeof attachment.size === 'number' ? attachment.size : 0,
                  messageId: newMessage.id,
                },
              });
              // 记录附件ID映射，用于后续文件恢复时的精确匹配
              if (oldAttachmentId) {
                attachmentIdMap.set(oldAttachmentId, newAttachment.id);
              }
            }
          }
        }

        // 更新会话的 messageCount 和 currentLeafId（在所有消息导入完成后统一处理）
        for (const [oldSessionId, newSessionId] of sessionIdMap.entries()) {
          const messageCount = (exportData.messages || []).filter(
            (m: Record<string, unknown>) => m.sessionId === oldSessionId
          ).length;
          
          // 查找原会话的 currentLeafId 并映射到新消息ID
          const sessionData = exportData.sessions?.find(
            (s: Record<string, unknown>) => String(s.id || "") === oldSessionId
          ) as { currentLeafId?: string } | undefined;
          
          let newCurrentLeafId: string | null = null;
          if (sessionData?.currentLeafId) {
            const oldLeafId = String(sessionData.currentLeafId);
            newCurrentLeafId = messageIdMap.get(oldLeafId) || null;
          }
          
          await tx.session.update({
            where: { id: newSessionId },
            data: { 
              messageCount,
              currentLeafId: newCurrentLeafId,
            },
          });
        }
      }

      // 3.6 导入文件（先创建数据库记录，文件将在后面恢复）
      if (exportData.files && Array.isArray(exportData.files)) {
        for (const file of exportData.files) {
          const projectIdStr = file.projectId ? String(file.projectId) : null;
          const newProjectId = projectIdStr
            ? projectIdMap.get(projectIdStr) || null
            : null;

          const newFile = await tx.file.create({
            data: {
              name: String(file.name || ""),
              url: String(file.url || ""), // 将在文件恢复后更新
              type: String(file.type || ""),
              size: typeof file.size === 'number' ? file.size : 0,
              status: String(file.status || "processing"),
              tokens: typeof file.tokens === 'number' ? file.tokens : 0,
              userId,
              projectId: newProjectId,
            },
          });
          fileIdMap.set(String(file.id || ""), newFile.id);
        }
      }

      // 3.7 导入记忆
      if (exportData.memories && Array.isArray(exportData.memories)) {
        for (const memory of exportData.memories) {
          const projectIdStr = memory.projectId ? String(memory.projectId) : null;
          const newProjectId = projectIdStr
            ? projectIdMap.get(projectIdStr) || null
            : null;

          await tx.memory.create({
            data: {
              content: String(memory.content || ""),
              category: memory.category ? String(memory.category) : null,
              userId,
              projectId: newProjectId,
              tokens: typeof memory.tokens === 'number' ? memory.tokens : 0,
              lastUsed: memory.lastUsed ? new Date(String(memory.lastUsed)) : new Date(),
            },
          });
        }
      }

      // 3.8 导入提示词
      if (exportData.prompts && Array.isArray(exportData.prompts)) {
        for (const prompt of exportData.prompts) {
          await tx.prompt.create({
            data: {
              title: String(prompt.title || ""),
              content: String(prompt.content || ""),
              icon: prompt.icon ? String(prompt.icon) : null,
              userId,
            },
          });
        }
      }

      // 3.9 导入 MCP 插件
      const mcpPluginIdMap = new Map<string, string>();
      if (exportData.mcpPlugins && Array.isArray(exportData.mcpPlugins)) {
        for (const plugin of exportData.mcpPlugins) {
          const newPlugin = await tx.mcpPlugin.create({
            data: {
              name: String(plugin.name || ""),
              icon: plugin.icon ? String(plugin.icon) : null,
              serverUrl: String(plugin.serverUrl || ""),
              authType: String(plugin.authType || "none"),
              apiKey: plugin.apiKey ? String(plugin.apiKey) : null,
              advancedConfig: plugin.advancedConfig ? (plugin.advancedConfig as any) : {},
              userId,
            },
          });
          mcpPluginIdMap.set(String(plugin.id || ""), newPlugin.id);
        }
      }

      // 3.10 导入技能
      const skillIdMap = new Map<string, string>();
      if (exportData.skills && Array.isArray(exportData.skills)) {
        for (const skill of exportData.skills) {
          const newSkill = await tx.skill.create({
            data: {
              name: String(skill.name || ""),
              displayName: String(skill.displayName || ""),
              description: String(skill.description || ""),
              icon: skill.icon ? String(skill.icon) : null,
              instructions: String(skill.instructions || ""),
              resources: skill.resources ? (skill.resources as any) : null,
              scripts: skill.scripts ? (skill.scripts as any) : null,
              version: String(skill.version || "1.0.0"),
              author: skill.author ? String(skill.author) : null,
              tags: Array.isArray(skill.tags) ? skill.tags.map(String) : [],
              triggerKeywords: Array.isArray(skill.triggerKeywords) ? skill.triggerKeywords.map(String) : [],
              isSystem: Boolean(skill.isSystem),
              isEnabled: Boolean(skill.isEnabled),
              userId,
            },
          });
          skillIdMap.set(String(skill.id || ""), newSkill.id);
        }
      }

      // 3.11 导入会话与 MCP 插件关联
      if (exportData.sessionMcpPlugins && Array.isArray(exportData.sessionMcpPlugins)) {
        for (const sessionMcpPlugin of exportData.sessionMcpPlugins) {
          const sessionIdStr = String(sessionMcpPlugin.sessionId || "");
          const pluginIdStr = String(sessionMcpPlugin.pluginId || "");
          const newSessionId = sessionIdMap.get(sessionIdStr);
          const newPluginId = mcpPluginIdMap.get(pluginIdStr);

          if (newSessionId && newPluginId) {
            await tx.sessionMcpPlugin.create({
              data: {
                sessionId: newSessionId,
                pluginId: newPluginId,
                enabled: Boolean(sessionMcpPlugin.enabled),
              },
            });
          }
        }
      }

      // 3.12 导入会话与技能关联
      if (exportData.sessionSkills && Array.isArray(exportData.sessionSkills)) {
        for (const sessionSkill of exportData.sessionSkills) {
          const sessionIdStr = String(sessionSkill.sessionId || "");
          const skillIdStr = String(sessionSkill.skillId || "");
          const newSessionId = sessionIdMap.get(sessionIdStr);
          const newSkillId = skillIdMap.get(skillIdStr);

          if (newSessionId && newSkillId) {
            await tx.sessionSkill.create({
              data: {
                sessionId: newSessionId,
                skillId: newSkillId,
                enabled: Boolean(sessionSkill.enabled),
              },
            });
          }
        }
      }

      // 3.13 导入文档切片
      if (exportData.documentChunks && Array.isArray(exportData.documentChunks)) {
        for (const chunk of exportData.documentChunks) {
          const fileIdStr = String(chunk.fileId || "");
          const newFileId = fileIdMap.get(fileIdStr);

          if (newFileId) {
            await tx.documentChunk.create({
              data: {
                content: String(chunk.content || ""),
                tokenCount: typeof chunk.tokenCount === 'number' ? chunk.tokenCount : 0,
                chunkIndex: typeof chunk.chunkIndex === 'number' ? chunk.chunkIndex : null,
                pageNumber: typeof chunk.pageNumber === 'number' ? chunk.pageNumber : null,
                sectionTitle: chunk.sectionTitle ? String(chunk.sectionTitle) : null,
                fileId: newFileId,
              },
            });
          }
        }
      }
    });

    // 4. 恢复文件到 uploads 目录
    const uploadDir = join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // 4.1 恢复 files 目录中的文件
    const filesDir = zip.folder("files");
    if (filesDir) {
      const filePromises: Promise<void>[] = [];
      filesDir.forEach(async (relativePath, file) => {
        if (!file.dir) {
          filePromises.push(
            (async () => {
              const fileName = relativePath.split("/").pop() || "";
              try {
                const fileBuffer = await file.async("nodebuffer");
                // 文件名格式：{oldFileId}-{filename}
                const parts = fileName.split("-");
                if (parts.length >= 2) {
                  const oldFileId = parts[0];
                  const originalName = parts.slice(1).join("-");

                  // 查找新的文件 ID
                  const entry = Array.from(fileIdMap.entries()).find(
                    (entry) => entry[0] === oldFileId
                  );
                  const newFileId = entry ? entry[1] : undefined;

                  if (newFileId) {
                    // 使用新文件 ID 创建文件名
                    const cleanFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
                    const newFileName = `${newFileId}-${Date.now()}-${cleanFileName}`;
                    const filePath = join(uploadDir, newFileName);

                    await writeFile(filePath, fileBuffer);

                    // 更新文件 URL
                    await db.file.update({
                      where: { id: newFileId },
                      data: { url: `/api/files/${newFileId}`, status: "completed" },
                    });
                  }
                }
              } catch (error: unknown) {
                logger.error(`Error restoring file ${relativePath}`, error, { 
                  relativePath, 
                  fileName,
                  userId 
                });
              }
            })()
          );
        }
      });
      await Promise.all(filePromises);
    }

    // 4.2 恢复 attachments 目录中的文件
    // 创建附件 ID 到新文件 ID 的映射
    const attachmentIdToFileIdMap = new Map<string, string>();
    const attachmentsDir = zip.folder("attachments");
    if (attachmentsDir) {
      const attachmentPromises: Promise<void>[] = [];
      attachmentsDir.forEach(async (relativePath, file) => {
        if (!file.dir) {
          attachmentPromises.push(
            (async () => {
              const fileName = relativePath.split("/").pop() || "";
              const parts = fileName.split("-");
              const oldAttachmentId = parts.length >= 2 ? parts[0] : "";
              try {
                const fileBuffer = await file.async("nodebuffer");
                // 文件名格式：{oldAttachmentId}-{filename}
                if (parts.length >= 2) {
                  const originalName = parts.slice(1).join("-");

                  // 查找对应的附件记录以获取文件信息
                  const originalAttachment = exportData.attachments?.find(
                    (a: Record<string, unknown>) => a.id === oldAttachmentId
                  );

                  if (originalAttachment) {
                    // 创建新的 File 记录
                    const newFile = await db.file.create({
                      data: {
                        name: String(originalAttachment.name || ""),
                        url: "/temp", // 临时 URL
                        type: String(originalAttachment.type || ""),
                        size: typeof originalAttachment.size === 'number' ? originalAttachment.size : 0,
                        status: "completed",
                        tokens: 0,
                        userId,
                        projectId: null, // 附件通常不关联项目
                      },
                    });

                    // 保存文件
                    const cleanFileName = originalName.replace(/[^a-zA-Z0-9.-]/g, "_");
                    const newFileName = `${newFile.id}-${Date.now()}-${cleanFileName}`;
                    const filePath = join(uploadDir, newFileName);
                    await writeFile(filePath, fileBuffer);

                    // 更新文件 URL
                    await db.file.update({
                      where: { id: newFile.id },
                      data: { url: `/api/files/${newFile.id}` },
                    });

                    // 保存映射关系
                    attachmentIdToFileIdMap.set(oldAttachmentId, newFile.id);
                  }
                }
              } catch (error: unknown) {
                logger.error(`Error restoring attachment ${relativePath}`, error, { 
                  relativePath, 
                  oldAttachmentId,
                  userId 
                });
              }
            })()
          );
        }
      });
      await Promise.all(attachmentPromises);
    }

    // 4.3 更新附件的 URL（使用新创建的文件 ID）
    if (attachmentIdToFileIdMap.size > 0) {
      // 查找所有导入的附件（通过消息关联）
      const importedMessages = await db.message.findMany({
        where: {
          session: {
            userId,
          },
          createdAt: {
            gte: new Date(Date.now() - 60000), // 最近1分钟内创建的（导入的消息）
          },
        },
        include: {
          attachments: true,
        },
      });

      // 创建附件ID到原附件数据的映射（用于匹配）
      const oldAttachmentIdToData = new Map<string, Record<string, unknown>>();
      if (exportData.attachments && Array.isArray(exportData.attachments)) {
        for (const attachment of exportData.attachments) {
          const oldAttachmentId = String(attachment.id || "");
          if (oldAttachmentId) {
            oldAttachmentIdToData.set(oldAttachmentId, attachment);
          }
        }
      }

      // 使用附件ID映射来精确匹配（优先使用ID匹配，回退到名称+类型+大小匹配）
      for (const message of importedMessages) {
        for (const attachment of message.attachments) {
          let matchedNewFileId: string | undefined;
          
          // 方法1：尝试从导入数据中的消息附件找到原附件ID
          // 查找包含此附件ID的原消息
          const oldMessage = (exportData.messages || []).find((m: Record<string, unknown>) => {
            const attachments = (m.attachments as Record<string, unknown>[]) || [];
            return attachments.some((a: Record<string, unknown>) => {
              // 尝试匹配：名称、类型、大小
              return String(a.name || "") === attachment.name &&
                     String(a.type || "") === attachment.type &&
                     (typeof a.size === 'number' ? a.size : 0) === attachment.size;
            });
          });
          
          if (oldMessage && Array.isArray(oldMessage.attachments)) {
            const oldAttachment = (oldMessage.attachments as Record<string, unknown>[]).find(
              (a: Record<string, unknown>) =>
                String(a.name || "") === attachment.name &&
                String(a.type || "") === attachment.type &&
                (typeof a.size === 'number' ? a.size : 0) === attachment.size
            );
            
            if (oldAttachment && oldAttachment.id) {
              const oldAttachmentId = String(oldAttachment.id);
              const oldAttachmentData = oldAttachmentIdToData.get(oldAttachmentId);
              
              // 使用原附件ID查找新创建的文件
              if (oldAttachmentData && oldAttachmentData.id) {
                matchedNewFileId = attachmentIdToFileIdMap.get(String(oldAttachmentData.id));
              }
            }
          }
          
          // 方法2：如果方法1失败，回退到使用附件ID映射（从导入时的记录）
          if (!matchedNewFileId && attachmentIdMap.size > 0) {
            // 通过反向查找：新附件ID -> 旧附件ID -> 旧附件数据 -> 新文件ID
            for (const [oldAttId, newAttId] of attachmentIdMap.entries()) {
              if (newAttId === attachment.id) {
                const oldAttachmentData = oldAttachmentIdToData.get(oldAttId);
                if (oldAttachmentData && oldAttachmentData.id) {
                  matchedNewFileId = attachmentIdToFileIdMap.get(String(oldAttachmentData.id));
                  break;
                }
              }
            }
          }
          
          // 更新附件URL
          if (matchedNewFileId) {
            await db.attachment.update({
              where: { id: attachment.id },
              data: { url: `/api/files/${matchedNewFileId}` },
            });
          } else {
            logger.warn("Could not find matching file for attachment", {
              attachmentId: attachment.id,
              attachmentName: attachment.name,
              messageId: message.id,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "数据导入成功",
      imported: {
        projects: exportData.projects?.length || 0,
        sessions: exportData.sessions?.length || 0,
        messages: exportData.messages?.length || 0,
        files: exportData.files?.length || 0,
        attachments: exportData.attachments?.length || 0,
        memories: exportData.memories?.length || 0,
        prompts: exportData.prompts?.length || 0,
        mcpPlugins: exportData.mcpPlugins?.length || 0,
        sessionMcpPlugins: exportData.sessionMcpPlugins?.length || 0,
        skills: exportData.skills?.length || 0,
        sessionSkills: exportData.sessionSkills?.length || 0,
        documentChunks: exportData.documentChunks?.length || 0,
      },
    });
  } catch (error: unknown) {
    return createErrorResponse("导入失败", 500, "IMPORT_FAILED", error);
  }
}


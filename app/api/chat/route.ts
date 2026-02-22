import { NextRequest } from "next/server";
import { getChatUser, getUserChatSettings } from "@/lib/chat/auth-helper";
import { createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { rateLimit, rateLimiters } from "@/lib/rate-limit";
import { selectProviderAndModel } from "@/lib/chat/provider-helper";
import { saveMessageHistory, updateAuditParams, saveAIResponse, completeAIResponse } from "@/lib/chat/db-helper";
import { calculateCost, createChatStream } from "@/lib/chat/stream-helper";
import { db } from "@/lib/db";
import { validateChatRequest } from "@/lib/chat/request-validator";
import { executeParallelTasks } from "@/lib/chat/parallel-tasks";
import { buildContext } from "@/lib/chat/context-builder";
import { executeAICall, createOpenAIClient, buildAICallParams, prepareMcpTools } from "@/lib/chat/ai-call-manager";
import { executePostProcessing } from "@/lib/chat/post-processing";
import { logger } from "@/lib/logger";
import { loadModelConfigsForProvider } from "@/lib/data/models";
import { buildEnabledToolsList, buildExtraParams } from "@/lib/chat/tools-builder";
import { TranslatorInput } from "@/lib/providers/types";
import { getProviderAdapter } from "@/lib/providers/adapter-factory";
import { convertToUnifiedMessages, convertToCommonSettings } from "@/lib/chat/protocols/message-converter";
import { getProtocolForProvider, getPreferredAPIForProvider, enrichProviderConfigWithDefaults } from "@/lib/chat/protocol-config";
import type { ProviderConfig } from "@/lib/types";
import { isProviderLayerProtocol } from "@/lib/config/provider-constants";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await rateLimit(req, rateLimiters.chat, (req) => {
    const userId = req.headers.get("x-user-id");
    return userId || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // 1. Auth & Settings
    const userId = await getChatUser();
    if (!userId) {
      return unauthorizedResponse();
    }

    const settings = await getUserChatSettings(userId);

    // 2. Parse & Validate Request
    const body = await req.json();
    const validation = validateChatRequest(body);
    if (!validation.success) {
      return validation.error;
    }

    const {
      messages,
      sessionId,
      projectId,
      provider: overrideProvider,
      model: overrideModel,
      webSearch,
      vectorSearch,
      reasoning,
      responseMessageId,
      tempChat,
      advancedSettings,
      webSearchSource,
      enabledTools,
    } = validation.data;

    // 3. Provider Selection
    const selection = selectProviderAndModel(settings, overrideProvider, overrideModel, reasoning);
    if (!selection) {
      return createErrorResponse("No AI provider enabled or selected provider is not configured.", 400, "NO_PROVIDER");
    }

    const providerSelection = {
      selectedProviderId: selection.selectedProviderId,
      selectedProviderConfig: selection.selectedProviderConfig,
      selectedModel: selection.selectedModel,
      baseURL: selection.baseURL,
    };

    // 4. Execute Parallel Tasks
    const parallelResults = await executeParallelTasks(
      userId,
      messages,
      sessionId ?? null,
      projectId ?? null,
      settings,
      tempChat || false,
      webSearch || false,
      vectorSearch || false,
      webSearchSource
    );

    // 5. 获取用户启用的 Skills
    const userSkills = await db.skill.findMany({
      where: {
        userId,
        isEnabled: true,
      },
    });

    // 6. Save Message History (async, but we need IDs)
    const messageHistoryPromise = tempChat
      ? Promise.resolve(new Map<string, string>())
      : saveMessageHistory(parallelResults.sessionId!, messages, providerSelection.selectedModel, providerSelection.selectedProviderId);

    // 7. Build Context
    const context = await buildContext({
      messages: parallelResults.processedMessages,
      settings,
      relevantMemories: parallelResults.relevantMemories,
      searchResult: parallelResults.searchResult,
      retrievalResult: parallelResults.retrievalResult,
      reasoning: typeof reasoning === 'boolean' ? reasoning : (reasoning?.enabled || false),
      selectedModel: providerSelection.selectedModel,
      userSkills,
    });

    // Ensure history is saved before proceeding
    const messageIdMap = await messageHistoryPromise;

    // 7. Audit Log (Async)
    if (!tempChat) {
      const lastUserMessage = messages.filter((m) => m.role === 'user').pop();
      if (lastUserMessage?.id) {
        const userMsgDbId = messageIdMap.get(lastUserMessage.id);
        if (userMsgDbId) {
          try {
            createOpenAIClient(providerSelection);
            const { tools } = await prepareMcpTools(userId, settings);
            const params = buildAICallParams(context.messages, providerSelection.selectedModel, tools, advancedSettings);
            // 异步更新审计参数，不阻塞响应
            updateAuditParams(userMsgDbId, params).catch((err: unknown) => {
              logger.error("Failed to update audit params", err, { userMsgDbId, userId });
            });
          } catch (err: unknown) {
            logger.error("Failed to prepare audit params", err, { userMsgDbId, userId });
          }
        }
      }
    }

    // 8. Load Model Config and Build Provider Input (for OpenAI-compatible providers)
    let useProviderLayer = false;
    let providerStream: AsyncIterable<any> | null = null;
    let selectedModelAvatar: string | undefined = undefined;

    // Check if provider uses Provider layer (new logic)
    const providerProtocol = getProtocolForProvider(providerSelection.selectedProviderId);

    if (isProviderLayerProtocol(providerProtocol)) {
      try {
        const modelConfigs = await loadModelConfigsForProvider(providerSelection.selectedProviderId);
        const modelConfig = modelConfigs.find(m => m.id === providerSelection.selectedModel);

        if (modelConfig) {
          useProviderLayer = true;
          selectedModelAvatar = modelConfig.avatar;

          const commonSettings = convertToCommonSettings(advancedSettings);

          // 构建TranslatorInput
          const translatorInput: TranslatorInput = {
            modelConfig,
            messages: convertToUnifiedMessages(context.messages),
            userSettings: commonSettings,
            reasoning: typeof reasoning === 'boolean'
              ? { enabled: reasoning }
              : reasoning || { enabled: false },
            enabledTools: buildEnabledToolsList({
              webSearch: webSearch || false,
              webSearchSource,
              vectorSearch: vectorSearch || false,
              enabledTools,
              modelConfig,
              settings,
            }),
            extra: buildExtraParams({
              webSearch: webSearch || false,
              webSearchSource,
              vectorSearch: vectorSearch || false,
              mcpPlugins: undefined, // 将在后续处理
              customFunctions: undefined,
              advancedSettings,
              settings,
            }),
          };

          // Moonshot 内置联网搜索：使用 Formula 工具方式 (moonshot/web-search:latest)
          logger.debug('Moonshot tool check', {
            providerId: providerSelection.selectedProviderId,
            enabledTools: translatorInput.enabledTools,
            hasWebSearch: translatorInput.enabledTools?.includes('web_search'),
            webSearch: webSearch,
            webSearchSource: webSearchSource,
            modelBuiltinTools: modelConfig.builtinTools,
          });
          if (providerSelection.selectedProviderId === 'moonshot' && translatorInput.enabledTools?.includes('web_search')) {
            translatorInput.extra = translatorInput.extra || {};
            translatorInput.extra.tools = translatorInput.extra.tools || [];
            // 使用 function 类型，adapter 会自动获取 Formula 工具声明
            translatorInput.extra.tools.unshift({
              type: 'function',
              function: { name: 'web_search' },
            });
            logger.info('Moonshot Formula tool (web_search) added', {
              tools: translatorInput.extra.tools,
            });
          }

          // 准备MCP工具
          const { tools: mcpTools, enabledPlugins: mcpPlugins } = await prepareMcpTools(userId, settings);
          logger.info("Prepared MCP tools", { mcpToolsCount: mcpTools.length, mcpPluginsCount: mcpPlugins.length });
          if (mcpTools.length > 0) {
            translatorInput.extra = translatorInput.extra || {};
            translatorInput.extra.tools = [
              ...(translatorInput.extra.tools || []),
              ...mcpTools
            ];
            logger.info("Added MCP tools to translatorInput", { 
              totalTools: translatorInput.extra.tools.length,
              toolNames: translatorInput.extra.tools.map((t: any) => t.function?.name || t.name)
            });
          }

          // 获取适配器并调用（baseURL 为空时使用默认接入点）
          const providerConfig: ProviderConfig = enrichProviderConfigWithDefaults<ProviderConfig>(
            providerSelection.selectedProviderId,
            providerSelection.selectedProviderConfig
          );
          const preferredAPI = getPreferredAPIForProvider(providerSelection.selectedProviderId);
          const adapter = getProviderAdapter(
            providerSelection.selectedProviderId,
            providerSelection.selectedModel,
            preferredAPI
          );

          // 获取基础流
          const baseStream = adapter.call(translatorInput, providerConfig);
          
          // 如果有MCP工具，使用 createMcpRecursiveStreamFromUnified 包装流
          if (mcpTools.length > 0 && mcpPlugins.length > 0) {
            const { createMcpRecursiveStreamFromUnified } = await import("@/lib/chat/ai-call-manager-unified");
            
            const baseCallArgs = {
              messages: convertToUnifiedMessages(context.messages),
              model: providerSelection.selectedModel,
              settings: convertToCommonSettings(advancedSettings),
              providerConfig: providerConfig,
              extra: { tools: mcpTools }
            };
            
            const toolCallUsageRef = { value: undefined as { prompt_tokens: number; completion_tokens: number; total_tokens: number } | undefined };
            
            providerStream = createMcpRecursiveStreamFromUnified(
              baseStream,
              mcpPlugins as any,
              adapter as any,
              baseCallArgs,
              mcpTools as any,
              toolCallUsageRef,
              providerConfig  // 传递 providerConfig
            );
          } else {
            providerStream = baseStream;
          }
        }
      } catch (error) {
        logger.error("Provider layer call failed, falling back to old method", error);
        useProviderLayer = false;
      }
    }

    // 9. Execute AI Call (降级路径或非Provider层服务商)
    let aiCallResult: Awaited<ReturnType<typeof executeAICall>> | null = null;

    if (!useProviderLayer) {
      // 非Provider层也需要加载模型配置获取avatar
      const modelConfigs = await loadModelConfigsForProvider(providerSelection.selectedProviderId);
      const modelConfig = modelConfigs.find(m => m.id === providerSelection.selectedModel);
      selectedModelAvatar = modelConfig?.avatar;

      aiCallResult = await executeAICall({
        messages: context.messages,
        providerSelection,
        settings,
        advancedSettings,
        userId,
      });
    }

    // 10. Stream Response
    const effectiveSessionId = parallelResults.sessionId || "temp";

    // 准备检索结果字符串（在多处使用）
    const retrievalChunksStr = parallelResults.retrievalResult && parallelResults.retrievalResult.length > 0
      ? JSON.stringify({
          chunks: parallelResults.retrievalResult.map(chunk => ({
            id: chunk.id,
            content: chunk.content,
            fileId: chunk.fileId,
            fileName: chunk.fileName,
            fileType: chunk.fileType,
            similarity: chunk.similarity,
            chunkIndex: chunk.chunkIndex,
          })),
          totalChunks: parallelResults.retrievalResult.length,
        })
      : undefined;

    // 选择使用Provider层的流还是旧的流
    const aiResponse = useProviderLayer && providerStream
      ? providerStream
      : aiCallResult?.aiResponse;

    logger.info('Selected AI response stream', { 
      useProviderLayer, 
      hasProviderStream: !!providerStream,
      hasAiCallResult: !!aiCallResult?.aiResponse
    });

    if (!aiResponse) {
      return createErrorResponse("Failed to get AI response stream", 500, "NO_AI_RESPONSE");
    }

    const stream = createChatStream({
      aiResponse: aiResponse as any,
      sessionId: effectiveSessionId,
      searchResults: context.searchResultsStr,
      retrievalChunks: retrievalChunksStr,
      enabledMcpPlugins: aiCallResult?.enabledMcpPlugins || [],
      toolCallUsage: aiCallResult?.toolCallUsage,
      mcpToolCallInfos: [],
      onStart: async () => {
        if (tempChat) {
          return undefined;
        }

        const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
        const parentId = lastUserMsg && lastUserMsg.id ? messageIdMap.get(lastUserMsg.id) : null;

        try {
          const messageId = await saveAIResponse({
            sessionId: parallelResults.sessionId!,
            content: "",
            reasoningContent: "",
            searchResults: context.searchResultsStr,
            retrievalChunks: retrievalChunksStr,
            parentId: parentId || null,
            model: providerSelection.selectedModel,
            provider: providerSelection.selectedProviderId,
            modelAvatar: selectedModelAvatar,
            usage: {
              prompt_tokens: 0,
              completion_tokens: 0,
              total_tokens: 0,
            },
            cost: 0,
            traceId: responseMessageId
          });
          return messageId;
        } catch (err) {
          logger.error("Failed to create initial message", err);
          return undefined;
        }
      },
      onProgress: async (messageId, text, reasoning, usage, contentParts) => {
        if (tempChat) {
          return;
        }

        const cost = await calculateCost(providerSelection.selectedModel, usage.prompt_tokens, usage.completion_tokens);
        try {
          await saveAIResponse({
            sessionId: parallelResults.sessionId!,
            content: text,
            reasoningContent: reasoning,
            searchResults: context.searchResultsStr,
            contentParts,
            parentId: null,
            model: providerSelection.selectedModel,
            provider: providerSelection.selectedProviderId,
            modelAvatar: selectedModelAvatar,
            usage,
            cost,
            messageId
          });
        } catch (err) {
          logger.error("Failed to save progress", err);
        }
      },
      onComplete: async (fullText, fullReasoning, usage, contentParts, messageId) => {
        if (tempChat) {
          return;
        }

        if (!fullText.trim() && !fullReasoning.trim() && !context.searchResultsStr) {
          if (messageId) {
            try {
              await db.message.delete({ where: { id: messageId } });
            } catch (err) {
              logger.error("Failed to delete empty message", err);
            }
          }
          return;
        }

        const cost = await calculateCost(providerSelection.selectedModel, usage.prompt_tokens, usage.completion_tokens);

        if (messageId) {
          // 先使用传入的完整内容更新数据库，确保内容不会丢失
          await saveAIResponse({
            sessionId: parallelResults.sessionId!,
            content: fullText,
            reasoningContent: fullReasoning,
            searchResults: context.searchResultsStr,
            contentParts,
            parentId: null, // 增量更新不需要 parentId
            model: providerSelection.selectedModel,
            provider: providerSelection.selectedProviderId,
            modelAvatar: selectedModelAvatar,
            usage,
            cost,
            messageId, // 传入 messageId 进行增量更新
          });
          // 然后标记为已完成（更新状态，如果缓存有数据也会更新）
          await completeAIResponse(messageId, usage, cost, parallelResults.sessionId!);
        } else {
          const lastUserMsg = messages.filter((m) => m.role === 'user').pop();
          const parentId = lastUserMsg && lastUserMsg.id ? messageIdMap.get(lastUserMsg.id) : null;
          await saveAIResponse({
            sessionId: parallelResults.sessionId!,
            content: fullText,
            reasoningContent: fullReasoning,
            searchResults: context.searchResultsStr,
            contentParts,
            parentId: parentId || null,
            model: providerSelection.selectedModel,
            provider: providerSelection.selectedProviderId,
            modelAvatar: selectedModelAvatar,
            usage,
            cost,
            traceId: responseMessageId
          });
        }

        // Post-processing: Auto rename and memory extraction
        const postProcessingResult = await executePostProcessing({
          fullText,
          fullReasoning,
          messages,
          settings,
          userId,
          projectId: projectId ?? null,
          sessionId: parallelResults.sessionId,
          userMsgCount: messages.filter((m) => m.role === 'user').length,
        });

        return {
          title: postProcessingResult.title,
          memories: postProcessingResult.memories,
        };
      }
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "x-session-id": effectiveSessionId,
        "Access-Control-Expose-Headers": "x-session-id",
      },
    });

  } catch (error: unknown) {
    return createErrorResponse("Chat API Error", 500, "CHAT_API_ERROR", error);
  }
}

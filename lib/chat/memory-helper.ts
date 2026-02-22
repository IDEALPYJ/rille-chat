import OpenAI from "openai";
import { UserSettings, Message } from "@/lib/types";
import { selectProviderAndModel } from "@/lib/chat/provider-helper";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

import {
  retrieveMemories,
  getRetrievalMode,
  processMemory,
  formatMemoriesForPrompt as formatNewMemories,
  formatMemoriesWithRoot,
} from "./memory";
import type { MemoryRetrievalResult, RetrievalMode } from "./memory";

/**
 * @deprecated 使用新的 processMemory 函数替代
 * 保留此函数以兼容旧代码
 */
export async function extractMemories(
  messages: Message[],
  settings: UserSettings,
  userId: string,
  projectId?: string
): Promise<string[]> {
  if (settings.memory?.extractionModel) {
    logger.debug("Using memory extraction");
    
    const conversationMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    if (conversationMessages.length < 2) {
      return [];
    }
    
    const lastTwo = conversationMessages.slice(-2);
    const userInput = lastTwo.find(m => m.role === 'user')?.content || '';
    const aiResponse = lastTwo.find(m => m.role === 'assistant')?.content || '';
    
    // Fire-and-forget 调用新流程
    processMemory({
      userId,
      projectId,
      userInput,
      aiResponse,
      extractionModel: settings.memory.extractionModel,
      embeddingModel: settings.memory.embeddingModel,
      settings: settings as any,
    }).catch(err => logger.error("New memory extraction failed", err));
    
    return []; // 新流程是异步的，不返回结果
  }
  
  // 旧流程（向后兼容）
  return extractMemoriesLegacy(messages, settings, userId, projectId);
}

/**
 * 旧版记忆提取（向后兼容）
 */
async function extractMemoriesLegacy(
  messages: Message[],
  settings: UserSettings,
  userId: string,
  projectId?: string
): Promise<string[]> {
  try {
    if (!settings.memory?.enabled) {
      return [];
    }

    let providerId: string | undefined;
    let modelId: string | undefined;

    if (settings.memory.extractionModel && settings.memory.extractionModel.trim() !== "") {
      const parts = settings.memory.extractionModel.split(":");
      if (parts.length === 2) {
        providerId = parts[0];
        modelId = parts[1];
        
        const providerConfig = settings.providers?.[providerId];
        if (!providerConfig || !providerConfig.enabled) {
          logger.warn("Memory extractionModel provider not enabled or not found, falling back to default", { 
            providerId, 
            modelId,
          });
          providerId = undefined;
          modelId = undefined;
        }
      }
    }

    const selection = selectProviderAndModel(settings, providerId, modelId);
    
    if (!selection) {
      logger.warn("No valid provider/model selected for memory extraction");
      return [];
    }

    const { selectedProviderConfig, baseURL, selectedModel } = selection;
    
    logger.debug("Memory extraction using model (legacy)", { 
      provider: selection.selectedProviderId, 
      model: selectedModel 
    });

    const openai = new OpenAI({
      apiKey: selectedProviderConfig.apiKey,
      baseURL: baseURL,
    });

    const conversationMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
    
    let recentContext: string;
    if (conversationMessages.length === 0) {
      return [];
    } else if (conversationMessages.length === 1) {
      const lastMsg = conversationMessages[conversationMessages.length - 1];
      recentContext = `User: ${lastMsg.content}`;
    } else {
      const lastTwo = conversationMessages.slice(-2);
      recentContext = lastTwo.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n\n");
    }

    const existingMemories = await getExistingMemoriesForDedup(userId, projectId);
    
    const existingMemoriesText = existingMemories.length > 0
      ? `\n\n<ExistingMemories>\nThe following memories have already been saved. DO NOT extract these again:\n${existingMemories.map(m => `- ${m}`).join("\n")}\n</ExistingMemories>`
      : "";

    const systemPrompt = `You are a memory extraction assistant. Your task is to identify NEW and IMPORTANT facts about the user from this conversation snippet.

RULES:
1. Extract ONLY new information not already in existing memories
2. Focus on: User preferences, personal details (name, occupation, interests), project info, specific instructions
3. Ignore: Casual chat, temporary context, questions that don't reveal preferences
4. DO NOT extract: Passwords, API keys, phone numbers, addresses, or sensitive PII
5. Each memory should be a concise, standalone fact (one sentence)
6. If nothing new or important is found, return empty array

OUTPUT FORMAT: Valid JSON object with "memories" array of strings
Example: {"memories": ["User prefers dark mode", "User is building a chat app"]}
If nothing to extract: {"memories": []}${existingMemoriesText}`.trim();

    const userPrompt = `Extract NEW memories from this conversation (ignore anything already saved):

${recentContext}

Remember: Output a JSON object with "memories" array. Only include genuinely new information.`;

    const completion = await openai.chat.completions.create({
      model: selectedModel,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      logger.warn("Memory extraction returned empty content");
      return [];
    }

    try {
      const cleanContent = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleanContent);
      
      if (parsed.memories && Array.isArray(parsed.memories)) {
        let memories = parsed.memories.filter((m: any) => typeof m === "string" && m.trim().length > 0);
        
        if (existingMemories.length > 0) {
          const existingLower = new Set(existingMemories.map(m => m.toLowerCase().trim()));
          memories = memories.filter((m: string) => {
            const mLower = m.toLowerCase().trim();
            for (const existing of existingLower) {
              if (mLower === existing || 
                  mLower.includes(existing) || 
                  existing.includes(mLower) ||
                  calculateSimilarity(mLower, existing) > 0.8) {
                logger.debug("Filtered duplicate memory", { new: m, existingSimilar: existing });
                return false;
              }
            }
            return true;
          });
        }
        
        if (memories.length > 0) {
          logger.info(`Extracted ${memories.length} new memories from conversation (legacy)`);
        }
        return memories;
      }
      
      if (Array.isArray(parsed)) {
        const memories = parsed.filter(m => typeof m === "string" && m.trim().length > 0);
        if (memories.length > 0) {
          logger.info(`Extracted ${memories.length} memories from conversation (array format, legacy)`);
        }
        return memories;
      }
      
      logger.warn("Memory extraction response did not contain expected format", { parsed });
      return [];
    } catch (e) {
      logger.error("Failed to parse memory extraction response", { error: e, content });
      return [];
    }

  } catch (error) {
    logger.error("Error extracting memories (legacy)", error);
    return [];
  }
}

/**
 * 获取相关记忆
 * 支持双模式检索：向量检索 + 关键词检索
 */
export async function getRelevantMemories(
  userId: string,
  projectId: string | undefined,
  maxTokens: number = 2000,
  currentMessageContent?: string,
  settings?: UserSettings
): Promise<string[]> {
  if (!settings?.memory?.enabled) {
    return getRelevantMemoriesLegacy(userId, projectId, maxTokens, currentMessageContent);
  }

  try {
    const mode: RetrievalMode = getRetrievalMode(settings.memory.embeddingModel);

    logger.debug("Retrieving memories", {
      mode,
      userId,
      hasQuery: !!currentMessageContent,
    });

    const results: MemoryRetrievalResult[] = await retrieveMemories(
      {
        userId,
        projectId,
        query: currentMessageContent || "",
        mode,
        strategy: settings.memory.strategy || "hybrid",
        limit: 10,
        maxTokens,
      },
      settings.providers as any
    );

    return results.map(r => r.content);
  } catch (error) {
    logger.error("Memory retrieval failed, falling back to legacy", error);
    return getRelevantMemoriesLegacy(userId, projectId, maxTokens, currentMessageContent);
  }
}

/**
 * 旧版记忆检索（向后兼容）
 */
async function getRelevantMemoriesLegacy(
  userId: string,
  projectId: string | undefined,
  maxTokens: number = 2000,
  currentMessageContent?: string
): Promise<string[]> {
  const whereClause: any = {
    userId,
    OR: [{ projectId: null }]
  };

  if (projectId) {
    whereClause.OR.push({ projectId: projectId });
  }

  const memories = await db.memory.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  let sortedMemories = memories;
  
  if (currentMessageContent) {
    const keywords = currentMessageContent.toLowerCase().split(/[\s,，.。]+/).filter(k => k.length > 1);
    
    if (keywords.length > 0) {
      sortedMemories = memories.map((m: any) => {
        let score = 0;
        const contentLower = m.content.toLowerCase();
        
        for (const k of keywords) {
          if (contentLower.includes(k)) {
            score += 1;
          }
        }
        
        const daysOld = (Date.now() - m.createdAt.getTime()) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.max(0, 10 - daysOld);
        
        return { ...m, score: score * 10 + recencyScore };
      }).sort((a: any, b: any) => b.score - a.score);
    }
  }

  const selected: string[] = [];
  const selectedIds: string[] = [];
  let currentTokens = 0;

  for (const m of sortedMemories) {
    const estimated = m.content.length;
    
    if (currentTokens + estimated > maxTokens) {
      break;
    }
    
    selected.push(m.content);
    selectedIds.push(m.id);
    currentTokens += estimated;
  }

  if (selectedIds.length > 0) {
    db.memory.updateMany({
      where: { id: { in: selectedIds } },
      data: { lastUsed: new Date() }
    }).catch((err: any) => logger.error("Failed to update memory lastUsed", err));
  }

  return selected;
}

/**
 * 获取现有记忆用于去重
 */
async function getExistingMemoriesForDedup(userId: string, projectId?: string): Promise<string[]> {
  try {
    const whereClause: any = {
      userId,
      OR: [{ projectId: null }]
    };

    if (projectId) {
      whereClause.OR.push({ projectId });
    }

    const memories = await db.memory.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { content: true }
    });

    return memories.map(m => m.content);
  } catch (error) {
    logger.error("Failed to fetch existing memories for dedup", error);
    return [];
  }
}

/**
 * 字符串相似度计算
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;
  
  if (s1.includes(s2) || s2.includes(s1)) {
    const minLen = Math.min(s1.length, s2.length);
    const maxLen = Math.max(s1.length, s2.length);
    return minLen / maxLen;
  }
  
  const words1 = new Set(s1.split(/\s+/).filter(w => w.length > 0));
  const words2 = new Set(s2.split(/\s+/).filter(w => w.length > 0));
  
  let wordIntersection = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      wordIntersection++;
    }
  }
  
  const wordUnion = words1.size + words2.size - wordIntersection;
  const jaccardScore = wordUnion > 0 ? wordIntersection / wordUnion : 0;
  
  const levenshteinDistance = computeLevenshteinDistance(s1, s2);
  const maxLen = Math.max(s1.length, s2.length);
  const levenshteinScore = maxLen > 0 ? 1 - (levenshteinDistance / maxLen) : 0;
  
  const ngramScore = computeNgramSimilarity(s1, s2, 2);
  
  return jaccardScore * 0.3 + levenshteinScore * 0.5 + ngramScore * 0.2;
}

function computeLevenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));
  
  for (let i = 0; i <= m; i++) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }
  
  return dp[m][n];
}

function computeNgramSimilarity(str1: string, str2: string, n: number): number {
  if (str1.length < n || str2.length < n) {
    return str1 === str2 ? 1.0 : 0.0;
  }
  
  const getNgrams = (str: string): Set<string> => {
    const ngrams = new Set<string>();
    for (let i = 0; i <= str.length - n; i++) {
      ngrams.add(str.substring(i, i + n));
    }
    return ngrams;
  };
  
  const ngrams1 = getNgrams(str1);
  const ngrams2 = getNgrams(str2);
  
  let intersection = 0;
  for (const ngram of ngrams1) {
    if (ngrams2.has(ngram)) {
      intersection++;
    }
  }
  
  const union = ngrams1.size + ngrams2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * @deprecated 使用新的 processMemory 函数替代
 * 保留此函数以兼容旧代码
 */
export async function saveMemories(
  userId: string,
  projectId: string | undefined,
  memories: string[]
) {
  if (!memories || memories.length === 0) return;

  let targetProjectId: string | null = null;

  if (projectId) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { memoryIsolated: true }
    });

    if (project?.memoryIsolated) {
      targetProjectId = projectId;
    }
  }

  const existingContents = await db.memory.findMany({
    where: {
      userId,
      projectId: targetProjectId,
      content: { in: memories }
    },
    select: { content: true }
  });
  
  const existingSet = new Set(existingContents.map(m => m.content));
  const newMemories = memories.filter(m => !existingSet.has(m));
  
  if (newMemories.length === 0) {
    logger.debug("All memories already exist, skipping save");
    return;
  }

  await db.$transaction(
    newMemories.map(content => 
      db.memory.create({
        data: {
          userId,
          projectId: targetProjectId,
          content,
          tokens: Math.ceil(content.length / 4),
        }
      })
    )
  );
  
  logger.info(`Saved ${newMemories.length} new memories (legacy)`);
}

/**
 * 格式化记忆用于系统提示词
 */
export function formatMemoriesForPrompt(memories: string[]): string {
  return formatNewMemories(memories);
}

// 重新导出核心函数
export { processMemory, formatMemoriesWithRoot };

/**
 * 记忆提取服务
 * 支持格式化输出和简单模式
 */

import OpenAI from "openai";
import { logger } from "@/lib/logger";
import {
  MemoryOperation,
  MemoryRoot,
  ProcessMemoryOptions,
} from "./types";
import { findSimilarMemories, getRetrievalMode } from "./retrieval";
import { openrouterModelConfigs } from "@/lib/data/models/openrouter";
import { googleModelConfigs } from "@/lib/data/models/google";
import { deepseekModelConfigs } from "@/lib/data/models/deepseek";
import { moonshotModelConfigs } from "@/lib/data/models/moonshot";
import { siliconflowModelConfigs } from "@/lib/data/models/siliconflow";
import { xaiModelConfigs } from "@/lib/data/models/xai";
import { mistralModelConfigs } from "@/lib/data/models/mistral";
import { perplexityModelConfigs } from "@/lib/data/models/perplexity";
import { zaiModelConfigs } from "@/lib/data/models/zai";
import { bailianModelConfigs } from "@/lib/data/models/bailian";
import { volcengineModelConfigs } from "@/lib/data/models/volcengine";

// 合并所有模型配置
const allModelConfigs = [
  ...openrouterModelConfigs,
  ...googleModelConfigs,
  ...deepseekModelConfigs,
  ...moonshotModelConfigs,
  ...siliconflowModelConfigs,
  ...xaiModelConfigs,
  ...mistralModelConfigs,
  ...perplexityModelConfigs,
  ...zaiModelConfigs,
  ...bailianModelConfigs,
  ...volcengineModelConfigs,
];

/**
 * 解析模型配置字符串
 */
function parseModelConfig(modelConfig: string): { provider: string; model: string } | null {
  if (!modelConfig || !modelConfig.includes(":")) {
    return null;
  }
  
  const [provider, ...modelParts] = modelConfig.split(":");
  const model = modelParts.join(":");
  
  if (!provider || !model) {
    return null;
  }
  
  return { provider, model };
}

/**
 * 获取 Provider 配置
 */
function getProviderConfig(providerId: string, providers: Record<string, any>): any | null {
  const config = providers[providerId];
  if (!config || !config.enabled) {
    return null;
  }
  return config;
}

/**
 * 获取模型配置
 */
function getModelConfig(provider: string, modelId: string): any | null {
  // 构建完整模型ID
  const fullModelId = `${provider}/${modelId}`;
  
  // 在配置中查找
  const config = allModelConfigs.find(
    (c) => c.id === fullModelId || c.id === modelId || c.id.endsWith(`/${modelId}`)
  );
  
  return config || null;
}

/**
 * 检测模型是否支持格式化输出
 */
function supportsStructuredOutput(modelConfig: any): boolean {
  if (!modelConfig || !modelConfig.features) {
    return false;
  }
  return modelConfig.features.includes("structured_outputs");
}

/**
 * 检测模型是否支持指定参数
 */
function modelSupportsParameter(modelConfig: any, paramId: string): boolean {
  if (!modelConfig?.parameters) return false;
  return modelConfig.parameters.some((p: any) => p.id === paramId);
}

/**
 * 获取格式化输出参数
 */
function getStructuredOutputParams(
  provider: string,
  modelConfig: any
): Record<string, any> | null {
  if (!supportsStructuredOutput(modelConfig)) {
    return null;
  }

  // JSON Schema 定义
  const jsonSchema = {
    type: "object",
    properties: {
      operations: {
        type: "array",
        items: {
          type: "object",
          properties: {
            root: { 
              type: "string", 
              enum: ["Profile", "Preference", "Ability", "Goal", "Context"],
              description: "记忆分类"
            },
            content: { 
              type: "string",
              description: "完整事实描述(第三人称)"
            },
            action: { 
              type: "string", 
              enum: ["add", "update", "delete"],
              description: "操作类型"
            },
            target_id: { 
              type: "string",
              description: "目标记忆ID（update/delete时必填）"
            },
            importance: { 
              type: "integer", 
              minimum: 1, 
              maximum: 5,
              description: "重要性评分 1(琐事)-5(核心/原则/过敏)"
            }
          },
          required: ["root", "content", "action", "importance"]
        }
      }
    },
    required: ["operations"]
  };

  switch (provider) {
    case "google":
      // Google 使用特殊参数
      return {
        response_mime_type: "application/json",
        response_schema: jsonSchema
      };
    
    case "anthropic":
      // Anthropic 不支持 JSON Mode，返回 null 使用简单模式
      return null;
    
    case "openrouter":
      // OpenRouter 支持 json_schema
      return {
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "memory_operations",
            strict: true,
            schema: jsonSchema
          }
        }
      };
    
    default:
      // 大多数服务商使用标准 json_object
      return {
        response_format: { type: "json_object" }
      };
  }
}

/**
 * 构建新提示词模板
 */
function buildExtractionPrompt(
  userInput: string,
  aiResponse: string,
  similarMemories: any[],
  currentTime: string
): string {
  return `# Role 
你是 AI 记忆管理员。任务是基于【当前对话】和【现有记忆】更新用户画像数据库。 
当前时间: ${currentTime}

# 5 Roots (分类) 
- **Profile**: 身份/健康/家庭 
- **Preference**: 偏好/习惯/避讳 
- **Ability**: 技能/知识/证书 
- **Goal**: 长期计划 
- **Context**: 短期状态/正在做 

# 核心规则 (严格执行) 
1. **原子化 (Atomic)**: 复合句必须拆分。 
   * "我是住在北京的程序员" -> [ADD Profile:住在北京], [ADD Profile:程序员]。 
2. **反幻觉 (Anti-Hallucination)**: 
   * ❌ **不提取**: 闲聊、重复信息、**疑问句**("Python好学吗?")、**假设**("如果...")、**第三方信息**。 
   * ✅ **只提取**: 用户**明确陈述**的事实。 
3. **操作指令**: 
   * **IGNORE**: 无新信息或命中"不提取"规则 -> 输出空数组。 
   * **ADD**: 新事实 -> "action": "add"。 
   * **UPDATE**: 冲突或补充细节 -> "action": "update", 必填 "target_id"。 
   * **DELETE**: 否认/撤销 -> "action": "delete", 必填 "target_id"。 

# Output JSON Schema
严格按照提供的 JSON Schema 格式输出，包含字段:
- "root": 5 Roots之一 
- "content": 完整事实描述(第三人称) 
- "action": "add"|"update"|"delete"
- "target_id": 仅 update/delete 时必填(对应 Existing ID) 
- "importance": 1(琐事)-5(核心/原则/过敏) 

# Examples
[Existing]: ${JSON.stringify(similarMemories.slice(0, 5))}

**Case 1: 冲突修正 (Update)** 
User: "刚做完手术，医生说忌辛辣。" 
Output: [{"root":"Preference","content":"用户因手术忌辛辣","action":"update","target_id":"m1","importance":5}]

**Case 2: 复合拆分 (Atomic Add)** 
User: "下周去上海出差，顺便看展。" 
Output: [ 
  {"root":"Context","content":"用户下周去上海出差","action":"add","importance":3}, 
  {"root":"Goal","content":"用户计划在上海看展","action":"add","importance":2} 
]

**Case 3: 负面样本 (Ignore)** 
User: "Python 和 Go 哪个做后端好？" 
Output: []

# Start 
[Existing Memories]: 
${similarMemories.length > 0 
  ? similarMemories.map(m => `- ID: ${m.id}, 内容: ${m.content}`).join("\n")
  : "无相关记忆"
}

[Dialogue]: 
User: ${userInput}
AI: ${aiResponse}`;
}

/**
 * 使用格式化输出提取记忆
 */
async function extractWithStructuredOutput(
  options: ProcessMemoryOptions
): Promise<MemoryOperation[]> {
  const {
    userInput,
    aiResponse,
    extractionModel,
    userId,
    projectId,
    settings,
  } = options;
  
  const parsed = parseModelConfig(extractionModel);
  if (!parsed) {
    logger.warn("Invalid extraction model config", { extractionModel });
    return [];
  }
  
  const { provider: providerId, model } = parsed;
  const providerConfig = getProviderConfig(providerId, settings.providers);
  
  if (!providerConfig) {
    logger.warn("Extraction provider not found or not enabled", { providerId });
    return [];
  }
  
  const modelConfig = getModelConfig(providerId, model);
  const structuredOutputParams = getStructuredOutputParams(providerId, modelConfig);
  
  if (!structuredOutputParams) {
    // 不支持格式化输出，回退到简单模式
    throw new Error("Model does not support structured output");
  }
  
  try {
    // 前置检索
    const mode = getRetrievalMode(settings.providers.memory?.embeddingModel);
    const similarMemories = await findSimilarMemories(
      userInput,
      userId,
      projectId,
      mode,
      settings.providers
    );
    
    let baseURL = providerConfig.baseURL;
    if (baseURL && !baseURL.endsWith("/")) {
      baseURL += "/";
    }
    
    const openai = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: baseURL,
    });
    
    const currentTime = new Date().toISOString();
    const systemPrompt = buildExtractionPrompt(
      userInput,
      aiResponse,
      similarMemories,
      currentTime
    );

    // 构建请求参数
    const requestParams: any = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请提取记忆操作。" },
      ],
    };

    // 如果模型支持 temperature，设置为 0
    if (modelSupportsParameter(modelConfig, 'temperature')) {
      requestParams.temperature = 0;
    }

    // 添加格式化输出参数
    Object.assign(requestParams, structuredOutputParams);
    
    const completion = await openai.chat.completions.create(requestParams);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      logger.warn("No content in LLM response");
      return [];
    }

    // 解析 JSON
    const parsedResult = JSON.parse(content);
    const operations: MemoryOperation[] = parsedResult.operations
      ?.filter((op: any) => op.action !== "skip" && op.action)
      ?.map((op: any): MemoryOperation => ({
        action: op.action,
        content: op.content,
        root: op.root as MemoryRoot,
        importance: op.importance,
        evidenceType: "explicit",
        targetId: op.target_id,
        searchKeywords: [],
      })) || [];

    logger.info(`Extracted ${operations.length} memory operations (structured output)`, {
      provider: providerId,
      model,
      operations: operations.map((o: MemoryOperation) => ({ action: o.action, root: o.root })),
    });

    return operations;
  } catch (error) {
    logger.error("Failed to extract memories (structured output)", {
      error,
      provider: providerId,
      model,
    });
    throw error;
  }
}

/**
 * 简单提取模式（不使用格式化输出，兼容性更好）
 */
async function extractWithSimpleMode(
  options: ProcessMemoryOptions
): Promise<MemoryOperation[]> {
  const {
    userInput,
    aiResponse,
    extractionModel,
    userId,
    projectId,
    settings,
  } = options;
  
  const parsed = parseModelConfig(extractionModel);
  if (!parsed) {
    return [];
  }
  
  const { provider: providerId, model } = parsed;
  const providerConfig = getProviderConfig(providerId, settings.providers);

  if (!providerConfig) {
    return [];
  }

  const modelConfig = getModelConfig(providerId, model);

  try {
    // 前置检索
    const mode = getRetrievalMode(settings.providers.memory?.embeddingModel);
    const similarMemories = await findSimilarMemories(
      userInput,
      userId,
      projectId,
      mode,
      settings.providers
    );
    
    let baseURL = providerConfig.baseURL;
    if (baseURL && !baseURL.endsWith("/")) {
      baseURL += "/";
    }
    
    const openai = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: baseURL,
    });
    
    const currentTime = new Date().toISOString();
    const systemPrompt = buildExtractionPrompt(
      userInput,
      aiResponse,
      similarMemories,
      currentTime
    ) + `

重要提示：请只输出纯 JSON 格式，不要包含任何其他文字、代码块标记或解释。`;

    // 构建请求参数
    const requestParams: any = {
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "请提取记忆操作。" },
      ],
    };

    // 如果模型支持 temperature，设置为 0
    if (modelSupportsParameter(modelConfig, 'temperature')) {
      requestParams.temperature = 0;
    }

    const completion = await openai.chat.completions.create(requestParams);

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      return [];
    }

    // 提取 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      logger.warn("No JSON found in response", { content: content.slice(0, 200) });
      return [];
    }

    const parsedResult = JSON.parse(jsonMatch[0]);
    const operations: MemoryOperation[] = parsedResult.operations
      ?.filter((op: any) => op.action !== "skip" && op.action)
      ?.map((op: any): MemoryOperation => ({
        action: op.action,
        content: op.content,
        root: op.root as MemoryRoot,
        importance: op.importance,
        evidenceType: "explicit",
        targetId: op.target_id,
        searchKeywords: [],
      })) || [];

    logger.info(`Extracted ${operations.length} memory operations (simple mode)`, {
      provider: providerId,
      model,
    });

    return operations;
  } catch (error) {
    logger.error("Failed to extract memories (simple mode)", error);
    return [];
  }
}

/**
 * 主提取函数 - 自动选择最佳提取方式
 */
export async function extractMemoryOperations(
  options: ProcessMemoryOptions
): Promise<MemoryOperation[]> {
  const { extractionModel } = options;
  
  const parsed = parseModelConfig(extractionModel);
  if (!parsed) {
    logger.warn("Invalid extraction model config", { extractionModel });
    return [];
  }
  
  const { provider: providerId, model } = parsed;
  const modelConfig = getModelConfig(providerId, model);
  
  // 1. 检查模型是否支持格式化输出
  if (supportsStructuredOutput(modelConfig)) {
    try {
      // 优先使用格式化输出
      return await extractWithStructuredOutput(options);
    } catch (error) {
      logger.warn("Structured output failed, falling back to simple mode", { 
        error,
        provider: providerId,
        model 
      });
      // 失败时回退到简单模式
      return extractWithSimpleMode(options);
    }
  }
  
  // 2. 不支持格式化输出，使用简单模式
  logger.debug("Model does not support structured output, using simple mode", {
    provider: providerId,
    model,
  });
  return extractWithSimpleMode(options);
}

/**
 * 简单提取模式（向后兼容）
 * @deprecated 使用 extractMemoryOperations 替代
 */
export async function extractMemoryOperationsSimple(
  options: ProcessMemoryOptions
): Promise<MemoryOperation[]> {
  return extractWithSimpleMode(options);
}

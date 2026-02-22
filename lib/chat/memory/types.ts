/**
 * 记忆系统类型定义
 */

/**
 * 记忆根节点分类（Taxonomy）
 * - Profile: 客观事实（身份/健康），无衰减
 * - Ability: 技能与知识，极低衰减
 * - Preference: 主观偏好，中等衰减
 * - Goal: 长期愿景，基于达成度
 * - Context: 短期状态/语境，高衰减
 */
export type MemoryRoot = "Profile" | "Preference" | "Ability" | "Goal" | "Context";

/**
 * 记忆状态
 * - candidate: 候选状态（待验证）
 * - active: 活跃状态（已验证，可检索）
 * - archived: 已归档（逻辑删除）
 */
export type MemoryStatus = "candidate" | "active" | "archived";

/**
 * 检索模式
 * - vector: 向量检索（需要 embedding）
 * - keyword: 关键词检索（无需 embedding）
 */
export type RetrievalMode = "vector" | "keyword";

/**
 * 记忆操作类型
 */
export type MemoryAction = "add" | "update" | "delete" | "skip";

/**
 * 记忆操作指令
 * 由 LLM Function Calling 输出
 */
export interface MemoryOperation {
  /** 操作类型 */
  action: MemoryAction;
  
  /** 记忆内容 */
  content: string;
  
  /** 根节点分类 */
  root: MemoryRoot;
  
  /** 重要性评分 1-5 */
  importance: number;
  
  /** 证据类型：用户直述或 AI 推断 */
  evidenceType: "explicit" | "inferred";
  
  /** 目标记忆 ID（update/delete 时使用） */
  targetId?: string;
  
  /** 检索关键词（关键词模式下使用） */
  searchKeywords?: string[];
  
  /** 操作理由 */
  reason?: string;
}

/**
 * 记忆实体（数据库模型对应）
 */
export interface Memory {
  id: string;
  content: string;
  
  /** 向量数据（Buffer 格式，关键词模式时为 null） */
  embedding: Buffer | null;
  
  /** 分类 */
  root: MemoryRoot | null;
  
  /** 状态 */
  status: MemoryStatus;
  
  /** 验证计数器 */
  frequency: number;
  
  /** 重要性 1-5 */
  importance: number;
  
  /** 最后访问时间 */
  lastAccessed: Date;
  
  /** 创建时间 */
  createdAt: Date;
  
  /** 更新时间 */
  updatedAt: Date;
  
  /** 用户 ID */
  userId: string;
  
  /** 项目 ID（可选，用于项目隔离） */
  projectId: string | null;
  
  /** 向后兼容 */
  category?: string | null;
  tokens?: number | null;
  lastUsed?: Date | null;
}

/**
 * 检索结果
 */
export interface MemoryRetrievalResult {
  /** 记忆 ID */
  id: string;
  
  /** 记忆内容 */
  content: string;
  
  /** 分类 */
  root: MemoryRoot | null;
  
  /** 重要性 */
  importance: number;
  
  /** 综合评分 */
  score: number;
  
  /** 语义相似度（向量模式） */
  semanticScore?: number;
  
  /** 关键词匹配度（关键词模式） */
  keywordScore?: number;
}

/**
 * 检索选项
 */
export interface RetrievalOptions {
  /** 用户 ID */
  userId: string;
  
  /** 项目 ID（可选） */
  projectId?: string;
  
  /** 最大返回数量 */
  limit?: number;
  
  /** 最大 Token 数 */
  maxTokens?: number;
  
  /** 检索模式 */
  mode: RetrievalMode;
  
  /** 查询文本（用于生成 embedding 或提取关键词） */
  query: string;
  
  /** 检索策略 */
  strategy: "recency" | "relevance" | "hybrid";
}

/**
 * 记忆处理选项
 */
export interface ProcessMemoryOptions {
  /** 用户 ID */
  userId: string;
  
  /** 项目 ID（可选） */
  projectId?: string;
  
  /** 用户输入 */
  userInput: string;
  
  /** AI 回复 */
  aiResponse: string;
  
  /** 提取模型配置 */
  extractionModel: string;
  
  /** Embedding 模型配置（可选） */
  embeddingModel?: string;
  
  /** 用户设置 */
  settings: {
    providers: Record<string, any>;
  };
}

/**
 * 根节点元数据
 */
export interface RootMetadata {
  /** 显示名称 */
  label: string;
  
  /** 描述 */
  description: string;
  
  /** 衰减策略 */
  decayStrategy: "none" | "very_slow" | "medium" | "goal_based" | "fast";
  
  /** 衰减天数（fast 模式下多少天后开始衰减） */
  decayDays?: number;
  
  /** 默认重要性 */
  defaultImportance: number;
  
  /** 示例 */
  examples: string[];
}

/**
 * 根节点配置映射
 */
export const ROOT_METADATA: Record<MemoryRoot, RootMetadata> = {
  Profile: {
    label: "个人档案",
    description: "客观事实（身份、健康、基本信息）",
    decayStrategy: "none",
    defaultImportance: 4,
    examples: ["我叫Tom", "我有糖尿病", "出生于1990年"],
  },
  Ability: {
    label: "技能能力",
    description: "技能与知识",
    decayStrategy: "very_slow",
    defaultImportance: 4,
    examples: ["我会Python", "懂法语", "有驾照"],
  },
  Preference: {
    label: "个人偏好",
    description: "主观偏好（可能随时间变化）",
    decayStrategy: "medium",
    decayDays: 90,
    defaultImportance: 3,
    examples: ["喜欢赛博朋克风", "爱吃辣", "喜欢安静"],
  },
  Goal: {
    label: "目标计划",
    description: "长期愿景和计划",
    decayStrategy: "goal_based",
    defaultImportance: 4,
    examples: ["想学吉他", "计划买房", "准备考研"],
  },
  Context: {
    label: "上下文",
    description: "短期状态/临时语境",
    decayStrategy: "fast",
    decayDays: 7,
    defaultImportance: 2,
    examples: ["正在修车", "下周要去出差", "最近感冒了"],
  },
};

/**
 * 获取根节点的显示标签
 */
export function getRootLabel(root: MemoryRoot | null): string {
  if (!root) return "未分类";
  return ROOT_METADATA[root]?.label || root;
}

/**
 * 获取根节点的描述
 */
export function getRootDescription(root: MemoryRoot | null): string {
  if (!root) return "";
  return ROOT_METADATA[root]?.description || "";
}

/**
 * 计算记忆的衰减因子
 * @param root 根节点类型
 * @param daysSinceAccess 距离上次访问的天数
 * @returns 衰减因子 0-1，1 表示无衰减
 */
export function calculateDecayFactor(
  root: MemoryRoot | null,
  daysSinceAccess: number
): number {
  if (!root) return 1;
  
  const meta = ROOT_METADATA[root];
  if (!meta) return 1;
  
  switch (meta.decayStrategy) {
    case "none":
      return 1;
    case "very_slow":
      // 365 天后衰减到 0.5
      return Math.max(0.5, 1 - daysSinceAccess / 730);
    case "medium":
      // 90 天后衰减到 0.3
      return Math.max(0.3, 1 - daysSinceAccess / 130);
    case "fast":
      // 7 天后快速衰减
      return Math.max(0.1, 1 - daysSinceAccess / 10);
    case "goal_based":
      // 目标类：180 天后衰减
      return Math.max(0.4, 1 - daysSinceAccess / 300);
    default:
      return 1;
  }
}

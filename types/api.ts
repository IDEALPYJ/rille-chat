/**
 * API 响应类型定义
 * 统一所有 API 路由的响应格式
 */

import type { Session, Message, Project, File as FileType, Prompt } from "@/lib/types";

/**
 * 通用 API 响应结构
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page?: number;
  pageSize?: number;
  hasMore: boolean;
  cursor?: string;
}

/**
 * 用户相关 API 响应
 */
export interface UserProfileResponse {
  success: true;
  user: {
    id: string;
    name: string;
    image: string | null;
    role: string;
  };
}

export interface UserSettingsResponse {
  providers?: Record<string, unknown>;
  search?: unknown;
  theme?: string;
  zoom?: number;
  fontSize?: number;
  memory?: unknown;
  [key: string]: unknown;
}

/**
 * 会话相关 API 响应
 */
export interface SessionListResponse {
  sessions: Session[];
  total: number;
}

export interface SessionDetailResponse {
  session: Session;
  messages: Message[];
  hasMore: boolean;
}

/**
 * 文件相关 API 响应
 */
export interface FileUploadResponse {
  success: true;
  id: string;
  url: string;
  name: string;
  size: number;
  type: string;
  embeddingProcessed: boolean;
  embeddingProcessing?: boolean;
}

export interface FileListResponse {
  files: FileType[];
  total: number;
}

/**
 * 项目相关 API 响应
 */
export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface ProjectDetailResponse {
  project: Project;
  sessions: Session[];
  files: FileType[];
}

/**
 * 提示词相关 API 响应
 */
export interface PromptListResponse {
  prompts: Prompt[];
  total: number;
}

/**
 * 健康检查响应
 */
export interface HealthCheckResponse {
  status: "healthy" | "unhealthy";
  timestamp: string;
  version: string;
  uptime: number;
  database: "connected" | "disconnected";
  responseTime: string;
  error?: string;
}

/**
 * MCP 插件相关 API 响应
 */
export interface McpPluginListResponse {
  plugins: Array<{
    id: string;
    name: string;
    icon: string | null;
    serverUrl: string;
    authType: string;
    advancedConfig: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface SessionMcpPluginResponse {
  sessionId: string;
  plugins: Array<{
    id: string;
    pluginId: string;
    enabled: boolean;
    plugin: {
      id: string;
      name: string;
      icon: string | null;
      serverUrl: string;
      authType: string;
      advancedConfig: Record<string, unknown>;
    };
  }>;
}

/**
 * 错误响应类型（已在 lib/api-error.ts 中定义，此处仅作类型引用）
 */
export type ErrorResponse = {
  error: string | Record<string, unknown>;
  code?: string;
  translationKey?: string;
  translationParams?: Record<string, string | number>;
};


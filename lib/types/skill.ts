export interface Skill {
  id: string;
  name: string;
  displayName: string;
  description: string;
  icon: string | null;
  instructions: string;
  resources: unknown;
  scripts: unknown;
  version: string;
  author: string | null;
  tags: string[];
  triggerKeywords: string[];
  userId: string;
  isSystem: boolean;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// 辅助函数：将 Prisma 返回的 Skill 转换为应用层 Skill
export function normalizeSkill(skill: Skill): Skill {
  return {
    ...skill,
    resources: skill.resources as SkillResource[] | null,
    scripts: skill.scripts as SkillScript[] | null,
  };
}

export interface SkillResource {
  name: string;
  content: string;
  type: 'markdown' | 'json' | 'text';
}

export interface SkillScript {
  name: string;
  content: string;
  language: 'python' | 'javascript' | 'bash';
}

export interface CreateSkillInput {
  name: string;
  displayName: string;
  description: string;
  icon?: string;
  instructions: string;
  resources?: SkillResource[];
  scripts?: SkillScript[];
  version?: string;
  author?: string;
  tags?: string[];
  triggerKeywords?: string[];
}

export interface SkillTriggerResult {
  skill: Skill;
  confidence: number;
  matchedKeywords: string[];
}

export interface DetectOptions {
  threshold?: number;
  maxSkills?: number;
}

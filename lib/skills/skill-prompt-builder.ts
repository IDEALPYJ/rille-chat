import { Skill, SkillTriggerResult, SkillResource } from "@/lib/types/skill";

/**
 * 构建 Skill 系统提示
 * 将触发的 skills 格式化为系统提示的一部分
 */
export function buildSkillSystemPrompt(results: SkillTriggerResult[]): string {
  if (results.length === 0) return "";

  const prompts: string[] = [];

  for (const result of results) {
    const skill = result.skill;
    const resources = skill.resources as SkillResource[] | null;
    prompts.push(`## ${skill.displayName}

${skill.instructions}
${resources?.map(r => `
### ${r.name}
${r.content}
`).join('') || ''}`);
  }

  return `\n\n# 已激活的技能\n\n${prompts.join('\n---\n')}`;
}

/**
 * 获取技能元数据提示（始终加载）
 * 用于在系统提示中显示所有可用技能的名称和描述
 */
export function buildSkillMetadataPrompt(skills: Skill[]): string {
  if (skills.length === 0) return "";
  
  const skillList = skills
    .filter(s => s.isEnabled)
    .map(s => `- ${s.displayName}: ${s.description}`)
    .join('\n');
  
  return `\n\n# 可用技能\n${skillList}`;
}

/**
 * 构建完整的系统提示，包含技能信息
 */
export function buildSystemPromptWithSkills(
  basePrompt: string,
  allSkills: Skill[],
  triggeredResults: SkillTriggerResult[]
): string {
  // 1. 添加所有可用技能的元数据（始终加载）
  const metadataPrompt = buildSkillMetadataPrompt(allSkills);
  
  // 2. 添加触发的技能的完整指令
  const triggeredPrompt = buildSkillSystemPrompt(triggeredResults);
  
  return `${basePrompt}${metadataPrompt}${triggeredPrompt}`;
}

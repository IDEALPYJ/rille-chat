import { Skill, SkillTriggerResult, DetectOptions, SkillResource } from "@/lib/types/skill";

/**
 * 检测用户输入是否触发 skills
 * 使用多维度匹配策略：关键词匹配（70%权重）+ 描述相似度（30%权重）
 */
export function detectSkills(
  userInput: string,
  availableSkills: Skill[],
  options: DetectOptions = {}
): SkillTriggerResult[] {
  const { threshold = 0.6, maxSkills = 3 } = options;
  
  const results: SkillTriggerResult[] = [];
  const inputLower = userInput.toLowerCase();
  
  for (const skill of availableSkills) {
    if (!skill.isEnabled) continue;
    
    let matchCount = 0;
    const matchedKeywords: string[] = [];
    
    // 1. 关键词匹配（权重 70%）
    for (const keyword of skill.triggerKeywords) {
      if (inputLower.includes(keyword.toLowerCase())) {
        matchCount++;
        matchedKeywords.push(keyword);
      }
    }
    
    // 2. 描述相似度匹配（权重 30%）
    const descriptionWords = skill.description.toLowerCase().split(/\s+/);
    let descriptionMatchCount = 0;
    for (const word of descriptionWords) {
      if (word.length > 3 && inputLower.includes(word)) {
        descriptionMatchCount++;
      }
    }
    
    // 计算置信度
    const keywordScore = skill.triggerKeywords.length > 0 
      ? matchCount / skill.triggerKeywords.length 
      : 0;
    const descriptionScore = descriptionWords.length > 0
      ? Math.min(descriptionMatchCount / 5, 1) // 最多匹配 5 个词
      : 0;
    
    const confidence = keywordScore * 0.7 + descriptionScore * 0.3;
    
    if (confidence >= threshold && matchedKeywords.length > 0) {
      results.push({
        skill,
        confidence,
        matchedKeywords,
      });
    }
  }
  
  // 按置信度排序并返回前 N 个
  return results
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxSkills);
}

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

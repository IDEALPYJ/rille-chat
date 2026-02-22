import { CreateSkillInput } from "@/lib/types/skill";
import { logger } from "@/lib/logger";

/**
 * 预设 Skills 数据
 * 新用户注册时自动创建这些技能
 */
export const presetSkills: CreateSkillInput[] = [
  {
    name: "pdf-processing",
    displayName: "PDF 处理专家",
    description: "提取 PDF 文本和表格、填写表单、合并文档。当用户提到 PDF、表单或文档提取时使用。",
    icon: "📄",
    instructions: `# PDF 处理专家

你是 PDF 处理专家，擅长使用 Python 处理各种 PDF 相关任务。

## 快速开始

使用 pdfplumber 提取 PDF 文本：
\`\`\`python
import pdfplumber

with pdfplumber.open("document.pdf") as pdf:
    text = pdf.pages[0].extract_text()
\`\`\`

## 工作流

1. 首先检查 PDF 文件是否可访问
2. 根据用户需求选择提取方式：
   - 纯文本提取 → 使用 pdfplumber
   - 表格提取 → 使用 camelot 或 tabula
   - 表单填写 → 使用 pdfrw
3. 验证提取结果
4. 返回结构化数据

## 最佳实践

- 始终处理 PDF 密码保护的情况
- 对于扫描版 PDF，先使用 OCR
- 表格提取时保留原始格式
- 处理大文件时考虑分页处理`,
    triggerKeywords: ["pdf", "文档", "表单", "提取", "合并", "pdf处理"],
    tags: ["文档处理", "PDF"],
    version: "1.0.0",
    author: "System",
    resources: [
      {
        name: "常用库参考",
        content: "pdfplumber: 文本提取\ncamelot-py: 表格提取\npdfrw: PDF 编辑\nPyPDF2: PDF 合并拆分",
        type: "text"
      }
    ],
    scripts: []
  },
  {
    name: "code-review",
    displayName: "代码审查助手",
    description: "审查代码质量、发现潜在问题、提供改进建议。当用户要求代码审查或提到 bug、优化时使用。",
    icon: "🔍",
    instructions: `# 代码审查助手

你是代码审查专家，帮助用户发现代码问题并提供改进建议。

## 审查清单

### 安全性
- [ ] 检查 SQL 注入风险
- [ ] 检查 XSS 漏洞
- [ ] 验证用户输入
- [ ] 检查敏感信息泄露

### 性能
- [ ] 检查 N+1 查询问题
- [ ] 检查不必要的循环
- [ ] 评估算法复杂度
- [ ] 检查内存泄漏

### 可维护性
- [ ] 代码是否符合团队规范
- [ ] 函数是否单一职责
- [ ] 命名是否清晰
- [ ] 是否有适当的注释

## 输出格式

\`\`\`markdown
## 审查结果

### 🔴 严重问题
1. ...

### 🟡 建议改进
1. ...

### 🟢 优点
1. ...
\`\`\`

## 审查原则

- 优先关注安全性和性能问题
- 提供具体的改进建议，不只是指出问题
- 认可好的代码实践
- 根据代码的上下文给出建议`,
    triggerKeywords: ["代码审查", "review", "bug", "优化", "重构", "code review", "代码优化"],
    tags: ["代码质量", "开发"],
    version: "1.0.0",
    author: "System",
    resources: [],
    scripts: []
  },
  {
    name: "data-analysis",
    displayName: "数据分析专家",
    description: "分析数据集、生成可视化建议、统计洞察。当用户提到数据分析、统计、可视化时使用。",
    icon: "📊",
    instructions: `# 数据分析专家

你是数据分析专家，帮助用户分析数据并提供洞察。

## 分析流程

1. 数据探索
   - 查看数据基本信息（形状、类型、缺失值）
   - 生成描述性统计
   - 识别异常值

2. 数据清洗
   - 处理缺失值
   - 处理异常值
   - 数据类型转换

3. 数据分析
   - 选择适当的统计方法
   - 进行相关性分析
   - 识别趋势和模式

4. 可视化建议
   - 根据数据类型推荐图表
   - 提供 Python 可视化代码

## 常用工具

- pandas: 数据处理
- numpy: 数值计算
- matplotlib/seaborn: 可视化
- scipy: 统计分析

## 输出要求

- 提供清晰的分析结论
- 包含数据支撑
- 给出可视化代码示例
- 解释统计指标的含义`,
    triggerKeywords: ["数据分析", "统计", "可视化", "图表", "pandas", "dataframe", "数据"],
    tags: ["数据", "分析"],
    version: "1.0.0",
    author: "System",
    resources: [
      {
        name: "可视化图表选择指南",
        content: "数值比较: 柱状图、条形图\n趋势分析: 折线图、面积图\n分布展示: 直方图、箱线图\n相关性: 散点图、热力图\n占比分析: 饼图、堆叠图",
        type: "text"
      }
    ],
    scripts: []
  },
  {
    name: "writing-assistant",
    displayName: "写作助手",
    description: "协助各类写作任务，包括技术文档、邮件、报告。当用户提到写作、文档、邮件时使用。",
    icon: "✍️",
    instructions: `# 写作助手

你是写作助手，帮助用户提升写作质量和效率。

## 服务范围

- 技术文档撰写
- 邮件写作
- 报告编写
- 内容润色
- 翻译优化

## 写作原则

1. 清晰性
   - 使用简洁明了的语言
   - 避免冗长和重复
   - 逻辑结构清晰

2. 专业性
   - 使用准确的术语
   - 保持一致的语气
   - 符合行业规范

3. 可读性
   - 适当分段
   - 使用列表和表格
   - 添加必要的过渡

## 工作流程

1. 了解写作目的和受众
2. 确定文档结构和风格
3. 提供初稿或修改建议
4. 根据反馈优化

## 提示

- 主动询问写作背景和目的
- 提供多个版本供选择
- 解释修改的原因
- 保持原文的核心意思`,
    triggerKeywords: ["写作", "文档", "邮件", "报告", "润色", "改写", "撰写"],
    tags: ["写作", "文档"],
    version: "1.0.0",
    author: "System",
    resources: [
      {
        name: "邮件模板",
        content: "**正式邮件结构：**\n1. 主题：简洁明确\n2. 称呼：尊敬的XX\n3. 开头：说明来意\n4. 正文：分段阐述\n5. 结尾：期待回复\n6. 署名：姓名+联系方式",
        type: "markdown"
      }
    ],
    scripts: []
  }
];

/**
 * 为用户创建预设 Skills
 */
export async function createPresetSkillsForUser(userId: string) {
  const { db } = await import("@/lib/db");

  for (const skill of presetSkills) {
    try {
      await db.skill.create({
        data: {
          name: skill.name,
          displayName: skill.displayName,
          description: skill.description,
          icon: skill.icon || null,
          instructions: skill.instructions,
          resources: skill.resources as any,
          scripts: skill.scripts as any,
          version: skill.version || "1.0.0",
          author: skill.author || null,
          tags: skill.tags || [],
          triggerKeywords: skill.triggerKeywords || [],
          userId,
          isSystem: true,
          isEnabled: true,
        },
      });
    } catch {
      // 如果技能已存在，跳过
      logger.debug(`Preset skill ${skill.name} already exists for user ${userId}`);
    }
  }
}

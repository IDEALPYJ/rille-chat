/**
 * 文本分块工具
 * 将文本智能分割成固定大小的块，支持重叠
 */

/**
 * 完整的 token 估算函数
 * 使用更准确的方法估算 token 数量
 * 参考 OpenAI 的 tiktoken 算法逻辑：
 * - 中文字符通常 1-2 字符 = 1 token
 * - 英文单词平均 4 字符 = 1 token
 * - 数字和标点符号的处理
 * - 特殊字符和空格的处理
 */
function estimateTokens(text: string): number {
  if (!text || text.length === 0) return 0;
  
  // 1. 统计各类字符
  const chineseChars = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const japaneseChars = (text.match(/[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g) || []).length;
  const koreanChars = (text.match(/[\uAC00-\uD7AF]/g) || []).length;
  
  // CJK 字符（中日韩）的处理：通常 1-2 字符 = 1 token
  const cjkChars = chineseChars + japaneseChars + koreanChars;
  
  // 2. 统计英文单词（更准确的单词计数）
  const words = text.match(/[a-zA-Z]+/g) || [];
  const wordCount = words.length;
  const wordChars = words.join('').length;
  
  // 3. 统计数字（用于后续处理）
  void (text.match(/\d+/g) || []).join('');
  
  // 4. 统计标点符号和特殊字符
  const punctuation = (text.match(/[^\w\s\u4e00-\u9fa5\u3040-\u309F\u30A0-\u30FF\uAC00-\uD7AF]/g) || []).length;
  
  // 5. 统计空格
  const spaces = (text.match(/\s+/g) || []).join('').length;
  
  // 6. 计算 token 数（使用更精确的估算）
  let tokenCount = 0;
  
  // CJK 字符：平均 1.3 字符/token（考虑字符组合）
  tokenCount += Math.ceil(cjkChars / 1.3);
  
  // 英文单词：每个单词约 1.33 token（考虑单词长度变化）
  // 对于较长的单词，可能需要多个 token
  const avgWordLength = wordCount > 0 ? wordChars / wordCount : 0;
  const wordTokens = wordCount * (avgWordLength > 6 ? 1.5 : 1.2);
  tokenCount += Math.ceil(wordTokens);
  
  // 数字：连续数字算作一个 token，但也考虑长度
  const numberSequences = (text.match(/\d+/g) || []).length;
  tokenCount += numberSequences;
  
  // 标点符号：通常几个标点算一个 token
  tokenCount += Math.ceil(punctuation / 3);
  
  // 空格处理：更精确的空格 token 计算
  // - 单词之间的单个空格通常不算额外 token（已包含在单词 token 中）
  // - 但多个连续空格、制表符、换行符等可能算作额外的 token
  // - 段落分隔（多个换行）应该算作 token
  const normalizedSpaces = text.replace(/[ \t]+/g, ' '); // 将连续的空白字符归一化为单个空格
  const extraSpaces = spaces - (normalizedSpaces.match(/ /g) || []).length;
  
  // 计算换行符和段落分隔符（重要：段落分隔符需要token）
  const lineBreaks = (text.match(/\n/g) || []).length;
  const paragraphBreaks = (text.match(/\n\s*\n/g) || []).length;
  
  // 连续空格和制表符：每3个算1个token
  if (extraSpaces > 0) {
    tokenCount += Math.ceil(extraSpaces / 3);
  }
  
  // 段落分隔符：每个段落分隔算1个token（比单个换行更重要）
  tokenCount += paragraphBreaks;
  
  // 单个换行符（非段落分隔）：每5个算1个token
  const standaloneLineBreaks = lineBreaks - paragraphBreaks * 2; // 段落分隔包含2个换行
  if (standaloneLineBreaks > 0) {
    tokenCount += Math.ceil(standaloneLineBreaks / 5);
  }
  
  // 7. 最低保证：如果文本很长但 token 估算很小，使用字符数的保守估算
  const maxTokens = Math.ceil(text.length / 1); // 最激进：1 字符/token（全中文）

  // 使用估算值，但确保在合理范围内
  return Math.max(1, Math.min(tokenCount, maxTokens));
}

/**
 * 智能分块配置
 */
export interface ChunkConfig {
  chunkSize: number;      // 每个块的目标token数
  overlap: number;         // 重叠的token数
  minChunkSize?: number;  // 最小块大小（token数），小于此值会合并到前一块
}

/**
 * 文本分块结果
 */
export interface TextChunk {
  content: string;
  tokenCount: number;
  startIndex: number;
  endIndex: number;
}

/**
 * 将文本分割成块
 */
export function chunkText(
  text: string,
  config: ChunkConfig = { chunkSize: 500, overlap: 50 }
): TextChunk[] {
  const { chunkSize, overlap, minChunkSize = chunkSize * 0.3 } = config;
  const chunks: TextChunk[] = [];
  
  if (!text || text.trim().length === 0) {
    return chunks;
  }
  
  // 按段落分割（保留段落结构）
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  
  let currentChunk = '';
  let currentTokenCount = 0;
  let startIndex = 0;
  let chunkStartIndex = 0;
  
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    if (!paragraph) continue;
    
    const paraTokens = estimateTokens(paragraph);
    
    // 如果单个段落就超过了块大小，需要进一步分割
    if (paraTokens > chunkSize) {
      // 先保存当前块（如果有）
      if (currentChunk.trim().length > 0) {
        chunks.push({
          content: currentChunk.trim(),
          tokenCount: currentTokenCount,
          startIndex: chunkStartIndex,
          endIndex: startIndex
        });
        currentChunk = '';
        currentTokenCount = 0;
      }
      
      // 分割大段落
      const subChunks = splitLargeParagraph(paragraph, chunkSize, overlap);
      for (let j = 0; j < subChunks.length; j++) {
        const subChunk = subChunks[j];
        chunks.push({
          content: subChunk.content,
          tokenCount: subChunk.tokenCount,
          startIndex: startIndex,
          endIndex: startIndex + subChunk.content.length
        });
        startIndex += subChunk.content.length;
        
        // 如果不是最后一块，添加重叠
        if (j < subChunks.length - 1) {
          startIndex -= overlap * 4; // 粗略估算重叠字符数
        }
      }
      continue;
    }
    
    // 如果添加这个段落会超过块大小，保存当前块
    if (currentTokenCount + paraTokens > chunkSize && currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount,
        startIndex: chunkStartIndex,
        endIndex: startIndex
      });
      
      // 开始新块，包含重叠部分
      const overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + '\n\n' + paragraph;
      currentTokenCount = estimateTokens(currentChunk);
      chunkStartIndex = startIndex - overlapText.length;
    } else {
      // 添加到当前块
      if (currentChunk.length > 0) {
        currentChunk += '\n\n' + paragraph;
      } else {
        currentChunk = paragraph;
        chunkStartIndex = startIndex;
      }
      currentTokenCount = estimateTokens(currentChunk);
    }
    
    startIndex += paragraph.length + 2; // +2 for \n\n
  }
  
  // 保存最后一个块
  if (currentChunk.trim().length > 0) {
    // 如果最后一个块太小，尝试合并到前一块
    if (currentTokenCount < minChunkSize && chunks.length > 0) {
      const lastChunk = chunks[chunks.length - 1];
      lastChunk.content += '\n\n' + currentChunk.trim();
      lastChunk.tokenCount += currentTokenCount;
      lastChunk.endIndex = startIndex;
    } else {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount,
        startIndex: chunkStartIndex,
        endIndex: startIndex
      });
    }
  }
  
  return chunks;
}

/**
 * 分割大段落
 */
function splitLargeParagraph(
  paragraph: string,
  chunkSize: number,
  overlap: number
): Array<{ content: string; tokenCount: number }> {
  const chunks: Array<{ content: string; tokenCount: number }> = [];
  const sentences = paragraph.split(/([。！？\n])/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  let currentTokenCount = 0;
  let overlapText = '';
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const sentenceTokens = estimateTokens(sentence);
    
    if (currentTokenCount + sentenceTokens > chunkSize && currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        tokenCount: currentTokenCount
      });
      
      // 计算重叠文本
      overlapText = getOverlapText(currentChunk, overlap);
      currentChunk = overlapText + sentence;
      currentTokenCount = estimateTokens(currentChunk);
    } else {
      currentChunk += sentence;
      currentTokenCount += sentenceTokens;
    }
  }
  
  if (currentChunk.trim().length > 0) {
    chunks.push({
      content: currentChunk.trim(),
      tokenCount: currentTokenCount
    });
  }
  
  return chunks;
}

/**
 * 获取重叠文本（从块末尾提取）
 */
function getOverlapText(text: string, overlapTokens: number): string {
  const targetChars = overlapTokens * 4; // 粗略估算
  if (text.length <= targetChars) {
    return text;
  }
  
  // 从末尾提取，尽量在句子边界处截断
  const overlapText = text.slice(-targetChars);
  const firstSentenceEnd = overlapText.search(/[。！？\n]/);
  
  if (firstSentenceEnd > 0) {
    return overlapText.slice(firstSentenceEnd + 1).trim();
  }
  
  return overlapText.trim();
}


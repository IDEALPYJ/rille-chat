import { Message } from "@/lib/types";
import { readFile } from "fs/promises";
import { logger } from "@/lib/logger";
import { getFilePathFromUrl } from "@/lib/file-utils";
import { extractTextFromFile } from "@/lib/embedding/text-extractor";

/**
 * 判断文件是否可以直接提取文本内容
 */
function isExtractableTextFile(fileName: string, mimeType: string): boolean {
  const lowerName = fileName.toLowerCase();
  
  // 纯文本文件
  if (mimeType.startsWith('text/')) return true;
  
  // 代码文件扩展名
  const codeExtensions = [
    '.txt', '.md', '.markdown', '.log', '.conf', '.config', '.ini', '.toml',
    '.js', '.jsx', '.ts', '.tsx', '.json', '.py', '.java', '.cpp', '.c', '.h',
    '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash',
    '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sql', '.r', '.m', '.pl',
    '.lua', '.vim', '.csv'
  ];
  
  // 文档文件扩展名（可以通过 extractTextFromFile 提取）
  const documentExtensions = [
    '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx'
  ];
  
  return codeExtensions.some(ext => lowerName.endsWith(ext)) ||
         documentExtensions.some(ext => lowerName.endsWith(ext));
}

export async function processMessageAttachments(messages: Message[]): Promise<Message[]> {
  return Promise.all(messages.map(async (m) => {
    // 如果没有附件，直接返回原消息
    if (!m.attachments || m.attachments.length === 0) {
      return m;
    }

    // 分离需要文本提取的附件和多模态附件
    const textAttachments = m.attachments.filter(a => 
      !a.type.startsWith('image/') && !a.type.startsWith('video/')
    );
    
    // 如果所有附件都是多模态（图像/视频），直接返回原消息
    // 这些会在 message-converter.ts 中处理
    if (textAttachments.length === 0) {
      return m;
    }

    // 处理需要文本提取的附件
    let content = m.content;
    const attachmentDetails = await Promise.all(textAttachments.map(async (a) => {
      let detail = `[File Attachment: ${a.name}]`;
      
      const isExtractable = isExtractableTextFile(a.name, a.type);

      if (isExtractable) {
        try {
          // 支持旧格式 /uploads/xxx 和新格式 /api/files/{id}
          const filePath = await getFilePathFromUrl(a.url, a.id);
          
          if (filePath) {
            // 对于简单的文本文件，直接读取
            const simpleTextExtensions = ['.txt', '.md', '.markdown', '.log', '.conf', '.config', '.ini', '.toml',
              '.js', '.jsx', '.ts', '.tsx', '.json', '.py', '.java', '.cpp', '.c', '.h',
              '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash',
              '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sql', '.r', '.m', '.pl',
              '.lua', '.vim', '.csv'];
            
            const isSimpleText = simpleTextExtensions.some(ext => a.name.toLowerCase().endsWith(ext)) ||
                                 a.type.startsWith('text/');
            
            let fileContent: string;
            
            if (isSimpleText) {
              // 简单文本文件直接读取
              fileContent = await readFile(filePath, 'utf-8');
            } else {
              // 复杂文档（PDF, DOCX, XLSX, PPTX）使用 extractTextFromFile
              const extractionResult = await extractTextFromFile(filePath, a.name, a.type);
              if (extractionResult.success) {
                fileContent = extractionResult.text;
              } else {
                logger.warn(`Failed to extract text from ${a.name}: ${extractionResult.error}`);
                return `[File Attachment: ${a.name}, URL: ${a.url}] (无法提取内容: ${extractionResult.error})`;
              }
            }
            
            const MAX_CONTENT_LENGTH = 10000;
            const isTruncated = fileContent.length > MAX_CONTENT_LENGTH;
            const truncatedContent = isTruncated
              ? fileContent.slice(0, MAX_CONTENT_LENGTH)
              : fileContent;
            
            const note = isTruncated ? `\n\n(Note: The content of "${a.name}" has been truncated to ${MAX_CONTENT_LENGTH} characters for brevity. Please ask if you need to see more.)` : '';
            detail = `[File: ${a.name}]\nContent:\n${truncatedContent}${note}`;
          } else {
            detail = `[File Attachment: ${a.name}, URL: ${a.url}]`;
          }
        } catch (err) {
          logger.error(`Failed to read file ${a.name}`, err);
          detail = `[File Attachment: ${a.name}, URL: ${a.url}]`;
        }
      } else {
        detail = `[File Attachment: ${a.name}, URL: ${a.url}]`;
      }
      return detail;
    }));
    
    content = `${attachmentDetails.join('\n\n')}\n\n${content}`;
    
    // 返回处理后的消息，保留所有附件（包括图像/视频）供后续多模态处理
    return {
      ...m,
      content: content,
    };
  }));
}

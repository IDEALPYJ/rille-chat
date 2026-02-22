/**
 * 文本提取工具
 * 支持多种文件格式的文本提取
 */

import { readFile } from "fs/promises";
import path from "path";

export interface TextExtractionResult {
  text: string;
  success: boolean;
  error?: string;
}

/**
 * 判断文件是否为文本文件（可用于embedding）
 */
export function isTextFileForEmbedding(fileName: string, mimeType: string): boolean {
  const ext = path.extname(fileName).toLowerCase();
  
  // 文本文件扩展名
  const textExtensions = [
    '.txt', '.md', '.markdown',
    '.js', '.jsx', '.ts', '.tsx', '.json',
    '.py', '.java', '.cpp', '.c', '.h', '.hpp',
    '.cs', '.go', '.rs', '.rb', '.php', '.swift',
    '.kt', '.scala', '.clj', '.sh', '.bash', '.zsh',
    '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.less',
    '.sql', '.r', '.m', '.pl', '.lua', '.vim', '.vimrc',
    '.log', '.conf', '.config', '.ini', '.toml',
  ];
  
  // 文档文件扩展名
  const documentExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.rtf', '.odt', '.ods', '.odp'
  ];
  
  // MIME类型检查
  const textMimeTypes = [
    'text/plain', 'text/markdown', 'text/html', 'text/css',
    'text/javascript', 'application/javascript', 'application/json',
    'application/xml', 'text/xml'
  ];
  
  const documentMimeTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf'
  ];
  
  return (
    textExtensions.includes(ext) ||
    documentExtensions.includes(ext) ||
    textMimeTypes.includes(mimeType) ||
    documentMimeTypes.includes(mimeType)
  );
}

/**
 * 提取文本文件内容
 */
export async function extractTextFromFile(
  filePath: string,
  fileName: string,
  mimeType: string
): Promise<TextExtractionResult> {
  const ext = path.extname(fileName).toLowerCase();
  
  try {
    // 纯文本文件直接读取
    if (['.txt', '.md', '.markdown', '.log', '.conf', '.config', '.ini'].includes(ext) ||
        mimeType.startsWith('text/')) {
      const buffer = await readFile(filePath);
      const text = buffer.toString('utf-8');
      return { text: cleanText(text), success: true };
    }
    
    // 代码文件
    if (['.js', '.jsx', '.ts', '.tsx', '.json', '.py', '.java', '.cpp', '.c', '.h',
         '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.scala', '.sh', '.bash',
         '.yaml', '.yml', '.xml', '.html', '.css', '.scss', '.sql', '.r', '.m', '.pl',
         '.lua', '.vim', '.log'].includes(ext)) {
      const buffer = await readFile(filePath);
      const text = buffer.toString('utf-8');
      return { text: cleanText(text), success: true };
    }
    
    // PDF文件
    if (ext === '.pdf' || mimeType === 'application/pdf') {
      try {
        // 动态导入pdf-parse（可选依赖）
        const pdfParse = await import('pdf-parse').catch(() => null);
        if (!pdfParse) {
          return { 
            text: '', 
            success: false, 
            error: 'PDF解析功能需要安装pdf-parse包: pnpm add pdf-parse' 
          };
        }
        const buffer = await readFile(filePath);
        // pdf-parse 的类型定义中 default 可能存在，使用类型断言处理
        const pdfParseModule = pdfParse as unknown as { default?: (buffer: Buffer) => Promise<{ text: string }> } & ((buffer: Buffer) => Promise<{ text: string }>);
        const pdfParseFn = pdfParseModule.default || pdfParseModule;
        if (typeof pdfParseFn !== 'function') {
          return { text: '', success: false, error: 'PDF parser function not available' };
        }
        const data = await pdfParseFn(buffer);
        return { text: cleanText(data.text), success: true };
      } catch (err: any) {
        return { 
          text: '', 
          success: false, 
          error: `PDF解析失败: ${err.message}` 
        };
      }
    }
    
    // DOCX文件
    if (ext === '.docx' || mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      try {
        // 动态导入mammoth（可选依赖）
        const mammoth = await import('mammoth').catch(() => null);
        if (!mammoth) {
          return { 
            text: '', 
            success: false, 
            error: 'DOCX解析功能需要安装mammoth包: pnpm add mammoth' 
          };
        }
        const buffer = await readFile(filePath);
        const result = await mammoth.extractRawText({ buffer });
        return { text: cleanText(result.value), success: true };
      } catch (err: any) {
        return { 
          text: '', 
          success: false, 
          error: `DOCX解析失败: ${err.message}` 
        };
      }
    }
    
    // DOC文件（旧格式，需要转换）
    if (ext === '.doc' || mimeType === 'application/msword') {
      return { 
        text: '', 
        success: false, 
        error: '不支持旧版DOC格式，请转换为DOCX格式' 
      };
    }
    
    // 其他格式暂不支持
    return { 
      text: '', 
      success: false, 
      error: `不支持的文件格式: ${ext}` 
    };
  } catch (err: any) {
    return { 
      text: '', 
      success: false, 
      error: `文件读取失败: ${err.message}` 
    };
  }
}

/**
 * 清洗文本内容
 */
function cleanText(text: string): string {
  // 移除多余的空白字符
  text = text.replace(/\r\n/g, '\n');
  text = text.replace(/\r/g, '\n');
  
  // 移除连续的空行（保留最多一个空行）
  text = text.replace(/\n{3,}/g, '\n\n');
  
  // 移除行首行尾空白
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  // 移除文件开头和结尾的空白
  text = text.trim();
  
  return text;
}


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
        // 动态导入pdfreader（纯JavaScript实现，不依赖PDF.js worker）
        const pdfreader = await import('pdfreader').catch(() => null);
        if (!pdfreader) {
          return { 
            text: '', 
            success: false, 
            error: 'PDF解析功能需要安装pdfreader包: pnpm add pdfreader' 
          };
        }
        
        const { PdfReader } = pdfreader;
        
        // 使用Promise包装回调式API
        const text = await new Promise<string>((resolve, reject) => {
          let extractedText = '';
          new PdfReader().parseFileItems(filePath, (err, item) => {
            if (err) {
              reject(err);
              return;
            }
            if (!item) {
              // 解析完成
              resolve(extractedText);
              return;
            }
            if (item.text) {
              extractedText += item.text + '\n';
            }
          });
        });
        
        if (!text.trim()) {
          return { 
            text: '', 
            success: false, 
            error: 'PDF文件为空或无法提取文本内容' 
          };
        }
        
        return { text: cleanText(text), success: true };
      } catch (err: any) {
        return { 
          text: '', 
          success: false, 
          error: `PDF解析失败: ${err.message}` 
        };
      }
    }
    
    // DOCX/DOC 文件 (Word)
    if (ext === '.docx' || ext === '.doc' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimeType === 'application/msword') {
      try {
        // 动态导入word-extractor（支持DOC和DOCX）
        const WordExtractor = await import('word-extractor').catch(() => null);
        if (!WordExtractor) {
          return { 
            text: '', 
            success: false, 
            error: 'Word解析功能需要安装word-extractor包: pnpm add word-extractor' 
          };
        }
        
        const extractor = new WordExtractor.default();
        const doc = await extractor.extract(filePath);
        const text = doc.getBody();
        
        if (!text.trim()) {
          return { 
            text: '', 
            success: false, 
            error: 'Word文件为空或无法提取文本内容' 
          };
        }
        
        return { text: cleanText(text), success: true };
      } catch (err: any) {
        return { 
          text: '', 
          success: false, 
          error: `Word文档解析失败: ${err.message}` 
        };
      }
    }
    
    // XLSX/XLS 文件 (Excel)
    if (ext === '.xlsx' || ext === '.xls' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
        mimeType === 'application/vnd.ms-excel') {
      try {
        // 动态导入xlsx（可选依赖）
        const xlsx = await import('xlsx').catch(() => null);
        if (!xlsx) {
          return { 
            text: '', 
            success: false, 
            error: 'Excel解析功能需要安装xlsx包: pnpm add xlsx' 
          };
        }
        const buffer = await readFile(filePath);
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        
        let text = '';
        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          // 将工作表转换为CSV格式
          const csv = xlsx.utils.sheet_to_csv(sheet);
          if (csv.trim()) {
            text += `[工作表: ${sheetName}]\n${csv}\n\n`;
          }
        });
        
        if (!text.trim()) {
          return { 
            text: '', 
            success: false, 
            error: 'Excel文件为空或无法读取内容' 
          };
        }
        
        return { text: cleanText(text), success: true };
      } catch (err: any) {
        return { 
          text: '', 
          success: false, 
          error: `Excel解析失败: ${err.message}` 
        };
      }
    }
    
    // PPTX 文件 (PowerPoint)
    if (ext === '.pptx' || 
        mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
      try {
        // 使用JSZip解析PPTX（PPTX实际上是ZIP文件）
        const JSZip = await import('jszip').catch(() => null);
        if (!JSZip) {
          return { 
            text: '', 
            success: false, 
            error: 'PPTX解析功能需要安装jszip包: pnpm add jszip' 
          };
        }
        
        const buffer = await readFile(filePath);
        const zip = await JSZip.default.loadAsync(buffer);
        
        let text = '';
        const slideRegex = /^ppt\/slides\/slide(\d+)\.xml$/;
        const slides: { num: number; content: string }[] = [];
        
        // 遍历所有文件，找到幻灯片
        for (const [filename, file] of Object.entries(zip.files)) {
          const match = filename.match(slideRegex);
          if (match && !file.dir) {
            const slideNum = parseInt(match[1], 10);
            const xmlContent = await file.async('text');
            
            // 从XML中提取文本内容
            // 匹配 <a:t>标签中的文本
            const textMatches = xmlContent.match(/<a:t>([^<]*)<\/a:t>/g);
            let slideText = '';
            if (textMatches) {
              slideText = textMatches
                .map((tag: string) => tag.replace(/<\/?a:t>/g, ''))
                .filter((t: string) => t.trim())
                .join('\n');
            }
            
            if (slideText.trim()) {
              slides.push({ num: slideNum, content: slideText });
            }
          }
        }
        
        // 按幻灯片编号排序
        slides.sort((a, b) => a.num - b.num);
        
        // 组合所有幻灯片内容
        slides.forEach((slide) => {
          text += `[幻灯片 ${slide.num}]\n${slide.content}\n\n`;
        });
        
        if (!text.trim()) {
          return { 
            text: '', 
            success: false, 
            error: 'PPTX文件为空或无法读取内容' 
          };
        }
        
        return { text: cleanText(text), success: true };
      } catch (err: any) {
        return { 
          text: '', 
          success: false, 
          error: `PPTX解析失败: ${err.message}` 
        };
      }
    }
    
    // PPT文件（旧格式，需要转换）
    if (ext === '.ppt' || mimeType === 'application/vnd.ms-powerpoint') {
      return { 
        text: '', 
        success: false, 
        error: '不支持旧版PPT格式，请转换为PPTX格式' 
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


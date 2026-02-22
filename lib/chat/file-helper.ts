import { Message } from "@/lib/types";
import { readFile } from "fs/promises";
import { logger } from "@/lib/logger";
import { getFilePathFromUrl } from "@/lib/file-utils";

export async function processMessageAttachments(messages: Message[]) {
  return Promise.all(messages.map(async (m) => {
    let content = m.content;
    if (m.attachments && m.attachments.length > 0) {
      const attachmentDetails = await Promise.all(m.attachments.map(async (a) => {
        let detail = `[File Attachment: ${a.name}]`;
        
        const isTextFile = a.type.startsWith('text/') ||
                          a.name.endsWith('.js') ||
                          a.name.endsWith('.ts') ||
                          a.name.endsWith('.tsx') ||
                          a.name.endsWith('.jsx') ||
                          a.name.endsWith('.py') ||
                          a.name.endsWith('.md') ||
                          a.name.endsWith('.json') ||
                          a.name.endsWith('.csv');

        if (isTextFile) {
          try {
            // 支持旧格式 /uploads/xxx 和新格式 /api/files/{id}
            const filePath = await getFilePathFromUrl(a.url, a.id);
            
            if (filePath) {
              const fileContent = await readFile(filePath, 'utf-8');
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
    }
    return {
      role: m.role,
      content: content,
    };
  }));
}

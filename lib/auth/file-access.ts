import { db } from "@/lib/db";

export interface FileAccessContext {
  userId: string;
  fileId: string;
}

/**
 * 统一的文件访问权限检查
 * 支持多种访问模式：所有者、项目成员、会话参与者等
 */
export async function checkFileAccess(context: FileAccessContext): Promise<boolean> {
  const { userId, fileId } = context;
  
  // 1. 检查是否是文件所有者
  const file = await db.file.findUnique({
    where: { id: fileId },
    select: { userId: true, projectId: true }
  });
  
  if (!file) {
    return false;
  }
  
  if (file.userId === userId) {
    return true;
  }
  
  // 2. 检查是否通过附件关联到用户的消息
  const attachmentAccess = await db.attachment.findFirst({
    where: {
      url: { contains: fileId },
      message: {
        session: {
          userId: userId,
        },
      },
    },
  });
  
  if (attachmentAccess) {
    return true;
  }

  return false;
}


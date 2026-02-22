import { PrismaClient } from "@prisma/client"
import { checkDatabaseSchema } from "./db/schema-checker"
import { env } from "./env"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma || new PrismaClient()

if (env.NODE_ENV !== "production") globalForPrisma.prisma = db

// 懒加载 schema 检查（仅在首次数据库操作时执行一次）
let schemaCheckPromise: Promise<boolean> | null = null;
export async function ensureSchemaChecked(): Promise<void> {
  if (!schemaCheckPromise) {
      schemaCheckPromise = checkDatabaseSchema().then(result => {
        if (!result && env.NODE_ENV === "production") {
          // 在生产环境中，可以选择抛出错误
          // 但为了不阻塞启动，这里只记录错误
        }
        return result;
      });
  }
  await schemaCheckPromise;
}
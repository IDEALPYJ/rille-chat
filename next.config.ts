import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output a standalone build for Docker optimization (only in production)
  // This automatically traces dependencies and creates a smaller node_modules
  ...(process.env.NODE_ENV === 'production' && { output: 'standalone' }),
  // 将 Prisma Client 标记为外部包，避免在 standalone 构建中被错误打包
  serverExternalPackages: ['@prisma/client', 'prisma'],
};

export default nextConfig;

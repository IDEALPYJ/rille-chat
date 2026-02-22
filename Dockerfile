# Stage 1: Base
FROM node:20-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV COREPACK_NPM_REGISTRY=https://registry.npmmirror.com

# 安装 OpenSSL (Prisma 必需)
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.26.2 --activate

# Stage 2: Builder
FROM base AS builder
WORKDIR /app

# 1. 强制扁平化依赖 (HOISTED)
ENV PNPM_CONFIG_NODE_LINKER=hoisted

# 2. 安装依赖
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# 3. 复制代码
COPY . .

# 4. 生成 Prisma Client（使用默认输出路径）
RUN npx prisma generate

# 5. 查找并复制 Prisma Client 文件到已知位置
RUN mkdir -p /app/prisma-output && \
    PRISMA_CLIENT_PATH=$(find node_modules -path "*/@prisma/client/index.js" -print -quit | xargs dirname) && \
    if [ -n "$PRISMA_CLIENT_PATH" ]; then \
      echo "Found Prisma Client at: $PRISMA_CLIENT_PATH" && \
      cp -r "$PRISMA_CLIENT_PATH" /app/prisma-output/client; \
    else \
      echo "Warning: Prisma Client not found"; \
    fi && \
    PRISMA_DOT_PRISMA=$(find node_modules -type d -name ".prisma" -print -quit) && \
    if [ -n "$PRISMA_DOT_PRISMA" ]; then \
      echo "Found .prisma at: $PRISMA_DOT_PRISMA" && \
      cp -r "$PRISMA_DOT_PRISMA" /app/prisma-output/dot-prisma; \
    fi

# 6. 构建 Next.js（使用 webpack 而不是 Turbopack，避免 Prisma Client 哈希模块问题）
ENV NODE_ENV=production
# 设置构建时必需的环境变量（用于静态生成）
ENV AUTH_SECRET=build-time-placeholder
ENV DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV ENCRYPTION_KEY=build-time-placeholder-at-least-32-chars-long
RUN pnpm next build --webpack

# Stage 3: Runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建用户（但不切换到该用户）
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 nextjs

# 1. 复制 Next.js Standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# 2. 复制 Prisma Client 和引擎文件
RUN mkdir -p node_modules/@prisma node_modules/.prisma
COPY --from=builder /app/prisma-output/client ./node_modules/@prisma/client
COPY --from=builder /app/prisma-output/dot-prisma ./node_modules/.prisma

# 3. 复制原始 Prisma Schema (Migration 需要)
COPY --from=builder /app/prisma ./prisma

# 4. 复制并设置入口脚本
COPY --from=builder /app/docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# 5. 安装 Prisma CLI 到应用目录（用于数据库迁移）
RUN mkdir -p node_modules && \
    pnpm add prisma@5.10.2 --save-dev --registry=https://registry.npmmirror.com --no-lockfile && \
    mkdir -p node_modules/.bin && \
    if [ -f node_modules/prisma/build/index.js ]; then \
      ln -sf ../prisma/build/index.js node_modules/.bin/prisma; \
    fi && \
    chmod +x node_modules/.bin/prisma 2>/dev/null || true

# 6. 设置环境变量
ENV PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1
ENV PATH="/app/node_modules/.bin:$PATH"

# 7. 创建 uploads 目录并设置权限（会被卷挂载覆盖，但保留作为备用）
RUN mkdir -p /app/uploads && \
    chown -R nextjs:nodejs /app/uploads /app

# 8. 设置卷
VOLUME ["/app/uploads"]

# 9. 暴露端口
EXPOSE 3000

# 使用入口脚本启动（脚本内部会处理权限然后切换到 nextjs 用户）
ENTRYPOINT ["/app/docker-entrypoint.sh"]

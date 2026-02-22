#!/bin/sh
set -e

# ============================================
# 注意：此脚本以 root 身份运行以修复权限
# 应用启动时会切换到 nextjs 用户
# ============================================

# Check and fix uploads directory permissions
# Docker 卷挂载会覆盖容器内的目录权限，需要在启动时修复
if [ -d "/app/uploads" ]; then
  echo "Checking /app/uploads permissions..."
  
  # 显示当前权限信息
  DIR_UID=$(stat -c '%u' /app/uploads 2>/dev/null || echo "unknown")
  DIR_GID=$(stat -c '%g' /app/uploads 2>/dev/null || echo "unknown")
  echo "/app/uploads ownership: UID=$DIR_UID, GID=$DIR_GID"
  
  # 修复 uploads 目录权限为 nextjs 用户 (UID=1001)
  echo "Fixing permissions for nextjs user..."
  chown -R 1001:1001 /app/uploads 2>/dev/null || {
    echo "Warning: Failed to change ownership of /app/uploads"
  }
  
  # 确保目录有写权限
  chmod -R u+w /app/uploads 2>/dev/null || {
    echo "Warning: Cannot set write permissions on /app/uploads"
  }
  
  # 验证权限
  if [ -w "/app/uploads" ]; then
    echo "✓ /app/uploads is writable"
  else
    echo "✗ /app/uploads is NOT writable - attempting to fix..."
    chmod 777 /app/uploads 2>/dev/null || true
  fi
else
  echo "Creating /app/uploads directory..."
  mkdir -p /app/uploads
  chown -R 1001:1001 /app/uploads
  chmod -R u+w /app/uploads
fi

# 同时修复 uploads 内所有文件的权限
if [ -d "/app/uploads" ]; then
  find /app/uploads -type f -exec chmod 644 {} \; 2>/dev/null || true
  find /app/uploads -type d -exec chmod 755 {} \; 2>/dev/null || true
fi

# Run database migrations (can be skipped with SKIP_MIGRATIONS=true)
if [ "$SKIP_MIGRATIONS" != "true" ]; then
  echo ""
  echo "Running database migrations..."
  echo ""
  echo "注意: 如果遇到 'type \"vector\" does not exist' 错误，"
  echo "      请确保您的数据库已安装 pgvector 扩展。"
  echo "      如果使用 Docker Compose，请使用 pgvector/pgvector:pg16 镜像。"
  echo ""
  
  # Retry logic for migration locks (useful in multi-instance deployments)
  MAX_RETRIES=5
  RETRY_DELAY=2
  RETRY_COUNT=0
  MIGRATION_FAILED=false
  
  while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    # 使用本地安装的 prisma
    if [ -f "/app/node_modules/.bin/prisma" ]; then
      MIGRATION_OUTPUT=$(/app/node_modules/.bin/prisma migrate deploy 2>&1)
    elif [ -f "/app/node_modules/prisma/build/index.js" ]; then
      MIGRATION_OUTPUT=$(node /app/node_modules/prisma/build/index.js migrate deploy 2>&1)
    else
      echo "错误: 找不到 Prisma CLI"
      MIGRATION_OUTPUT="Prisma CLI not found"
      MIGRATION_EXIT_CODE=1
      break
    fi
    MIGRATION_EXIT_CODE=$?
    
    if [ $MIGRATION_EXIT_CODE -eq 0 ]; then
      echo "$MIGRATION_OUTPUT"
      echo "Migrations completed successfully"
      break
    else
      # Check if the error is related to pgvector extension
      if echo "$MIGRATION_OUTPUT" | grep -qi "type.*vector.*does not exist\|pgvector\|vector extension"; then
        echo ""
        echo "❌ 错误: pgvector 扩展未安装或不可用"
        echo ""
        echo "解决方案:"
        echo "1. 如果使用 Docker Compose，请确保 docker-compose.yml 中的数据库镜像为:"
        echo "   image: pgvector/pgvector:pg16"
        echo ""
        echo "2. 如果使用本地 PostgreSQL，请安装 pgvector 扩展:"
        echo "   参考: https://github.com/pgvector/pgvector"
        echo ""
        MIGRATION_FAILED=true
      fi
      
      RETRY_COUNT=$((RETRY_COUNT + 1))
      if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
        echo "Migration failed, retrying in ${RETRY_DELAY}s (attempt ${RETRY_COUNT}/${MAX_RETRIES})..."
        sleep $RETRY_DELAY
      else
        if [ "$MIGRATION_FAILED" = "true" ]; then
          echo ""
          echo "❌ 迁移失败: pgvector 扩展相关问题"
          echo ""
        else
          echo "Migration failed after ${MAX_RETRIES} attempts. Continuing anyway..."
        fi
      fi
    fi
  done
else
  echo "Skipping database migrations (SKIP_MIGRATIONS=true)"
fi

# 确保所有文件权限正确（在切换用户前）
echo "Setting final permissions..."
chown -R 1001:1001 /app/uploads 2>/dev/null || true

# Start the application as nextjs user
echo ""
echo "Starting application as nextjs user..."
echo ""

# 切换到 nextjs 用户运行应用
exec su -s /bin/sh -c 'exec node server.js' nextjs

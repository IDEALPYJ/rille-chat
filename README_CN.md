<p align="center">
  <img src="./public/imgs/logo-black.png" width="120" alt="Rille Chat Logo">
</p>
<h1 align="center">Rille Chat</h1>

<p align="center">
  <strong>现代化的 AI 聊天应用，支持多模型、树状对话和项目管理</strong>
</p>

<p align="center">
  <a href="./README_EN.md">English</a> | <strong>中文</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Prisma-5.0-2D3748?style=flat-square&logo=prisma" alt="Prisma">
  <img src="https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Docker-Compose-2496ED?style=flat-square&logo=docker" alt="Docker">
</p>

<p align="center">
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#部署指南">部署指南</a> •
  <a href="#使用指南">使用指南</a>
</p>

---

## 功能特性

### 🤖 多模型支持
- 集成 OpenAI、Anthropic Claude、Google Gemini、Azure OpenAI 等主流 AI 提供商
- 支持本地模型部署（Ollama）
- 统一的消息协议，无缝切换不同模型

### 🌳 树状对话
- 支持对话分支，轻松探索不同思路
- 消息树导航，随时回到任意节点
- 可视化的对话历史管理

### 📁 项目管理
- 按项目组织对话和文件
- 支持项目级别的设置和配置
- 文件上传与 RAG（检索增强生成）就绪的文档处理

### 🔍 实时搜索
- 集成多个搜索引擎进行网络搜索
- 搜索结果自动整合到对话中
- 支持 Perplexity 等搜索增强模型

### 🎨 现代化界面
- 响应式设计，完美适配桌面和移动端
- 深色/浅色主题切换
- 流畅的动画和交互体验

### 🔐 安全可靠
- 基于 NextAuth.js 的用户认证系统
- 用户数据加密存储
- 支持 Docker 一键部署

---

## 快速开始

### Docker Compose 部署（推荐）

使用预构建的 Docker 镜像，无需本地编译，快速部署。

```bash
# 1. 创建 docker-compose.yml 文件
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: idealpyj/rille-chat:latest
    container_name: rille-chat
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - AUTH_SECRET=${AUTH_SECRET}
      - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD:-rille_chat_password}@db:5432/rille_chat
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - NODE_ENV=production
      - ALLOWED_ORIGINS=${ALLOWED_ORIGINS:-http://localhost:3000}
    volumes:
      - uploads_data:/app/uploads
    depends_on:
      db:
        condition: service_healthy

  db:
    image: pgvector/pgvector:pg16
    container_name: rille-chat-db
    restart: unless-stopped
    ports:
      - "5433:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-rille_chat_password}
      - POSTGRES_DB=rille_chat
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  uploads_data:
EOF

# 2. 配置环境变量
cat > .env << 'EOF'
AUTH_SECRET=your-auth-secret-here
ENCRYPTION_KEY=your-encryption-key-32-chars
POSTGRES_PASSWORD=your-secure-password
EOF

# 3. 启动服务
docker-compose up -d

# 4. 访问应用
# 打开 http://localhost:3000
```

> 💡 **提示**: 镜像由 GitHub Actions 自动构建并推送至 Docker Hub，无需本地编译。

---

## 部署指南

### 环境变量配置

复制以下内容到 `.env` 文件并修改：

```env
# 必需配置
AUTH_SECRET=your-auth-secret-here              # 认证密钥
ENCRYPTION_KEY=your-encryption-key-32-chars    # 加密密钥（≥32字符）
POSTGRES_PASSWORD=your-secure-password         # 数据库密码

# 可选配置
ALLOWED_ORIGINS=https://yourdomain.com         # 允许的域名
NEXT_PUBLIC_APP_URL=https://yourdomain.com     # 应用公开 URL
```

### 常用命令

```bash
# 查看日志
docker-compose logs -f app

# 更新到最新版本
docker-compose pull
docker-compose up -d

# 停止服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

### 生产环境部署

使用生产环境配置：

```bash
# 下载生产环境配置文件
wget https://raw.githubusercontent.com/IDEALPYJ/rille-chat/main/docker-compose.prod.yml

# 启动服务
docker-compose -f docker-compose.prod.yml up -d
```

### 反向代理配置

#### Nginx

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### Caddy

```caddy
yourdomain.com {
    reverse_proxy localhost:3000
}
```

---

## 使用指南

### 首次使用

1. **注册账号**
   - 访问应用首页
   - 点击注册，创建管理员账号

2. **配置 AI Provider**
   - 进入设置页面
   - 添加你的 API Key（OpenAI、Claude 等）
   - 支持配置多个 Provider

3. **创建项目**
   - 点击左侧项目列表的"新建项目"
   - 输入项目名称和描述
   - 选择项目使用的 AI 模型

4. **开始对话**
   - 在项目中点击"新建对话"
   - 输入消息开始与 AI 交流
   - 支持文件上传和联网搜索

### 核心功能

#### 树状对话
- 在任意消息处点击"分支"创建新对话分支
- 使用消息树导航查看不同分支
- 支持合并分支或删除分支

#### 文件上传
- 支持 PDF、Word、TXT 等文档格式
- 自动进行文档切片和向量化
- 支持基于文档内容的问答

#### 语音功能
- 支持语音输入（浏览器语音识别）
- 支持文本转语音（TTS）
- 支持语音消息播放

---

## 技术栈

- **框架**: [Next.js](https://nextjs.org/) 16 + [React](https://react.dev/) 19
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式**: [Tailwind CSS](https://tailwindcss.com/)
- **UI 组件**: [Radix UI](https://www.radix-ui.com/)
- **数据库**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/)
- **认证**: [NextAuth.js](https://next-auth.js.org/)
- **部署**: [Docker](https://www.docker.com/) + Docker Compose

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=IDEALPYJ/rille-chat&type=Date)](https://star-history.com/#IDEALPYJ/rille-chat&Date)

---

## 许可证

[CC BY-NC 4.0](./LICENSE) - 知识共享署名-非商业性使用 4.0 国际许可协议

本项目采用 **署名-非商业性使用 4.0 国际 (CC BY-NC 4.0)** 许可证。

---

<p align="center">
  如果这个项目对你有帮助，请给我们一个 ⭐️ Star！
</p>

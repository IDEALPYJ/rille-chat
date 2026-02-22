<p align="center">
  <img src="./public/imgs/logo-black.png" width="120" alt="Rille Chat Logo">
</p>

<h1 align="center">Rille Chat</h1>

<p align="center">
  <strong>Modern AI Chat Application with Multi-Model Support, Tree-Structured Conversations & Project Management</strong>
</p>

<p align="center">
  <strong>English</strong> | <a href="./README.md">中文</a>
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
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#deployment">Deployment</a> •
  <a href="#usage">Usage</a>
</p>

---

## Features

### 🤖 Multi-Model Support
- Integrates OpenAI, Anthropic Claude, Google Gemini, Azure OpenAI and other major AI providers
- Supports local model deployment (Ollama)
- Unified messaging protocol for seamless model switching

### 🌳 Tree-Structured Conversations
- Supports conversation branching for exploring different ideas
- Message tree navigation allows returning to any point
- Visual conversation history management

### 📁 Project Management
- Organize conversations and files by projects
- Project-level settings and configuration
- File upload with RAG-ready document processing

### 🔍 Real-time Search
- Integrates multiple search engines
- Search results automatically integrated into conversations
- Supports Perplexity and other search-enhanced models

### 🎨 Modern Interface
- Responsive design for desktop and mobile
- Dark/light theme switching
- Smooth animations and interactions

### 🔐 Security & Reliability
- NextAuth.js-based authentication
- Encrypted user data storage
- One-click Docker deployment

---

## Quick Start

### Docker Compose Deployment (Recommended)

Use pre-built Docker images for quick deployment without local compilation.

```bash
# 1. Create docker-compose.yml file
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

# 2. Configure environment variables
cat > .env << 'EOF'
AUTH_SECRET=your-auth-secret-here
ENCRYPTION_KEY=your-encryption-key-32-chars
POSTGRES_PASSWORD=your-secure-password
EOF

# 3. Start services
docker-compose up -d

# 4. Access the application
# Open http://localhost:3000
```

> 💡 **Tip**: Images are automatically built by GitHub Actions and pushed to Docker Hub. No local compilation needed.

---

## Deployment

### Environment Variables

Copy the following to `.env` file and modify:

```env
# Required
AUTH_SECRET=your-auth-secret-here              # Authentication secret
ENCRYPTION_KEY=your-encryption-key-32-chars    # Encryption key (≥32 chars)
POSTGRES_PASSWORD=your-secure-password         # Database password

# Optional
ALLOWED_ORIGINS=https://yourdomain.com         # Allowed origins
NEXT_PUBLIC_APP_URL=https://yourdomain.com     # Public app URL
```

### Common Commands

```bash
# View logs
docker-compose logs -f app

# Update to latest version
docker-compose pull
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (use with caution)
docker-compose down -v
```

### Production Deployment

Use production configuration:

```bash
# Download production config
wget https://raw.githubusercontent.com/IDEALPYJ/rille-chat/main/docker-compose.prod.yml

# Start services
docker-compose -f docker-compose.prod.yml up -d
```

### Reverse Proxy Configuration

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

## Usage

### First Time Setup

1. **Register Account**
   - Visit the application homepage
   - Click register to create an admin account

2. **Configure AI Provider**
   - Go to settings page
   - Add your API Key (OpenAI, Claude, etc.)
   - Support for multiple providers

3. **Create Project**
   - Click "New Project" in the left sidebar
   - Enter project name and description
   - Select AI model for the project

4. **Start Chatting**
   - Click "New Chat" in the project
   - Type messages to chat with AI
   - Supports file upload and web search

### Core Features

#### Tree Conversations
- Click "Branch" on any message to create a new branch
- Use message tree navigation to view branches
- Support merging or deleting branches

#### File Upload
- Supports PDF, Word, TXT and other formats
- Automatic document chunking and vectorization
- Support Q&A based on document content

#### Voice Features
- Supports voice input (browser speech recognition)
- Supports text-to-speech (TTS)
- Supports voice message playback

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) 16 + [React](https://react.dev/) 19
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/)
- **Database**: [PostgreSQL](https://www.postgresql.org/) + [Prisma](https://www.prisma.io/)
- **Auth**: [NextAuth.js](https://next-auth.js.org/)
- **Deployment**: [Docker](https://www.docker.com/) + Docker Compose

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=IDEALPYJ/rille-chat&type=Date)](https://star-history.com/#IDEALPYJ/rille-chat&Date)

---

## License

[CC BY-NC 4.0](./LICENSE) - Creative Commons Attribution-NonCommercial 4.0 International License

This project is licensed under **Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)**.

You are free to:
- ✅ Share — copy and redistribute the material
- ✅ Adapt — remix, transform, and build upon the material

Under the following terms:
- 📌 Attribution — You must give appropriate credit
- 🚫 **NonCommercial** — You may not use the material for commercial purposes

---

<p align="center">
  If this project helps you, please give us a ⭐️ Star!
</p>
import NextAuth from "next-auth"
import { env } from "@/lib/env"
import { authConfig } from "./auth.config"
import Credentials from "next-auth/providers/credentials"
import { z } from "zod"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { logger } from "@/lib/logger"

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: env.AUTH_SECRET,
  // trustHost 配置：
  // - 如果设置了 AUTH_URL，使用该 URL，trustHost 设为 false（更安全）
  // - 如果未设置 AUTH_URL，trustHost 设为 true（开发环境或需要自动检测）
  // 在生产环境中，建议显式设置 AUTH_URL 以提高安全性
  trustHost: !env.AUTH_URL,
  ...(env.AUTH_URL && { url: env.AUTH_URL }),
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.image = user.image
      }
      if (trigger === "update" && session) {
        if (session.user?.image) token.image = session.user.image
        if (session.user?.username) token.username = session.user.username
      }
      return token
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.image = token.image as string
      }
      return session
    },
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        try {
          // 验证输入格式
          const parsedCredentials = z
            .object({ 
              username: z.string().min(1, "用户名不能为空"),
              password: z.string().min(1, "密码不能为空")
            })
            .safeParse(credentials);

          if (!parsedCredentials.success) {
            const errors = parsedCredentials.error.issues.map(e => {
              if (e.path[0] === 'username') {
                return '用户名不能为空';
              }
              if (e.path[0] === 'password') {
                return '密码不能为空';
              }
              return e.message;
            });
            logger.warn("Login validation failed", { errors });
            // 抛出错误，NextAuth 会捕获并返回给客户端
            throw new Error(`输入验证失败：${errors.join('；')}`);
          }

          const { username, password } = parsedCredentials.data;
          const trimmedUsername = username.trim();
          
          // 验证用户名不为空
          if (!trimmedUsername) {
            logger.warn("Login attempt with empty username");
            throw new Error("用户名不能为空");
          }

          // 验证密码不为空
          if (!password) {
            logger.warn("Login attempt with empty password", { username: trimmedUsername });
            throw new Error("密码不能为空");
          }
          
          let user;
          try {
            user = await db.user.findUnique({ where: { username: trimmedUsername } });
          } catch (error: unknown) {
            logger.error("Database query failed during login", error, { username: trimmedUsername });
            throw new Error("登录失败，数据库查询错误，请稍后重试");
          }
          
          // 防止时序攻击：无论用户是否存在，都执行 bcrypt.compare
          // 使用固定的 bcrypt 哈希值（无效密码）进行比较，避免通过响应时间推断用户存在性
          // bcrypt 哈希格式：$2a$10$22个字符的盐值+31个字符的哈希值 = 60字符
          const dummyHash = "$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV";
          const hashToCompare = user?.password || dummyHash;
          
          // 始终执行 bcrypt.compare，即使用户不存在
          // bcrypt.compare 的执行时间取决于密码哈希的计算，不取决于用户是否存在
          // 这样可以防止攻击者通过响应时间推断用户名是否存在
          let passwordsMatch: boolean;
          try {
            passwordsMatch = await bcrypt.compare(password, hashToCompare);
          } catch (error: unknown) {
            logger.error("Password comparison failed", error, { username: trimmedUsername });
            throw new Error("登录失败，密码验证错误，请稍后重试");
          }
          
          // 只有在用户存在且密码匹配时才返回用户
          if (user && passwordsMatch) {
            logger.info("User logged in successfully", { userId: user.id, username: trimmedUsername });
            return user;
          }
          
          // 用户不存在或密码错误 - 区分两种情况以提供更明确的错误提示
          if (!user) {
            logger.warn("Login attempt with non-existent username", { username: trimmedUsername });
            throw new Error("用户名不存在，请检查用户名或前往注册");
          } else {
            logger.warn("Login attempt with incorrect password", { username: trimmedUsername });
            throw new Error("密码错误，请检查后重试");
          }
        } catch (error: unknown) {
          // 如果是我们抛出的错误，直接抛出（NextAuth 会处理）
          if (error instanceof Error) {
            throw error;
          }
          // 其他未知错误
          logger.error("Unexpected error during login", error);
          throw new Error("登录失败，发生未知错误，请稍后重试");
        }
      },
    }),
  ],
});
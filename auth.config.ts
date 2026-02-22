import type { NextAuthConfig } from "next-auth"

export const authConfig = {
  pages: {
    signIn: '/login', // 指定登录页路径
    error: '/login', // 错误页面也指向登录页，这样可以在登录页显示错误信息
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnDashboard = nextUrl.pathname.startsWith('/chat');
      const isRoot = nextUrl.pathname === '/';

      if (isOnDashboard) {
        if (isLoggedIn) return true;
        return false; // 如果没登录且访问 /chat，强制跳转登录页
      } else if (isRoot) {
        if (isLoggedIn) {
          return Response.redirect(new URL('/chat', nextUrl));
        }
        return Response.redirect(new URL('/login', nextUrl));
      } else if (isLoggedIn && nextUrl.pathname === '/login') {
        // 如果已登录且访问登录页，跳转到 /chat
        return Response.redirect(new URL('/chat', nextUrl));
      }
      return true;
    },
  },
  providers: [], // 必须留空数组，以满足类型定义
} satisfies NextAuthConfig;
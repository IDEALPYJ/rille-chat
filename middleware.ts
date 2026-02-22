import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import { handleCORS } from "@/lib/cors-handler";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  
  // 处理 API 路由的 CORS
  if (nextUrl.pathname.startsWith('/api')) {
    const response = req.method === 'OPTIONS'
      ? new NextResponse(null, { status: 204 })
      : NextResponse.next();

    // 使用独立的 CORS 处理函数
    const res = handleCORS(req, response);

    if (req.method === 'OPTIONS') {
      return res;
    }
    
    return res;
  }

  return;
});

export const config = {
  // 包含 api 路由以处理 CORS
  matcher: ['/((?!_next/static|_next/image|.*\\.png$).*)'],
};

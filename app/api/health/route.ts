import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * 健康检查端点
 * 用于 Docker/Kubernetes 健康检查和监控系统
 */
export async function GET() {
  const startTime = Date.now();
  
  try {
    // 检查数据库连接
    await db.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      uptime: process.uptime(),
      database: "connected",
      responseTime: `${responseTime}ms`,
    }, {
      status: 200,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "0.1.0",
      uptime: process.uptime(),
      database: "disconnected",
      responseTime: `${responseTime}ms`,
      error: error instanceof Error ? error.message : "Unknown error",
    }, {
      status: 503,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  }
}





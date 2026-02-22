import { NextResponse } from "next/server";
import { env } from "./env";

const ALLOWED_ORIGINS = env.ALLOWED_ORIGINS.split(",");

export function withCors(res: NextResponse, requestOrigin?: string | null) {
  let origin = ALLOWED_ORIGINS[0];
  
  if (requestOrigin && (ALLOWED_ORIGINS.includes("*") || ALLOWED_ORIGINS.includes(requestOrigin))) {
    origin = requestOrigin;
  }
  
  res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.headers.set("Access-Control-Max-Age", "86400");
  
  return res;
}

export function corsResponse() {
  const res = new NextResponse(null, { status: 204 });
  return withCors(res);
}

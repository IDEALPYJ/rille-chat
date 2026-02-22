import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface User {
    username?: string
  }
  
  interface Session {
    user: {
      id: string
      username: string
      image?: string | null
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    username?: string
    image?: string | null
  }
}
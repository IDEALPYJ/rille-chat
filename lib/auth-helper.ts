import { auth } from "@/auth";

export async function getAuthenticatedUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  // No fallback for dev - requiring explicit authentication for security
  return userId;
}
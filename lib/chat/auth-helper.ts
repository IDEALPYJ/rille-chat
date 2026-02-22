import { auth } from "@/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encrypt";
import { UserSettings } from "@/lib/types";
import { logger } from "@/lib/logger";

export async function getChatUser() {
  const session = await auth();
  const userId = session?.user?.id;

  // No fallback for dev - requiring explicit authentication for security

  return userId;
}

export async function getUserChatSettings(userId: string): Promise<UserSettings> {
  const settingsDoc = await db.userSetting.findUnique({
    where: { userId },
  });

  if (!settingsDoc) {
    return {};
  }

  try {
    const configStr = typeof settingsDoc.config === "string"
      ? settingsDoc.config
      : JSON.stringify(settingsDoc.config);
    const decryptedConfig = decrypt(configStr);
    return JSON.parse(decryptedConfig);
  } catch (e) {
    logger.error("Chat API settings decryption failed, proceeding with empty config", e);
    return {};
  }
}

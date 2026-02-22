import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { badRequestResponse, createErrorResponse, unauthorizedResponse } from "@/lib/api-error";
import { getAdapterForProvider } from "@/lib/chat/protocols";
import { enrichProviderConfigWithDefaults } from "@/lib/chat/protocol-config";

export async function POST(req: Request) {
  const session = await auth();
  const userId = session?.user?.id;

  // Remove dev fallback for security - require explicit authentication
  if (!userId) {
    return unauthorizedResponse();
  }

  try {
    const body = await req.json();
    const { provider, config, model } = body;

    if (!config) {
      return badRequestResponse("Config is required");
    }

    const checkConfig = enrichProviderConfigWithDefaults(provider, {
      ...config,
      checkModel: model || config.checkModel,
    });
    const adapter = getAdapterForProvider(provider);
    const result = await adapter.check(checkConfig);

    if (!result.success) {
      throw new Error(result.error || 'Connection check failed');
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Extract error information
    const errorMessage = error.message || "Failed to connect to the provider";

    return createErrorResponse(errorMessage, 500, "CONNECTIVITY_CHECK_FAILED", error);
  }
}

import { NextRequest, NextResponse } from "next/server";
import type { ToolSet } from "ai";
import { z } from "zod";
import { resolveCountry, type CountryCode } from "@/lib/commerce/market";
import { createCommerceToolkit } from "@/lib/agent/toolkit";
import { buildSystemPrompt } from "@/lib/agent/system-prompt";
import { extractPendingTransaction } from "@/lib/agent/bytes-utils";
import { assertAgentLlmConfigured, generateAgentText } from "@/lib/agent/llm";
import type { AgentSessionContext } from "@/lib/agent/types";
import type { MandateRecord } from "@/types/wallet";

export const runtime = "nodejs";
export const maxDuration = 60;

const ChatRequestSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    })
  ),
  accountId: z.string().optional(),
  country: z.string().optional(),
  searchUnlocked: z.boolean().optional().default(false),
  mandates: z.array(z.unknown()).optional().default([]),
});

export async function POST(req: NextRequest) {
  try {
    assertAgentLlmConfigured();

    const body = ChatRequestSchema.parse(await req.json());
    const country = resolveCountry(body.country) as CountryCode;

    const session: AgentSessionContext = {
      accountId: body.accountId,
      country,
      searchUnlocked: body.searchUnlocked,
      mandates: body.mandates as MandateRecord[],
    };

    const toolkit = createCommerceToolkit(session);
    const tools = toolkit.getTools();

    const result = await generateAgentText({
      system: buildSystemPrompt(session),
      messages: body.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      tools: tools as ToolSet,
    });

    const toolResults = result.toolResults.map(
      (tr: (typeof result.toolResults)[number]) => ({
        toolName: tr.toolName,
        result: "output" in tr ? tr.output : (tr as { result?: unknown }).result,
      })
    );

    const pendingTransaction = extractPendingTransaction(toolResults);

    return NextResponse.json({
      success: true,
      text: result.text,
      toolResults,
      pendingTransaction,
      unlockSearchAfterSign:
        pendingTransaction?.toolName === "unlock_search_access" ? true : undefined,
    });
  } catch (error) {
    console.error("[agent/chat]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Agent request failed",
      },
      { status: 500 }
    );
  }
}

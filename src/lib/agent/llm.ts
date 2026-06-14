import { generateText, stepCountIs, type ToolSet } from "ai";
import { openai } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export type AgentLlmProvider = "openai" | "gemini" | "auto";

const OPENAI_MODEL = "gpt-4o-mini";
/** Lite models share a separate free-tier quota pool (see AI.GEMINI_VISION_MODELS). */
const GEMINI_AGENT_MODELS = [
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
  "gemini-flash-lite-latest",
] as const;

function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}

function createGeminiModel(model: string) {
  const apiKey = getGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set.");
  const google = createGoogleGenerativeAI({ apiKey });
  return google(model);
}

async function runGeminiWithFallback(
  base: {
    system: string;
    messages: AgentGenerateOptions["messages"];
    tools: ToolSet;
    stopWhen: ReturnType<typeof stepCountIs>;
  }
) {
  let lastError: unknown;
  for (const model of GEMINI_AGENT_MODELS) {
    try {
      return await generateText({ ...base, model: createGeminiModel(model) });
    } catch (error) {
      lastError = error;
      if (!isQuotaOrAuthError(error)) throw error;
      console.warn(`[agent/llm] Gemini ${model} unavailable, trying next model`);
    }
  }
  throw lastError;
}

function isQuotaOrAuthError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    /quota|429|rate limit|billing|insufficient/i.test(message) ||
    /401|403|invalid api key|authentication/i.test(message)
  );
}

function resolveProvider(): AgentLlmProvider {
  const raw = process.env.AGENT_LLM?.toLowerCase();
  if (raw === "openai" || raw === "gemini" || raw === "auto") return raw;
  return "auto";
}

export function getAvailableAgentProviders(): AgentLlmProvider[] {
  const providers: AgentLlmProvider[] = [];
  if (process.env.OPENAI_API_KEY) providers.push("openai");
  if (getGeminiApiKey()) providers.push("gemini");
  return providers;
}

export function assertAgentLlmConfigured(): void {
  if (getAvailableAgentProviders().length === 0) {
    throw new Error(
      "Set OPENAI_API_KEY and/or GEMINI_API_KEY for the commerce agent chat."
    );
  }
}

interface AgentGenerateOptions {
  system: string;
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  tools: ToolSet;
}

export async function generateAgentText(options: AgentGenerateOptions) {
  const preference = resolveProvider();
  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(getGeminiApiKey());

  const base = {
    system: options.system,
    messages: options.messages,
    tools: options.tools,
    stopWhen: stepCountIs(8),
  };

  const runOpenAi = () =>
    generateText({ ...base, model: openai(OPENAI_MODEL) });

  const runGemini = () => runGeminiWithFallback(base);

  if (preference === "gemini") {
    if (!hasGemini) throw new Error("AGENT_LLM=gemini but GEMINI_API_KEY is not set.");
    return runGemini();
  }

  if (preference === "openai") {
    if (!hasOpenAi) throw new Error("AGENT_LLM=openai but OPENAI_API_KEY is not set.");
    return runOpenAi();
  }

  // auto: prefer OpenAI, fall back to Gemini on quota/auth errors
  if (hasOpenAi) {
    try {
      return await runOpenAi();
    } catch (error) {
      if (hasGemini && isQuotaOrAuthError(error)) {
        console.warn("[agent/llm] OpenAI unavailable, falling back to Gemini:", error);
        return runGemini();
      }
      throw error;
    }
  }

  if (hasGemini) return runGemini();

  throw new Error("No LLM configured for agent chat.");
}

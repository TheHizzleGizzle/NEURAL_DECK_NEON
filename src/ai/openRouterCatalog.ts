import type { OpenRouterModelInfo } from "../types/deck";

/** Curated quick-pick models (mirrors FEATURED_OPENROUTER_MODELS in server.ts). */
export const FEATURED_OPENROUTER_MODELS: OpenRouterModelInfo[] = [
  { id: "anthropic/claude-sonnet-4", name: "Anthropic · Claude Sonnet 4" },
  { id: "openai/gpt-4.1", name: "OpenAI · GPT-4.1" },
  { id: "openai/o4-mini", name: "OpenAI · o4-mini" },
  { id: "google/gemini-2.5-flash", name: "Google · Gemini 2.5 Flash" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek · R1" },
  { id: "meta-llama/llama-4-maverick", name: "Meta · Llama 4 Maverick" },
];

export const OPENROUTER_MODEL_ID_RE = /^[a-zA-Z0-9._:/-]{2,120}$/;

/** Merge the live OpenRouter /models payload behind the featured list (same rules as server.ts). */
export function buildOpenRouterCatalog(json: unknown): OpenRouterModelInfo[] {
  const featuredIds = new Set(FEATURED_OPENROUTER_MODELS.map((m) => m.id));
  const catalog: OpenRouterModelInfo[] = [...FEATURED_OPENROUTER_MODELS];
  const data = (json as { data?: unknown } | null)?.data;
  if (!Array.isArray(data)) return catalog;

  for (const raw of data) {
    const item = raw as { id?: unknown; name?: unknown; context_length?: unknown };
    if (
      typeof item?.id === "string" &&
      OPENROUTER_MODEL_ID_RE.test(item.id) &&
      !featuredIds.has(item.id)
    ) {
      catalog.push({
        id: item.id,
        name:
          typeof item.name === "string" && item.name.trim()
            ? item.name.trim()
            : item.id,
        contextLength:
          typeof item.context_length === "number" ? item.context_length : undefined,
      });
    }
    if (catalog.length >= 160) break;
  }
  return catalog;
}

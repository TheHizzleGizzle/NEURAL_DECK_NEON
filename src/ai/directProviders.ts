/**
 * Direct-to-provider AI transport used by the native (APK) build.
 *
 * The web build proxies through server.ts; on Android there is no server, so
 * these functions call Gemini / OpenRouter straight from the WebView using the
 * user's own API keys. Both providers allow CORS from the app origin
 * (https://localhost), so plain fetch works.
 *
 * Model ids, thinking levels, retries and the OpenRouter JSON-mode fallback
 * deliberately mirror runGeminiCompletion / runOpenRouterCompletion in server.ts.
 */
import type {
  DeckTuningConfig,
  OpenRouterModelInfo,
  ProviderKeys,
  ReasoningPreset,
} from "../types/deck";
import {
  buildOpenRouterCatalog,
  FEATURED_OPENROUTER_MODELS,
  OPENROUTER_MODEL_ID_RE,
} from "./openRouterCatalog";

const REQUEST_TIMEOUT_MS = 150_000; // deep-thinking calls can be slow on mobile networks
const CATALOG_TIMEOUT_MS = 8_000;

export interface DirectChatParams {
  tuning: DeckTuningConfig;
  keys: ProviderKeys;
  systemPrompt: string;
  userPrompt: string;
  expectJson: boolean;
}

export async function runDirectChat(params: DirectChatParams): Promise<string> {
  if (!params.userPrompt.trim()) {
    throw new Error("Missing userPrompt");
  }
  if (params.tuning.provider === "openrouter") {
    const key = params.keys.openRouterApiKey.trim();
    if (!key) {
      throw new Error(
        "No OpenRouter API key set. Open Options > AI Engine and paste your OpenRouter key, or switch to Gemini."
      );
    }
    const model = OPENROUTER_MODEL_ID_RE.test(params.tuning.openRouterModel.trim())
      ? params.tuning.openRouterModel.trim()
      : FEATURED_OPENROUTER_MODELS[0].id;
    return runOpenRouterDirect(key, model, params);
  }

  const key = params.keys.geminiApiKey.trim();
  if (!key) {
    throw new Error(
      "No Gemini API key set. Open Options > AI Engine and paste a Gemini API key (free from Google AI Studio)."
    );
  }
  return runGeminiDirect(key, params.tuning.reasoningPreset, params);
}

/* ---------------- Gemini ---------------- */

function resolveGeminiConfig(preset: ReasoningPreset): {
  model: string;
  thinkingLevel: "MINIMAL" | "MEDIUM" | "HIGH";
} {
  if (preset === "fast") {
    return { model: "gemini-3.1-flash-lite", thinkingLevel: "MINIMAL" };
  }
  if (preset === "deep") {
    return { model: "gemini-4-hydrogen", thinkingLevel: "HIGH" };
  }
  return { model: "gemini-4-hydrogen", thinkingLevel: "MEDIUM" };
}

export function formatProviderError(err: unknown): string {
  const raw =
    err instanceof Error && err.message ? err.message : "Unexpected AI request error";
  // SDK errors often embed the provider's JSON error body in the message.
  const start = raw.indexOf("{");
  if (start !== -1) {
    try {
      const parsed = JSON.parse(raw.slice(start)) as {
        error?: { code?: number; message?: string };
      };
      if (parsed?.error?.message) {
        const code = parsed.error.code ? `HTTP ${parsed.error.code}: ` : "";
        return `${code}${parsed.error.message}`;
      }
    } catch {
      // Not JSON; fall through to the raw message
    }
  }
  return raw;
}

function isRetryableError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("503") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("429") ||
    msg.includes("ECONNRESET") ||
    msg.includes("ETIMEDOUT") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError")
  );
}

async function runGeminiDirect(
  apiKey: string,
  preset: ReasoningPreset,
  params: DirectChatParams
): Promise<string> {
  // Loaded on demand so the web bundle (which uses the server proxy) doesn't pay for it up front.
  const { GoogleGenAI, ThinkingLevel } = await import("@google/genai");
  const { model, thinkingLevel } = resolveGeminiConfig(preset);
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: REQUEST_TIMEOUT_MS } });

  const config: {
    systemInstruction?: string;
    responseMimeType?: string;
    thinkingConfig: { thinkingLevel: (typeof ThinkingLevel)[keyof typeof ThinkingLevel] };
  } = {
    thinkingConfig: { thinkingLevel: ThinkingLevel[thinkingLevel] },
  };
  if (params.systemPrompt.trim()) config.systemInstruction = params.systemPrompt;
  if (params.expectJson) config.responseMimeType = "application/json";

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.userPrompt,
        config,
      });
      const text = response.text;
      if (!text) throw new Error("Empty response from Gemini.");
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < 2 && isRetryableError(err)) {
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
        continue;
      }
      throw new Error(formatProviderError(err));
    }
  }
  throw new Error(formatProviderError(lastErr));
}

/* ---------------- OpenRouter ---------------- */

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "TimeoutError" || err.name === "AbortError")
    ) {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s.`, {
        cause: err,
      });
    }
    throw err;
  }
}

async function runOpenRouterDirect(
  apiKey: string,
  model: string,
  params: DirectChatParams
): Promise<string> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (params.systemPrompt.trim()) {
    messages.push({ role: "system", content: params.systemPrompt });
  }
  messages.push({ role: "user", content: params.userPrompt });

  const makeRequest = async (withJsonFormat: boolean) => {
    const payload: Record<string, unknown> = { model, messages };
    if (withJsonFormat) payload.response_format = { type: "json_object" };

    const resp = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "X-Title": "NEURAL//DECK",
        },
        body: JSON.stringify(payload),
      },
      REQUEST_TIMEOUT_MS
    );
    const text = await resp.text();
    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string; code?: number };
    } = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Plain text error body
    }
    return { ok: resp.ok, status: resp.status, data, rawText: text };
  };

  let result = await makeRequest(params.expectJson);
  // Some OpenRouter models reject response_format: json_object; retry cleanly without it.
  if (!result.ok && params.expectJson && result.status === 400) {
    result = await makeRequest(false);
  }

  if (!result.ok) {
    const detail =
      result.data?.error?.message ||
      result.rawText.slice(0, 240) ||
      `OpenRouter HTTP ${result.status}`;
    throw new Error(`OpenRouter (${model}): HTTP ${result.status}: ${detail}`);
  }

  const content = result.data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`Empty response from OpenRouter model "${model}".`);
  }
  return content;
}

export async function fetchOpenRouterCatalogDirect(): Promise<{
  featured: OpenRouterModelInfo[];
  models: OpenRouterModelInfo[];
}> {
  try {
    const resp = await fetchWithTimeout(
      "https://openrouter.ai/api/v1/models",
      { headers: { Accept: "application/json" } },
      CATALOG_TIMEOUT_MS
    );
    if (!resp.ok) {
      return { featured: FEATURED_OPENROUTER_MODELS, models: FEATURED_OPENROUTER_MODELS };
    }
    const models = buildOpenRouterCatalog(await resp.json());
    return { featured: FEATURED_OPENROUTER_MODELS, models };
  } catch {
    return { featured: FEATURED_OPENROUTER_MODELS, models: FEATURED_OPENROUTER_MODELS };
  }
}

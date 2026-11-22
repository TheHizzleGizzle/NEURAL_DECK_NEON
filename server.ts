import crypto from "node:crypto";
import express from "express";
import type { Request, Response } from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { GoogleGenAI, ThinkingLevel } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const HOST = "0.0.0.0";
const IS_PROD = process.env.NODE_ENV === "production";

type ReasoningPreset = "fast" | "balanced" | "deep";
type AiProvider = "gemini" | "openrouter";

interface ChatRequestBody {
  provider?: AiProvider;
  openRouterModel?: string;
  reasoningPreset?: ReasoningPreset;
  systemPrompt?: string;
  userPrompt?: string;
  expectJson?: boolean;
}

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  contextLength?: number;
}

const FEATURED_OPENROUTER_MODELS: OpenRouterModelInfo[] = [
  { id: "anthropic/claude-sonnet-4", name: "Anthropic · Claude Sonnet 4" },
  { id: "openai/gpt-4.1", name: "OpenAI · GPT-4.1" },
  { id: "openai/o4-mini", name: "OpenAI · o4-mini" },
  { id: "google/gemini-2.5-flash", name: "Google · Gemini 2.5 Flash" },
  { id: "deepseek/deepseek-r1", name: "DeepSeek · R1" },
  { id: "meta-llama/llama-4-maverick", name: "Meta · Llama 4 Maverick" },
];

const MODEL_ID_RE = /^[a-zA-Z0-9._:/-]{2,120}$/;
const SESSION_TOKEN_RE = /^[a-f0-9]{64}$/;
const PKCE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_PENDING_PKCE = 200;
const MAX_OPENROUTER_SESSIONS = 500;
const MODEL_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

const pendingPkceStates = new Map<
  string,
  { verifier: string; createdAt: number }
>();

const openRouterSessions = new Map<
  string,
  { apiKey: string; createdAt: number }
>();

let cachedModelCatalog: {
  models: OpenRouterModelInfo[];
  fetchedAt: number;
} | null = null;

function pruneMaps(): void {
  const now = Date.now();
  for (const [k, v] of pendingPkceStates) {
    if (now - v.createdAt > PKCE_TTL_MS) pendingPkceStates.delete(k);
  }
  while (pendingPkceStates.size > MAX_PENDING_PKCE) {
    const oldest = pendingPkceStates.keys().next().value;
    if (oldest) pendingPkceStates.delete(oldest);
    else break;
  }

  for (const [k, v] of openRouterSessions) {
    if (now - v.createdAt > SESSION_TTL_MS) openRouterSessions.delete(k);
  }
  while (openRouterSessions.size > MAX_OPENROUTER_SESSIONS) {
    const oldest = openRouterSessions.keys().next().value;
    if (oldest) openRouterSessions.delete(oldest);
    else break;
  }
}

function getAppBaseUrl(): string {
  const envUrl = process.env.APP_URL?.trim();
  if (envUrl && /^https?:\/\//i.test(envUrl)) {
    return envUrl.replace(/\/+$/, "");
  }
  return `http://localhost:${PORT}`;
}

function generateCodeVerifier(): string {
  return crypto.randomBytes(32).toString("base64url");
}

function computeS256Challenge(verifier: string): string {
  return crypto.createHash("sha256").update(verifier).digest("base64url");
}

function extractBearerToken(req: Request): string | null {
  const auth = req.header("authorization");
  if (!auth) return null;
  const match = /^Bearer\s+([a-f0-9]{64})$/i.exec(auth.trim());
  if (!match) return null;
  return match[1].toLowerCase();
}

function getActiveOpenRouterSession(
  req: Request
): { token: string; apiKey: string } | null {
  pruneMaps();
  const token = extractBearerToken(req);
  if (!token || !SESSION_TOKEN_RE.test(token)) return null;
  const entry = openRouterSessions.get(token);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > SESSION_TTL_MS) {
    openRouterSessions.delete(token);
    return null;
  }
  return { token, apiKey: entry.apiKey };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function safeJsonForInlineScript(payload: unknown): string {
  return JSON.stringify(payload).replace(/</g, "\\u003c").replace(/>/g, "\\u003e");
}

function resolveGeminiConfig(preset: ReasoningPreset): {
  model: string;
  thinkingLevel: ThinkingLevel;
} {
  if (preset === "fast") {
    return {
      model: "gemini-3.1-flash-lite",
      thinkingLevel: ThinkingLevel.MINIMAL,
    };
  }
  if (preset === "deep") {
    return {
      model: "gemini-4-hydrogen",
      thinkingLevel: ThinkingLevel.HIGH,
    };
  }
  return {
    model: "gemini-4-hydrogen",
    thinkingLevel: ThinkingLevel.MEDIUM,
  };
}

function formatErrorMessage(err: unknown): string {
  const raw =
    err instanceof Error && err.message
      ? err.message
      : "Unexpected AI request error";
  try {
    const parsed = JSON.parse(raw) as {
      error?: { code?: number; message?: string };
    };
    if (parsed?.error?.message) {
      const code = parsed.error.code ? `HTTP ${parsed.error.code}: ` : "";
      return `${code}${parsed.error.message}`;
    }
  } catch {
    // Raw message is already plain text
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
    msg.includes("ETIMEDOUT")
  );
}

async function runGeminiCompletion(
  preset: ReasoningPreset,
  systemPrompt: string,
  userPrompt: string,
  expectJson: boolean
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY on server. Check Settings > Secrets to configure your Gemini API key."
    );
  }

  const { model, thinkingLevel } = resolveGeminiConfig(preset);

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  const config: {
    systemInstruction?: string;
    responseMimeType?: string;
    thinkingConfig: { thinkingLevel: ThinkingLevel };
  } = {
    thinkingConfig: { thinkingLevel },
  };

  if (systemPrompt.trim()) {
    config.systemInstruction = systemPrompt;
  }
  if (expectJson) {
    config.responseMimeType = "application/json";
  }

  let lastErr: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: userPrompt,
        config,
      });

      const text = response.text;
      if (!text) {
        throw new Error("Empty response from Gemini.");
      }
      return text;
    } catch (err) {
      lastErr = err;
      if (attempt < 2 && isRetryableError(err)) {
        await new Promise((r) => setTimeout(r, 600 * Math.pow(2, attempt)));
        continue;
      }
      throw new Error(formatErrorMessage(err));
    }
  }
  throw new Error(formatErrorMessage(lastErr));
}

async function runOpenRouterCompletion(
  userApiKey: string,
  model: string,
  systemPrompt: string,
  userPrompt: string,
  expectJson: boolean
): Promise<string> {
  const messages: Array<{ role: "system" | "user"; content: string }> = [];
  if (systemPrompt.trim()) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: userPrompt });

  const makeRequest = async (withJsonFormat: boolean) => {
    const payload: Record<string, unknown> = {
      model,
      messages,
    };
    if (withJsonFormat) {
      payload.response_format = { type: "json_object" };
    }

    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userApiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": getAppBaseUrl(),
        "X-Title": "NEURAL//DECK",
      },
      body: JSON.stringify(payload),
    });

    const text = await resp.text();
    let data: {
      choices?: Array<{ message?: { content?: string } }>;
      error?: { message?: string; code?: number };
    } = {};
    try {
      data = JSON.parse(text);
    } catch {
      // Plain text error
    }

    return { ok: resp.ok, status: resp.status, data, rawText: text };
  };

  let result = await makeRequest(expectJson);

  // Some OpenRouter models reject response_format: json_object; retry cleanly without it.
  if (!result.ok && expectJson && result.status === 400) {
    result = await makeRequest(false);
  }

  if (!result.ok) {
    const detail =
      result.data?.error?.message ||
      result.rawText.slice(0, 240) ||
      `OpenRouter HTTP ${result.status}`;
    throw new Error(`OpenRouter (${model}): ${detail}`);
  }

  const content = result.data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error(`Empty response from OpenRouter model "${model}".`);
  }
  return content;
}

async function fetchOpenRouterModels(): Promise<OpenRouterModelInfo[]> {
  if (
    cachedModelCatalog &&
    Date.now() - cachedModelCatalog.fetchedAt < MODEL_CACHE_TTL_MS
  ) {
    return cachedModelCatalog.models;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const resp = await fetch("https://openrouter.ai/api/v1/models", {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
    clearTimeout(timer);

    if (!resp.ok) {
      return FEATURED_OPENROUTER_MODELS;
    }

    const json = (await resp.json()) as {
      data?: Array<{
        id?: string;
        name?: string;
        context_length?: number;
      }>;
    };

    const featuredIds = new Set(FEATURED_OPENROUTER_MODELS.map((m) => m.id));
    const catalog: OpenRouterModelInfo[] = [...FEATURED_OPENROUTER_MODELS];

    if (Array.isArray(json.data)) {
      for (const item of json.data) {
        if (
          typeof item?.id === "string" &&
          MODEL_ID_RE.test(item.id) &&
          !featuredIds.has(item.id)
        ) {
          catalog.push({
            id: item.id,
            name:
              typeof item.name === "string" && item.name.trim()
                ? item.name.trim()
                : item.id,
            contextLength:
              typeof item.context_length === "number"
                ? item.context_length
                : undefined,
          });
        }
        if (catalog.length >= 160) break;
      }
    }

    cachedModelCatalog = { models: catalog, fetchedAt: Date.now() };
    return catalog;
  } catch {
    return FEATURED_OPENROUTER_MODELS;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/ai/status", (_req: Request, res: Response) => {
    res.json({
      geminiReady: Boolean(process.env.GEMINI_API_KEY?.trim()),
      openRouterOAuthSupported: true,
    });
  });

  app.get("/api/ai/models", async (_req: Request, res: Response) => {
    const models = await fetchOpenRouterModels();
    res.json({
      featured: FEATURED_OPENROUTER_MODELS,
      models,
    });
  });

  /* --- OpenRouter OAuth PKCE Flow --- */

  app.get("/api/auth/openrouter/url", (_req: Request, res: Response) => {
    pruneMaps();
    const state = crypto.randomBytes(24).toString("hex");
    const verifier = generateCodeVerifier();
    const challenge = computeS256Challenge(verifier);

    pendingPkceStates.set(state, { verifier, createdAt: Date.now() });

    const baseUrl = getAppBaseUrl();
    const callbackBaseUrl = `${baseUrl}/auth/openrouter/callback`;
    const callbackUrl = `${callbackBaseUrl}?state=${encodeURIComponent(state)}`;

    const params = new URLSearchParams({
      callback_url: callbackUrl,
      code_challenge: challenge,
      code_challenge_method: "S256",
    });

    res.json({
      url: `https://openrouter.ai/auth?${params.toString()}`,
      callbackBaseUrl,
    });
  });

  const handleOpenRouterCallback = async (req: Request, res: Response) => {
    pruneMaps();
    const code = typeof req.query.code === "string" ? req.query.code.trim() : "";
    const state =
      typeof req.query.state === "string" ? req.query.state.trim() : "";

    const renderPopupPage = (payload: Record<string, unknown>, message: string) => {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.send(`<!doctype html>
<html lang="en">
  <head><meta charset="utf-8" /><title>NEURAL//DECK · OpenRouter Auth</title></head>
  <body style="background:#080A12;color:#ECF6FF;font-family:monospace;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;">
    <div style="border:2px solid #2D3E66;background:#0E1322;padding:20px;max-width:420px;text-align:center;">
      <p style="margin:0 0 8px 0;color:#00F0FF;font-weight:bold;">NEURAL//DECK</p>
      <p style="margin:0;font-size:13px;line-height:1.5;">${escapeHtml(message)}</p>
    </div>
    <script>
      (function () {
        var msg = ${safeJsonForInlineScript(payload)};
        if (window.opener) {
          window.opener.postMessage(msg, window.location.origin);
          setTimeout(function () { window.close(); }, 250);
        }
      })();
    </script>
  </body>
</html>`);
    };

    if (!code || !state) {
      renderPopupPage(
        {
          type: "OPENROUTER_OAUTH_ERROR",
          error: "Missing authorization code or state from OpenRouter.",
        },
        "Authorization did not complete. You can close this window and retry."
      );
      return;
    }

    const pending = pendingPkceStates.get(state);
    pendingPkceStates.delete(state);

    if (!pending || Date.now() - pending.createdAt > PKCE_TTL_MS) {
      renderPopupPage(
        {
          type: "OPENROUTER_OAUTH_ERROR",
          error: "OAuth session expired. Please click Connect OpenRouter again.",
        },
        "Authorization session expired. Close this window and try again."
      );
      return;
    }

    try {
      const exchangeResp = await fetch("https://openrouter.ai/api/v1/auth/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          code_verifier: pending.verifier,
          code_challenge_method: "S256",
        }),
      });

      const exchangeJson = (await exchangeResp.json()) as {
        key?: string;
        error?: { message?: string };
      };

      if (!exchangeResp.ok || !exchangeJson.key) {
        const errMsg =
          exchangeJson?.error?.message ||
          `OpenRouter key exchange failed (HTTP ${exchangeResp.status}).`;
        renderPopupPage(
          { type: "OPENROUTER_OAUTH_ERROR", error: errMsg },
          errMsg
        );
        return;
      }

      const sessionToken = crypto.randomBytes(32).toString("hex");
      openRouterSessions.set(sessionToken, {
        apiKey: exchangeJson.key,
        createdAt: Date.now(),
      });

      renderPopupPage(
        {
          type: "OPENROUTER_OAUTH_SUCCESS",
          sessionToken,
          connectedAt: Date.now(),
        },
        "OpenRouter connected! Returning to NEURAL//DECK..."
      );
    } catch {
      renderPopupPage(
        {
          type: "OPENROUTER_OAUTH_ERROR",
          error: "Network error exchanging authorization code with OpenRouter.",
        },
        "Could not complete OpenRouter sign-in. Close this window and try again."
      );
    }
  };

  app.get(
    ["/auth/openrouter/callback", "/auth/openrouter/callback/"],
    handleOpenRouterCallback
  );

  app.get("/api/auth/openrouter/status", (req: Request, res: Response) => {
    const session = getActiveOpenRouterSession(req);
    res.json({ connected: Boolean(session) });
  });

  app.post("/api/auth/openrouter/disconnect", (req: Request, res: Response) => {
    const token = extractBearerToken(req);
    if (token) {
      openRouterSessions.delete(token);
    }
    res.json({ disconnected: true });
  });

  /* --- Unified AI Chat Proxy --- */

  app.post("/api/ai/chat", async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as ChatRequestBody;
      const provider: AiProvider =
        body.provider === "openrouter" ? "openrouter" : "gemini";
      const rawPreset = body.reasoningPreset;
      const reasoningPreset: ReasoningPreset =
        rawPreset === "fast" || rawPreset === "deep" || rawPreset === "balanced"
          ? rawPreset
          : "balanced";
      const systemPrompt =
        typeof body.systemPrompt === "string" ? body.systemPrompt : "";
      const userPrompt =
        typeof body.userPrompt === "string" ? body.userPrompt : "";
      const expectJson = Boolean(body.expectJson);

      if (!userPrompt.trim()) {
        res.status(400).json({ error: "Missing userPrompt" });
        return;
      }

      if (provider === "openrouter") {
        const session = getActiveOpenRouterSession(req);
        if (!session) {
          res.status(401).json({
            error:
              "OpenRouter account is not connected. Open Options > AI Engine to connect your OpenRouter account via OAuth, or switch back to Built-in Gemini.",
          });
          return;
        }
        const model =
          typeof body.openRouterModel === "string" &&
          MODEL_ID_RE.test(body.openRouterModel.trim())
            ? body.openRouterModel.trim()
            : FEATURED_OPENROUTER_MODELS[0].id;

        const content = await runOpenRouterCompletion(
          session.apiKey,
          model,
          systemPrompt,
          userPrompt,
          expectJson
        );
        res.json({ content });
        return;
      }

      const content = await runGeminiCompletion(
        reasoningPreset,
        systemPrompt,
        userPrompt,
        expectJson
      );

      res.json({ content });
    } catch (err: unknown) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Unexpected AI request error";
      res.status(502).json({ error: message });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`NEURAL//DECK server running at http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});

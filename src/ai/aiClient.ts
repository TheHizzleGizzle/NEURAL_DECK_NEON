import type {
  BriefFormat,
  CreativeSkill,
  DeckTuningConfig,
  DivergenceLevel,
  GraveyardEntry,
  IdeaCard,
  OpenRouterModelInfo,
  SynthesizedBrief,
} from "../types/deck";
import { generateId } from "../data/starterSession";
import { classifyQuadrant } from "../utils/treeUtils";

function divergenceDirective(level: DivergenceLevel): string {
  if (level === "grounded") {
    return "Stay pragmatic, shippable, and commercially realistic. Favor concrete mechanics that can be built quickly with low risk.";
  }
  if (level === "wild") {
    return "Push for extreme originality and paradigm-breaking leaps. Challenge category conventions and explore surprising cross-domain mechanisms.";
  }
  return "Balance creative surprise with real-world feasibility. Avoid safe cliches while keeping mechanics concrete and believable.";
}

function appendContextAndGraveyard(
  globalCtx: string,
  sessionConstraints: string | undefined,
  graveyard: GraveyardEntry[]
): string {
  let sb = "";
  if (globalCtx && globalCtx.trim()) {
    sb += `\n[GLOBAL PERSONA & DEFAULTS]\n${globalCtx.trim()}\n`;
  }
  if (sessionConstraints && sessionConstraints.trim()) {
    sb += `\n[SESSION CONSTRAINTS & TARGET]\n${sessionConstraints.trim()}\n`;
  }
  const active = graveyard.filter((g) => g.activeInPrompts);
  if (active.length > 0) {
    sb +=
      "\n[FORBIDDEN ANTI-PATTERNS // IDEA GRAVEYARD]\n" +
      "The user explicitly banished these directions. DO NOT propose anything similar to:\n";
    for (const g of active) {
      sb += `- [${g.reasonTag}] ${g.antiPatternRule}\n`;
    }
  }
  return sb;
}

function buildBrainstormSystemPrompt(
  skillInstruction: string,
  tuning: DeckTuningConfig,
  sessionConstraints: string | undefined,
  graveyard: GraveyardEntry[],
  count: number
): string {
  let sb =
    "You are NEURAL//DECK, an AI-assisted creative brainstorming engine.\n" +
    `Core Directive: ${skillInstruction}\n` +
    `Divergence Calibration: ${divergenceDirective(tuning.divergence)}\n` +
    "Be concrete, vivid, and opinionated. Avoid vague corporate buzzwords.\n";

  sb += appendContextAndGraveyard(
    tuning.globalContext,
    sessionConstraints,
    graveyard
  );

  sb +=
    "\nRespond ONLY with valid JSON in this exact structure (no markdown commentary outside JSON):\n" +
    "{\n" +
    '  "ideas": [\n' +
    "    {\n" +
    '      "title": "Punchy 2-5 Word Concept Name",\n' +
    '      "summary": "2-3 crisp sentences explaining the exact mechanic and user experience.",\n' +
    '      "rationale": "1 sharp sentence on why this angle unlocks real leverage.",\n' +
    '      "tags": ["TAG_ONE", "TAG_TWO"]\n' +
    "    }\n" +
    "  ]\n" +
    "}\n" +
    `Generate exactly ${count} distinct items in "ideas".`;
  return sb;
}

function extractJsonBlock(text: string): string {
  if (!text) return "{}";
  let trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    const firstNewline = trimmed.indexOf("\n");
    if (firstNewline !== -1) {
      trimmed = trimmed.slice(firstNewline + 1);
    }
    if (trimmed.endsWith("```")) {
      trimmed = trimmed.slice(0, -3);
    }
    trimmed = trimmed.trim();
  }
  const firstBrace = trimmed.indexOf("{");
  const firstBracket = trimmed.indexOf("[");
  if (firstBrace === -1 && firstBracket === -1) {
    return trimmed;
  }
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = trimmed.lastIndexOf("]");
    if (lastBracket > firstBracket) {
      return trimmed.slice(firstBracket, lastBracket + 1);
    }
  }
  if (firstBrace !== -1) {
    const lastBrace = trimmed.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      return trimmed.slice(firstBrace, lastBrace + 1);
    }
  }
  return trimmed;
}

function parseIdeaCards(
  rawContent: string,
  parentId: string | null,
  depth: number,
  badge: string,
  accentColor: string,
  extra?: Partial<Pick<IdeaCard, "splicedFrom" | "steeringNote">>
): IdeaCard[] {
  const jsonSlice = extractJsonBlock(rawContent);
  const out: IdeaCard[] = [];

  try {
    const parsed = JSON.parse(jsonSlice) as unknown;
    let arr: unknown[] | null = null;
    if (Array.isArray(parsed)) {
      arr = parsed;
    } else if (parsed && typeof parsed === "object") {
      const root = parsed as Record<string, unknown>;
      if (Array.isArray(root.ideas)) arr = root.ideas;
      else if (Array.isArray(root.cards)) arr = root.cards;
      else if (Array.isArray(root.branches)) arr = root.branches;
    }

    if (arr) {
      arr.forEach((entry, idx) => {
        if (!entry || typeof entry !== "object") return;
        const item = entry as Record<string, unknown>;
        const title =
          typeof item.title === "string" && item.title.trim()
            ? item.title.trim()
            : `Idea ${idx + 1}`;
        const summary =
          typeof item.summary === "string"
            ? item.summary.trim()
            : typeof item.description === "string"
            ? item.description.trim()
            : "";
        const rationale =
          typeof item.rationale === "string"
            ? item.rationale.trim()
            : typeof item.why === "string"
            ? item.why.trim()
            : "";
        const tags: string[] = [];
        if (Array.isArray(item.tags)) {
          for (const t of item.tags) {
            if (typeof t === "string") {
              const norm = t
                .trim()
                .replace(/^#+/, "")
                .toUpperCase()
                .replace(/\s+/g, "_");
              if (norm) tags.push(norm);
            }
          }
        }
        out.push({
          id: generateId(),
          parentId,
          depth,
          title,
          summary,
          rationale,
          skillBadge: badge,
          accentColor,
          tags,
          starred: false,
          collapsed: false,
          createdAt: Date.now(),
          author: "ai",
          ...extra,
        });
      });
    }
  } catch {
    // Fallback to freeform card below
  }

  if (out.length === 0) {
    out.push({
      id: generateId(),
      parentId,
      depth,
      title: "AI Synthesis Output",
      summary: rawContent.trim(),
      rationale: "Parsed from freeform model output.",
      skillBadge: badge,
      accentColor,
      tags: [],
      starred: false,
      collapsed: false,
      createdAt: Date.now(),
      author: "ai",
      ...extra,
    });
  }
  return out;
}

async function callServerChat(params: {
  tuning: DeckTuningConfig;
  openRouterSessionToken?: string | null;
  systemPrompt: string;
  userPrompt: string;
  expectJson: boolean;
}): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (
    params.tuning.provider === "openrouter" &&
    params.openRouterSessionToken
  ) {
    headers.Authorization = `Bearer ${params.openRouterSessionToken}`;
  }

  const response = await fetch("/api/ai/chat", {
    method: "POST",
    headers,
    body: JSON.stringify({
      provider: params.tuning.provider,
      openRouterModel: params.tuning.openRouterModel,
      reasoningPreset: params.tuning.reasoningPreset,
      systemPrompt: params.systemPrompt,
      userPrompt: params.userPrompt,
      expectJson: params.expectJson,
    }),
  });
  const data = (await response.json()) as { content?: string; error?: string };
  if (!response.ok || data.error) {
    throw new Error(data.error || `HTTP ${response.status}`);
  }
  return data.content || "";
}

export async function fetchGeminiStatus(): Promise<boolean> {
  try {
    const res = await fetch("/api/ai/status");
    if (!res.ok) return false;
    const data = (await res.json()) as { geminiReady?: boolean };
    return Boolean(data.geminiReady);
  } catch {
    return false;
  }
}

export async function fetchOpenRouterAuthUrl(): Promise<{
  url: string;
  callbackBaseUrl: string;
}> {
  const res = await fetch("/api/auth/openrouter/url");
  if (!res.ok) {
    throw new Error(`Could not start OpenRouter OAuth (HTTP ${res.status})`);
  }
  return (await res.json()) as { url: string; callbackBaseUrl: string };
}

export async function disconnectOpenRouter(
  sessionToken: string | null
): Promise<void> {
  if (!sessionToken) return;
  try {
    await fetch("/api/auth/openrouter/disconnect", {
      method: "POST",
      headers: { Authorization: `Bearer ${sessionToken}` },
    });
  } catch {
    // Ignore network errors during local disconnect
  }
}

export async function fetchOpenRouterModels(): Promise<{
  featured: OpenRouterModelInfo[];
  models: OpenRouterModelInfo[];
}> {
  const res = await fetch("/api/ai/models");
  if (!res.ok) {
    throw new Error(`Could not fetch OpenRouter models (HTTP ${res.status})`);
  }
  return (await res.json()) as {
    featured: OpenRouterModelInfo[];
    models: OpenRouterModelInfo[];
  };
}

export async function generateSeedIdeas(
  tuning: DeckTuningConfig,
  seedPrompt: string,
  sessionConstraints: string | undefined,
  initialSkill: CreativeSkill | null,
  graveyard: GraveyardEntry[],
  openRouterSessionToken?: string | null
): Promise<IdeaCard[]> {
  const badge = initialSkill ? initialSkill.badge : "SEED";
  const accent = initialSkill ? initialSkill.accentColor : "#00F0FF";
  const count = initialSkill ? initialSkill.outputCount : 4;
  const lens = initialSkill
    ? initialSkill.systemInstruction
    : "Generate wildly distinct, high-leverage creative angles that avoid generic advice.";

  const sys = buildBrainstormSystemPrompt(
    lens,
    tuning,
    sessionConstraints,
    graveyard,
    count
  );
  const user =
    `Brainstorm Topic / Seed:\n${seedPrompt}\n\n` +
    `Return JSON object with key "ideas" containing ${count} distinct cards.`;

  const raw = await callServerChat({
    tuning,
    openRouterSessionToken,
    systemPrompt: sys,
    userPrompt: user,
    expectJson: true,
  });

  return parseIdeaCards(raw, null, 0, badge, accent);
}

export async function branchFromCard(
  tuning: DeckTuningConfig,
  parent: IdeaCard,
  ancestorPath: IdeaCard[],
  existingChildTitles: string[],
  sessionSeed: string,
  sessionConstraints: string | undefined,
  skill: CreativeSkill,
  graveyard: GraveyardEntry[],
  steeringNote?: string,
  openRouterSessionToken?: string | null
): Promise<IdeaCard[]> {
  const sys = buildBrainstormSystemPrompt(
    skill.systemInstruction,
    tuning,
    sessionConstraints,
    graveyard,
    skill.outputCount
  );

  let user = "";
  if (sessionSeed && sessionSeed.trim()) {
    user += `Session Root Prompt: ${sessionSeed.trim()}\n\n`;
  }

  if (ancestorPath.length > 1) {
    const lineage = ancestorPath
      .slice(0, -1)
      .map((a, i) => `${i + 1}. ${a.title} — ${a.summary}`)
      .join("\n");
    user += `Ancestor Lineage Leading Here:\n${lineage}\n\n`;
  }

  user +=
    `Target Node to Branch From:\n` +
    `- Title: ${parent.title}\n` +
    `- Summary: ${parent.summary}\n`;
  if (parent.rationale && parent.rationale.trim()) {
    user += `- Rationale: ${parent.rationale}\n`;
  }

  if (existingChildTitles.length > 0) {
    user +=
      `\nExisting Child Branches Already Explored (DO NOT repeat or closely paraphrase these):\n` +
      existingChildTitles.map((t) => `- ${t}`).join("\n") +
      "\n";
  }

  const cleanSteer = steeringNote?.trim();
  if (cleanSteer) {
    user += `\nHuman Steering Direction (MUST prioritize this direction):\n${cleanSteer}\n`;
  }

  user += `\nApply the skill [${skill.name}] and return JSON with ${skill.outputCount} distinct child branch cards.`;

  const raw = await callServerChat({
    tuning,
    openRouterSessionToken,
    systemPrompt: sys,
    userPrompt: user,
    expectJson: true,
  });

  return parseIdeaCards(
    raw,
    parent.id,
    parent.depth + 1,
    skill.badge,
    skill.accentColor,
    cleanSteer ? { steeringNote: cleanSteer } : undefined
  );
}

export async function mashupCards(
  tuning: DeckTuningConfig,
  selectedCards: IdeaCard[],
  sessionSeed: string,
  sessionConstraints: string | undefined,
  graveyard: GraveyardEntry[],
  openRouterSessionToken?: string | null
): Promise<IdeaCard[]> {
  const lens =
    "Synthesize unexpected hybrid concepts by fusing the strongest mechanics of ALL selected cards into cohesive, non-obvious mashups. Do not merely list features side-by-side; create emergent synergy.";
  const sys = buildBrainstormSystemPrompt(
    lens,
    tuning,
    sessionConstraints,
    graveyard,
    3
  );

  let user = "";
  if (sessionSeed && sessionSeed.trim()) {
    user += `Session Context: ${sessionSeed.trim()}\n\n`;
  }
  user += `Fuse these ${selectedCards.length} Idea Nodes:\n`;
  selectedCards.forEach((c, idx) => {
    user += `${idx + 1}. [${c.title}]: ${c.summary}\n`;
  });
  user += "\nReturn JSON with 3 emergent hybrid mashup cards.";

  const raw = await callServerChat({
    tuning,
    openRouterSessionToken,
    systemPrompt: sys,
    userPrompt: user,
    expectJson: true,
  });

  const anchor = selectedCards[0];
  const splicedFrom = selectedCards.map((c) => ({ id: c.id, title: c.title }));
  return parseIdeaCards(
    raw,
    anchor.id,
    anchor.depth + 1,
    `SPLICE_X${selectedCards.length}`,
    "#FF2E93",
    { splicedFrom }
  );
}

/**
 * 1-click inline seed sharpener replacing the old Prompt Lab modal.
 */
export async function sharpenSeedPrompt(
  tuning: DeckTuningConfig,
  rawSeed: string,
  sessionConstraints: string | undefined,
  graveyard: GraveyardEntry[],
  openRouterSessionToken?: string | null
): Promise<string> {
  let sys =
    "You tighten rough brainstorm ideas into razor-sharp, concrete 2-3 sentence creative briefs.\n" +
    "Preserve the user's intent, add specificity (target user, core tension, or surprising constraint), and remove vague buzzwords.\n" +
    "Do NOT output labels like [CONTEXT], bullet lists, or CO-STAR headings—just 2-3 punchy sentences ready to brainstorm from.\n";

  sys += appendContextAndGraveyard(
    tuning.globalContext,
    sessionConstraints,
    graveyard
  );

  sys +=
    '\nRespond ONLY with valid JSON: { "sharpened": "Your 2-3 sentence sharpened seed prompt." }';

  const raw = await callServerChat({
    tuning,
    openRouterSessionToken,
    systemPrompt: sys,
    userPrompt: `Rough seed:\n${rawSeed.trim()}`,
    expectJson: true,
  });

  try {
    const parsed = JSON.parse(extractJsonBlock(raw)) as { sharpened?: string };
    if (typeof parsed.sharpened === "string" && parsed.sharpened.trim()) {
      return parsed.sharpened.trim();
    }
  } catch {
    // Fallback to raw trimmed text
  }
  return raw.trim();
}

function getBriefFormatDirective(format: BriefFormat): string {
  if (format === "mvp_48h") {
    return (
      "Produce a razor-sharp 48-Hour MVP Execution Plan. Sections should cover: " +
      "(1) Winning Wedge & Core Loop, (2) What We Explicitly Cut, (3) 48-Hour Build Slice, and (4) Falsifiable Validation Test."
    );
  }
  if (format === "tradeoff_matrix") {
    return (
      "Produce an honest Head-to-Head Tradeoff Comparison across the starred finalists. Sections should cover: " +
      "(1) Strongest Contender & Why, (2) Key Tradeoffs Across Finalists, (3) Biggest Kill Risks, and (4) Recommended Hybrid or Decision."
    );
  }
  return (
    "Produce a concise 1-Page Product Decision Spec synthesizing the starred finalists into one coherent direction. Sections should cover: " +
    "(1) Problem & Positioning, (2) Core Product Mechanics, (3) Anti-Patterns We Reject, and (4) First-Week Launch Scope."
  );
}

export async function synthesizeConvergenceBrief(
  tuning: DeckTuningConfig,
  format: BriefFormat,
  starredCards: IdeaCard[],
  sessionSeed: string,
  sessionConstraints: string | undefined,
  graveyard: GraveyardEntry[],
  openRouterSessionToken?: string | null
): Promise<SynthesizedBrief> {
  let sys =
    "You are NEURAL//DECK's Convergence Strategist. Your job is to turn messy divergent brainstorm finalists into one decisive, shippable direction.\n" +
    `${getBriefFormatDirective(format)}\n` +
    "Be direct, opinionated, and grounded in the user's starred cards and their own Impact/Effort ratings. Do not invent fake numeric scores.\n";

  sys += appendContextAndGraveyard(
    tuning.globalContext,
    sessionConstraints,
    graveyard
  );

  sys +=
    "\nRespond ONLY with valid JSON matching this exact schema:\n" +
    "{\n" +
    '  "title": "Concise Brief Title",\n' +
    '  "verdict": "1-2 sentence decisive recommendation.",\n' +
    '  "sections": [\n' +
    '    { "heading": "Section Heading", "body": "Crisp 2-4 sentence concrete paragraph." }\n' +
    "  ],\n" +
    '  "nextActions": ["Concrete action 1", "Concrete action 2", "Concrete action 3"]\n' +
    "}";

  let user = `Original Seed: ${sessionSeed || "Untitled Brainstorm"}\n\nStarred Finalist Ideas:\n`;
  starredCards.forEach((c, idx) => {
    const ratingStr = c.ratings
      ? ` [User Rating: Impact ${c.ratings.impact}/5, Effort ${c.ratings.effort}/5 -> ${
          classifyQuadrant(c.ratings)?.label ?? "Rated"
        }]`
      : "";
    user += `${idx + 1}. ${c.title}${ratingStr}\n   Summary: ${c.summary}\n`;
    if (c.rationale) {
      user += `   Rationale: ${c.rationale}\n`;
    }
  });

  const raw = await callServerChat({
    tuning,
    openRouterSessionToken,
    systemPrompt: sys,
    userPrompt: user,
    expectJson: true,
  });

  const parsed = JSON.parse(extractJsonBlock(raw)) as {
    title?: string;
    verdict?: string;
    sections?: Array<{ heading?: string; body?: string }>;
    nextActions?: string[];
  };

  const sections = Array.isArray(parsed.sections)
    ? parsed.sections
        .filter((s) => s && typeof s.heading === "string" && typeof s.body === "string")
        .map((s) => ({
          heading: s.heading!.trim(),
          body: s.body!.trim(),
        }))
    : [];

  const nextActions = Array.isArray(parsed.nextActions)
    ? parsed.nextActions
        .filter((a): a is string => typeof a === "string" && a.trim().length > 0)
        .map((a) => a.trim())
    : [];

  return {
    format,
    title:
      typeof parsed.title === "string" && parsed.title.trim()
        ? parsed.title.trim()
        : "Synthesized Decision Brief",
    verdict:
      typeof parsed.verdict === "string" && parsed.verdict.trim()
        ? parsed.verdict.trim()
        : "Consolidated recommendation from starred nodes.",
    sections:
      sections.length > 0
        ? sections
        : [{ heading: "Summary", body: raw.trim() }],
    nextActions,
    sourceCardTitles: starredCards.map((c) => c.title),
    generatedAt: Date.now(),
  };
}

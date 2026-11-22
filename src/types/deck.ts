export type FilterMode = "ALL" | "STARRED" | "ROOTS";

export type ThemeMode = "dark" | "light";

export interface UiPreferences {
  theme: ThemeMode;
  showGrid: boolean;
  compactCards: boolean;
}

export type ReasoningPreset = "fast" | "balanced" | "deep";

export type DivergenceLevel = "grounded" | "balanced" | "wild";

export type BriefFormat = "mvp_48h" | "product_spec" | "tradeoff_matrix";

export type RailTab = "shortlist" | "graveyard" | "tuning";

export interface SpliceOrigin {
  id: string;
  title: string;
}

export interface IdeaRatings {
  impact: number; // 1-5 human rating
  effort: number; // 1-5 human rating (1 = low effort, 5 = high effort)
}

export interface IdeaCard {
  id: string;
  parentId: string | null;
  depth: number;
  title: string;
  summary: string;
  rationale: string;
  skillBadge: string;
  accentColor: string; // Hex color like "#00F0FF"
  tags: string[];
  starred: boolean;
  collapsed: boolean;
  createdAt: number;
  author?: "ai" | "human";
  splicedFrom?: SpliceOrigin[];
  steeringNote?: string;
  ratings?: IdeaRatings;
}

export interface GraveyardEntry {
  id: string;
  reasonTag: string;
  antiPatternRule: string;
  activeInPrompts: boolean;
  banishedAt: number;
  archivedCard: IdeaCard | null;
  archivedSubtree?: IdeaCard[];
}

export interface CreativeSkill {
  id: string;
  name: string;
  badge: string;
  subtitle: string;
  systemInstruction: string;
  accentColor: string;
  outputCount: number;
  builtIn: boolean;
}

export interface SynthesizedBrief {
  format: BriefFormat;
  title: string;
  verdict: string;
  sections: Array<{
    heading: string;
    body: string;
  }>;
  nextActions: string[];
  sourceCardTitles: string[];
  generatedAt: number;
}

export interface BrainstormSession {
  id: string;
  title: string;
  seedPrompt: string;
  sessionConstraints?: string;
  updatedAt: number;
  cards: IdeaCard[];
  graveyard: GraveyardEntry[];
  brief?: SynthesizedBrief | null;
}

export type AiProvider = "gemini" | "openrouter";

export interface OpenRouterModelInfo {
  id: string;
  name: string;
  contextLength?: number;
}

export interface DeckTuningConfig {
  provider: AiProvider;
  openRouterModel: string;
  reasoningPreset: ReasoningPreset;
  divergence: DivergenceLevel;
  globalContext: string;
}

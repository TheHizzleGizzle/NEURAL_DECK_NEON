import type {
  BrainstormSession,
  CreativeSkill,
  DeckTuningConfig,
  DivergenceLevel,
  ReasoningPreset,
  UiPreferences,
} from "../types/deck";
import { BUILT_IN_SKILLS } from "../data/builtInSkills";
import { createStarterSession } from "../data/starterSession";

const SESSIONS_KEY = "neural_deck_sessions_v1";
const CUSTOM_SKILLS_KEY = "neural_deck_custom_skills_v1";
const ACTIVE_SESSION_KEY = "neural_deck_active_session_id";
const TUNING_KEY = "neural_deck_tuning_v2";
const LEGACY_AI_CONFIG_KEY = "neural_deck_ai_config_v1";
const UI_PREFS_KEY = "neural_deck_ui_prefs_v1";

export function getDefaultUiPreferences(): UiPreferences {
  return {
    theme: "dark",
    showGrid: true,
    compactCards: false,
  };
}

export function loadUiPreferences(): UiPreferences {
  const defaults = getDefaultUiPreferences();
  try {
    const raw = localStorage.getItem(UI_PREFS_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as Partial<UiPreferences>;
    return {
      theme: parsed.theme === "light" ? "light" : "dark",
      showGrid:
        typeof parsed.showGrid === "boolean"
          ? parsed.showGrid
          : defaults.showGrid,
      compactCards:
        typeof parsed.compactCards === "boolean"
          ? parsed.compactCards
          : defaults.compactCards,
    };
  } catch {
    return defaults;
  }
}

export function saveUiPreferences(prefs: UiPreferences): void {
  try {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore storage errors
  }
}

export function getDefaultTuning(): DeckTuningConfig {
  return {
    provider: "gemini",
    openRouterModel: "anthropic/claude-sonnet-4",
    reasoningPreset: "balanced",
    divergence: "balanced",
    globalContext: "",
  };
}

export function loadTuningConfig(): DeckTuningConfig {
  const defaults = getDefaultTuning();
  try {
    const raw = localStorage.getItem(TUNING_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DeckTuningConfig>;
      const provider =
        parsed.provider === "openrouter" ? "openrouter" : "gemini";
      const openRouterModel =
        typeof parsed.openRouterModel === "string" &&
        parsed.openRouterModel.trim().length > 0
          ? parsed.openRouterModel.trim()
          : defaults.openRouterModel;
      const preset: ReasoningPreset =
        parsed.reasoningPreset === "fast" ||
        parsed.reasoningPreset === "balanced" ||
        parsed.reasoningPreset === "deep"
          ? parsed.reasoningPreset
          : defaults.reasoningPreset;
      const divergence: DivergenceLevel =
        parsed.divergence === "grounded" ||
        parsed.divergence === "balanced" ||
        parsed.divergence === "wild"
          ? parsed.divergence
          : defaults.divergence;
      return {
        provider,
        openRouterModel,
        reasoningPreset: preset,
        divergence,
        globalContext:
          typeof parsed.globalContext === "string" ? parsed.globalContext : "",
      };
    }

    // Migrate globalContext cleanly from legacy config if present
    const legacyRaw = localStorage.getItem(LEGACY_AI_CONFIG_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw) as { globalContext?: string };
      if (typeof legacy.globalContext === "string" && legacy.globalContext.trim()) {
        return { ...defaults, globalContext: legacy.globalContext.trim() };
      }
    }
  } catch {
    // Fall back to defaults
  }
  return defaults;
}

export function saveTuningConfig(config: DeckTuningConfig): void {
  try {
    localStorage.setItem(TUNING_KEY, JSON.stringify(config));
  } catch {
    // Ignore quota errors
  }
}

export function loadSessions(): BrainstormSession[] {
  try {
    const raw = localStorage.getItem(SESSIONS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as BrainstormSession[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Fall through to starter session
  }
  const starter = createStarterSession();
  saveSessions([starter]);
  setActiveSessionId(starter.id);
  return [starter];
}

export function saveSessions(sessions: BrainstormSession[]): void {
  try {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore quota errors
  }
}

export function getActiveSessionId(): string {
  try {
    return localStorage.getItem(ACTIVE_SESSION_KEY) || "";
  } catch {
    return "";
  }
}

export function setActiveSessionId(sessionId: string): void {
  try {
    localStorage.setItem(ACTIVE_SESSION_KEY, sessionId);
  } catch {
    // Ignore storage errors
  }
}

export function loadCustomSkills(): CreativeSkill[] {
  try {
    const raw = localStorage.getItem(CUSTOM_SKILLS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CreativeSkill[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((s) => ({ ...s, builtIn: false }));
  } catch {
    return [];
  }
}

export function saveCustomSkills(skills: CreativeSkill[]): void {
  try {
    const customOnly = skills.filter((s) => !s.builtIn);
    localStorage.setItem(CUSTOM_SKILLS_KEY, JSON.stringify(customOnly));
  } catch {
    // Ignore storage errors
  }
}

export function loadAllSkills(): CreativeSkill[] {
  return [...BUILT_IN_SKILLS, ...loadCustomSkills()];
}

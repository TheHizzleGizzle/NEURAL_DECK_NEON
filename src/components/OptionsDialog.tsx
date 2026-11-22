import React, { useEffect, useMemo, useState } from "react";
import type {
  AiProvider,
  DeckTuningConfig,
  DivergenceLevel,
  OpenRouterModelInfo,
  ReasoningPreset,
  ThemeMode,
  UiPreferences,
} from "../types/deck";
import { usePWAInstall } from "../hooks/usePWAInstall";
import { PxSlidersIcon } from "./PixelIcons";

interface OptionsDialogProps {
  open: boolean;
  onClose: () => void;
  prefs: UiPreferences;
  tuning: DeckTuningConfig;
  openRouterConnected: boolean;
  openRouterConnecting: boolean;
  openRouterModels: OpenRouterModelInfo[];
  featuredModels: OpenRouterModelInfo[];
  onConnectOpenRouter: () => void;
  onDisconnectOpenRouter: () => void;
  onUpdatePrefs: (next: UiPreferences) => void;
  onUpdateTuning: (next: DeckTuningConfig) => void;
  onExportBackupJson: () => void;
}

const THEMES: Array<{ id: ThemeMode; label: string; desc: string }> = [
  { id: "dark", label: "Dark Mode", desc: "Midnight cyber-deck" },
  { id: "light", label: "Light Mode", desc: "Daylight blueprint" },
];

const PROVIDERS: Array<{ id: AiProvider; label: string; desc: string }> = [
  { id: "gemini", label: "Built-in Gemini", desc: "Ready immediately" },
  {
    id: "openrouter",
    label: "OpenRouter OAuth",
    desc: "Use your account & models",
  },
];

const DIVERGENCE_OPTIONS: Array<{ id: DivergenceLevel; label: string }> = [
  { id: "grounded", label: "Grounded" },
  { id: "balanced", label: "Balanced" },
  { id: "wild", label: "Wild" },
];

const REASONING_OPTIONS: Array<{ id: ReasoningPreset; label: string }> = [
  { id: "fast", label: "Fast" },
  { id: "balanced", label: "Balanced" },
  { id: "deep", label: "Deep" },
];

export const OptionsDialog: React.FC<OptionsDialogProps> = ({
  open,
  onClose,
  prefs,
  tuning,
  openRouterConnected,
  openRouterConnecting,
  openRouterModels,
  featuredModels,
  onConnectOpenRouter,
  onDisconnectOpenRouter,
  onUpdatePrefs,
  onUpdateTuning,
  onExportBackupJson,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [modelSearch, setModelSearch] = useState("");

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  const filteredModels = useMemo(() => {
    const q = modelSearch.trim().toLowerCase();
    const source = openRouterModels.length > 0 ? openRouterModels : featuredModels;
    if (!q) return source;
    return source.filter(
      (m) =>
        m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)
    );
  }, [modelSearch, openRouterModels, featuredModels]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Deck Options"
    >
      <div
        className="px-panel max-h-[90vh] w-full max-w-[540px] overflow-y-auto p-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-[8px] border-b border-[var(--deck-border)] pb-[10px]">
          <div className="flex items-center gap-[8px]">
            <PxSlidersIcon size={16} color="var(--deck-cyan)" />
            <h2 className="font-mono text-[14px] font-bold tracking-[0.04em] text-[var(--deck-cyan)]">
              Options
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-chip-idle h-[28px] cursor-pointer px-[10px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
          >
            Done
          </button>
        </div>

        <div className="mt-[14px] space-y-[18px]">
          {/* AI Engine & Multi-User OAuth Model Selection */}
          <div className="space-y-[10px]">
            <div className="flex items-center justify-between gap-[8px]">
              <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
                AI Engine &amp; Model Selection
              </div>
              {tuning.provider === "openrouter" && (
                <span
                  className={`font-mono text-[10px] font-bold ${
                    openRouterConnected
                      ? "text-[var(--deck-green)]"
                      : "text-[var(--deck-amber)]"
                  }`}
                >
                  {openRouterConnected ? "OAuth Connected" : "Not Connected"}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-[8px]">
              {PROVIDERS.map((p) => {
                const active = tuning.provider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onUpdateTuning({ ...tuning, provider: p.id })
                    }
                    className={`cursor-pointer p-[10px] text-left ${
                      active
                        ? "px-chip-active"
                        : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                    }`}
                  >
                    <div className="font-mono text-[12px] font-bold">
                      {p.label}
                    </div>
                    <div className="mt-[2px] text-[11px] opacity-80">
                      {p.desc}
                    </div>
                  </button>
                );
              })}
            </div>

            {tuning.provider === "openrouter" ? (
              <div className="space-y-[10px] border border-[var(--deck-border)] bg-[var(--deck-panel-alt)] p-[12px]">
                <div className="flex flex-wrap items-center justify-between gap-[8px]">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono text-[12px] font-bold text-[var(--deck-text)]">
                      {openRouterConnected
                        ? "Your OpenRouter Account"
                        : "Connect via OpenRouter OAuth"}
                    </div>
                    <div className="mt-[2px] text-[11px] leading-[1.4] text-[var(--deck-text-muted)]">
                      {openRouterConnected
                        ? "Requests run on your own OpenRouter credits through the server proxy for this session."
                        : "Sign in with your own OpenRouter account so your brainstorms use your credits and chosen model."}
                    </div>
                  </div>
                  {openRouterConnected ? (
                    <button
                      type="button"
                      onClick={onDisconnectOpenRouter}
                      className="px-btn-crimson h-[32px] shrink-0 cursor-pointer px-[12px] font-mono text-[11px] font-bold whitespace-nowrap"
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={openRouterConnecting}
                      onClick={onConnectOpenRouter}
                      className="px-btn-cyan h-[32px] shrink-0 cursor-pointer px-[12px] font-mono text-[11px] font-bold whitespace-nowrap disabled:opacity-50"
                    >
                      {openRouterConnecting
                        ? "Opening..."
                        : "Connect OpenRouter"}
                    </button>
                  )}
                </div>

                {/* Quick-Pick Models */}
                <div className="border-t border-[var(--deck-border)] pt-[10px]">
                  <div className="mb-[6px] font-mono text-[10px] font-bold text-[var(--deck-text-muted)]">
                    Popular Models
                  </div>
                  <div className="grid grid-cols-2 gap-[6px]">
                    {featuredModels.map((m) => {
                      const active = tuning.openRouterModel === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() =>
                            onUpdateTuning({ ...tuning, openRouterModel: m.id })
                          }
                          className={`cursor-pointer truncate px-[8px] py-[6px] text-left font-mono text-[10px] font-bold ${
                            active
                              ? "px-chip-active"
                              : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                          }`}
                          title={m.id}
                        >
                          {m.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Full OpenRouter Catalog Picker */}
                <div className="space-y-[6px]">
                  <label
                    htmlFor="openrouter-model-select"
                    className="block font-mono text-[10px] font-bold text-[var(--deck-text-muted)]"
                  >
                    Model Catalog ({filteredModels.length} available)
                  </label>
                  <input
                    type="search"
                    value={modelSearch}
                    onChange={(e) => setModelSearch(e.target.value)}
                    placeholder="Filter models (e.g. claude, gpt, deepseek, llama)..."
                    aria-label="Filter OpenRouter models"
                    className="px-terminal-input h-[32px] w-full px-[10px] text-[12px]"
                  />
                  <select
                    id="openrouter-model-select"
                    value={tuning.openRouterModel}
                    onChange={(e) =>
                      onUpdateTuning({
                        ...tuning,
                        openRouterModel: e.target.value,
                      })
                    }
                    className="px-terminal-input h-[34px] w-full px-[8px] font-mono text-[11px]"
                  >
                    {!filteredModels.some(
                      (m) => m.id === tuning.openRouterModel
                    ) && (
                      <option value={tuning.openRouterModel}>
                        {tuning.openRouterModel}
                      </option>
                    )}
                    {filteredModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="border border-[var(--deck-border)] bg-[var(--deck-panel-alt)] px-[12px] py-[9px] text-[11px] leading-[1.45] text-[var(--deck-text-muted)]">
                Using built-in <strong className="text-[var(--deck-text)]">Gemini 4</strong>{" "}
                (or <strong className="text-[var(--deck-text)]">Gemini 3.1 Flash Lite</strong>{" "}
                in Fast mode). Switch to <strong className="text-[var(--deck-text)]">OpenRouter OAuth</strong>{" "}
                above to connect your own account and pick Claude, GPT, DeepSeek, or Llama models.
              </div>
            )}
          </div>

          {/* Appearance / Theme */}
          <div className="border-t border-[var(--deck-border)] pt-[14px]">
            <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
              Appearance
            </div>
            <div className="mt-[6px] grid grid-cols-2 gap-[8px]">
              {THEMES.map((t) => {
                const active = prefs.theme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onUpdatePrefs({ ...prefs, theme: t.id })}
                    className={`cursor-pointer p-[10px] text-left ${
                      active
                        ? "px-chip-active"
                        : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                    }`}
                  >
                    <div className="font-mono text-[12px] font-bold">
                      {t.label}
                    </div>
                    <div className="mt-[2px] text-[11px] opacity-80">
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Workspace Display Toggles */}
          <div className="space-y-[8px]">
            <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
              Workspace Display
            </div>

            <div className="flex items-center justify-between border border-[var(--deck-border)] bg-[var(--deck-panel-alt)] px-[12px] py-[9px]">
              <div>
                <div className="font-mono text-[12px] font-bold text-[var(--deck-text)]">
                  Dot-Grid Backdrop
                </div>
                <div className="text-[11px] text-[var(--deck-text-muted)]">
                  Show pixel drafting grid behind panels
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Toggle Dot-Grid Backdrop"
                aria-checked={prefs.showGrid}
                onClick={() =>
                  onUpdatePrefs({ ...prefs, showGrid: !prefs.showGrid })
                }
                className={`h-[28px] min-w-[60px] cursor-pointer px-[10px] font-mono text-[11px] font-bold ${
                  prefs.showGrid
                    ? "px-chip-active"
                    : "px-chip-idle text-[var(--deck-text-muted)]"
                }`}
              >
                {prefs.showGrid ? "On" : "Off"}
              </button>
            </div>

            <div className="flex items-center justify-between border border-[var(--deck-border)] bg-[var(--deck-panel-alt)] px-[12px] py-[9px]">
              <div>
                <div className="font-mono text-[12px] font-bold text-[var(--deck-text)]">
                  Compact Idea Cards
                </div>
                <div className="text-[11px] text-[var(--deck-text-muted)]">
                  Tighter card spacing for larger idea trees
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-label="Toggle Compact Idea Cards"
                aria-checked={prefs.compactCards}
                onClick={() =>
                  onUpdatePrefs({ ...prefs, compactCards: !prefs.compactCards })
                }
                className={`h-[28px] min-w-[60px] cursor-pointer px-[10px] font-mono text-[11px] font-bold ${
                  prefs.compactCards
                    ? "px-chip-active"
                    : "px-chip-idle text-[var(--deck-text-muted)]"
                }`}
              >
                {prefs.compactCards ? "On" : "Off"}
              </button>
            </div>
          </div>

          {/* AI Engine Tuning (synced with Context tab) */}
          <div className="space-y-[10px] border-t border-[var(--deck-border)] pt-[14px]">
            <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
              AI Brainstorm Tuning
            </div>

            <div>
              <div className="mb-[5px] text-[11px] text-[var(--deck-text-muted)]">
                Divergence Style
              </div>
              <div className="grid grid-cols-3 gap-[6px]">
                {DIVERGENCE_OPTIONS.map((opt) => {
                  const active = tuning.divergence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateTuning({ ...tuning, divergence: opt.id })
                      }
                      className={`h-[32px] cursor-pointer font-mono text-[11px] font-bold ${
                        active
                          ? "px-chip-active"
                          : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {tuning.provider === "gemini" && (
              <div>
                <div className="mb-[5px] text-[11px] text-[var(--deck-text-muted)]">
                  Gemini Reasoning Depth
                </div>
                <div className="grid grid-cols-3 gap-[6px]">
                  {REASONING_OPTIONS.map((opt) => {
                    const active = tuning.reasoningPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateTuning({ ...tuning, reasoningPreset: opt.id })
                        }
                        className={`h-[32px] cursor-pointer font-mono text-[11px] font-bold ${
                          active
                            ? "px-chip-active"
                            : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Install as App (PWA) */}
          <div className="border-t border-[var(--deck-border)] pt-[14px]">
            <div className="flex items-center justify-between gap-[10px]">
              <div>
                <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
                  Install App (PWA)
                </div>
                <div className="text-[11px] text-[var(--deck-text-muted)]">
                  {isInstalled
                    ? "Running in standalone app mode with offline cache."
                    : isInstallable
                    ? "Install on desktop or mobile for a standalone window & offline access."
                    : isIOS
                    ? "In Safari, tap Share → Add to Home Screen to install."
                    : "Use your browser address bar Install icon (or Add to Home Screen on mobile)."}
                </div>
              </div>
              {isInstallable && !isInstalled && (
                <button
                  type="button"
                  onClick={() => void install()}
                  className="px-btn-green h-[32px] shrink-0 cursor-pointer px-[12px] font-mono text-[11px] font-bold whitespace-nowrap"
                >
                  Install App
                </button>
              )}
              {isInstalled && (
                <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--deck-green)]">
                  Installed
                </span>
              )}
            </div>
          </div>

          {/* Local Data Backup */}
          <div className="border-t border-[var(--deck-border)] pt-[14px]">
            <div className="flex items-center justify-between gap-[10px]">
              <div>
                <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
                  Local Data Backup
                </div>
                <div className="text-[11px] text-[var(--deck-text-muted)]">
                  Download all sessions &amp; custom skills as JSON
                </div>
              </div>
              <button
                type="button"
                onClick={onExportBackupJson}
                className="px-chip-active h-[32px] shrink-0 cursor-pointer px-[12px] font-mono text-[11px] font-bold whitespace-nowrap"
              >
                Download JSON
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

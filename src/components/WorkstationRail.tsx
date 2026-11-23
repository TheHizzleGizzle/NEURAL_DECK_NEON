import React, { useId, useState } from "react";
import type {
  BriefFormat,
  DeckTuningConfig,
  DivergenceLevel,
  GraveyardEntry,
  IdeaCard,
  IdeaRatings,
  RailTab,
  ReasoningPreset,
  SynthesizedBrief,
} from "../types/deck";
import { classifyQuadrant } from "../utils/treeUtils";
import {
  PxSkullIcon,
  PxSlidersIcon,
  PxSparkIcon,
  PxStarIcon,
  PxTargetIcon,
} from "./PixelIcons";

interface WorkstationRailProps {
  activeTab: RailTab;
  onTabChange: (tab: RailTab) => void;
  starredCards: IdeaCard[];
  graveyard: GraveyardEntry[];
  brief: SynthesizedBrief | null | undefined;
  sessionConstraints: string;
  tuning: DeckTuningConfig;
  isSynthesizing: boolean;
  onUpdateRatings: (cardId: string, ratings: IdeaRatings) => void;
  onToggleStar: (card: IdeaCard) => void;
  onSynthesizeBrief: (format: BriefFormat) => void;
  onClearBrief: () => void;
  onCopyBrief: (brief: SynthesizedBrief) => void;
  onToggleGraveMute: (entryId: string) => void;
  onReviveGraveEntry: (entry: GraveyardEntry) => void;
  onPurgeGraveEntry: (entryId: string) => void;
  onUpdateSessionConstraints: (value: string) => void;
  onUpdateTuning: (next: DeckTuningConfig) => void;
}

const BRIEF_FORMATS: Array<{ id: BriefFormat; label: string }> = [
  { id: "mvp_48h", label: "48h MVP" },
  { id: "product_spec", label: "1-Page Spec" },
  { id: "tradeoff_matrix", label: "Tradeoffs" },
];

const DIVERGENCE_OPTIONS: Array<{
  id: DivergenceLevel;
  label: string;
  desc: string;
}> = [
  { id: "grounded", label: "Grounded", desc: "Pragmatic & shippable" },
  { id: "balanced", label: "Balanced", desc: "Fresh yet concrete" },
  { id: "wild", label: "Wild", desc: "Lateral & unconventional" },
];

const REASONING_OPTIONS: Array<{
  id: ReasoningPreset;
  label: string;
  desc: string;
}> = [
  { id: "fast", label: "Fast", desc: "Quick rapid-fire drafts" },
  { id: "balanced", label: "Balanced", desc: "Default Gemini 4 depth" },
  { id: "deep", label: "Deep", desc: "Max strategic reasoning" },
];

function quadrantVarColor(
  label: "Quick Win" | "Big Bet" | "Incremental" | "Reconsider"
): string {
  if (label === "Quick Win") return "var(--deck-green)";
  if (label === "Big Bet") return "var(--deck-cyan)";
  if (label === "Incremental") return "var(--deck-amber)";
  return "var(--deck-crimson)";
}

export const WorkstationRail: React.FC<WorkstationRailProps> = ({
  activeTab,
  onTabChange,
  starredCards,
  graveyard,
  brief,
  sessionConstraints,
  tuning,
  isSynthesizing,
  onUpdateRatings,
  onToggleStar,
  onSynthesizeBrief,
  onClearBrief,
  onCopyBrief,
  onToggleGraveMute,
  onReviveGraveEntry,
  onPurgeGraveEntry,
  onUpdateSessionConstraints,
  onUpdateTuning,
}) => {
  const [briefFormat, setBriefFormat] = useState<BriefFormat>("mvp_48h");
  const [confirmPurgeId, setConfirmPurgeId] = useState<string | null>(null);
  const sessionConstraintsId = useId();
  const globalContextId = useId();

  const activeGuardrailCount = graveyard.filter((g) => g.activeInPrompts).length;

  return (
    <aside
      aria-label="Convergence, Graveyard, and Deck Tuning"
      className="px-panel flex h-full min-h-0 flex-col"
    >
      {/* Rail Tabs */}
      <div
        role="tablist"
        aria-label="Workstation panels"
        className="grid shrink-0 grid-cols-3 border-b-2 border-[var(--deck-border)] bg-[var(--deck-panel-alt)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "shortlist"}
          onClick={() => onTabChange("shortlist")}
          className={`flex h-[42px] cursor-pointer items-center justify-center gap-[5px] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap ${
            activeTab === "shortlist"
              ? "border-b-2 border-[var(--deck-cyan)] bg-[var(--deck-tab-shortlist-bg)] text-[var(--deck-cyan)]"
              : "text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
          }`}
        >
          <PxTargetIcon
            size={12}
            color={
              activeTab === "shortlist"
                ? "var(--deck-cyan)"
                : "var(--deck-text-muted)"
            }
          />
          <span>Shortlist ({starredCards.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "graveyard"}
          onClick={() => onTabChange("graveyard")}
          className={`flex h-[42px] cursor-pointer items-center justify-center gap-[5px] border-x border-[var(--deck-border)] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap ${
            activeTab === "graveyard"
              ? "border-b-2 border-[var(--deck-crimson)] bg-[var(--deck-tab-grave-bg)] text-[var(--deck-crimson)]"
              : "text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
          }`}
        >
          <PxSkullIcon
            size={12}
            color={
              activeTab === "graveyard"
                ? "var(--deck-crimson)"
                : "var(--deck-text-muted)"
            }
          />
          <span>Grave ({graveyard.length})</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "tuning"}
          onClick={() => onTabChange("tuning")}
          className={`flex h-[42px] cursor-pointer items-center justify-center gap-[5px] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap ${
            activeTab === "tuning"
              ? "border-b-2 border-[var(--deck-green)] bg-[var(--deck-tab-tuning-bg)] text-[var(--deck-green)]"
              : "text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
          }`}
        >
          <PxSlidersIcon
            size={12}
            color={
              activeTab === "tuning"
                ? "var(--deck-green)"
                : "var(--deck-text-muted)"
            }
          />
          <span>Context</span>
        </button>
      </div>

      {/* Rail Body */}
      <div className="min-h-0 flex-1 overflow-y-auto p-[14px]">
        {/* TAB 1: CONVERGENCE SHORTLIST & BRIEF SYNTHESIS */}
        {activeTab === "shortlist" && (
          <div className="space-y-[14px]">
            <div>
              <h2 className="font-mono text-[12px] font-bold tracking-[0.04em] text-[var(--deck-cyan)]">
                Convergence Shortlist
              </h2>
              <p className="mt-[4px] text-[12px] leading-[1.45] text-[var(--deck-text-muted)]">
                Rate your starred finalists on Impact and Effort, then distill
                them into a shippable decision brief.
              </p>
            </div>

            {starredCards.length === 0 ? (
              <div className="px-terminal-input p-[16px] text-center">
                <p className="font-mono text-[12px] font-bold text-[var(--deck-text)]">
                  No finalists starred yet
                </p>
                <p className="mt-[6px] text-[12px] leading-[1.45] text-[var(--deck-text-muted)]">
                  Click the star icon on promising idea cards in the tree to
                  build your shortlist here.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-[8px]">
                  {starredCards.map((card) => {
                    const ratings = card.ratings ?? { impact: 3, effort: 3 };
                    const quad = card.ratings ? classifyQuadrant(card.ratings) : null;
                    return (
                      <div
                        key={card.id}
                        className="border border-[var(--deck-border)] bg-[var(--deck-subcard)] p-[9px]"
                        data-testid="shortlist-item"
                      >
                        <div className="flex items-start gap-[6px]">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-[6px] gap-y-[2px]">
                              <span className="font-mono text-[12px] font-bold text-[var(--deck-text)]">
                                {card.title}
                              </span>
                              {quad && (
                                <span
                                  className="font-mono text-[10px] font-bold"
                                  style={{ color: quadrantVarColor(quad.label) }}
                                >
                                  · {quad.label}
                                </span>
                              )}
                            </div>
                            <p className="mt-[2px] line-clamp-1 text-[11px] leading-[1.35] text-[var(--deck-text-muted)]">
                              {card.summary}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onToggleStar(card)}
                            aria-label={`Remove ${card.title} from shortlist`}
                            className="shrink-0 cursor-pointer p-[4px] hover:brightness-110"
                          >
                            <PxStarIcon size={14} color="var(--deck-amber)" />
                          </button>
                        </div>

                        {/* Human Impact & Effort Rating Controls */}
                        <div className="mt-[7px] space-y-[5px] border-t border-[var(--deck-border)] pt-[6px]">
                          <div className="flex items-center justify-between gap-[8px]">
                            <span className="font-mono text-[10px] font-bold text-[var(--deck-text-muted)]">
                              Impact
                            </span>
                            <div
                              className="flex gap-[3px]"
                              role="group"
                              aria-label={`Impact rating for ${card.title}`}
                            >
                              {[1, 2, 3, 4, 5].map((n) => {
                                const active =
                                  card.ratings && card.ratings.impact === n;
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                      onUpdateRatings(card.id, {
                                        impact: n,
                                        effort: ratings.effort,
                                      })
                                    }
                                    aria-label={`Set ${card.title} impact to ${n}`}
                                    aria-pressed={Boolean(active)}
                                    className={`px-touch-ctrl h-[26px] min-w-[26px] cursor-pointer font-mono text-[10px] font-bold ${
                                      active
                                        ? "bg-[var(--deck-green)] text-white dark:text-[#050811]"
                                        : "border border-[var(--deck-border-strong)] bg-[var(--deck-panel-alt)] text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                                    }`}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between gap-[8px]">
                            <span className="font-mono text-[10px] font-bold text-[var(--deck-text-muted)]">
                              Effort
                            </span>
                            <div
                              className="flex gap-[3px]"
                              role="group"
                              aria-label={`Effort rating for ${card.title}`}
                            >
                              {[1, 2, 3, 4, 5].map((n) => {
                                const active =
                                  card.ratings && card.ratings.effort === n;
                                return (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() =>
                                      onUpdateRatings(card.id, {
                                        impact: ratings.impact,
                                        effort: n,
                                      })
                                    }
                                    aria-label={`Set ${card.title} effort to ${n}`}
                                    aria-pressed={Boolean(active)}
                                    className={`px-touch-ctrl h-[26px] min-w-[26px] cursor-pointer font-mono text-[10px] font-bold ${
                                      active
                                        ? "bg-[var(--deck-amber)] text-white dark:text-[#050811]"
                                        : "border border-[var(--deck-border-strong)] bg-[var(--deck-panel-alt)] text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                                    }`}
                                  >
                                    {n}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Brief Synthesis Controls */}
                <div className="border border-[var(--deck-border)] bg-[var(--deck-panel-alt)] p-[12px]">
                  <div className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
                    Synthesize Decision Brief
                  </div>
                  <p className="mt-[3px] text-[12px] text-[var(--deck-text-muted)]">
                    Combines your {starredCards.length} starred finalist
                    {starredCards.length === 1 ? "" : "s"}, ratings, and{" "}
                    {activeGuardrailCount} active Graveyard guardrail
                    {activeGuardrailCount === 1 ? "" : "s"}.
                  </p>

                  <div className="mt-[10px] grid grid-cols-3 gap-[6px]">
                    {BRIEF_FORMATS.map((f) => {
                      const active = briefFormat === f.id;
                      return (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => setBriefFormat(f.id)}
                          className={`h-[30px] cursor-pointer px-[6px] font-mono text-[10px] font-bold whitespace-nowrap ${
                            active
                              ? "px-chip-active"
                              : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                          }`}
                        >
                          {f.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    disabled={isSynthesizing}
                    onClick={() => onSynthesizeBrief(briefFormat)}
                    className="px-btn-cyan mt-[10px] flex h-[36px] w-full cursor-pointer items-center justify-center gap-[6px] font-mono text-[11px] font-bold hover:brightness-110 disabled:opacity-50"
                  >
                    <PxSparkIcon size={13} color="var(--deck-cyan-btn-text)" />
                    <span>
                      {isSynthesizing
                        ? "Synthesizing Brief..."
                        : "Synthesize Action Brief"}
                    </span>
                  </button>
                </div>
              </>
            )}

            {/* Rendered Convergence Brief */}
            {brief && (
              <section
                aria-label="Synthesized Decision Brief"
                className="px-cartridge space-y-[10px] p-[13px]"
              >
                <div className="flex items-start justify-between gap-[8px]">
                  <div>
                    <div className="font-mono text-[10px] font-bold text-[var(--deck-green)]">
                      Decision Brief
                    </div>
                    <h3 className="mt-[2px] font-mono text-[14px] font-bold text-[var(--deck-text)]">
                      {brief.title}
                    </h3>
                  </div>
                  <div className="flex shrink-0 gap-[4px]">
                    <button
                      type="button"
                      onClick={() => onCopyBrief(brief)}
                      className="px-chip-idle h-[26px] cursor-pointer px-[8px] font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      onClick={onClearBrief}
                      className="px-chip-idle h-[26px] cursor-pointer px-[8px] font-mono text-[10px] font-bold text-[var(--deck-text-muted)]"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <p className="bg-[var(--deck-green-soft)] px-[10px] py-[8px] text-[13px] leading-[1.45] font-medium text-[var(--deck-text)]">
                  {brief.verdict}
                </p>

                <div className="space-y-[10px]">
                  {brief.sections.map((sec, i) => (
                    <div key={i}>
                      <h4 className="font-mono text-[11px] font-bold text-[var(--deck-cyan)]">
                        {sec.heading}
                      </h4>
                      <p className="mt-[3px] text-[12px] leading-[1.5] text-[var(--deck-text-body)]">
                        {sec.body}
                      </p>
                    </div>
                  ))}
                </div>

                {brief.nextActions.length > 0 && (
                  <div className="border-t border-[var(--deck-border)] pt-[8px]">
                    <h4 className="font-mono text-[11px] font-bold text-[var(--deck-amber)]">
                      Next Actions
                    </h4>
                    <ul className="mt-[4px] list-disc space-y-[4px] pl-[16px] text-[12px] leading-[1.45] text-[var(--deck-text-body)]">
                      {brief.nextActions.map((act, i) => (
                        <li key={i}>{act}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>
            )}
          </div>
        )}

        {/* TAB 2: IDEA GRAVEYARD (NEGATIVE MEMORY) */}
        {activeTab === "graveyard" && (
          <div className="space-y-[12px]">
            <div>
              <h2 className="font-mono text-[12px] font-bold tracking-[0.04em] text-[var(--deck-crimson)]">
                Idea Graveyard · Negative Memory
              </h2>
              <p className="mt-[4px] text-[12px] leading-[1.45] text-[var(--deck-text-muted)]">
                {activeGuardrailCount} active guardrail
                {activeGuardrailCount === 1
                  ? " automatically steers"
                  : "s automatically steer"}{" "}
                AI away from rejected tropes across every branch and brief.
              </p>
            </div>

            {graveyard.length === 0 ? (
              <div className="px-terminal-input p-[16px] text-center">
                <p className="font-mono text-[12px] font-bold text-[var(--deck-text-muted)]">
                  Graveyard is empty
                </p>
                <p className="mt-[4px] text-[12px] text-[var(--deck-text-faint)]">
                  Banish weak or cliché ideas from the tree to lock in
                  anti-pattern guardrails.
                </p>
              </div>
            ) : (
              <div className="space-y-[10px]">
                {graveyard.map((entry) => {
                  const childCount = entry.archivedSubtree?.length ?? 0;
                  const confirmingPurge = confirmPurgeId === entry.id;
                  return (
                    <div
                      key={entry.id}
                      className="border border-[var(--deck-grave-border)] bg-[var(--deck-grave-card)] p-[11px]"
                      data-testid="graveyard-entry"
                    >
                      <div className="flex items-center justify-between gap-[6px]">
                        <span className="font-mono text-[10px] font-bold text-[var(--deck-crimson)]">
                          {entry.reasonTag}
                        </span>
                        <span
                          className={`font-mono text-[10px] font-bold ${
                            entry.activeInPrompts
                              ? "text-[var(--deck-green)]"
                              : "text-[var(--deck-text-faint)]"
                          }`}
                        >
                          {entry.activeInPrompts ? "Active" : "Muted"}
                        </span>
                      </div>

                      {entry.archivedCard && (
                        <div className="mt-[5px] font-mono text-[13px] font-bold text-[var(--deck-text)]">
                          {entry.archivedCard.title}
                          {childCount > 0 && (
                            <span className="ml-[6px] font-mono text-[10px] font-normal text-[var(--deck-text-muted)]">
                              (+{childCount} child
                              {childCount === 1 ? "" : "ren"})
                            </span>
                          )}
                        </div>
                      )}

                      <p className="mt-[4px] mb-[10px] text-[12px] leading-[1.45] text-[var(--deck-text-body)]">
                        {entry.antiPatternRule}
                      </p>

                      {confirmingPurge ? (
                        <div className="flex items-center justify-between gap-[6px] border border-[var(--deck-crimson)] bg-[var(--deck-crimson-bg)] p-[6px]">
                          <span className="font-mono text-[10px] font-bold text-[var(--deck-crimson)]">
                            Purge permanently?
                          </span>
                          <div className="flex gap-[6px]">
                            <button
                              type="button"
                              onClick={() => setConfirmPurgeId(null)}
                              className="px-chip-idle cursor-pointer px-[8px] py-[4px] font-mono text-[10px] font-bold text-[var(--deck-text-muted)]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onPurgeGraveEntry(entry.id);
                                setConfirmPurgeId(null);
                              }}
                              className="cursor-pointer bg-[var(--deck-crimson)] px-[8px] py-[4px] font-mono text-[10px] font-bold text-white"
                            >
                              Confirm Purge
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-[6px]">
                          <button
                            type="button"
                            onClick={() => onToggleGraveMute(entry.id)}
                            className="px-chip-idle cursor-pointer px-[8px] py-[5px] font-mono text-[10px] font-bold text-[var(--deck-cyan)] hover:brightness-110"
                          >
                            {entry.activeInPrompts ? "Mute Rule" : "Enable Rule"}
                          </button>

                          {entry.archivedCard && (
                            <button
                              type="button"
                              onClick={() => onReviveGraveEntry(entry)}
                              className="px-chip-idle cursor-pointer px-[8px] py-[5px] font-mono text-[10px] font-bold text-[var(--deck-green)] hover:brightness-110"
                            >
                              {childCount > 0
                                ? `Revive Branch (${childCount + 1})`
                                : "Revive Node"}
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setConfirmPurgeId(entry.id)}
                            className="px-chip-idle cursor-pointer px-[8px] py-[5px] font-mono text-[10px] font-bold text-[var(--deck-crimson)] hover:brightness-110"
                          >
                            Purge
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SESSION CONTEXT & DECK TUNING */}
        {activeTab === "tuning" && (
          <div className="space-y-[16px]">
            <div>
              <h2 className="font-mono text-[12px] font-bold tracking-[0.04em] text-[var(--deck-green)]">
                Session Context &amp; Tuning
              </h2>
              <p className="mt-[4px] text-[12px] leading-[1.45] text-[var(--deck-text-muted)]">
                Shape every spark, branch, splice, and decision brief without
                repeating yourself.
              </p>
            </div>

            {/* Session-Specific Constraints */}
            <div>
              <label
                htmlFor={sessionConstraintsId}
                className="block font-mono text-[11px] font-bold text-[var(--deck-cyan)]"
              >
                Session Constraints &amp; Target Audience
              </label>
              <p className="mt-[2px] text-[11px] text-[var(--deck-text-muted)]">
                Applies to this session only (budget, tech stack, vibe, hard
                rules).
              </p>
              <textarea
                id={sessionConstraintsId}
                value={sessionConstraints}
                onChange={(e) => onUpdateSessionConstraints(e.target.value)}
                rows={3}
                placeholder="e.g. Weekend build, offline-first mobile web, no account wall..."
                className="px-terminal-input mt-[6px] w-full resize-y p-[10px] text-[12px] leading-[1.45]"
              />
            </div>

            {/* Global Persona */}
            <div>
              <label
                htmlFor={globalContextId}
                className="block font-mono text-[11px] font-bold text-[var(--deck-cyan)]"
              >
                Global Persona &amp; Defaults
              </label>
              <p className="mt-[2px] text-[11px] text-[var(--deck-text-muted)]">
                Carried across all sessions in this browser.
              </p>
              <textarea
                id={globalContextId}
                value={tuning.globalContext}
                onChange={(e) =>
                  onUpdateTuning({ ...tuning, globalContext: e.target.value })
                }
                rows={2}
                placeholder="e.g. Solo indie founder, prefer crisp consumer UX and B2C pricing"
                className="px-terminal-input mt-[6px] w-full resize-y p-[10px] text-[12px] leading-[1.45]"
              />
            </div>

            {/* Divergence Style */}
            <div>
              <div className="font-mono text-[11px] font-bold text-[var(--deck-cyan)]">
                Divergence Style
              </div>
              <div className="mt-[6px] grid grid-cols-3 gap-[6px]">
                {DIVERGENCE_OPTIONS.map((opt) => {
                  const active = tuning.divergence === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        onUpdateTuning({ ...tuning, divergence: opt.id })
                      }
                      className={`cursor-pointer p-[8px] text-left ${
                        active
                          ? "px-chip-active"
                          : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                      }`}
                    >
                      <div className="font-mono text-[11px] font-bold">
                        {opt.label}
                      </div>
                      <div className="mt-[2px] text-[10px] opacity-80">
                        {opt.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reasoning Depth (Gemini only) */}
            {tuning.provider === "gemini" && (
              <div>
                <div className="font-mono text-[11px] font-bold text-[var(--deck-cyan)]">
                  Reasoning Depth
                </div>
                <div className="mt-[6px] grid grid-cols-3 gap-[6px]">
                  {REASONING_OPTIONS.map((opt) => {
                    const active = tuning.reasoningPreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          onUpdateTuning({ ...tuning, reasoningPreset: opt.id })
                        }
                        className={`cursor-pointer p-[8px] text-left ${
                          active
                            ? "px-chip-active"
                            : "px-chip-idle text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                        }`}
                      >
                        <div className="font-mono text-[11px] font-bold">
                          {opt.label}
                        </div>
                        <div className="mt-[2px] text-[10px] opacity-80">
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

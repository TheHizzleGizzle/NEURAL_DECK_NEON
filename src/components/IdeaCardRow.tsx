import React, { useId, useState } from "react";
import type { CreativeSkill, IdeaCard } from "../types/deck";
import { PixelBranchConnector } from "./PixelBranchConnector";
import {
  PxBranchIcon,
  PxEditIcon,
  PxPlusIcon,
  PxSkullIcon,
  PxStarIcon,
} from "./PixelIcons";
import { normalizeTag, parseTagsInput } from "../utils/treeUtils";

interface IdeaCardRowProps {
  card: IdeaCard;
  subtreeCount: number;
  parentTitle: string | null;
  isFlatView: boolean;
  compact?: boolean;
  activeSkill: CreativeSkill | null;
  allSkills: CreativeSkill[];
  activeTag: string | null;
  isSelected: boolean;
  isBusy: boolean;
  onQuickBranch: (card: IdeaCard) => void;
  onSteeredBranch: (
    card: IdeaCard,
    skill: CreativeSkill,
    steeringNote: string
  ) => void;
  onPickSkillBranch: (card: IdeaCard) => void;
  onAddManualChild: (parent: IdeaCard) => void;
  onSaveEdit: (
    cardId: string,
    patch: { title: string; summary: string; rationale: string; tags: string[] }
  ) => void;
  onToggleCollapse: (card: IdeaCard) => void;
  onToggleStar: (card: IdeaCard) => void;
  onToggleSelectMashup: (card: IdeaCard) => void;
  onClickTag: (tag: string) => void;
  onCopyCard: (card: IdeaCard) => void;
  onBanishCard: (card: IdeaCard) => void;
}

export const IdeaCardRow: React.FC<IdeaCardRowProps> = React.memo(({
  card,
  subtreeCount,
  parentTitle,
  isFlatView,
  compact = false,
  activeSkill,
  allSkills,
  activeTag,
  isSelected,
  isBusy,
  onQuickBranch,
  onSteeredBranch,
  onPickSkillBranch,
  onAddManualChild,
  onSaveEdit,
  onToggleCollapse,
  onToggleStar,
  onToggleSelectMashup,
  onClickTag,
  onCopyCard,
  onBanishCard,
}) => {
  const editTitleId = useId();
  const editSummaryId = useId();
  const editRationaleId = useId();
  const editTagsId = useId();
  const steerInputId = useId();

  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(card.title);
  const [editSummary, setEditSummary] = useState(card.summary);
  const [editRationale, setEditRationale] = useState(card.rationale);
  const [editTags, setEditTags] = useState(card.tags.join(", "));
  const [editError, setEditError] = useState<string | null>(null);

  const [steeringOpen, setSteeringOpen] = useState(false);
  const [steerNote, setSteerNote] = useState("");
  const [steerSkillId, setSteerSkillId] = useState(
    activeSkill?.id ?? allSkills[0]?.id ?? ""
  );

  const quickSkillLabel = activeSkill
    ? `Branch · ${activeSkill.badge}`
    : "Branch";

  const openEditor = () => {
    setEditTitle(card.title);
    setEditSummary(card.summary);
    setEditRationale(card.rationale);
    setEditTags(card.tags.join(", "));
    setEditError(null);
    setSteeringOpen(false);
    setEditing(true);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = editTitle.trim();
    const cleanSummary = editSummary.trim();
    if (!cleanTitle || !cleanSummary) {
      setEditError("Title and summary are required.");
      return;
    }
    onSaveEdit(card.id, {
      title: cleanTitle,
      summary: cleanSummary,
      rationale: editRationale.trim(),
      tags: parseTagsInput(editTags),
    });
    setEditing(false);
    setEditError(null);
  };

  const handleRunSteer = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenSkill =
      allSkills.find((s) => s.id === steerSkillId) ?? activeSkill ?? allSkills[0];
    if (!chosenSkill) return;
    onSteeredBranch(card, chosenSkill, steerNote.trim());
    setSteerNote("");
    setSteeringOpen(false);
  };

  const cartridgeClass = isSelected
    ? "px-cartridge-selected"
    : card.author === "human"
    ? "px-cartridge-human"
    : "px-cartridge";

  return (
    <article
      className={`${compact ? "mb-[6px]" : "mb-[8px]"} flex w-full items-stretch`}
      data-testid="idea-card"
    >
      {/* Stepped 90-degree neon pixel circuit connector (only in tree view) */}
      {!isFlatView && (
        <PixelBranchConnector
          depth={card.depth}
          accentColor={card.accentColor}
        />
      )}

      {/* Pixel Cartridge Container */}
      <div
        className={`flex min-w-0 flex-1 flex-col ${
          compact ? "px-[10px] py-[7px]" : "px-[12px] py-[9px]"
        } ${cartridgeClass}`}
      >
        {/* Top Metadata Row */}
        <div className="flex items-center gap-2">
          <span
            className="h-[14px] w-[5px] shrink-0"
            style={{ backgroundColor: card.accentColor }}
            aria-hidden="true"
          />

          <span className="font-mono text-[11px] font-bold tracking-[0.04em] text-[var(--deck-cyan)]">
            {card.skillBadge}
          </span>

          {card.author === "human" && (
            <span className="font-mono text-[10px] font-semibold text-[var(--deck-green)]">
              · Human
            </span>
          )}

          {subtreeCount > 0 && !isFlatView && (
            <button
              type="button"
              onClick={() => onToggleCollapse(card)}
              className={`px-chip-idle cursor-pointer px-[7px] py-[2px] font-mono text-[10px] font-bold leading-tight whitespace-nowrap hover:brightness-110 ${
                card.collapsed
                  ? "text-[var(--deck-amber)]"
                  : "text-[var(--deck-text-muted)]"
              }`}
              aria-label={
                card.collapsed
                  ? `Expand ${subtreeCount} child ideas under ${card.title}`
                  : `Collapse ${subtreeCount} child ideas under ${card.title}`
              }
            >
              {card.collapsed ? `+${subtreeCount} hidden` : `-${subtreeCount}`}
            </button>
          )}

          <div className="flex-1" />

          {/* Multi-Select Splice Toggle */}
          <button
            type="button"
            onClick={() => onToggleSelectMashup(card)}
            aria-label={
              isSelected
                ? `Remove ${card.title} from splice`
                : `Select ${card.title} for splice`
            }
            className={`flex h-[26px] shrink-0 cursor-pointer items-center justify-center px-[8px] font-mono text-[10px] font-bold whitespace-nowrap hover:brightness-110 ${
              isSelected
                ? "px-btn-magenta text-[var(--deck-magenta)]"
                : "px-chip-idle text-[var(--deck-text-muted)]"
            }`}
          >
            {isSelected ? "✓ Spliced" : "+ Splice"}
          </button>

          {/* Star Button */}
          <button
            type="button"
            onClick={() => onToggleStar(card)}
            aria-label={
              card.starred
                ? `Unstar ${card.title}`
                : `Star ${card.title} for shortlist`
            }
            aria-pressed={card.starred}
            className="flex h-[26px] w-[28px] shrink-0 cursor-pointer items-center justify-center hover:brightness-110"
          >
            <PxStarIcon
              size={16}
              color={card.starred ? "var(--deck-amber)" : "var(--deck-text-faint)"}
            />
          </button>
        </div>

        {/* Parent Context Breadcrumb in Filtered/Flat Mode */}
        {isFlatView && parentTitle && (
          <div className="mt-[6px] font-mono text-[11px] text-[var(--deck-text-muted)]">
            Branch of{" "}
            <span className="font-bold text-[var(--deck-cyan)]">
              {parentTitle}
            </span>
          </div>
        )}

        {/* Splice Multi-Parent Lineage Banner */}
        {card.splicedFrom && card.splicedFrom.length > 0 && (
          <div className="mt-[6px] bg-[var(--deck-magenta-soft)] px-[8px] py-[4px] font-mono text-[11px] text-[var(--deck-magenta-text-soft)]">
            Fused from: {card.splicedFrom.map((s) => s.title).join(" + ")}
          </div>
        )}

        {/* Steering Note Indicator */}
        {card.steeringNote && (
          <div className="mt-[6px] bg-[var(--deck-green-soft)] px-[8px] py-[4px] font-mono text-[11px] text-[var(--deck-green-text-soft)]">
            Steered: &ldquo;{card.steeringNote}&rdquo;
          </div>
        )}

        {/* Card Content OR Inline Editor */}
        {editing ? (
          <form onSubmit={handleSaveEdit} className="mt-[10px] space-y-[8px]">
            <div>
              <label
                htmlFor={editTitleId}
                className="mb-[3px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
              >
                Title
              </label>
              <input
                id={editTitleId}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="px-terminal-input w-full px-[10px] py-[7px] font-mono text-[13px] font-bold"
                autoFocus
              />
            </div>

            <div>
              <label
                htmlFor={editSummaryId}
                className="mb-[3px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
              >
                Summary
              </label>
              <textarea
                id={editSummaryId}
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                rows={3}
                className="px-terminal-input w-full resize-y px-[10px] py-[7px] text-[13px] leading-[1.45]"
              />
            </div>

            <div>
              <label
                htmlFor={editRationaleId}
                className="mb-[3px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
              >
                Rationale (optional)
              </label>
              <input
                id={editRationaleId}
                type="text"
                value={editRationale}
                onChange={(e) => setEditRationale(e.target.value)}
                className="px-terminal-input w-full px-[10px] py-[7px] text-[12px]"
              />
            </div>

            <div>
              <label
                htmlFor={editTagsId}
                className="mb-[3px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
              >
                Tags (comma-separated)
              </label>
              <input
                id={editTagsId}
                type="text"
                value={editTags}
                onChange={(e) => setEditTags(e.target.value)}
                placeholder="AUDIO, FLOW_STATE, ZERO_UI"
                className="px-terminal-input w-full px-[10px] py-[7px] font-mono text-[11px]"
              />
            </div>

            {editError && (
              <p className="font-mono text-[11px] font-bold text-[var(--deck-crimson)]">
                {editError}
              </p>
            )}

            <div className="flex items-center justify-end gap-[8px] pt-[2px]">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-chip-idle h-[30px] cursor-pointer px-[10px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-btn-cyan h-[30px] cursor-pointer px-[12px] font-mono text-[11px] font-bold"
              >
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <>
            {/* Idea Title */}
            <h3
              className={`${
                compact ? "mt-[5px] text-[14px]" : "mt-[8px] text-[15px]"
              } font-mono leading-[1.3] font-bold text-[var(--deck-text)]`}
            >
              {card.title}
            </h3>

            {/* Idea Summary */}
            <p
              className={`${
                compact ? "mt-[4px] text-[13px] leading-[1.45]" : "mt-[6px] text-[14px] leading-[1.55]"
              } text-[var(--deck-text-body)]`}
            >
              {card.summary}
            </p>

            {/* Strategic Rationale */}
            {card.rationale && card.rationale.trim().length > 0 && (
              <div className="mt-[7px] bg-[var(--deck-cyan-soft)] px-[10px] py-[6px] text-[12px] leading-[1.45] text-[var(--deck-text-muted)]">
                <span className="font-mono font-bold text-[var(--deck-cyan)]">
                  Why:{" "}
                </span>
                {card.rationale.trim()}
              </div>
            )}

            {/* Interactive Clickable Tag Filters */}
            {card.tags && card.tags.length > 0 && (
              <div className="mt-[7px] flex flex-wrap gap-x-2.5 gap-y-1">
                {card.tags.map((t, i) => {
                  const norm = normalizeTag(t);
                  const isActive =
                    activeTag !== null && normalizeTag(activeTag) === norm;
                  return (
                    <button
                      key={`${norm}-${i}`}
                      type="button"
                      onClick={() => onClickTag(norm)}
                      aria-label={`Filter by tag ${norm}`}
                      aria-pressed={isActive}
                      className={`cursor-pointer font-mono text-[11px] transition-colors ${
                        isActive
                          ? "font-bold text-[var(--deck-cyan)] underline underline-offset-2"
                          : "text-[var(--deck-text-faint)] hover:text-[var(--deck-text)]"
                      }`}
                    >
                      #{norm}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* Inline Branch Steering Drawer */}
        {steeringOpen && !editing && (
          <form
            onSubmit={handleRunSteer}
            className="mt-[8px] border border-[var(--deck-border)] bg-[var(--deck-panel-alt)] p-[10px]"
          >
            <div className="flex flex-wrap items-center gap-[6px]">
              <label
                htmlFor={steerInputId}
                className="font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
              >
                Steer next branch
              </label>
              <div className="flex-1" />
              <select
                aria-label={`Skill for steering ${card.title}`}
                value={steerSkillId}
                onChange={(e) => setSteerSkillId(e.target.value)}
                className="px-terminal-input h-[26px] px-[6px] font-mono text-[10px]"
              >
                {allSkills.map((sk) => (
                  <option key={sk.id} value={sk.id}>
                    {sk.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mt-[6px] flex flex-wrap gap-[6px]">
              <input
                id={steerInputId}
                type="text"
                value={steerNote}
                onChange={(e) => setSteerNote(e.target.value)}
                placeholder="e.g. Make it work offline, cut hardware cost, target solo teams..."
                className="px-terminal-input min-w-[200px] flex-1 px-[9px] py-[6px] text-[12px]"
                autoFocus
              />
              <button
                type="submit"
                disabled={isBusy}
                className="px-btn-cyan px-touch-ctrl h-[32px] shrink-0 cursor-pointer px-[12px] font-mono text-[11px] font-bold disabled:opacity-50"
              >
                Run Branch
              </button>
              <button
                type="button"
                onClick={() => setSteeringOpen(false)}
                className="px-chip-idle px-touch-ctrl h-[32px] shrink-0 cursor-pointer px-[8px] font-mono text-[10px] font-bold text-[var(--deck-text-muted)]"
              >
                Close
              </button>
            </div>
          </form>
        )}

        {/* Divider */}
        {!editing && (
          <>
            <div
              className={`${
                compact ? "mt-[6px] mb-[5px]" : "mt-[8px] mb-[6px]"
              } h-[1px] w-full bg-[var(--deck-border)]`}
            />

            {/* Cartridge Action Bar */}
            <div className="flex flex-wrap items-center gap-[5px]">
              {/* Primary CTA: Quick Branch with Active Skill */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onQuickBranch(card)}
                className="px-chip-active px-touch-ctrl flex h-[28px] cursor-pointer items-center gap-[5px] px-[9px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110 disabled:opacity-50"
              >
                <PxBranchIcon size={12} color="var(--deck-cyan)" />
                <span>{quickSkillLabel}</span>
              </button>

              {/* Steer Branch Inline */}
              <button
                type="button"
                onClick={() => {
                  setSteerSkillId(activeSkill?.id ?? allSkills[0]?.id ?? "");
                  setSteeringOpen((prev) => !prev);
                }}
                aria-expanded={steeringOpen}
                className={`px-touch-ctrl flex h-[28px] cursor-pointer items-center px-[8px] font-mono text-[10px] font-bold whitespace-nowrap hover:brightness-110 ${
                  steeringOpen
                    ? "px-btn-magenta"
                    : "px-chip-idle text-[var(--deck-text)]"
                }`}
              >
                Steer
              </button>

              {/* Pick Specific Skill Cartridge */}
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onPickSkillBranch(card)}
                className="px-chip-idle px-touch-ctrl flex h-[28px] cursor-pointer items-center px-[8px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-magenta)] hover:brightness-110 disabled:opacity-50"
              >
                Skills ▾
              </button>

              {/* Manual Human Child Idea */}
              <button
                type="button"
                onClick={() => onAddManualChild(card)}
                className="px-chip-idle px-touch-ctrl flex h-[28px] cursor-pointer items-center gap-[4px] px-[8px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-green)] hover:brightness-110"
                aria-label={`Add manual child idea under ${card.title}`}
              >
                <PxPlusIcon size={10} color="var(--deck-green)" />
                <span>Child</span>
              </button>

              <div className="flex-1" />

              {/* Quiet Utility Actions */}
              <button
                type="button"
                onClick={openEditor}
                aria-label={`Edit ${card.title}`}
                className="px-btn-ghost px-touch-ctrl flex h-[28px] cursor-pointer items-center gap-[4px] px-[7px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
              >
                <PxEditIcon size={11} color="currentColor" />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => onCopyCard(card)}
                aria-label={`Copy ${card.title}`}
                className="px-btn-ghost px-touch-ctrl flex h-[28px] cursor-pointer items-center px-[7px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
              >
                Copy
              </button>

              <button
                type="button"
                onClick={() => onBanishCard(card)}
                aria-label={`Banish ${card.title}`}
                className="px-btn-ghost px-touch-ctrl flex h-[28px] cursor-pointer items-center gap-[4px] px-[7px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-crimson)] hover:border-[var(--deck-crimson)] hover:bg-[var(--deck-crimson-bg)]"
              >
                <PxSkullIcon size={11} color="var(--deck-crimson)" />
                <span>Banish</span>
              </button>
            </div>
          </>
        )}
      </div>
    </article>
  );
});

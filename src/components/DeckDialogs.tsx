import React, { useEffect, useId, useState } from "react";
import type { BrainstormSession, IdeaCard } from "../types/deck";
import { parseTagsInput } from "../utils/treeUtils";
import { IS_NATIVE } from "../platform/native";
import { NativeDialog } from "./NativeDialog";

interface DialogShellProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const DialogShell: React.FC<DialogShellProps> = ({
  open,
  title,
  onClose,
  children,
}) => {
  const titleId = useId();

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      variant="modal"
      maxWidthClass="max-w-[460px]"
      ariaLabelledBy={titleId}
    >
      <div className="flex items-center justify-between gap-[8px] border-b border-[var(--deck-border)] pb-[8px]">
        <h2
          id={titleId}
          className="font-mono text-[13px] font-bold tracking-[0.05em] text-[var(--deck-cyan)]"
        >
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label={`Close ${title}`}
          className="px-chip-idle px-touch-ctrl flex h-[28px] min-w-[28px] cursor-pointer items-center justify-center px-[8px] font-mono text-[12px] font-bold text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
        >
          ×
        </button>
      </div>
      <div className="mt-[12px]">{children}</div>
    </NativeDialog>
  );
};

/* --- 1. Session Switcher Dialog (with 2-step delete confirmation) --- */
interface SessionSwitcherDialogProps {
  open: boolean;
  sessions: BrainstormSession[];
  activeSessionId: string;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onCreateNew: () => void;
  onRenameCurrent: () => void;
  onDeleteCurrent: () => void;
}

export const SessionSwitcherDialog: React.FC<SessionSwitcherDialogProps> = ({
  open,
  sessions,
  activeSessionId,
  onClose,
  onSelectSession,
  onCreateNew,
  onRenameCurrent,
  onDeleteCurrent,
}) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    if (open) setConfirmingDelete(false);
  }, [open]);

  const current = sessions.find((s) => s.id === activeSessionId);

  return (
    <DialogShell open={open} title="Switch Deck Session" onClose={onClose}>
      <div className="flex max-h-[60vh] flex-col gap-[6px] overflow-y-auto">
        {sessions.map((s) => {
          const active = s.id === activeSessionId;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                onSelectSession(s.id);
                onClose();
              }}
              className={`cursor-pointer px-[10px] py-[9px] text-left font-mono text-[12px] font-bold hover:brightness-110 ${
                active
                  ? "px-chip-active"
                  : "px-chip-idle text-[var(--deck-text)]"
              }`}
            >
              {active ? "● " : "  "}
              {s.title} ({s.cards.length} ideas)
            </button>
          );
        })}

        <div className="my-[4px] h-[1px] bg-[var(--deck-border)]" />

        <button
          type="button"
          onClick={() => {
            onClose();
            onCreateNew();
          }}
          className="px-chip-idle cursor-pointer px-[10px] py-[9px] text-left font-mono text-[12px] font-bold text-[var(--deck-green)] hover:brightness-110"
        >
          + New Blank Session
        </button>

        <button
          type="button"
          onClick={() => {
            onClose();
            onRenameCurrent();
          }}
          className="px-chip-idle cursor-pointer px-[10px] py-[9px] text-left font-mono text-[12px] font-bold text-[var(--deck-cyan)] hover:brightness-110"
        >
          Rename Current Session
        </button>

        {sessions.length > 1 &&
          (confirmingDelete ? (
            <div className="border border-[var(--deck-crimson)] bg-[var(--deck-crimson-bg)] p-[10px]">
              <p className="font-mono text-[11px] font-bold text-[var(--deck-text)]">
                Delete &ldquo;{current?.title}&rdquo; and all{" "}
                {current?.cards.length ?? 0} idea cards permanently?
              </p>
              <div className="mt-[8px] flex justify-end gap-[8px]">
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(false)}
                  className="px-chip-idle h-[30px] cursor-pointer px-[10px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteCurrent();
                    setConfirmingDelete(false);
                    onClose();
                  }}
                  className="h-[30px] cursor-pointer bg-[var(--deck-crimson)] px-[12px] font-mono text-[11px] font-bold text-white"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingDelete(true)}
              className="px-grave-badge cursor-pointer px-[10px] py-[9px] text-left font-mono text-[12px] font-bold text-[var(--deck-crimson)] hover:brightness-110"
            >
              Delete Current Session
            </button>
          ))}
      </div>
    </DialogShell>
  );
};

/* --- 2. Create / Rename Session Dialog --- */
interface TextPromptDialogProps {
  open: boolean;
  title: string;
  placeholder: string;
  initialValue: string;
  confirmLabel: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
}

export const TextPromptDialog: React.FC<TextPromptDialogProps> = ({
  open,
  title,
  placeholder,
  initialValue,
  confirmLabel,
  onClose,
  onConfirm,
}) => {
  const [val, setVal] = useState(initialValue);

  useEffect(() => {
    if (open) setVal(initialValue);
  }, [open, initialValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(val);
    onClose();
  };

  return (
    <DialogShell open={open} title={title} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          aria-label={title}
          placeholder={placeholder}
          className="px-terminal-input w-full p-[10px] font-mono text-[12px]"
        />
        <div className="mt-[14px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="px-chip-idle px-touch-ctrl h-[34px] cursor-pointer px-[12px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-btn-cyan px-touch-ctrl h-[34px] cursor-pointer px-[14px] font-mono text-[11px] font-bold"
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </DialogShell>
  );
};

/* --- 3. Manual Human Idea Composer Dialog --- */
interface ManualCardDialogProps {
  open: boolean;
  parentCard: IdeaCard | null;
  onClose: () => void;
  onCreate: (payload: {
    parentId: string | null;
    title: string;
    summary: string;
    rationale: string;
    tags: string[];
  }) => void;
}

export const ManualCardDialog: React.FC<ManualCardDialogProps> = ({
  open,
  parentCard,
  onClose,
  onCreate,
}) => {
  const [title, setTitle] = useState("");
  const [summary, setSummary] = useState("");
  const [rationale, setRationale] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setTitle("");
      setSummary("");
      setRationale("");
      setTagsRaw("");
      setError(null);
    }
  }, [open, parentCard]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();
    const cleanSummary = summary.trim();
    if (!cleanTitle || !cleanSummary) {
      setError("Please enter both a title and a summary.");
      return;
    }
    onCreate({
      parentId: parentCard ? parentCard.id : null,
      title: cleanTitle,
      summary: cleanSummary,
      rationale: rationale.trim(),
      tags: parseTagsInput(tagsRaw),
    });
    onClose();
  };

  return (
    <DialogShell
      open={open}
      title={parentCard ? "Add Child Idea" : "Add Your Own Idea"}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="space-y-[10px]">
        {parentCard && (
          <div className="bg-[var(--deck-cyan-soft)] px-[10px] py-[6px] font-mono text-[11px] text-[var(--deck-text-muted)]">
            Branching under:{" "}
            <span className="font-bold text-[var(--deck-text)]">
              {parentCard.title}
            </span>
          </div>
        )}

        <div>
          <label
            htmlFor="manual-idea-title"
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Idea Title
          </label>
          <input
            id="manual-idea-title"
            type="text"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Offline Tactile Focus Timer"
            className="px-terminal-input w-full p-[10px] font-mono text-[12px]"
          />
        </div>

        <div>
          <label
            htmlFor="manual-idea-summary"
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Core Mechanic / Summary
          </label>
          <textarea
            id="manual-idea-summary"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            rows={3}
            placeholder="Describe how it works in 1-3 crisp sentences..."
            className="px-terminal-input w-full resize-y p-[10px] text-[13px] leading-[1.45]"
          />
        </div>

        <div>
          <label
            htmlFor="manual-idea-rationale"
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Why It Works (optional)
          </label>
          <input
            id="manual-idea-rationale"
            type="text"
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            placeholder="What unfair advantage or user insight drives this?"
            className="px-terminal-input w-full p-[10px] text-[12px]"
          />
        </div>

        <div>
          <label
            htmlFor="manual-idea-tags"
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Tags (comma-separated, optional)
          </label>
          <input
            id="manual-idea-tags"
            type="text"
            value={tagsRaw}
            onChange={(e) => setTagsRaw(e.target.value)}
            placeholder="HARDWARE, OFFLINE, INDIE"
            className="px-terminal-input w-full p-[10px] font-mono text-[11px]"
          />
        </div>

        {error && (
          <p className="font-mono text-[11px] font-bold text-[var(--deck-crimson)]">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-[8px] pt-[4px]">
          <button
            type="button"
            onClick={onClose}
            className="px-chip-idle h-[34px] cursor-pointer px-[12px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-btn-green h-[34px] cursor-pointer px-[14px] font-mono text-[11px] font-bold"
          >
            Add to Tree
          </button>
        </div>
      </form>
    </DialogShell>
  );
};

/* --- 4. Banish Card Dialog (with explicit subtree warning) --- */
const BANISH_REASONS = [
  { code: "TOO_CLICHE", label: "Too Cliche — Generic or overdone trope" },
  { code: "OUT_OF_SCOPE", label: "Out of Scope — Too complex or wrong market" },
  { code: "WRONG_VIBE", label: "Wrong Vibe — Clashes with product vision" },
  { code: "DEAD_END", label: "Dead End — Flawed unit economics or UX" },
  { code: "DELETE_ONLY", label: "Silent Delete — Remove without Graveyard rule" },
];

interface BanishDialogProps {
  card: IdeaCard | null;
  subtreeCount: number;
  onClose: () => void;
  onBanish: (card: IdeaCard, reasonCode: string, customRule: string) => void;
}

export const BanishDialog: React.FC<BanishDialogProps> = ({
  card,
  subtreeCount,
  onClose,
  onBanish,
}) => {
  const [customNote, setCustomNote] = useState("");
  const customRuleId = useId();

  useEffect(() => {
    if (card) setCustomNote("");
  }, [card]);

  return (
    <DialogShell
      open={Boolean(card)}
      title="Banish to Graveyard"
      onClose={onClose}
    >
      {card && (
        <>
          <div className="mb-[8px] font-mono text-[12px] text-[var(--deck-text-muted)]">
            Idea:{" "}
            <span className="font-bold text-[var(--deck-text)]">
              {card.title}
            </span>
          </div>

          {subtreeCount > 0 && (
            <div className="mb-[10px] border border-[var(--deck-amber)] bg-[var(--deck-amber-bg)] p-[9px] text-[12px] leading-[1.4] text-[var(--deck-text)]">
              This will also remove{" "}
              <strong className="font-mono">
                {subtreeCount} child idea{subtreeCount === 1 ? "" : "s"}
              </strong>{" "}
              beneath this node. Banishing saves the entire branch in the
              Graveyard so you can revive it intact later.
            </div>
          )}

          <label
            htmlFor={customRuleId}
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Anti-Pattern Rule (optional)
          </label>
          <textarea
            id={customRuleId}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            rows={2}
            placeholder="Optional custom anti-pattern rule for the AI to avoid..."
            className="px-terminal-input mb-[10px] w-full resize-y p-[10px] text-[12px]"
          />

          <div className="flex flex-col gap-[6px]">
            {BANISH_REASONS.map((r) => (
              <button
                key={r.code}
                type="button"
                onClick={() => {
                  onBanish(card, r.code, customNote.trim());
                  onClose();
                }}
                className={`cursor-pointer px-[10px] py-[8px] text-left font-mono text-[11px] font-bold hover:brightness-110 ${
                  r.code === "DELETE_ONLY"
                    ? "px-chip-idle text-[var(--deck-text-muted)]"
                    : "px-grave-badge text-[var(--deck-crimson)]"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <div className="mt-[12px] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-chip-idle h-[32px] cursor-pointer px-[12px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </DialogShell>
  );
};

/* --- 5. Forge Custom Skill Dialog --- */
interface ForgeSkillDialogProps {
  open: boolean;
  onClose: () => void;
  onForge: (name: string, badge: string, systemInstruction: string) => void;
  onToast: (message: string) => void;
}

export const ForgeSkillDialog: React.FC<ForgeSkillDialogProps> = ({
  open,
  onClose,
  onForge,
  onToast,
}) => {
  const [name, setName] = useState("");
  const [badge, setBadge] = useState("");
  const [instruction, setInstruction] = useState("");
  const nameId = useId();
  const badgeId = useId();
  const instructionId = useId();

  useEffect(() => {
    if (open) {
      setName("");
      setBadge("");
      setInstruction("");
    }
  }, [open]);

  const handleForge = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanSys = instruction.trim();
    if (!cleanName || !cleanSys) {
      onToast("Skill name and instruction are required.");
      return;
    }
    let cleanBadge = badge.trim().toUpperCase().replace(/\s+/g, "_");
    if (!cleanBadge) {
      cleanBadge = cleanName
        .slice(0, Math.min(8, cleanName.length))
        .toUpperCase()
        .replace(/\s+/g, "_");
    }
    onForge(cleanName, cleanBadge, cleanSys);
    onClose();
  };

  return (
    <DialogShell open={open} title="Forge Custom Skill" onClose={onClose}>
      <form onSubmit={handleForge} className="flex flex-col gap-[8px]">
        <div>
          <label
            htmlFor={nameId}
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Skill Name
          </label>
          <input
            id={nameId}
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Skill Name (e.g. Sci-Fi Worldbuilder)"
            className="px-terminal-input w-full p-[10px] text-[12px]"
          />
        </div>
        <div>
          <label
            htmlFor={badgeId}
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            Short Badge (optional)
          </label>
          <input
            id={badgeId}
            type="text"
            value={badge}
            onChange={(e) => setBadge(e.target.value)}
            placeholder="Short Badge (e.g. SCI_FI)"
            className="px-terminal-input w-full p-[10px] font-mono text-[12px] text-[var(--deck-cyan)]"
          />
        </div>
        <div>
          <label
            htmlFor={instructionId}
            className="mb-[4px] block font-mono text-[10px] font-bold text-[var(--deck-cyan)]"
          >
            System Instruction
          </label>
          <textarea
            id={instructionId}
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={3}
            placeholder="Instruction: how should AI mutate or branch ideas with this skill?"
            className="px-terminal-input w-full resize-y p-[10px] text-[12px]"
          />
        </div>

        <div className="mt-[6px] flex justify-end gap-[8px]">
          <button
            type="button"
            onClick={onClose}
            className="px-chip-idle px-touch-ctrl h-[34px] cursor-pointer px-[12px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-btn-cyan px-touch-ctrl h-[34px] cursor-pointer px-[14px] font-mono text-[11px] font-bold"
          >
            Forge Skill
          </button>
        </div>
      </form>
    </DialogShell>
  );
};

/* --- 6. Error Dialog --- */
interface ErrorDialogProps {
  error: { code: string; details: string } | null;
  onClose: () => void;
}

export const ErrorDialog: React.FC<ErrorDialogProps> = ({ error, onClose }) => (
  <DialogShell
    open={Boolean(error)}
    title={error?.code || "Request Error"}
    onClose={onClose}
  >
    <p className="text-[13px] leading-[1.5] text-[var(--deck-text)] break-words">
      {error?.details}
    </p>
    <div className="mt-[14px] flex justify-end">
      <button
        type="button"
        onClick={onClose}
        className="px-btn-cyan h-[34px] cursor-pointer px-[14px] font-mono text-[11px] font-bold"
      >
        Dismiss
      </button>
    </div>
  </DialogShell>
);

/* --- 7. Export Markdown Dialog --- */
interface ExportMarkdownDialogProps {
  open: boolean;
  sessionTitle: string;
  markdown: string;
  onClose: () => void;
  onCopy: () => void;
  onDownload: () => void;
}

export const ExportMarkdownDialog: React.FC<ExportMarkdownDialogProps> = ({
  open,
  sessionTitle,
  markdown,
  onClose,
  onCopy,
  onDownload,
}) => (
  <DialogShell
    open={open}
    title={`Export Markdown · ${sessionTitle}`}
    onClose={onClose}
  >
    <pre className="px-terminal-input max-h-[45vh] overflow-auto p-[10px] font-mono text-[11px] leading-[1.45] whitespace-pre-wrap">
      {markdown}
    </pre>
    <div className="mt-[12px] flex justify-end gap-[8px]">
      <button
        type="button"
        onClick={onClose}
        className="px-chip-idle h-[34px] cursor-pointer px-[12px] font-mono text-[11px] font-bold text-[var(--deck-text-muted)]"
      >
        Close
      </button>
      <button
        type="button"
        onClick={onCopy}
        className="px-chip-active h-[34px] cursor-pointer px-[12px] font-mono text-[11px] font-bold"
      >
        Copy Markdown
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="px-btn-cyan h-[34px] cursor-pointer px-[12px] font-mono text-[11px] font-bold"
      >
        {IS_NATIVE ? "Save .md" : "Download .md"}
      </button>
    </div>
  </DialogShell>
);

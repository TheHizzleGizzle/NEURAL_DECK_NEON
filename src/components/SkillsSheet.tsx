import React from "react";
import type { CreativeSkill, IdeaCard } from "../types/deck";
import { BottomSheetShell } from "./BottomSheetShell";
import { PxChipIcon } from "./PixelIcons";

interface SkillsSheetProps {
  open: boolean;
  onClose: () => void;
  skills: CreativeSkill[];
  activeSkill: CreativeSkill | null;
  targetCard: IdeaCard | null;
  onSelectSkill: (skill: CreativeSkill, targetCard: IdeaCard | null) => void;
  onDeleteCustomSkill: (skillId: string) => void;
  onOpenForgeDialog: () => void;
}

export const SkillsSheet: React.FC<SkillsSheetProps> = ({
  open,
  onClose,
  skills,
  activeSkill,
  targetCard,
  onSelectSkill,
  onDeleteCustomSkill,
  onOpenForgeDialog,
}) => {
  const title = targetCard ? "Branch With Skill" : "Creative Skill Cartridges";
  const subtitle = targetCard
    ? `Apply a thinking skill to branch "${targetCard.title}"`
    : "Choose the default thinking skill used when sparking or quick-branching ideas.";

  return (
    <BottomSheetShell open={open} onClose={onClose}>
      <div className="flex items-center gap-[8px]">
        <PxChipIcon size={18} color="var(--deck-magenta)" className="shrink-0" />
        <h2 className="flex-1 font-mono text-[14px] font-bold tracking-[0.05em] text-[var(--deck-magenta)]">
          {title}
        </h2>
        <button
          type="button"
          onClick={onOpenForgeDialog}
          className="px-btn-magenta flex h-[30px] shrink-0 cursor-pointer items-center px-[10px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110"
        >
          + Forge Skill
        </button>
      </div>

      <p className="mt-[4px] text-[12px] text-[var(--deck-text-muted)]">
        {subtitle}
      </p>

      <div className="mt-[12px] flex flex-col gap-[8px]">
        {skills.map((skill) => {
          const isCurrent = activeSkill?.id === skill.id;
          return (
            <div
              key={skill.id}
              className={`flex items-stretch gap-[8px] ${
                isCurrent ? "px-cartridge-selected" : "px-cartridge"
              }`}
            >
              <button
                type="button"
                onClick={() => {
                  onSelectSkill(skill, targetCard);
                  onClose();
                }}
                className="flex-1 cursor-pointer p-[12px] text-left hover:brightness-105"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] font-bold text-[var(--deck-cyan)]">
                    [{skill.badge}]
                  </span>
                  <span className="font-mono text-[13px] font-bold text-[var(--deck-text)]">
                    {skill.name}
                  </span>
                </div>
                <p className="mt-[4px] text-[12px] text-[var(--deck-text-muted)]">
                  {skill.subtitle}
                </p>
              </button>

              {!skill.builtIn && (
                <button
                  type="button"
                  onClick={() => onDeleteCustomSkill(skill.id)}
                  aria-label={`Delete custom skill ${skill.name}`}
                  className="cursor-pointer border-l border-[var(--deck-border)] px-[12px] font-mono text-[10px] font-bold text-[var(--deck-crimson)] hover:bg-[var(--deck-crimson-bg)]"
                >
                  Delete
                </button>
              )}
            </div>
          );
        })}
      </div>
    </BottomSheetShell>
  );
};

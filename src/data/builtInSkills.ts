import type { CreativeSkill } from "../types/deck";

export const BUILT_IN_SKILLS: CreativeSkill[] = [
  {
    id: "skill_diverge_10x",
    name: "Diverge 10x",
    badge: "10X_DIVERGE",
    subtitle: "Break incrementalism with non-obvious lateral leaps",
    systemInstruction:
      "Push the target idea 10x further into bold, non-obvious territory. Reject safe incremental tweaks; explore distinct mechanisms, audiences, or business models.",
    accentColor: "#00F0FF",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_scamper",
    name: "SCAMPER Matrix",
    badge: "SCAMPER",
    subtitle: "Substitute, Combine, Adapt, Modify, Eliminate, Reverse",
    systemInstruction:
      "Apply SCAMPER operators to mutate the target idea. Pick the 3 strongest SCAMPER lenses and show concrete transformed concepts.",
    accentColor: "#FF2E93",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_first_principles",
    name: "First Principles",
    badge: "1ST_PRINC",
    subtitle: "Strip away assumptions to physics/human truths & rebuild",
    systemInstruction:
      "Deconstruct the target idea down to undeniable fundamental truths, expose hidden legacy assumptions, and rebuild cleaner solutions from scratch.",
    accentColor: "#39FF88",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_devils_advocate",
    name: "Devil's Advocate",
    badge: "PRE_MORTEM",
    subtitle: "Brutal failure simulation + hardened counter-designs",
    systemInstruction:
      "Imagine it is 12 months from now and this idea failed catastrophically. Identify the deadliest failure modes and propose hardened counter-architectures.",
    accentColor: "#FF3864",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_inversion",
    name: "Inversion Flip",
    badge: "INVERT",
    subtitle: "Guarantee failure first, then invert every lever",
    systemInstruction:
      "Use Charlie Munger style inversion: ask how to guarantee the worst outcome, then flip the core constraint, workflow, or monetization upside down.",
    accentColor: "#FFB800",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_analogy",
    name: "Cross-Domain Bio/Game",
    badge: "ANALOGY",
    subtitle: "Steal mechanics from game design, biology, & aviation",
    systemInstruction:
      "Transfer proven mechanics from distant domains (mycelial networks, roguelike game loops, cockpit checklists, high-frequency trading) onto this idea.",
    accentColor: "#A855F7",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_six_hats",
    name: "Six Hats Synthesis",
    badge: "6_HATS",
    subtitle: "Facts, gut intuition, upside, risk, lateral, execution",
    systemInstruction:
      "Synthesize perspectives across De Bono's Six Thinking Hats—delivering one optimistic breakthrough, one data/system play, and one tactical execution pivot.",
    accentColor: "#38BDF8",
    outputCount: 3,
    builtIn: true,
  },
  {
    id: "skill_48h_mvp",
    name: "48h Prototype Spec",
    badge: "48H_MVP",
    subtitle: "Razor-thin weekend build slices that prove core value",
    systemInstruction:
      "Turn the concept into concrete 48-hour shippable MVP slices: smallest possible scope, wizard-of-oz shortcuts, and a falsifiable validation signal.",
    accentColor: "#39FF88",
    outputCount: 3,
    builtIn: true,
  },
];

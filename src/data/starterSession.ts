import type { BrainstormSession, GraveyardEntry, IdeaCard } from "../types/deck";

export function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createStarterSession(): BrainstormSession {
  const now = Date.now();
  const root1Id = generateId();

  const root1: IdeaCard = {
    id: root1Id,
    parentId: null,
    depth: 0,
    title: "Acoustic Bio-Rhythm Cockpit",
    summary:
      "Generates adaptive pixel-synth soundscapes keyed to typing cadence and time-of-day ultradian cycles (90m sprint / 20m cooldown).",
    rationale: "Replaces punitive streak counters with immediate physiological feedback.",
    skillBadge: "SEED",
    accentColor: "#00F0FF",
    tags: ["AUDIO", "FLOW_STATE", "NO_STREAKS"],
    starred: true,
    collapsed: false,
    createdAt: now,
    author: "ai",
    ratings: { impact: 5, effort: 2 },
  };

  const child1: IdeaCard = {
    id: generateId(),
    parentId: root1Id,
    depth: 1,
    title: "Zero-UI Lockscreen Cartridge",
    summary:
      "Flip phone face-down to arm focus; a single 16-bit LED waveform pulses through the AOD while notifications buffer into a post-sprint digest.",
    rationale:
      "SCAMPER Eliminate: removes screen temptation completely while preserving ambient reassurance.",
    skillBadge: "SCAMPER",
    accentColor: "#FF2E93",
    tags: ["ZERO_UI", "HARDWARE_TRIGGER"],
    starred: true,
    collapsed: false,
    createdAt: now,
    author: "ai",
    ratings: { impact: 4, effort: 3 },
  };

  const child2: IdeaCard = {
    id: generateId(),
    parentId: root1Id,
    depth: 1,
    title: "Multiplayer Ghost Co-Working",
    summary:
      "Pair silently with 3 anonymous builders working on parallel sprints—represented only as tiny pixel avatars typing at real-time WPM.",
    rationale: "Borrows Dark Souls ambient multiplayer presence without chat distraction.",
    skillBadge: "ANALOGY",
    accentColor: "#A855F7",
    tags: ["AMBIENT_SOCIAL", "DARK_SOULS_UX"],
    starred: false,
    collapsed: false,
    createdAt: now,
    author: "ai",
  };

  const root2: IdeaCard = {
    id: generateId(),
    parentId: null,
    depth: 0,
    title: "Context-Snapshot Parking Lot",
    summary:
      "Before pausing work, record a 12-second voice dump that AI compiles into a 'Next 3 Keystrokes' launchpad card for tomorrow morning.",
    rationale:
      "First Principles: procrastination comes from high cognitive reload cost, not laziness.",
    skillBadge: "1ST_PRINC",
    accentColor: "#39FF88",
    tags: ["COGNITIVE_RELOAD", "VOICE_MEMO"],
    starred: false,
    collapsed: false,
    createdAt: now,
    author: "ai",
  };

  const rejected: IdeaCard = {
    id: generateId(),
    parentId: null,
    depth: 0,
    title: "Daily Flame Streak Leaderboard",
    summary:
      "Users lose XP and drop league tiers if they miss a focus day, with push notification reminders.",
    rationale: "Standard Duolingo retention loop.",
    skillBadge: "SEED",
    accentColor: "#FF3864",
    tags: ["GAMIFICATION"],
    starred: false,
    collapsed: false,
    createdAt: now,
    author: "ai",
  };

  const grave: GraveyardEntry = {
    id: generateId(),
    reasonTag: "TOO_CLICHE",
    antiPatternRule:
      "Never suggest punitive daily streaks, XP leaderboards, or guilt-inducing push notifications.",
    activeInPrompts: true,
    banishedAt: now,
    archivedCard: rejected,
  };

  return {
    id: generateId(),
    title: "AMBIENT_FOCUS_OS",
    seedPrompt:
      "Design a mobile tool that helps deep thinkers enter flow state without gamified streak guilt.",
    sessionConstraints:
      "Solo indie build, privacy-first local storage, delivers value in under 15 seconds without onboarding.",
    updatedAt: now,
    cards: [root1, child1, child2, root2],
    graveyard: [grave],
    brief: null,
  };
}

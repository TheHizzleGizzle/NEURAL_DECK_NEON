import type {
  BrainstormSession,
  FilterMode,
  GraveyardEntry,
  IdeaCard,
  IdeaRatings,
} from "../types/deck";
import { generateId } from "../data/starterSession";

export function findCardById(
  cards: IdeaCard[],
  cardId: string | null
): IdeaCard | null {
  if (!cardId) return null;
  return cards.find((c) => c.id === cardId) ?? null;
}

export function getParentTitle(
  cards: IdeaCard[],
  card: IdeaCard
): string | null {
  if (!card.parentId) return null;
  return findCardById(cards, card.parentId)?.title ?? null;
}

/**
 * Returns ordered ancestor chain from root down to (and including) the target card.
 * Cycle-safe in case of corrupted parent links.
 */
export function getAncestorPath(
  cards: IdeaCard[],
  cardId: string
): IdeaCard[] {
  const path: IdeaCard[] = [];
  const visited = new Set<string>();
  let current = findCardById(cards, cardId);
  while (current && !visited.has(current.id)) {
    visited.add(current.id);
    path.unshift(current);
    current = current.parentId ? findCardById(cards, current.parentId) : null;
  }
  return path;
}

/**
 * Returns titles of direct children of a card so subsequent branches avoid duplicates.
 */
export function getExistingChildTitles(
  cards: IdeaCard[],
  parentId: string
): string[] {
  return cards
    .filter((c) => c.parentId === parentId)
    .map((c) => c.title.trim())
    .filter(Boolean);
}

export function countSubtree(cards: IdeaCard[], rootId: string): number {
  let total = 0;
  for (const c of cards) {
    if (c.parentId === rootId) {
      total += 1 + countSubtree(cards, c.id);
    }
  }
  return total;
}

export function collectSubtreeIds(
  cards: IdeaCard[],
  rootId: string
): Set<string> {
  const out = new Set<string>();
  const root = findCardById(cards, rootId);
  if (!root) return out;
  out.add(root.id);

  const visit = (parentId: string) => {
    for (const c of cards) {
      if (c.parentId === parentId && !out.has(c.id)) {
        out.add(c.id);
        visit(c.id);
      }
    }
  };
  visit(rootId);
  return out;
}

export function normalizeTag(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, "")
    .toUpperCase()
    .replace(/\s+/g, "_");
}

export function parseTagsInput(raw: string): string[] {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const piece of raw.split(/[,\n]+/)) {
    const norm = normalizeTag(piece);
    if (norm && !seen.has(norm)) {
      seen.add(norm);
      tags.push(norm);
    }
  }
  return tags;
}

export function buildVisibleTree(
  cards: IdeaCard[],
  filterMode: FilterMode,
  searchQuery = "",
  activeTag: string | null = null
): IdeaCard[] {
  const q = searchQuery.trim().toLowerCase();
  const tagTarget = activeTag ? normalizeTag(activeTag) : null;

  const matchesCriteria = (c: IdeaCard): boolean => {
    if (tagTarget) {
      const cardTags = (c.tags || []).map(normalizeTag);
      if (!cardTags.includes(tagTarget)) return false;
    }
    if (q) {
      const haystack = [
        c.title,
        c.summary,
        c.rationale,
        c.skillBadge,
        ...(c.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  };

  if (filterMode === "STARRED") {
    return cards.filter((c) => c.starred && matchesCriteria(c));
  }
  if (filterMode === "ROOTS") {
    return cards.filter(
      (c) => (!c.parentId || !findCardById(cards, c.parentId)) && matchesCriteria(c)
    );
  }

  // If search or tag filter is active in ALL mode, return flat ordered matches
  // so deeply nested matches inside collapsed branches are still discoverable.
  if (q || tagTarget) {
    return buildFullOrderedTree(cards).filter(matchesCriteria);
  }

  const childrenMap = new Map<string, IdeaCard[]>();
  const roots: IdeaCard[] = [];

  for (const c of cards) {
    if (!c.parentId || !findCardById(cards, c.parentId)) {
      roots.push(c);
    } else {
      const list = childrenMap.get(c.parentId) ?? [];
      list.push(c);
      childrenMap.set(c.parentId, list);
    }
  }

  const ordered: IdeaCard[] = [];
  const appendVisibleChildren = (parentId: string, depth: number) => {
    const kids = childrenMap.get(parentId);
    if (!kids) return;
    for (const kid of kids) {
      ordered.push({ ...kid, depth });
      if (!kid.collapsed) {
        appendVisibleChildren(kid.id, depth + 1);
      }
    }
  };

  for (const root of roots) {
    ordered.push({ ...root, depth: 0 });
    if (!root.collapsed) {
      appendVisibleChildren(root.id, 1);
    }
  }

  return ordered;
}

export function buildFullOrderedTree(cards: IdeaCard[]): IdeaCard[] {
  const childrenMap = new Map<string, IdeaCard[]>();
  const roots: IdeaCard[] = [];

  for (const c of cards) {
    if (!c.parentId || !findCardById(cards, c.parentId)) {
      roots.push(c);
    } else {
      const list = childrenMap.get(c.parentId) ?? [];
      list.push(c);
      childrenMap.set(c.parentId, list);
    }
  }

  const out: IdeaCard[] = [];
  const appendAll = (parentId: string, depth: number) => {
    const kids = childrenMap.get(parentId);
    if (!kids) return;
    for (const kid of kids) {
      out.push({ ...kid, depth });
      appendAll(kid.id, depth + 1);
    }
  };

  for (const root of roots) {
    out.push({ ...root, depth: 0 });
    appendAll(root.id, 1);
  }

  return out;
}

export function getActiveGraveyardEntries(
  session: BrainstormSession
): GraveyardEntry[] {
  return session.graveyard.filter((g) => g.activeInPrompts);
}

export function createGraveyardEntry(
  card: IdeaCard,
  reasonTag: string,
  customRule: string,
  archivedSubtree: IdeaCard[] = []
): GraveyardEntry {
  const cleanTag = reasonTag.trim() || "REJECTED_DIRECTION";
  let antiPatternRule: string;
  if (customRule.trim()) {
    antiPatternRule = customRule.trim();
  } else {
    let snippet = card.summary || "";
    if (snippet.length > 110) {
      snippet = `${snippet.slice(0, 107)}...`;
    }
    antiPatternRule = `Avoid ideas resembling "${card.title}" (${cleanTag}): ${snippet}`;
  }

  return {
    id: generateId(),
    reasonTag: cleanTag,
    antiPatternRule,
    activeInPrompts: true,
    banishedAt: Date.now(),
    archivedCard: card,
    archivedSubtree: archivedSubtree.length > 0 ? archivedSubtree : undefined,
  };
}

/**
 * Pure banish helper: removes target card and all descendants, archiving the full subtree
 * into the Graveyard entry so revival never silently loses child nodes.
 */
export function banishCardSubtree(
  session: BrainstormSession,
  card: IdeaCard,
  reasonCode: string,
  customRule: string
): {
  cards: IdeaCard[];
  graveyard: GraveyardEntry[];
  removedIds: Set<string>;
} {
  const removedIds = collectSubtreeIds(session.cards, card.id);
  const descendants = session.cards.filter(
    (c) => removedIds.has(c.id) && c.id !== card.id
  );
  const remaining = session.cards.filter((c) => !removedIds.has(c.id));

  let nextGrave = session.graveyard;
  if (reasonCode !== "DELETE_ONLY") {
    const entry = createGraveyardEntry(card, reasonCode, customRule, descendants);
    nextGrave = [entry, ...session.graveyard];
  }

  return {
    cards: remaining,
    graveyard: nextGrave,
    removedIds,
  };
}

/**
 * Pure revive helper: restores archived card AND its full archived subtree.
 * If the original parent still exists, re-attaches under it; otherwise restores as a root branch.
 */
export function reviveGraveyardEntry(
  session: BrainstormSession,
  entryId: string
): {
  cards: IdeaCard[];
  graveyard: GraveyardEntry[];
  revivedCount: number;
} {
  const entry = session.graveyard.find((g) => g.id === entryId);
  if (!entry) {
    return {
      cards: session.cards,
      graveyard: session.graveyard,
      revivedCount: 0,
    };
  }

  const nextGrave = session.graveyard.filter((g) => g.id !== entryId);
  if (!entry.archivedCard) {
    return {
      cards: session.cards,
      graveyard: nextGrave,
      revivedCount: 0,
    };
  }

  const existingParent = entry.archivedCard.parentId
    ? findCardById(session.cards, entry.archivedCard.parentId)
    : null;

  const restoredRoot: IdeaCard = {
    ...entry.archivedCard,
    parentId: existingParent ? existingParent.id : null,
    depth: existingParent ? existingParent.depth + 1 : 0,
    collapsed: false,
  };

  const depthDelta = restoredRoot.depth - entry.archivedCard.depth;
  const restoredChildren: IdeaCard[] = (entry.archivedSubtree || []).map(
    (child) => ({
      ...child,
      depth: Math.max(1, child.depth + depthDelta),
    })
  );

  const restoredBlock = [restoredRoot, ...restoredChildren];
  const nextCards = [...session.cards];
  if (existingParent) {
    const idx = nextCards.findIndex((c) => c.id === existingParent.id);
    if (idx >= 0) {
      nextCards[idx] = { ...nextCards[idx], collapsed: false };
      nextCards.splice(idx + 1, 0, ...restoredBlock);
    } else {
      nextCards.unshift(...restoredBlock);
    }
  } else {
    nextCards.unshift(...restoredBlock);
  }

  return {
    cards: nextCards,
    graveyard: nextGrave,
    revivedCount: restoredBlock.length,
  };
}

export interface QuadrantClassification {
  label: "Quick Win" | "Big Bet" | "Incremental" | "Reconsider";
  color: string;
}

export function classifyQuadrant(
  ratings?: IdeaRatings
): QuadrantClassification | null {
  if (!ratings) return null;
  const { impact, effort } = ratings;
  if (impact >= 4 && effort <= 2) {
    return { label: "Quick Win", color: "#39FF88" };
  }
  if (impact >= 4 && effort >= 3) {
    return { label: "Big Bet", color: "#00F0FF" };
  }
  if (impact <= 3 && effort <= 2) {
    return { label: "Incremental", color: "#FFB800" };
  }
  return { label: "Reconsider", color: "#FF3864" };
}

export function sessionToMarkdown(session: BrainstormSession): string {
  const lines: string[] = [];
  lines.push(`# ${session.title}\n`);
  if (session.seedPrompt && session.seedPrompt.trim()) {
    lines.push(`> **Seed Prompt:** ${session.seedPrompt.trim()}\n`);
  }
  if (session.sessionConstraints && session.sessionConstraints.trim()) {
    lines.push(`> **Session Constraints:** ${session.sessionConstraints.trim()}\n`);
  }

  const fullTree = buildFullOrderedTree(session.cards);
  lines.push(`## Idea Tree (${fullTree.length} nodes)\n`);

  for (const c of fullTree) {
    const indent = "  ".repeat(c.depth);
    const star = c.starred ? " ★" : "";
    const authorTag = c.author === "human" ? " (Human)" : "";
    lines.push(`${indent}- **[${c.skillBadge}] ${c.title}**${authorTag}${star}`);
    lines.push(`${indent}  ${c.summary}`);
    if (c.rationale && c.rationale.trim()) {
      lines.push(`${indent}  _Why:_ ${c.rationale}`);
    }
    if (c.splicedFrom && c.splicedFrom.length > 0) {
      lines.push(
        `${indent}  _Spliced from:_ ${c.splicedFrom.map((s) => s.title).join(" + ")}`
      );
    }
    if (c.ratings) {
      const quad = classifyQuadrant(c.ratings);
      lines.push(
        `${indent}  _Rating:_ Impact ${c.ratings.impact}/5, Effort ${c.ratings.effort}/5${
          quad ? ` (${quad.label})` : ""
        }`
      );
    }
  }

  if (session.brief) {
    lines.push(`\n## Decision Brief: ${session.brief.title}\n`);
    lines.push(`> ${session.brief.verdict}\n`);
    for (const sec of session.brief.sections) {
      lines.push(`### ${sec.heading}\n${sec.body}\n`);
    }
    if (session.brief.nextActions.length > 0) {
      lines.push(`### Immediate Next Actions`);
      for (const act of session.brief.nextActions) {
        lines.push(`- ${act}`);
      }
      lines.push("");
    }
  }

  if (session.graveyard.length > 0) {
    lines.push(
      `\n## Anti-Pattern Graveyard (${session.graveyard.length} banished)\n`
    );
    for (const g of session.graveyard) {
      const state = g.activeInPrompts ? "Active" : "Muted";
      lines.push(`- **[${g.reasonTag} · ${state}]** ${g.antiPatternRule}`);
    }
  }

  return `${lines.join("\n")}\n`;
}

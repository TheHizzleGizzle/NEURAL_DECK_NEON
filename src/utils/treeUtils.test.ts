import test from "node:test";
import assert from "node:assert/strict";
import type { BrainstormSession, IdeaCard } from "../types/deck";
import {
  banishCardSubtree,
  buildVisibleTree,
  classifyQuadrant,
  getAncestorPath,
  getExistingChildTitles,
  parseTagsInput,
  reviveGraveyardEntry,
  sessionToMarkdown,
} from "./treeUtils";

function makeCard(overrides: Partial<IdeaCard> & { id: string; title: string }): IdeaCard {
  return {
    parentId: null,
    depth: 0,
    summary: `Summary for ${overrides.title}`,
    rationale: "",
    skillBadge: "SEED",
    accentColor: "#00F0FF",
    tags: [],
    starred: false,
    collapsed: false,
    createdAt: 1000,
    author: "ai",
    ...overrides,
  };
}

test("getAncestorPath returns ordered root-to-target chain and avoids cycles", () => {
  const root = makeCard({ id: "r1", title: "Root" });
  const child = makeCard({ id: "c1", parentId: "r1", depth: 1, title: "Child" });
  const grand = makeCard({ id: "g1", parentId: "c1", depth: 2, title: "Grandchild" });

  const path = getAncestorPath([root, child, grand], "g1");
  assert.deepEqual(
    path.map((c) => c.id),
    ["r1", "c1", "g1"]
  );

  // Cycle safety
  const cycA = makeCard({ id: "a", parentId: "b", title: "A" });
  const cycB = makeCard({ id: "b", parentId: "a", title: "B" });
  const cycPath = getAncestorPath([cycA, cycB], "a");
  assert.equal(cycPath.length, 2);
});

test("getExistingChildTitles collects only direct child titles", () => {
  const root = makeCard({ id: "r1", title: "Root" });
  const c1 = makeCard({ id: "c1", parentId: "r1", depth: 1, title: "Alpha" });
  const c2 = makeCard({ id: "c2", parentId: "r1", depth: 1, title: "Beta" });
  const g1 = makeCard({ id: "g1", parentId: "c1", depth: 2, title: "Deep" });

  assert.deepEqual(getExistingChildTitles([root, c1, c2, g1], "r1"), [
    "Alpha",
    "Beta",
  ]);
});

test("buildVisibleTree filters by search query and clickable tags even inside collapsed branches", () => {
  const root = makeCard({
    id: "r1",
    title: "Audio Engine",
    tags: ["AUDIO"],
    collapsed: true,
  });
  const child = makeCard({
    id: "c1",
    parentId: "r1",
    depth: 1,
    title: "Offline Pulse",
    tags: ["ZERO_UI", "OFFLINE"],
  });

  // Collapsed hides child in normal tree view
  assert.deepEqual(
    buildVisibleTree([root, child], "ALL").map((c) => c.id),
    ["r1"]
  );

  // Tag filter surfaces nested child
  assert.deepEqual(
    buildVisibleTree([root, child], "ALL", "", "zero_ui").map((c) => c.id),
    ["c1"]
  );

  // Search query matches title/tags
  assert.deepEqual(
    buildVisibleTree([root, child], "ALL", "offline", null).map((c) => c.id),
    ["c1"]
  );
});

test("banishCardSubtree and reviveGraveyardEntry round-trip parent AND all descendants intact", () => {
  const root = makeCard({ id: "r1", title: "Parent Node" });
  const c1 = makeCard({ id: "c1", parentId: "r1", depth: 1, title: "Child 1" });
  const g1 = makeCard({ id: "g1", parentId: "c1", depth: 2, title: "Grandchild 1" });
  const other = makeCard({ id: "r2", title: "Other Root" });

  const session: BrainstormSession = {
    id: "s1",
    title: "TEST_DECK",
    seedPrompt: "Test seed",
    updatedAt: 1000,
    cards: [root, c1, g1, other],
    graveyard: [],
  };

  const banished = banishCardSubtree(session, root, "TOO_CLICHE", "No gimmicks");
  assert.deepEqual(
    banished.cards.map((c) => c.id),
    ["r2"]
  );
  assert.equal(banished.removedIds.size, 3);
  assert.equal(banished.graveyard.length, 1);
  assert.equal(banished.graveyard[0].archivedSubtree?.length, 2);

  const afterBanish: BrainstormSession = {
    ...session,
    cards: banished.cards,
    graveyard: banished.graveyard,
  };

  const revived = reviveGraveyardEntry(afterBanish, banished.graveyard[0].id);
  assert.equal(revived.revivedCount, 3);
  assert.equal(revived.graveyard.length, 0);
  assert.deepEqual(
    revived.cards.map((c) => c.id),
    ["r1", "c1", "g1", "r2"]
  );
  assert.equal(revived.cards.find((c) => c.id === "g1")?.parentId, "c1");
});

test("classifyQuadrant maps Impact and Effort scores deterministically", () => {
  assert.equal(classifyQuadrant({ impact: 5, effort: 1 })?.label, "Quick Win");
  assert.equal(classifyQuadrant({ impact: 4, effort: 4 })?.label, "Big Bet");
  assert.equal(classifyQuadrant({ impact: 2, effort: 2 })?.label, "Incremental");
  assert.equal(classifyQuadrant({ impact: 2, effort: 5 })?.label, "Reconsider");
  assert.equal(classifyQuadrant(undefined), null);
});

test("parseTagsInput normalizes and deduplicates comma-separated tags", () => {
  assert.deepEqual(parseTagsInput("#audio, zero ui, AUDIO,  flow_state "), [
    "AUDIO",
    "ZERO_UI",
    "FLOW_STATE",
  ]);
});

test("sessionToMarkdown exports splice lineage, human author, ratings, constraints, and decision brief", () => {
  const hybrid = makeCard({
    id: "h1",
    title: "Hybrid Cockpit",
    author: "human",
    starred: true,
    splicedFrom: [
      { id: "a", title: "Idea A" },
      { id: "b", title: "Idea B" },
    ],
    ratings: { impact: 5, effort: 2 },
  });

  const md = sessionToMarkdown({
    id: "s1",
    title: "TEST_DECK",
    seedPrompt: "Build better focus",
    sessionConstraints: "Offline first",
    updatedAt: 1000,
    cards: [hybrid],
    graveyard: [],
    brief: {
      format: "mvp_48h",
      title: "48h Focus Wedge",
      verdict: "Ship Hybrid Cockpit first.",
      sections: [{ heading: "Scope", body: "Single audio loop." }],
      nextActions: ["Build prototype"],
      sourceCardTitles: ["Hybrid Cockpit"],
      generatedAt: 1000,
    },
  });

  assert.match(md, /Session Constraints:\*\* Offline first/);
  assert.match(md, /\(Human\) ★/);
  assert.match(md, /Spliced from:_ Idea A \+ Idea B/);
  assert.match(md, /Impact 5\/5, Effort 2\/5 \(Quick Win\)/);
  assert.match(md, /## Decision Brief: 48h Focus Wedge/);
  assert.match(md, /- Build prototype/);
});

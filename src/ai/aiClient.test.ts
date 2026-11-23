import test from "node:test";
import assert from "node:assert/strict";
import type { IdeaCard } from "../types/deck";
import { parseConvergenceBrief, parseSharpenedSeed } from "./aiClient";

const sampleCard: IdeaCard = {
  id: "c1",
  parentId: null,
  depth: 0,
  title: "Zero-UI Focus",
  summary: "Flip phone to start.",
  rationale: "Removes screen friction.",
  skillBadge: "SEED",
  accentColor: "#00F0FF",
  tags: [],
  starred: true,
  collapsed: false,
  createdAt: 1000,
};

test("parseConvergenceBrief falls back cleanly on plain prose and JSON null", () => {
  const proseBrief = parseConvergenceBrief(
    "Ship the Zero-UI lockscreen wedge first.",
    "mvp_48h",
    [sampleCard]
  );
  assert.equal(proseBrief.title, "Synthesized Decision Brief");
  assert.equal(proseBrief.sections[0].heading, "Summary");
  assert.equal(
    proseBrief.sections[0].body,
    "Ship the Zero-UI lockscreen wedge first."
  );

  const nullBrief = parseConvergenceBrief("null", "product_spec", [sampleCard]);
  assert.equal(nullBrief.title, "Synthesized Decision Brief");
  assert.equal(nullBrief.sections[0].body, "null");
});

test("parseSharpenedSeed extracts sharpened field and rejects mismatched JSON shapes", () => {
  assert.equal(
    parseSharpenedSeed('{"sharpened": "Build a screenless 90-minute focus timer."}'),
    "Build a screenless 90-minute focus timer."
  );

  assert.throws(
    () => parseSharpenedSeed('{"unexpected": 123}'),
    /unexpected JSON shape/
  );
});

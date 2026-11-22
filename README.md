# NEURAL//DECK

Pixel-art cyber-deck web application for AI-assisted brainstorming, rewritten in React, TypeScript, Tailwind CSS, and Express from the original Android app.

## Features

- **Branching Idea Tree**: Spark root concept cartridges from a seed prompt, branch any card into child nodes with 90-degree neon circuit rails, collapse/expand subtrees, star favorites, and filter by `[ALL]`, `[★ STARRED]`, or `[ROOTS]`.
- **Creative Skills Deck**: Arm the deck or branch specific cards using 8 built-in thinking cartridges (`10X_DIVERGE`, `SCAMPER`, `1ST_PRINC`, `PRE_MORTEM`, `INVERT`, `ANALOGY`, `6_HATS`, `48H_MVP`) or forge/delete custom skills.
- **Multi-Select Splice / Mashup**: Arm 2 or more cards with `[+SPLICE]` and fuse them into emergent hybrid concepts.
- **Anti-Pattern Idea Graveyard**: Banish cards with reason tags (`TOO_CLICHE`, `OUT_OF_SCOPE`, `WRONG_VIBE`, `DEAD_END`) or custom rules to inject negative memory into future AI prompts; toggle rules (`MUTE_RULE` / `ENABLE_RULE`), revive nodes, or purge entries.
- **Prompt Optimizer Lab**: Upgrade rough seeds via `CO-STAR`, `10X_DIVERGENT`, `SOCRATIC`, or `CONSTRAINT_BOX` using the live AI link (with built-in local heuristic fallback).
- **Neural Link Server Proxy**: Routes AI requests server-side through Express (`/api/ai/chat`) with built-in Gemini support (`@google/genai`) and optional OpenAI-compatible provider presets (`OPENROUTER`, `OPENAI`, `GROQ`, `DEEPSEEK`, `CUSTOM_URL`), divergence temperature control, global persona/constraints, and endpoint ping diagnostics.
- **Sessions & Markdown Export**: Create, switch, rename, and delete brainstorming sessions persisted in `localStorage`, and export/copy/download any session tree as Markdown.

## Development

```bash
npm install
npm run dev
```

The server listens on `http://0.0.0.0:3000`.

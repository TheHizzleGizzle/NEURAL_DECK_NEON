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

## Android app (APK)

The same React app ships as a native Android app via [Capacitor](https://capacitorjs.com) (`android/`, `capacitor.config.ts`).
There is no Express server on the phone, so the app talks to AI providers **directly** using your own API key:

- **Gemini** — paste a key from <https://aistudio.google.com/apikey> in **Options → AI Engine**.
- **OpenRouter** — paste a key from <https://openrouter.ai/keys> (OAuth sign-in is web-only).

Keys are kept in the app's private storage (never in the JSON backup or exports) and sent only to the provider you pick. Like the rest of the app's data, they can be included in Android's encrypted device backup if you have it enabled (`android:allowBackup="true"`).
In the app, Markdown/JSON exports open the Android share sheet so you can save them to Files or Drive, and the back button closes the topmost dialog.

### Build the APK

Requires Node, the Android SDK, and a JDK (Android Studio's bundled JBR works; Gradle auto-downloads the JDK 21 toolchain the plugins need).

```powershell
npm install
npm run android:apk   # vite build → cap sync → gradlew assembleDebug → apk/neural-deck-<version>-debug.apk
```

To iterate in Android Studio instead: `npm run android:sync`, then open `android/`.

### Install on a phone

Copy `apk/neural-deck-<version>-debug.apk` to the phone and open it (allow "Install unknown apps" for your file manager when prompted), or with USB debugging on: `adb install -r apk/neural-deck-<version>-debug.apk`.
Updates must be signed with the same key: debug builds use this machine's `~/.android/debug.keystore`, so always build updates on the same machine. Installing a build signed with a different key requires uninstalling first, which **erases all sessions** — and there is no backup *import* yet, so an exported JSON backup is a readable copy, not a restore point.

# NEURAL//DECK
commit these changes and push them to main

Pixel-art cyber-deck web application for AI-assisted brainstorming, rewritten in React, TypeScript, Tailwind CSS, and Express from the original Android app.

## Features

- **Branching Idea Tree**: Spark root concept cartridges from a seed prompt, branch any card into child nodes with 90-degree neon circuit rails (or add your own manual root/child cards), collapse/expand subtrees, edit cards inline, star finalists, and filter by `All`, `★ Starred`, `Roots`, live search, or clickable `#TAG` pills.
- **Creative Skills Deck**: Arm the deck or branch specific cards using 8 built-in thinking cartridges (`10X_DIVERGE`, `SCAMPER`, `1ST_PRINC`, `PRE_MORTEM`, `INVERT`, `ANALOGY`, `6_HATS`, `48H_MVP`) or forge/delete custom skills, with optional per-branch steering notes.
- **Multi-Select Splice / Mashup**: Arm 2 or more cards with `+ Splice` and fuse them into emergent hybrid concepts with tracked parent lineage.
- **Convergence Shortlist & Decision Briefs**: Rate starred finalists on Impact and Effort (auto-classified into `Quick Win`, `Big Bet`, `Incremental`, or `Reconsider`) and synthesize a `48h MVP`, `1-Page Spec`, or `Tradeoffs` decision brief.
- **Anti-Pattern Idea Graveyard**: Banish cards (and their subtrees) with reason tags (`TOO_CLICHE`, `OUT_OF_SCOPE`, `WRONG_VIBE`, `DEAD_END`) or custom rules to inject negative memory into future AI prompts; toggle rules (`Mute Rule` / `Enable Rule`), revive branches, or purge entries.
- **1-Click Inline Seed Sharpener**: Tighten rough seed ideas into crisp creative briefs with single-click `Revert` back to the prior draft.
- **Built-in Gemini & OpenRouter Integration**: Web builds proxy requests server-side through Express (`/api/ai/chat`) with built-in Gemini support (`@google/genai`) and OpenRouter OAuth PKCE (`Fast` / `Balanced` / `Deep` reasoning presets, `Grounded` / `Balanced` / `Wild` divergence styles, and session/global context constraints).
- **Dark/Light Themes, Offline PWA & Exports**: Switch between Dark and Light modes, work offline with local `localStorage` persistence, switch/rename/delete sessions, and export Markdown trees or JSON backups.

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

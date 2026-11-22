# NEURAL//DECK code review (2026-11-22)

Scope: the whole repo at `ce128be` (HEAD), reviewed for correctness/state, server/AI/security, and mobile/Android/UX. Three reviewers worked from clean worktrees and an adversarial verifier re-checked every finding (36 raised → 32 survived; 4 refuted as duplicates or wrong).

**Status** is against the current working tree, which adds the Android (Capacitor) build:
✅ fixed · 🟡 partly fixed · ⬜ open.

## Highest priority (open)

| # | Status | Severity | Where | Finding |
|---|---|---|---|---|
| 1 | ⬜ | **High** | `src/App.tsx` (backup), `src/utils/storage.ts` | **No backup import.** All data lives in WebView `localStorage`. Export now works on Android (share sheet), but there is no way to restore it. Uninstalling (e.g. to install a build signed with a different key) or "Clear storage" loses every session. *Fix:* add "Import backup" that validates and merges `sessions` / `customSkills` / `tuning` / `uiPrefs`. |
| 2 | ⬜ | **High** (web) | `server.ts:558` | **`/api/ai/chat` is an open, unauthenticated, unrate-limited proxy** for the server's `GEMINI_API_KEY` (2 MB body, caller picks `deep`/HIGH thinking). Anyone with the URL can spend your quota. *Fix:* require caller identity, add rate limiting (e.g. `express-rate-limit`), cut the body limit to ~64 KB, cap prompt length. Not relevant to the APK (no server). |
| 3 | ⬜ | Medium (web) | `src/App.tsx:301` | **OAuth `postMessage` listener trusts spoofable origins** (`*.run.app`, anything *containing* `localhost`) and never checks `event.source` or that a connect is pending, so an attacker page can inject its own OpenRouter session token. *Fix:* exact-match the callback origin, check `event.source === popup`, require a pending flow. |
| 4 | ⬜ | Medium | `src/utils/storage.ts:142` | **`saveSessions`/`saveCustomSkills` swallow `QuotaExceededError`.** Once storage is full, work only lives in memory and is lost when Android kills the app. "Forged custom skill" toasts even when the save failed. *Fix:* surface a "storage full — export now" banner; consider IndexedDB/Filesystem on native. |
| 5 | ⬜ | Medium | `src/App.tsx:262` | **Undo restores a whole-session snapshot**, silently discarding everything done in the 6 s window (AI results that landed, stars, ratings, constraint edits). *Fix:* make undo an inverse operation (revive that graveyard entry). |
| 6 | ⬜ | Medium | `src/ai/aiClient.ts:573` | **Unguarded `JSON.parse` in `synthesizeConvergenceBrief`.** A prose reply (likely after the OpenRouter no-`response_format` retry) throws, and the paid output is discarded; a `null` reply is a TypeError. `sharpenSeedPrompt` can write raw JSON into the seed box. *Fix:* try/catch with the existing `Summary: raw` fallback. |

## Android / APK readiness

| Status | Finding (original severity) | Resolution |
|---|---|---|
| ✅ | Every AI call and the OpenRouter OAuth flow depend on `server.ts`, which the APK doesn't have (critical) | Native builds call Gemini / OpenRouter **directly** with the user's own key (`src/ai/directProviders.ts`). CORS from `https://localhost` verified for both. The web build still uses the server. |
| ✅ | Markdown download & JSON backup use `<a download href=blob:>`, which does nothing in the WebView yet toasts success (high) | `saveTextFile()` writes to app cache and opens the Android share sheet; success toast only after it works. |
| ✅ | No Android back-button handling: Back exits the app with a dialog open (medium) | Back closes the topmost App-level dialog/sheet, then minimizes. *Inline card editors/popovers aren't covered.* |
| ✅ | PWA service worker + "Install App" UI ship into the native build (medium) | SW registration and install UI skipped on native. |
| ✅ | Fonts from Google Fonts at runtime: offline first launch falls back, third-party request every launch (low) | Self-hosted via `@fontsource` (Latin subsets). |
| 🟡 | No safe-area handling; header/dock under system bars on Android 15 edge-to-edge (low) | APK: Capacitor 8 SystemBars pads the WebView (no `viewport-fit=cover`), dark `windowBackground`, light bar icons. **Not yet observed on a device.** iOS/PWA `black-translucent` still open. |
| 🟡 | OpenRouter token is memory-only while provider choice persists; mobile status hint hidden (low) | APK: keys persist and an "Add key" banner shows on all widths. Web: unchanged. |
| ✅ | OpenRouter Disconnect uses undefined class `px-btn-crimson` (low) | Uses the existing `px-grave-badge` danger style. |

## Correctness / state (open)

| Severity | Where | Finding |
|---|---|---|
| Medium (web) | `src/App.tsx:238` | Two tabs/windows (PWA + browser) overwrite each other's sessions — last writer wins. APK unaffected. |
| Low | `src/App.tsx:539` | Banish/Delete stay enabled during an AI branch/splice; the late result becomes orphan root cards with a dangling `parentId`. |
| Low | `src/App.tsx:490` | Switching sessions during "Sharpen Seed" drops session X's sharpened prompt (and Revert draft) into session Y. |
| Low | `src/App.tsx:1308` | Ctrl/Cmd+Enter sparks with no busy check; overlapping requests and the first to finish re-enables all AI controls. |
| Low | `src/utils/storage.ts:133` | Unparseable stored sessions are overwritten by the starter session with no recovery copy. |
| Low | `src/utils/treeUtils.ts:399` | Markdown export indents only the first line of multi-line fields; an unclosed ``` in raw model output turns the rest of the file into a code block. |

## Server / web-only (open)

| Severity | Where | Finding |
|---|---|---|
| Medium | `server.ts:50` | OAuth state is in-memory: a restart leaves the UI "connected" while every call 401s; ~200 anonymous `/url` calls evict a user's pending PKCE state. |
| Medium | `server.ts:86` | OAuth callback is fixed to `APP_URL` (default `http://localhost:3000`), so any other origin (LAN IP, custom domain) never receives the token. |
| Low | `server.ts:196` | `.env` is never loaded (no dotenv / `--env-file`), so `GEMINI_API_KEY` in `.env` is ignored outside AI Studio; error text points at AI Studio UI. |
| 🟡 Low | `server.ts:232` | No timeouts/abort on server AI fetches and no cancel in the UI. *(The APK's direct path now has 150 s timeouts.)* |
| Low | `package.json:9` | `npm start` runs the Vite dev middleware (NODE_ENV unset); PORT hardcoded; AI Studio User-Agent hardcoded. |

## UX / accessibility / performance (open)

| Severity | Where | Finding |
|---|---|---|
| Low | `src/App.tsx:1257` | Every keystroke re-renders all cards with super-linear `countSubtree`; constraint edits re-serialize every session to storage. Noticeable on big decks on mid-range phones. |
| Low | `src/components/WorkstationRail.tsx:263` | Touch targets 18–30 px (ratings, un-star, action row incl. Banish), far below 44–48 dp. |
| Low | `src/components/SkillsSheet.tsx:86` | Custom-skill Delete is one tap, no confirm/undo, right next to "select". |
| Low | `src/components/DeckDialogs.tsx:29` | Dialogs don't move/trap/restore focus; Escape closes stacked layers; unlabeled inputs; duplicate ids from the rail rendering twice. |
| Low | `index.html:2` | Light-theme users get a dark flash on every cold start. |
| Low | `src/index.css:27` | Light-mode `.px-btn-cyan` (white on `#0284c7`) is ~4.1:1, below WCAG AA. |

## Repo hygiene

| Status | Finding |
|---|---|
| ✅ | `package-lock.json` was out of sync (missing `vite-plugin-pwa`), so `npm ci` failed. Re-synced. |
| ⬜ | `bun.lock` is now stale against `package.json` (Capacitor, fonts, genai range). Pick one package manager and delete the other lockfile. |
| ✅ | `.gitignore` lacked `node_modules`, `dist`, `.env`. Added (plus `apk/`). |
| ⬜ | `dev-dist/` (generated dev service worker) is committed. Remove it and ignore it. |
| ✅ | `"@google/genai": ">=2.29.1"` accepted any future major. Now `^3.6.1` (it ships in the APK). |
| ✅ | `treeUtils.test.ts` had no runner. `npm test` added (7/7 pass). |
| ⬜ | README describes features that don't exist: "Prompt Optimizer Lab" (CO-STAR, SOCRATIC…), OPENAI/GROQ/DEEPSEEK/CUSTOM_URL presets, "divergence temperature", "endpoint ping diagnostics". |

## Notes on the Android build

- **Gemini model IDs are hard-coded and unverified**: `gemini-4-hydrogen` (Balanced/Deep) and `gemini-3.1-flash-lite` (Fast), copied unchanged from `server.ts`. A bogus-key call reached Google's auth check, but no call has been made with a real key. If a preset returns "model not found", it can't be fixed from the phone. Switch to OpenRouter in the meantime.
- The APK is a **debug build** (debuggable, debug-signed). Fine for personal use, but anyone with USB access to an unlocked phone could inspect the WebView, and with it the stored API keys.
- `android:allowBackup="true"`: app data, including keys, can be included in Android's encrypted device backup.

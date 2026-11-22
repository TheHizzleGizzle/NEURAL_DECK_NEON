import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  BrainstormSession,
  BriefFormat,
  CreativeSkill,
  DeckTuningConfig,
  FilterMode,
  GraveyardEntry,
  IdeaCard,
  IdeaRatings,
  OpenRouterModelInfo,
  ProviderKeys,
  RailTab,
  SynthesizedBrief,
  UiPreferences,
} from "./types/deck";
import {
  DIRECT_PROVIDER_MODE,
  branchFromCard,
  disconnectOpenRouter,
  fetchOpenRouterAuthUrl,
  fetchOpenRouterModels,
  generateSeedIdeas,
  mashupCards,
  sharpenSeedPrompt,
  synthesizeConvergenceBrief,
} from "./ai/aiClient";
import { FEATURED_OPENROUTER_MODELS } from "./ai/openRouterCatalog";
import { IS_NATIVE, copyText, saveTextFile } from "./platform/native";
import { generateId } from "./data/starterSession";
import {
  getActiveSessionId,
  loadAllSkills,
  loadCustomSkills,
  loadProviderKeys,
  loadSessions,
  loadTuningConfig,
  loadUiPreferences,
  saveCustomSkills,
  saveProviderKeys,
  saveSessions,
  saveTuningConfig,
  saveUiPreferences,
  setActiveSessionId,
} from "./utils/storage";
import {
  banishCardSubtree,
  buildVisibleTree,
  countSubtree,
  findCardById,
  getActiveGraveyardEntries,
  getAncestorPath,
  getExistingChildTitles,
  getParentTitle,
  normalizeTag,
  reviveGraveyardEntry,
  sessionToMarkdown,
} from "./utils/treeUtils";
import { PixelGridBackground } from "./components/PixelGridBackground";
import {
  PxBranchIcon,
  PxChipIcon,
  PxExportIcon,
  PxFolderIcon,
  PxPlusIcon,
  PxSearchIcon,
  PxSkullIcon,
  PxSlidersIcon,
  PxSparkIcon,
  PxSpliceIcon,
  PxTargetIcon,
} from "./components/PixelIcons";
import { IdeaCardRow } from "./components/IdeaCardRow";
import { SkillsSheet } from "./components/SkillsSheet";
import { WorkstationRail } from "./components/WorkstationRail";
import { BottomSheetShell } from "./components/BottomSheetShell";
import { OptionsDialog } from "./components/OptionsDialog";
import { PWAInstallButton } from "./components/PWAInstallButton";
import { OfflineIndicator } from "./components/OfflineIndicator";
import {
  BanishDialog,
  ErrorDialog,
  ExportMarkdownDialog,
  ForgeSkillDialog,
  ManualCardDialog,
  SessionSwitcherDialog,
  TextPromptDialog,
} from "./components/DeckDialogs";

const FALLBACK_FEATURED_MODELS: OpenRouterModelInfo[] = FEATURED_OPENROUTER_MODELS;

/** Filesystem-safe export name (session titles are free text and may contain "/" etc.). */
function toSafeFileName(base: string, ext: string): string {
  const cleaned = base
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${cleaned || "neural_deck"}.${ext}`;
}

interface ToastState {
  message: string;
  canUndo?: boolean;
}

export default function App() {
  const [sessions, setSessions] = useState<BrainstormSession[]>(() =>
    loadSessions()
  );
  const [activeSessionId, setActiveSessionIdState] = useState<string>(() => {
    const loaded = loadSessions();
    const saved = getActiveSessionId();
    const found = loaded.find((s) => s.id === saved);
    return found ? found.id : loaded[0].id;
  });

  const [allSkills, setAllSkills] = useState<CreativeSkill[]>(() =>
    loadAllSkills()
  );
  const [activeSkillId, setActiveSkillId] = useState<string>(
    () => loadAllSkills()[0]?.id ?? "skill_diverge_10x"
  );
  const [tuning, setTuning] = useState<DeckTuningConfig>(() =>
    loadTuningConfig()
  );
  const [uiPrefs, setUiPrefs] = useState<UiPreferences>(() =>
    loadUiPreferences()
  );

  // OpenRouter OAuth PKCE session token — held strictly in React memory (never localStorage)
  const [openRouterSessionToken, setOpenRouterSessionToken] = useState<
    string | null
  >(null);
  const [openRouterConnecting, setOpenRouterConnecting] = useState(false);
  const [openRouterModels, setOpenRouterModels] = useState<
    OpenRouterModelInfo[]
  >(FALLBACK_FEATURED_MODELS);
  const [featuredModels, setFeaturedModels] = useState<OpenRouterModelInfo[]>(
    FALLBACK_FEATURED_MODELS
  );
  const modelsLoadedRef = useRef(false);

  // Native app only: user's own provider API keys (persisted on-device, never exported).
  const [providerKeys, setProviderKeys] = useState<ProviderKeys>(() =>
    loadProviderKeys()
  );
  const handleUpdateProviderKeys = (next: ProviderKeys) => {
    setProviderKeys(next);
    saveProviderKeys(next);
  };
  const openRouterConnected = DIRECT_PROVIDER_MODE
    ? Boolean(providerKeys.openRouterApiKey)
    : Boolean(openRouterSessionToken);
  const geminiReady = DIRECT_PROVIDER_MODE
    ? Boolean(providerKeys.geminiApiKey)
    : true;

  // Sync .dark class on <html> and <meta name="theme-color"> cleanly whenever theme changes
  useEffect(() => {
    const root = document.documentElement;
    if (uiPrefs.theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute(
        "content",
        uiPrefs.theme === "dark" ? "#080A12" : "#EEF2F8"
      );
    }
  }, [uiPrefs.theme]);

  // Tree filtering & selection
  const [filterMode, setFilterMode] = useState<FilterMode>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedMashupIds, setSelectedMashupIds] = useState<string[]>([]);

  // Right rail state (desktop persistent, mobile drawer)
  const [railTab, setRailTab] = useState<RailTab>("shortlist");
  const [mobileRailOpen, setMobileRailOpen] = useState(false);

  // Busy & notification state
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
  const [isSharpening, setIsSharpening] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [previousSeedDraft, setPreviousSeedDraft] = useState<string | null>(
    null
  );

  // Dialog & sheet state
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [skillsSheetState, setSkillsSheetState] = useState<{
    open: boolean;
    targetCard: IdeaCard | null;
  }>({ open: false, targetCard: null });
  const [manualComposerState, setManualComposerState] = useState<{
    open: boolean;
    parentCard: IdeaCard | null;
  }>({ open: false, parentCard: null });
  const [sessionSwitcherOpen, setSessionSwitcherOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [renameSessionOpen, setRenameSessionOpen] = useState(false);
  const [forgeSkillOpen, setForgeSkillOpen] = useState(false);
  const [banishTarget, setBanishTarget] = useState<IdeaCard | null>(null);
  const [errorDialog, setErrorDialog] = useState<{
    code: string;
    details: string;
  } | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const treeScrollRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const undoSnapshotRef = useRef<BrainstormSession | null>(null);

  const showToast = useCallback(
    (message: string, undoSnapshot?: BrainstormSession) => {
      if (undoSnapshot) {
        undoSnapshotRef.current = undoSnapshot;
      } else {
        undoSnapshotRef.current = null;
      }
      setToast({ message, canUndo: Boolean(undoSnapshot) });
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(
        () => {
          setToast(null);
          undoSnapshotRef.current = null;
          toastTimerRef.current = null;
        },
        undoSnapshot ? 6000 : 3000
      );
    },
    []
  );

  const activeSession = useMemo(() => {
    return sessions.find((s) => s.id === activeSessionId) ?? sessions[0];
  }, [sessions, activeSessionId]);

  const activeSkill = useMemo(() => {
    return allSkills.find((s) => s.id === activeSkillId) ?? allSkills[0] ?? null;
  }, [allSkills, activeSkillId]);

  const [seedPromptInput, setSeedPromptInput] = useState<string>(
    () => activeSession?.seedPrompt ?? ""
  );

  useEffect(() => {
    setSeedPromptInput(activeSession?.seedPrompt ?? "");
    setPreviousSeedDraft(null);
    setSearchQuery("");
    setActiveTag(null);
  }, [activeSession?.id]);

  const updateSessions = useCallback(
    (updater: (prev: BrainstormSession[]) => BrainstormSession[]) => {
      setSessions((prev) => {
        const next = updater(prev);
        saveSessions(next);
        return next;
      });
    },
    []
  );

  const updateActiveSession = useCallback(
    (updater: (session: BrainstormSession) => BrainstormSession) => {
      updateSessions((prev) =>
        prev.map((s) =>
          s.id === activeSession.id
            ? { ...updater(s), updatedAt: Date.now() }
            : s
        )
      );
    },
    [activeSession.id, updateSessions]
  );

  const handleUndo = () => {
    const snap = undoSnapshotRef.current;
    if (!snap) return;
    updateSessions((prev) =>
      prev.map((s) => (s.id === snap.id ? snap : s))
    );
    undoSnapshotRef.current = null;
    setToast(null);
    showToast("Action undone.");
  };

  const handleUpdateTuning = (next: DeckTuningConfig) => {
    setTuning(next);
    saveTuningConfig(next);
  };

  const handleUpdatePrefs = (next: UiPreferences) => {
    setUiPrefs(next);
    saveUiPreferences(next);
  };

  // Fetch OpenRouter model catalog lazily when Options opens
  useEffect(() => {
    if (!optionsOpen || modelsLoadedRef.current) return;
    modelsLoadedRef.current = true;
    fetchOpenRouterModels()
      .then((res) => {
        if (res.featured.length > 0) setFeaturedModels(res.featured);
        if (res.models.length > 0) setOpenRouterModels(res.models);
      })
      .catch(() => {
        // Keep curated fallback models on offline/network error
      });
  }, [optionsOpen]);

  // Listen for OpenRouter OAuth PKCE popup completion
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin || "";
      const isTrusted =
        origin === window.location.origin ||
        origin.endsWith(".run.app") ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1");
      if (!isTrusted) return;

      const data = event.data as
        | { type?: string; sessionToken?: string; error?: string }
        | undefined;
      if (!data || typeof data !== "object") return;

      if (
        data.type === "OPENROUTER_OAUTH_SUCCESS" &&
        typeof data.sessionToken === "string" &&
        data.sessionToken.length > 0
      ) {
        setOpenRouterSessionToken(data.sessionToken);
        setOpenRouterConnecting(false);
        setTuning((prev) => {
          const next: DeckTuningConfig = { ...prev, provider: "openrouter" };
          saveTuningConfig(next);
          return next;
        });
        showToast("OpenRouter account connected for this session.");
      } else if (data.type === "OPENROUTER_OAUTH_ERROR") {
        setOpenRouterConnecting(false);
        setErrorDialog({
          code: "OpenRouter OAuth",
          details:
            data.error || "Could not complete OpenRouter authorization.",
        });
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [showToast]);

  const handleConnectOpenRouter = async () => {
    setOpenRouterConnecting(true);
    try {
      const { url } = await fetchOpenRouterAuthUrl();
      const popup = window.open(
        url,
        "openrouter_oauth_popup",
        "width=600,height=720"
      );
      if (!popup) {
        setOpenRouterConnecting(false);
        setErrorDialog({
          code: "Popup Blocked",
          details:
            "Your browser blocked the OpenRouter sign-in popup. Please allow popups for this site and click Connect OpenRouter again.",
        });
        return;
      }
      // Reset connecting state if user closes popup manually
      const poll = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(poll);
          setOpenRouterConnecting(false);
        }
      }, 600);
    } catch (err) {
      setOpenRouterConnecting(false);
      setErrorDialog({
        code: "OpenRouter OAuth",
        details:
          err instanceof Error
            ? err.message
            : "Could not initialize OpenRouter OAuth.",
      });
    }
  };

  const handleDisconnectOpenRouter = async () => {
    const token = openRouterSessionToken;
    setOpenRouterSessionToken(null);
    await disconnectOpenRouter(token);
    showToast("Disconnected OpenRouter session.");
  };

  const handleExportBackupJson = async () => {
    // Provider API keys live in a separate storage slot and are intentionally not included.
    const payload = {
      exportedAt: new Date().toISOString(),
      sessions,
      customSkills: loadCustomSkills(),
      tuning,
      uiPrefs,
    };
    try {
      const result = await saveTextFile(
        `neural-deck-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2),
        "application/json"
      );
      if (result === "downloaded") showToast("Downloaded local JSON backup.");
      else if (result === "shared") showToast("Backup ready to save or share.");
    } catch (err) {
      setErrorDialog({
        code: "Backup Failed",
        details: err instanceof Error ? err.message : "Could not export backup.",
      });
    }
  };

  const starredCards = useMemo(
    () => activeSession.cards.filter((c) => c.starred),
    [activeSession.cards]
  );

  const isFlatView =
    filterMode !== "ALL" || searchQuery.trim().length > 0 || activeTag !== null;

  const visibleCards = useMemo(() => {
    return buildVisibleTree(
      activeSession.cards,
      filterMode,
      searchQuery,
      activeTag
    );
  }, [activeSession.cards, filterMode, searchQuery, activeTag]);

  const selectedMashupSet = useMemo(
    () => new Set(selectedMashupIds),
    [selectedMashupIds]
  );

  const isAnyAiBusy = Boolean(loadingMessage) || isSharpening || isSynthesizing;

  /* --- AI Operations --- */

  const sparkRootIdeas = async (overridePrompt?: string) => {
    const seed = (overridePrompt ?? seedPromptInput).trim();
    if (!seed) {
      showToast("Enter a seed idea in the bottom dock first.");
      return;
    }

    if (overridePrompt !== undefined) {
      setSeedPromptInput(seed);
    }
    updateActiveSession((s) => ({ ...s, seedPrompt: seed }));

    const badge = activeSkill?.badge ?? "SEED";
    setLoadingMessage(`Sparking root ideas with [${badge}]...`);
    try {
      const generated = await generateSeedIdeas(
        tuning,
        seed,
        activeSession.sessionConstraints,
        activeSkill,
        getActiveGraveyardEntries(activeSession),
        openRouterSessionToken
      );
      updateActiveSession((s) => ({
        ...s,
        seedPrompt: seed,
        cards: [...generated, ...s.cards],
      }));
      setFilterMode("ALL");
      setSearchQuery("");
      setActiveTag(null);
      requestAnimationFrame(() => {
        treeScrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    } catch (err) {
      const details =
        err instanceof Error ? err.message : "Unexpected AI request error";
      setErrorDialog({ code: "Spark Failed", details });
    } finally {
      setLoadingMessage(null);
    }
  };

  const handleSharpenSeed = async () => {
    const raw = seedPromptInput.trim();
    if (!raw) {
      showToast("Type a rough seed idea first to sharpen it.");
      return;
    }
    setIsSharpening(true);
    try {
      const sharpened = await sharpenSeedPrompt(
        tuning,
        raw,
        activeSession.sessionConstraints,
        getActiveGraveyardEntries(activeSession),
        openRouterSessionToken
      );
      setPreviousSeedDraft(raw);
      setSeedPromptInput(sharpened);
      updateActiveSession((s) => ({ ...s, seedPrompt: sharpened }));
      showToast("Seed sharpened. Ready to spark.");
    } catch (err) {
      const details =
        err instanceof Error ? err.message : "Could not sharpen seed prompt";
      setErrorDialog({ code: "Sharpen Failed", details });
    } finally {
      setIsSharpening(false);
    }
  };

  const branchCardWithSkill = async (
    parent: IdeaCard,
    skill: CreativeSkill,
    steeringNote?: string
  ) => {
    updateActiveSession((s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === parent.id ? { ...c, collapsed: false } : c
      ),
    }));

    const ancestorPath = getAncestorPath(activeSession.cards, parent.id);
    const existingChildren = getExistingChildTitles(
      activeSession.cards,
      parent.id
    );

    setLoadingMessage(
      steeringNote
        ? `Branching "${parent.title}" with steering...`
        : `Branching "${parent.title}" via [${skill.badge}]...`
    );
    try {
      const children = await branchFromCard(
        tuning,
        parent,
        ancestorPath,
        existingChildren,
        activeSession.seedPrompt,
        activeSession.sessionConstraints,
        skill,
        getActiveGraveyardEntries(activeSession),
        steeringNote,
        openRouterSessionToken
      );
      updateActiveSession((s) => {
        const idx = s.cards.findIndex((c) => c.id === parent.id);
        const nextCards = [...s.cards];
        if (idx >= 0) {
          nextCards.splice(idx + 1, 0, ...children);
        } else {
          nextCards.push(...children);
        }
        return { ...s, cards: nextCards };
      });
      setFilterMode("ALL");
      setSearchQuery("");
      setActiveTag(null);
    } catch (err) {
      const details =
        err instanceof Error ? err.message : "Unexpected AI request error";
      setErrorDialog({ code: "Branch Failed", details });
    } finally {
      setLoadingMessage(null);
    }
  };

  const executeMashup = async () => {
    if (selectedMashupIds.length < 2) {
      showToast("Select at least 2 idea cards with [+ Splice] to fuse them.");
      return;
    }

    const selectedCards: IdeaCard[] = [];
    for (const id of selectedMashupIds) {
      const found = findCardById(activeSession.cards, id);
      if (found) selectedCards.push(found);
    }
    if (selectedCards.length < 2) return;

    setLoadingMessage(`Splicing ${selectedCards.length} ideas into hybrids...`);
    try {
      const hybrids = await mashupCards(
        tuning,
        selectedCards,
        activeSession.seedPrompt,
        activeSession.sessionConstraints,
        getActiveGraveyardEntries(activeSession),
        openRouterSessionToken
      );
      const anchor = selectedCards[0];
      updateActiveSession((s) => {
        const nextCards = s.cards.map((c) =>
          c.id === anchor.id ? { ...c, collapsed: false } : c
        );
        const idx = nextCards.findIndex((c) => c.id === anchor.id);
        if (idx >= 0) {
          nextCards.splice(idx + 1, 0, ...hybrids);
        } else {
          nextCards.push(...hybrids);
        }
        return { ...s, cards: nextCards };
      });
      setSelectedMashupIds([]);
      setFilterMode("ALL");
      setSearchQuery("");
      setActiveTag(null);
    } catch (err) {
      const details =
        err instanceof Error ? err.message : "Unexpected AI request error";
      setErrorDialog({ code: "Splice Failed", details });
    } finally {
      setLoadingMessage(null);
    }
  };

  const handleSynthesizeBrief = async (format: BriefFormat) => {
    if (starredCards.length === 0) {
      showToast("Star at least one idea card first.");
      return;
    }
    setIsSynthesizing(true);
    try {
      const brief = await synthesizeConvergenceBrief(
        tuning,
        format,
        starredCards,
        activeSession.seedPrompt,
        activeSession.sessionConstraints,
        getActiveGraveyardEntries(activeSession),
        openRouterSessionToken
      );
      updateActiveSession((s) => ({ ...s, brief }));
      showToast("Decision brief synthesized.");
    } catch (err) {
      const details =
        err instanceof Error ? err.message : "Could not synthesize brief";
      setErrorDialog({ code: "Synthesis Failed", details });
    } finally {
      setIsSynthesizing(false);
    }
  };

  /* --- Human Authoring & Card Actions --- */

  const handleCreateManualCard = (payload: {
    parentId: string | null;
    title: string;
    summary: string;
    rationale: string;
    tags: string[];
  }) => {
    const parent = payload.parentId
      ? findCardById(activeSession.cards, payload.parentId)
      : null;

    const newCard: IdeaCard = {
      id: generateId(),
      parentId: parent ? parent.id : null,
      depth: parent ? parent.depth + 1 : 0,
      title: payload.title,
      summary: payload.summary,
      rationale: payload.rationale,
      skillBadge: "HUMAN",
      accentColor: "#39FF88",
      tags: payload.tags,
      starred: false,
      collapsed: false,
      createdAt: Date.now(),
      author: "human",
    };

    updateActiveSession((s) => {
      const nextCards = s.cards.map((c) =>
        parent && c.id === parent.id ? { ...c, collapsed: false } : c
      );
      if (parent) {
        const idx = nextCards.findIndex((c) => c.id === parent.id);
        if (idx >= 0) {
          nextCards.splice(idx + 1, 0, newCard);
          return { ...s, cards: nextCards };
        }
      }
      return { ...s, cards: [newCard, ...nextCards] };
    });

    setFilterMode("ALL");
    setSearchQuery("");
    setActiveTag(null);
    showToast(`Added "${payload.title}" to tree.`);
  };

  const handleSaveCardEdit = (
    cardId: string,
    patch: { title: string; summary: string; rationale: string; tags: string[] }
  ) => {
    updateActiveSession((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c)),
    }));
    showToast("Idea updated.");
  };

  const handleUpdateRatings = (cardId: string, ratings: IdeaRatings) => {
    updateActiveSession((s) => ({
      ...s,
      cards: s.cards.map((c) => (c.id === cardId ? { ...c, ratings } : c)),
    }));
  };

  const handleToggleCollapse = (card: IdeaCard) => {
    updateActiveSession((s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === card.id ? { ...c, collapsed: !c.collapsed } : c
      ),
    }));
  };

  const handleToggleStar = (card: IdeaCard) => {
    updateActiveSession((s) => ({
      ...s,
      cards: s.cards.map((c) =>
        c.id === card.id ? { ...c, starred: !c.starred } : c
      ),
    }));
  };

  const handleToggleSelectMashup = (card: IdeaCard) => {
    setSelectedMashupIds((prev) =>
      prev.includes(card.id)
        ? prev.filter((id) => id !== card.id)
        : [...prev, card.id]
    );
  };

  const handleClickTag = (tag: string) => {
    const norm = normalizeTag(tag);
    setActiveTag((prev) => (prev === norm ? null : norm));
  };

  const handleCopyCard = async (card: IdeaCard) => {
    const text =
      `[${card.skillBadge}] ${card.title}\n${card.summary}` +
      (card.rationale ? `\nWhy: ${card.rationale}` : "");
    try {
      await copyText(text);
      showToast("Copied idea to clipboard.");
    } catch {
      showToast("Clipboard unavailable.");
    }
  };

  const handleCopyBrief = async (brief: SynthesizedBrief) => {
    const text = [
      `# ${brief.title}`,
      `> ${brief.verdict}`,
      "",
      ...brief.sections.flatMap((s) => [`## ${s.heading}`, s.body, ""]),
      ...(brief.nextActions.length > 0
        ? ["## Next Actions", ...brief.nextActions.map((a) => `- ${a}`)]
        : []),
    ].join("\n");
    try {
      await copyText(text);
      showToast("Copied decision brief to clipboard.");
    } catch {
      showToast("Clipboard unavailable.");
    }
  };

  const handleBanishConfirm = (
    card: IdeaCard,
    reasonCode: string,
    customRule: string
  ) => {
    const snapshot = activeSession;
    const { cards, graveyard, removedIds } = banishCardSubtree(
      activeSession,
      card,
      reasonCode,
      customRule
    );
    setSelectedMashupIds((prev) => prev.filter((id) => !removedIds.has(id)));
    updateActiveSession((s) => ({ ...s, cards, graveyard }));

    const removedCount = removedIds.size;
    if (reasonCode !== "DELETE_ONLY") {
      showToast(
        removedCount > 1
          ? `Banished "${card.title}" + ${removedCount - 1} child ideas.`
          : `Banished "${card.title}" to Graveyard.`,
        snapshot
      );
    } else {
      showToast(
        removedCount > 1
          ? `Deleted "${card.title}" + ${removedCount - 1} child ideas.`
          : `Deleted "${card.title}".`,
        snapshot
      );
    }
  };

  /* --- Graveyard Actions --- */

  const handleToggleGraveMute = (entryId: string) => {
    updateActiveSession((s) => ({
      ...s,
      graveyard: s.graveyard.map((g) =>
        g.id === entryId ? { ...g, activeInPrompts: !g.activeInPrompts } : g
      ),
    }));
  };

  const handleReviveGraveEntry = (entry: GraveyardEntry) => {
    const { cards, graveyard, revivedCount } = reviveGraveyardEntry(
      activeSession,
      entry.id
    );
    updateActiveSession((s) => ({ ...s, cards, graveyard }));
    showToast(
      revivedCount > 1
        ? `Revived branch (${revivedCount} ideas) back to tree.`
        : "Idea revived back to tree."
    );
  };

  const handlePurgeGraveEntry = (entryId: string) => {
    const snapshot = activeSession;
    updateActiveSession((s) => ({
      ...s,
      graveyard: s.graveyard.filter((g) => g.id !== entryId),
    }));
    showToast("Graveyard entry purged.", snapshot);
  };

  /* --- Skills Actions --- */

  const handleSelectSkill = (
    skill: CreativeSkill,
    targetCard: IdeaCard | null
  ) => {
    setActiveSkillId(skill.id);
    if (targetCard) {
      branchCardWithSkill(targetCard, skill);
    }
  };

  const handleForgeCustomSkill = (
    name: string,
    badge: string,
    systemInstruction: string
  ) => {
    const custom: CreativeSkill = {
      id: `custom_${generateId()}`,
      name,
      badge,
      subtitle:
        systemInstruction.length > 70
          ? `${systemInstruction.slice(0, 67)}...`
          : systemInstruction,
      systemInstruction,
      accentColor: "#39FF88",
      outputCount: 3,
      builtIn: false,
    };
    const customs = [...loadCustomSkills(), custom];
    saveCustomSkills(customs);
    setAllSkills(loadAllSkills());
    showToast(`Forged custom skill [${badge}].`);
  };

  const handleDeleteCustomSkill = (skillId: string) => {
    const customs = loadCustomSkills().filter((s) => s.id !== skillId);
    saveCustomSkills(customs);
    const updated = loadAllSkills();
    setAllSkills(updated);
    if (activeSkillId === skillId && updated.length > 0) {
      setActiveSkillId(updated[0].id);
    }
  };

  /* --- Session Actions --- */

  const handleSelectSession = (sessionId: string) => {
    setActiveSessionIdState(sessionId);
    setActiveSessionId(sessionId);
    setSelectedMashupIds([]);
  };

  const handleCreateSession = (rawName: string) => {
    let name = rawName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!name) {
      name = `SESSION_0${sessions.length + 1}`;
    }
    const created: BrainstormSession = {
      id: generateId(),
      title: name,
      seedPrompt: "",
      sessionConstraints: "",
      updatedAt: Date.now(),
      cards: [],
      graveyard: [],
      brief: null,
    };
    updateSessions((prev) => [created, ...prev]);
    setActiveSessionIdState(created.id);
    setActiveSessionId(created.id);
    setSelectedMashupIds([]);
    setSeedPromptInput("");
  };

  const handleRenameSession = (rawName: string) => {
    const name = rawName.trim().toUpperCase().replace(/\s+/g, "_");
    if (!name) return;
    updateActiveSession((s) => ({ ...s, title: name }));
  };

  const handleDeleteCurrentSession = () => {
    if (sessions.length <= 1) return;
    const remaining = sessions.filter((s) => s.id !== activeSession.id);
    saveSessions(remaining);
    setSessions(remaining);
    setActiveSessionIdState(remaining[0].id);
    setActiveSessionId(remaining[0].id);
    setSelectedMashupIds([]);
    showToast(`Deleted session "${activeSession.title}".`);
  };

  /* --- Export Markdown --- */

  const exportedMarkdown = useMemo(
    () => sessionToMarkdown(activeSession),
    [activeSession]
  );

  const handleDownloadMarkdown = async () => {
    const fileName = toSafeFileName(activeSession.title, "md");
    try {
      const result = await saveTextFile(fileName, exportedMarkdown, "text/markdown");
      if (result === "downloaded") showToast(`Downloaded ${fileName}`);
      else if (result === "shared") showToast(`${fileName} ready to save or share.`);
    } catch (err) {
      setErrorDialog({
        code: "Export Failed",
        details: err instanceof Error ? err.message : "Could not export Markdown.",
      });
    }
  };

  /* --- Android hardware/gesture back: close the topmost overlay first --- */

  const closeTopOverlayRef = useRef<() => boolean>(() => false);
  useEffect(() => {
    const close = (fn: () => void) => {
      fn();
      return true;
    };
    // Ordered topmost-first: dialogs that can open on top of sheets come earlier.
    closeTopOverlayRef.current = () => {
      if (errorDialog) return close(() => setErrorDialog(null));
      if (banishTarget) return close(() => setBanishTarget(null));
      if (forgeSkillOpen) return close(() => setForgeSkillOpen(false));
      if (createSessionOpen) return close(() => setCreateSessionOpen(false));
      if (renameSessionOpen) return close(() => setRenameSessionOpen(false));
      if (sessionSwitcherOpen) return close(() => setSessionSwitcherOpen(false));
      if (manualComposerState.open)
        return close(() => setManualComposerState({ open: false, parentCard: null }));
      if (exportDialogOpen) return close(() => setExportDialogOpen(false));
      if (skillsSheetState.open)
        return close(() => setSkillsSheetState({ open: false, targetCard: null }));
      if (optionsOpen) return close(() => setOptionsOpen(false));
      if (mobileRailOpen) return close(() => setMobileRailOpen(false));
      return false;
    };
  });

  useEffect(() => {
    if (!IS_NATIVE) return;
    let cancelled = false;
    let removeListener: (() => void) | null = null;
    void import("@capacitor/app").then(async ({ App: CapacitorApp }) => {
      const handle = await CapacitorApp.addListener("backButton", () => {
        if (!closeTopOverlayRef.current()) void CapacitorApp.minimizeApp();
      });
      if (cancelled) void handle.remove();
      else removeListener = () => void handle.remove();
    });
    return () => {
      cancelled = true;
      removeListener?.();
    };
  }, []);

  const openMobileRail = (tab: RailTab) => {
    setRailTab(tab);
    setMobileRailOpen(true);
  };

  const railNode = (
    <WorkstationRail
      activeTab={railTab}
      onTabChange={setRailTab}
      starredCards={starredCards}
      graveyard={activeSession.graveyard}
      brief={activeSession.brief}
      sessionConstraints={activeSession.sessionConstraints ?? ""}
      tuning={tuning}
      isSynthesizing={isSynthesizing}
      onUpdateRatings={handleUpdateRatings}
      onToggleStar={handleToggleStar}
      onSynthesizeBrief={handleSynthesizeBrief}
      onClearBrief={() => updateActiveSession((s) => ({ ...s, brief: null }))}
      onCopyBrief={handleCopyBrief}
      onToggleGraveMute={handleToggleGraveMute}
      onReviveGraveEntry={handleReviveGraveEntry}
      onPurgeGraveEntry={handlePurgeGraveEntry}
      onUpdateSessionConstraints={(val) =>
        updateActiveSession((s) => ({ ...s, sessionConstraints: val }))
      }
      onUpdateTuning={handleUpdateTuning}
    />
  );

  return (
    <div className="relative flex h-dvh w-full justify-center overflow-hidden bg-[var(--deck-void)]">
      {/* Theme-aware pixel dot-grid backdrop */}
      <PixelGridBackground theme={uiPrefs.theme} visible={uiPrefs.showGrid} />

      {/* Wide Responsive Cyber-Deck Workstation Shell */}
      <div className="relative z-10 flex h-full w-full max-w-[1400px] flex-col lg:gap-[12px] lg:p-[12px]">
        {/* TOP HEADER BAR */}
        <header className="px-panel flex shrink-0 items-center justify-between gap-[8px] px-[10px] py-[9px] sm:gap-[12px] sm:px-[14px] sm:py-[10px]">
          <div className="flex min-w-0 flex-1 items-center gap-[8px] sm:gap-[12px]">
            <span className="font-mono text-[12px] font-bold tracking-[0.08em] whitespace-nowrap text-[var(--deck-cyan)] sm:text-[13px] sm:tracking-[0.1em]">
              <span className="sm:hidden">N//D</span>
              <span className="hidden sm:inline">NEURAL//DECK</span>
            </span>

            <span className="h-[16px] w-[1px] shrink-0 bg-[var(--deck-border)]" />

            {/* Session Switcher */}
            <button
              type="button"
              onClick={() => setSessionSwitcherOpen(true)}
              aria-label={`Switch session, current ${activeSession.title}`}
              className="flex min-w-0 flex-1 cursor-pointer items-center gap-[5px] px-[2px] py-[2px] text-left hover:brightness-110 sm:flex-initial"
            >
              <PxFolderIcon size={13} color="var(--deck-text)" className="shrink-0" />
              <span className="truncate font-mono text-[12px] font-bold text-[var(--deck-text)] sm:max-w-[260px] sm:text-[13px]">
                {activeSession.title} ▾
              </span>
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-[5px] sm:gap-[6px]">
            {/* Mobile Rail Launchers (< lg) */}
            <button
              type="button"
              onClick={() => openMobileRail("shortlist")}
              aria-label={`Open shortlist (${starredCards.length} starred)`}
              className="px-chip-idle flex h-[30px] cursor-pointer items-center gap-[4px] px-[7px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-cyan)] lg:hidden"
            >
              <PxTargetIcon size={11} color="var(--deck-cyan)" />
              <span>{starredCards.length}</span>
            </button>

            <button
              type="button"
              onClick={() => openMobileRail("graveyard")}
              aria-label={`Open graveyard (${activeSession.graveyard.length} banished)`}
              className="px-grave-badge flex h-[30px] cursor-pointer items-center gap-[4px] px-[7px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-crimson)] lg:hidden"
            >
              <PxSkullIcon size={11} color="var(--deck-crimson)" />
              <span>{activeSession.graveyard.length}</span>
            </button>

            {/* Active Skill Cartridge Selector */}
            <button
              type="button"
              onClick={() =>
                setSkillsSheetState({ open: true, targetCard: null })
              }
              className="px-chip-idle hidden h-[32px] cursor-pointer items-center gap-[6px] px-[10px] font-mono text-[11px] font-bold whitespace-nowrap text-[var(--deck-magenta)] hover:brightness-110 sm:flex"
            >
              <PxChipIcon size={13} color="var(--deck-magenta)" />
              <span>Skill: {activeSkill?.badge ?? "10X_DIVERGE"}</span>
            </button>

            {/* In-App PWA Install Button (auto-hides in standalone mode) */}
            {!IS_NATIVE && <PWAInstallButton compact />}

            {/* Dedicated Options Button (AI Engine, Theme, Display, PWA, Backup) */}
            <button
              type="button"
              onClick={() => setOptionsOpen(true)}
              aria-label="Open Deck Options"
              className="px-chip-idle flex h-[30px] cursor-pointer items-center gap-[5px] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap text-[var(--deck-text)] hover:brightness-110 sm:h-[32px] sm:px-[10px]"
            >
              <PxSlidersIcon size={13} color="var(--deck-green)" />
              <span className="hidden sm:inline">Options</span>
            </button>

            {/* Export Markdown Button */}
            <button
              type="button"
              onClick={() => setExportDialogOpen(true)}
              aria-label="Export session to Markdown"
              className="px-chip-idle flex h-[30px] cursor-pointer items-center gap-[5px] px-[8px] font-mono text-[11px] font-bold whitespace-nowrap text-[var(--deck-cyan)] hover:brightness-110 sm:h-[32px] sm:px-[10px]"
            >
              <PxExportIcon size={13} color="var(--deck-cyan)" />
              <span className="hidden sm:inline">Export</span>
            </button>
          </div>
        </header>

        {/* WORKSTATION BODY: 2-Column Split on Desktop, Single Column on Mobile */}
        <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-[12px] xl:grid-cols-[minmax(0,1fr)_420px]">
          {/* LEFT / MAIN COLUMN: IDEA TREE WORKSPACE + SEED DOCK */}
          <div className="flex min-h-0 flex-col border-[var(--deck-border)] lg:border-2 lg:bg-[var(--deck-canvas)]">
            {/* Workspace Filter, Search & Human Authoring Toolbar */}
            <div className="shrink-0 border-b border-[var(--deck-border)] bg-[var(--deck-panel)] px-[12px] py-[8px]">
              <div className="flex flex-wrap items-center gap-[6px]">
                {/* Filter Tabs */}
                <div className="flex items-center gap-[4px]">
                  {(
                    [
                      { id: "ALL", label: `All (${activeSession.cards.length})` },
                      {
                        id: "STARRED",
                        label: `★ Starred (${starredCards.length})`,
                      },
                      { id: "ROOTS", label: "Roots" },
                    ] as const
                  ).map((tab) => {
                    const active = filterMode === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setFilterMode(tab.id)}
                        className={`flex h-[30px] cursor-pointer items-center px-[9px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110 ${
                          active
                            ? "px-chip-active"
                            : "px-chip-idle text-[var(--deck-text-muted)]"
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                {/* Live Search Input */}
                <div className="relative min-w-[120px] flex-1">
                  <PxSearchIcon
                    size={12}
                    color="var(--deck-text-faint)"
                    className="pointer-events-none absolute top-1/2 left-[9px] -translate-y-1/2"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search ideas or tags"
                    placeholder="Search ideas..."
                    className="px-terminal-input h-[30px] w-full pr-[8px] pl-[28px] text-[12px]"
                  />
                </div>

                {/* Mobile Skill Trigger */}
                <button
                  type="button"
                  onClick={() =>
                    setSkillsSheetState({ open: true, targetCard: null })
                  }
                  className="px-chip-idle flex h-[30px] cursor-pointer items-center gap-[4px] px-[8px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-magenta)] sm:hidden"
                >
                  <PxChipIcon size={11} color="var(--deck-magenta)" />
                  <span>{activeSkill?.badge ?? "SKILL"}</span>
                </button>

                {/* Manual Human Idea Authoring Trigger */}
                <button
                  type="button"
                  onClick={() =>
                    setManualComposerState({ open: true, parentCard: null })
                  }
                  className="px-btn-green flex h-[30px] shrink-0 cursor-pointer items-center gap-[5px] px-[10px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110"
                >
                  <PxPlusIcon size={11} color="var(--deck-green)" />
                  <span>Add Idea</span>
                </button>
              </div>

              {/* Active Tag Filter Strip */}
              {activeTag && (
                <div className="mt-[8px] flex items-center gap-[8px] font-mono text-[11px]">
                  <span className="text-[var(--deck-text-muted)]">
                    Filtered by tag:
                  </span>
                  <span className="font-bold text-[var(--deck-cyan)]">
                    #{activeTag}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveTag(null)}
                    className="px-chip-idle cursor-pointer px-[7px] py-[2px] text-[10px] font-bold text-[var(--deck-text)]"
                  >
                    Clear Tag
                  </button>
                </div>
              )}
            </div>

            {/* Active AI Loading Banner */}
            {loadingMessage && (
              <div
                role="status"
                aria-live="polite"
                className="flex shrink-0 items-center gap-[8px] border-b border-[var(--deck-cyan)]/30 bg-[var(--deck-cyan-soft)] px-[12px] py-[7px]"
              >
                <span className="h-[12px] w-[12px] shrink-0 animate-spin border-2 border-[var(--deck-cyan)] border-t-transparent" />
                <span className="truncate font-mono text-[11px] font-bold text-[var(--deck-cyan)]">
                  {loadingMessage}
                </span>
              </div>
            )}

            {/* Multi-Select Splice Action Banner */}
            {selectedMashupIds.length > 0 && (
              <div className="flex shrink-0 items-center gap-[8px] border-b border-[var(--deck-magenta)]/40 bg-[var(--deck-magenta-soft)] px-[12px] py-[8px]">
                <PxSpliceIcon
                  size={16}
                  color="var(--deck-magenta)"
                  className="shrink-0"
                />
                <span className="flex-1 font-mono text-[11px] font-bold text-[var(--deck-text)]">
                  {selectedMashupIds.length}{" "}
                  {selectedMashupIds.length === 1
                    ? "idea armed (select 1 more to splice)"
                    : "ideas armed for splice"}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedMashupIds([])}
                  className="px-chip-idle flex h-[28px] cursor-pointer items-center px-[8px] font-mono text-[10px] font-bold text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  disabled={isAnyAiBusy || selectedMashupIds.length < 2}
                  onClick={executeMashup}
                  className="px-btn-magenta flex h-[28px] cursor-pointer items-center px-[10px] font-mono text-[10px] font-bold hover:brightness-110 disabled:opacity-50"
                >
                  Splice Ideas
                </button>
              </div>
            )}

            {/* Scrollable Idea Tree Canvas */}
            <main
              ref={treeScrollRef}
              className="relative min-h-0 flex-1 overflow-y-auto px-[12px] pt-[12px] pb-[18px]"
            >
              {visibleCards.length === 0 ? (
                <div className="flex h-full items-center justify-center p-[18px]">
                  <div className="px-cartridge flex w-full max-w-[440px] flex-col items-center p-[22px] text-center">
                    <PxSparkIcon
                      size={30}
                      color="var(--deck-cyan)"
                      className="mb-[10px]"
                    />
                    <div className="font-mono text-[13px] font-bold text-[var(--deck-cyan)]">
                      {activeSession.cards.length === 0
                        ? "Deck ready for a seed"
                        : "No matching ideas"}
                    </div>
                    <p className="mt-[8px] text-[13px] leading-[1.5] text-[var(--deck-text-muted)]">
                      {activeSession.cards.length === 0
                        ? "Type a concept below and click Spark Ideas, or click Add Idea above to write your own starting card."
                        : "Try clearing your search or tag filter to see all ideas in this session."}
                    </p>
                    {activeSession.cards.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setFilterMode("ALL");
                          setSearchQuery("");
                          setActiveTag(null);
                        }}
                        className="px-chip-active mt-[12px] h-[32px] cursor-pointer px-[12px] font-mono text-[11px] font-bold"
                      >
                        Reset Filters
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col">
                  {visibleCards.map((card) => (
                    <IdeaCardRow
                      key={card.id}
                      card={card}
                      subtreeCount={countSubtree(activeSession.cards, card.id)}
                      parentTitle={getParentTitle(activeSession.cards, card)}
                      isFlatView={isFlatView}
                      compact={uiPrefs.compactCards}
                      activeSkill={activeSkill}
                      allSkills={allSkills}
                      activeTag={activeTag}
                      isSelected={selectedMashupSet.has(card.id)}
                      isBusy={isAnyAiBusy}
                      onQuickBranch={(c) => {
                        if (activeSkill) branchCardWithSkill(c, activeSkill);
                      }}
                      onSteeredBranch={(c, sk, note) =>
                        branchCardWithSkill(c, sk, note)
                      }
                      onPickSkillBranch={(c) =>
                        setSkillsSheetState({ open: true, targetCard: c })
                      }
                      onAddManualChild={(c) =>
                        setManualComposerState({ open: true, parentCard: c })
                      }
                      onSaveEdit={handleSaveCardEdit}
                      onToggleCollapse={handleToggleCollapse}
                      onToggleStar={handleToggleStar}
                      onToggleSelectMashup={handleToggleSelectMashup}
                      onClickTag={handleClickTag}
                      onCopyCard={handleCopyCard}
                      onBanishCard={(c) => setBanishTarget(c)}
                    />
                  ))}
                </div>
              )}
            </main>

            {/* Native app: prompt for an API key before the first AI call */}
            {DIRECT_PROVIDER_MODE &&
              (tuning.provider === "openrouter" ? !openRouterConnected : !geminiReady) && (
                <div
                  role="status"
                  className="flex shrink-0 items-center gap-[8px] border-t border-[var(--deck-amber)]/40 bg-[var(--deck-panel-alt)] px-[12px] py-[8px]"
                >
                  <span className="flex-1 text-[12px] leading-[1.4] text-[var(--deck-text)]">
                    {tuning.provider === "openrouter"
                      ? "Add your OpenRouter API key to start sparking ideas."
                      : "Add your Gemini API key to start sparking ideas."}
                  </span>
                  <button
                    type="button"
                    onClick={() => setOptionsOpen(true)}
                    className="px-chip-active h-[32px] shrink-0 cursor-pointer px-[10px] font-mono text-[11px] font-bold whitespace-nowrap"
                  >
                    Add Key
                  </button>
                </div>
              )}

            {/* BOTTOM SEED DOCK */}
            <footer className="shrink-0 border-t-2 border-[var(--deck-border)] bg-[var(--deck-panel)] px-[12px] pt-[10px] pb-[10px]">
              <textarea
                value={seedPromptInput}
                onChange={(e) => {
                  setSeedPromptInput(e.target.value);
                  if (previousSeedDraft !== null) setPreviousSeedDraft(null);
                }}
                onBlur={() => {
                  if (seedPromptInput !== activeSession.seedPrompt) {
                    updateActiveSession((s) => ({
                      ...s,
                      seedPrompt: seedPromptInput,
                    }));
                  }
                }}
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                    e.preventDefault();
                    sparkRootIdeas();
                  }
                }}
                rows={2}
                aria-label="Brainstorm seed prompt"
                placeholder='Enter a raw idea, problem, or "what-if" seed... (Ctrl+Enter to spark)'
                className="px-terminal-input max-h-[110px] w-full resize-none p-[10px] text-[13px] leading-[1.45]"
              />

              <div className="mt-[8px] flex items-center gap-[8px]">
                {/* 1-Click Inline Seed Sharpener */}
                <button
                  type="button"
                  disabled={isAnyAiBusy}
                  onClick={handleSharpenSeed}
                  className="px-btn-magenta flex h-[38px] cursor-pointer items-center justify-center gap-[6px] px-[14px] font-mono text-[11px] font-bold whitespace-nowrap hover:brightness-110 disabled:opacity-50"
                >
                  <PxSparkIcon size={13} color="var(--deck-magenta)" />
                  <span>{isSharpening ? "Sharpening..." : "Sharpen Seed"}</span>
                </button>

                {previousSeedDraft !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setSeedPromptInput(previousSeedDraft);
                      updateActiveSession((s) => ({
                        ...s,
                        seedPrompt: previousSeedDraft,
                      }));
                      setPreviousSeedDraft(null);
                    }}
                    className="px-chip-idle flex h-[38px] cursor-pointer items-center px-[10px] font-mono text-[10px] font-bold whitespace-nowrap text-[var(--deck-text-muted)] hover:text-[var(--deck-text)]"
                  >
                    Revert
                  </button>
                )}

                <div className="hidden flex-1 truncate text-right font-mono text-[10px] text-[var(--deck-text-faint)] sm:block">
                  Skill: {activeSkill?.badge ?? "SEED"} ·{" "}
                  {tuning.provider === "openrouter"
                    ? openRouterConnected
                      ? tuning.openRouterModel.split("/").pop()
                      : DIRECT_PROVIDER_MODE
                      ? "OpenRouter (Add key in Options)"
                      : "OpenRouter (Connect in Options)"
                    : geminiReady
                    ? `Gemini 4 · ${tuning.divergence}`
                    : "Gemini (Add key in Options)"}
                </div>

                {/* Primary CTA: Spark Ideas */}
                <button
                  type="button"
                  disabled={isAnyAiBusy}
                  onClick={() => sparkRootIdeas()}
                  className="px-btn-cyan flex h-[38px] flex-1 cursor-pointer items-center justify-center gap-[6px] px-[16px] font-mono text-[12px] font-bold whitespace-nowrap hover:brightness-110 disabled:opacity-50 sm:flex-initial"
                >
                  <PxBranchIcon size={14} color="var(--deck-cyan-btn-text)" />
                  <span>Spark Ideas</span>
                </button>
              </div>
            </footer>
          </div>

          {/* RIGHT COLUMN: PERSISTENT DESKTOP WORKSTATION RAIL */}
          <div className="hidden min-h-0 lg:flex lg:flex-col">{railNode}</div>
        </div>
      </div>

      {/* Toast Notification with Interactive Undo */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="px-cartridge fixed top-[66px] left-1/2 z-50 flex max-w-[92vw] -translate-x-1/2 items-center gap-[10px] border-[var(--deck-cyan)] px-[14px] py-[8px] font-mono text-[11px] font-bold text-[var(--deck-text)]"
        >
          <span className="truncate">{toast.message}</span>
          {toast.canUndo && (
            <button
              type="button"
              onClick={handleUndo}
              className="shrink-0 cursor-pointer bg-[var(--deck-cyan-btn-bg)] px-[8px] py-[3px] font-mono text-[10px] font-bold text-[var(--deck-cyan-btn-text)]"
            >
              Undo
            </button>
          )}
        </div>
      )}

      {/* MOBILE DRAWER FOR WORKSTATION RAIL */}
      <BottomSheetShell
        open={mobileRailOpen}
        onClose={() => setMobileRailOpen(false)}
      >
        <div className="mb-[8px] flex items-center justify-between">
          <span className="font-mono text-[11px] font-bold text-[var(--deck-text-muted)]">
            Workstation Panel
          </span>
          <button
            type="button"
            onClick={() => setMobileRailOpen(false)}
            className="px-chip-idle cursor-pointer px-[10px] py-[4px] font-mono text-[10px] font-bold text-[var(--deck-text)]"
          >
            Done
          </button>
        </div>
        <div className="h-[68vh] min-h-[380px]">{railNode}</div>
      </BottomSheetShell>

      {/* Offline Connectivity Indicator */}
      <OfflineIndicator />

      {/* OPTIONS MODAL */}
      <OptionsDialog
        open={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        prefs={uiPrefs}
        tuning={tuning}
        openRouterConnected={openRouterConnected}
        directProviderMode={DIRECT_PROVIDER_MODE}
        providerKeys={providerKeys}
        onUpdateProviderKeys={handleUpdateProviderKeys}
        openRouterConnecting={openRouterConnecting}
        openRouterModels={openRouterModels}
        featuredModels={featuredModels}
        onConnectOpenRouter={handleConnectOpenRouter}
        onDisconnectOpenRouter={handleDisconnectOpenRouter}
        onUpdatePrefs={handleUpdatePrefs}
        onUpdateTuning={handleUpdateTuning}
        onExportBackupJson={() => void handleExportBackupJson()}
      />

      {/* SKILLS SHEET */}
      <SkillsSheet
        open={skillsSheetState.open}
        onClose={() => setSkillsSheetState({ open: false, targetCard: null })}
        skills={allSkills}
        activeSkill={activeSkill}
        targetCard={skillsSheetState.targetCard}
        onSelectSkill={handleSelectSkill}
        onDeleteCustomSkill={handleDeleteCustomSkill}
        onOpenForgeDialog={() => setForgeSkillOpen(true)}
      />

      {/* MODAL DIALOGS */}
      <ManualCardDialog
        open={manualComposerState.open}
        parentCard={manualComposerState.parentCard}
        onClose={() => setManualComposerState({ open: false, parentCard: null })}
        onCreate={handleCreateManualCard}
      />

      <SessionSwitcherDialog
        open={sessionSwitcherOpen}
        sessions={sessions}
        activeSessionId={activeSession.id}
        onClose={() => setSessionSwitcherOpen(false)}
        onSelectSession={handleSelectSession}
        onCreateNew={() => setCreateSessionOpen(true)}
        onRenameCurrent={() => setRenameSessionOpen(true)}
        onDeleteCurrent={handleDeleteCurrentSession}
      />

      <TextPromptDialog
        open={createSessionOpen}
        title="New Brainstorm Session"
        placeholder="Session codename (e.g. NEXT_GEN_SYNTH)"
        initialValue=""
        confirmLabel="Create"
        onClose={() => setCreateSessionOpen(false)}
        onConfirm={handleCreateSession}
      />

      <TextPromptDialog
        open={renameSessionOpen}
        title="Rename Session"
        placeholder="Session codename"
        initialValue={activeSession.title}
        confirmLabel="Save"
        onClose={() => setRenameSessionOpen(false)}
        onConfirm={handleRenameSession}
      />

      <BanishDialog
        card={banishTarget}
        subtreeCount={
          banishTarget ? countSubtree(activeSession.cards, banishTarget.id) : 0
        }
        onClose={() => setBanishTarget(null)}
        onBanish={handleBanishConfirm}
      />

      <ForgeSkillDialog
        open={forgeSkillOpen}
        onClose={() => setForgeSkillOpen(false)}
        onForge={handleForgeCustomSkill}
        onToast={(m) => showToast(m)}
      />

      <ErrorDialog
        error={errorDialog}
        onClose={() => setErrorDialog(null)}
      />

      <ExportMarkdownDialog
        open={exportDialogOpen}
        sessionTitle={activeSession.title}
        markdown={exportedMarkdown}
        onClose={() => setExportDialogOpen(false)}
        onCopy={async () => {
          try {
            await copyText(exportedMarkdown);
            showToast("Copied Markdown to clipboard.");
          } catch {
            showToast("Clipboard unavailable.");
          }
        }}
        onDownload={handleDownloadMarkdown}
      />
    </div>
  );
}

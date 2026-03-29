import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  FilePenLine,
  Layers3,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Sparkles,
  Swords,
  Trash2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { SyllableCard } from "../game/GameComponents";
import { getCardsForDeck, getCatalogDeckById, getTargetsForDeck } from "../../data/content";
import {
  ContentEditorDeckDraft,
  ContentEditorTargetDraft,
  buildContentEditorPreview,
  cloneRawDeckDefinition,
  createContentEditorDeckDraft,
  createEmptyContentEditorSyllableRow,
  createEmptyContentEditorTarget,
  getContentEditorLocalIssues,
  hydrateRawDeckDefinitionFromDraft,
} from "../../data/content/editor";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import { DeckVisualThemeId, TargetDefinition } from "../../data/content/types";
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from "../../data/content/decks";
import { RARITY_DAMAGE, normalizeRarity } from "../../types/game";

type SaveStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

const themeIds = Object.keys(DECK_VISUAL_THEME_CLASSES) as DeckVisualThemeId[];

const createSourceDeckState = () =>
  rawDeckCatalogEntries.reduce<Record<string, ReturnType<typeof cloneRawDeckDefinition>>>((acc, entry) => {
    acc[entry.id] = cloneRawDeckDefinition(entry.deck);
    return acc;
  }, {});

const createDraftForDeck = (sourceDecksById: Record<string, ReturnType<typeof cloneRawDeckDefinition>>, deckId: string) =>
  createContentEditorDeckDraft(sourceDecksById[deckId] ?? cloneRawDeckDefinition(rawDeckCatalogEntries[0].deck));

const idleSaveStatus: SaveStatus = {
  tone: "idle",
  message: "Edicao local em memoria ate salvar no source bruto do deck selecionado.",
};

const getRarityToneClass = (rarity: string) => {
  const normalized = normalizeRarity(rarity);
  if (normalized === "comum") return "bg-slate-500";
  if (normalized === "raro") return "bg-amber-600";
  if (normalized === "épico") return "bg-purple-700";
  return "bg-rose-800";
};

const getRarityLabel = (rarity: string) => {
  const normalized = normalizeRarity(rarity);
  if (normalized === "épico") return "EPICO";
  if (normalized === "lendário") return "LENDARIO";
  return normalized.toUpperCase();
};

export const ContentEditor: React.FC = () => {
  const initialSourceDecks = useMemo(createSourceDeckState, []);
  const [sourceDecksById, setSourceDecksById] = useState(initialSourceDecks);
  const [selectedDeckId, setSelectedDeckId] = useState(() => rawDeckCatalogEntries[0]?.id ?? "");
  const [draft, setDraft] = useState<ContentEditorDeckDraft>(() =>
    createDraftForDeck(initialSourceDecks, rawDeckCatalogEntries[0]?.id ?? ""),
  );
  const [selectedTargetId, setSelectedTargetId] = useState(() => draft.targets[0]?.id ?? "");
  const [selectedCardId, setSelectedCardId] = useState("");
  const [derivedCardsGridColumns, setDerivedCardsGridColumns] = useState(() =>
    typeof window !== "undefined" && window.innerWidth >= 640 ? 3 : 2,
  );
  const [deckSearchValue, setDeckSearchValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(idleSaveStatus);
  const deferredDeckSearch = useDeferredValue(deckSearchValue.trim().toLowerCase());

  const sourceEntries = useMemo(
    () =>
      rawDeckCatalogEntries.map((entry) => ({
        ...entry,
        deck: sourceDecksById[entry.id] ?? cloneRawDeckDefinition(entry.deck),
      })),
    [sourceDecksById],
  );

  const selectedDeckEntry = useMemo(() => getRawDeckCatalogEntry(selectedDeckId), [selectedDeckId]);
  const persistedDeck = sourceDecksById[selectedDeckId] ?? null;
  const draftRawDeck = useMemo(() => hydrateRawDeckDefinitionFromDraft(draft), [draft]);
  const isDirty = useMemo(
    () => JSON.stringify(draftRawDeck) !== JSON.stringify(persistedDeck),
    [draftRawDeck, persistedDeck],
  );

  const localIssues = useMemo(() => getContentEditorLocalIssues(draft), [draft]);
  const preview = useMemo(() => buildContentEditorPreview(sourceEntries, selectedDeckId, draft), [draft, selectedDeckId, sourceEntries]);

  const selectedDeckDefinition = useMemo(
    () => (preview.ok ? getCatalogDeckById(preview.pipeline.catalog, selectedDeckId) : null),
    [preview, selectedDeckId],
  );
  const selectedCatalogTargets = useMemo(
    () => (preview.ok ? getTargetsForDeck(preview.pipeline.catalog, selectedDeckId) : []),
    [preview, selectedDeckId],
  );
  const selectedCatalogCards = useMemo(
    () => (preview.ok ? getCardsForDeck(preview.pipeline.catalog, selectedDeckId) : []),
    [preview, selectedDeckId],
  );
  const pipelineIssues = useMemo(() => ("issues" in preview ? preview.issues : []), [preview]);
  const selectedTargetDraft = useMemo(
    () => draft.targets.find((target) => target.id === selectedTargetId) ?? draft.targets[0] ?? null,
    [draft.targets, selectedTargetId],
  );
  const selectedCardEntry = useMemo(
    () => selectedCatalogCards.find((entry) => entry.card.id === selectedCardId) ?? null,
    [selectedCardId, selectedCatalogCards],
  );
  const expandedCardRowEndIndex = useMemo(() => {
    if (!selectedCardEntry) return -1;
    const selectedIndex = selectedCatalogCards.findIndex((entry) => entry.card.id === selectedCardEntry.card.id);
    if (selectedIndex < 0) return -1;

    const rowStartIndex = Math.floor(selectedIndex / derivedCardsGridColumns) * derivedCardsGridColumns;
    return Math.min(selectedCatalogCards.length - 1, rowStartIndex + derivedCardsGridColumns - 1);
  }, [derivedCardsGridColumns, selectedCardEntry, selectedCatalogCards]);

  const filteredDeckEntries = useMemo(
    () =>
      sourceEntries.filter((entry) => {
        if (!deferredDeckSearch) return true;
        return (
          entry.id.toLowerCase().includes(deferredDeckSearch) ||
          entry.deck.name.toLowerCase().includes(deferredDeckSearch)
        );
      }),
    [deferredDeckSearch, sourceEntries],
  );

  useEffect(() => {
    if (!draft.targets.some((target) => target.id === selectedTargetId)) {
      setSelectedTargetId(draft.targets[0]?.id ?? "");
    }
  }, [draft.targets, selectedTargetId]);

  useEffect(() => {
    if (selectedCardId && !selectedCatalogCards.some((entry) => entry.card.id === selectedCardId)) {
      setSelectedCardId("");
    }
  }, [selectedCardId, selectedCatalogCards]);

  useEffect(() => {
    const syncColumns = () => {
      if (typeof window === "undefined") return;
      setDerivedCardsGridColumns(window.innerWidth >= 640 ? 3 : 2);
    };

    syncColumns();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", syncColumns);
    return () => window.removeEventListener("resize", syncColumns);
  }, []);

  const openDeck = (nextDeckId: string) => {
    if (nextDeckId === selectedDeckId) return;
    if (isDirty && typeof window !== "undefined") {
      const shouldContinue = window.confirm(
        `Descartar alteracoes locais de "${draft.name || selectedDeckId}" e abrir outro deck?`,
      );
      if (!shouldContinue) return;
    }

    const nextDeck = sourceDecksById[nextDeckId];
    if (!nextDeck) return;

    startTransition(() => {
      const nextDraft = createContentEditorDeckDraft(nextDeck);
      setSelectedDeckId(nextDeckId);
      setDraft(nextDraft);
      setSelectedTargetId(nextDraft.targets[0]?.id ?? "");
      setSelectedCardId("");
      setSaveStatus(idleSaveStatus);
    });
  };

  const resetDraft = () => {
    const baselineDeck = sourceDecksById[selectedDeckId];
    if (!baselineDeck) return;
    const nextDraft = createContentEditorDeckDraft(baselineDeck);
    setDraft(nextDraft);
    setSelectedTargetId(nextDraft.targets[0]?.id ?? "");
    setSelectedCardId("");
    setSaveStatus(idleSaveStatus);
  };

  const updateDraft = (updater: (current: ContentEditorDeckDraft) => ContentEditorDeckDraft) => {
    setDraft((current) => updater(current));
    setSaveStatus(idleSaveStatus);
  };

  const updateDeckField = <K extends keyof Pick<ContentEditorDeckDraft, "name" | "description" | "emoji" | "visualTheme">>(
    field: K,
    value: ContentEditorDeckDraft[K],
  ) => {
    updateDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateSyllableRow = (rowId: string, patch: Partial<{ syllable: string; count: string }>) => {
    updateDraft((current) => ({
      ...current,
      syllableRows: current.syllableRows.map((row) => (row.id === rowId ? { ...row, ...patch } : row)),
    }));
  };

  const removeSyllableRow = (rowId: string) => {
    updateDraft((current) => ({
      ...current,
      syllableRows: current.syllableRows.filter((row) => row.id !== rowId),
    }));
  };

  const addSyllableRow = () => {
    updateDraft((current) => ({
      ...current,
      syllableRows: [...current.syllableRows, createEmptyContentEditorSyllableRow()],
    }));
  };

  const updateTarget = (
    targetId: string,
    patch: Partial<ContentEditorDeckDraft["targets"][number]>,
  ) => {
    updateDraft((current) => ({
      ...current,
      targets: current.targets.map((target) => (target.id === targetId ? { ...target, ...patch } : target)),
    }));
  };

  const addTarget = () => {
    const targetIds = new Set<string>();
    sourceEntries.forEach((entry) => {
      entry.deck.targets.forEach((target) => {
        if (entry.id !== selectedDeckId) {
          targetIds.add(target.id);
        }
      });
    });
    draft.targets.forEach((target) => targetIds.add(target.id));

    const nextTarget = createEmptyContentEditorTarget(targetIds);
    updateDraft((current) => ({
      ...current,
      targets: [...current.targets, nextTarget],
    }));
    setSelectedTargetId(nextTarget.id);
  };

  const removeTarget = (targetId: string) => {
    updateDraft((current) => {
      const currentIndex = current.targets.findIndex((target) => target.id === targetId);
      const nextTargets = current.targets.filter((target) => target.id !== targetId);
      const nextSelected =
        nextTargets[currentIndex] ?? nextTargets[Math.max(0, currentIndex - 1)] ?? null;
      setSelectedTargetId(nextSelected?.id ?? "");
      return {
        ...current,
        targets: nextTargets,
      };
    });
  };

  const moveTarget = (targetId: string, direction: -1 | 1) => {
    updateDraft((current) => {
      const index = current.targets.findIndex((target) => target.id === targetId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.targets.length) return current;

      const nextTargets = [...current.targets];
      const [target] = nextTargets.splice(index, 1);
      nextTargets.splice(nextIndex, 0, target);
      return {
        ...current,
        targets: nextTargets,
      };
    });
  };

  const duplicateTargetId = useMemo(() => {
    if (!selectedTargetDraft) return false;
    const allOtherTargetIds = new Set<string>();
    sourceEntries.forEach((entry) => {
      entry.deck.targets.forEach((target) => {
        if (entry.id !== selectedDeckId) allOtherTargetIds.add(target.id);
      });
    });
    return allOtherTargetIds.has(selectedTargetDraft.id);
  }, [selectedDeckId, selectedTargetDraft, sourceEntries]);

  const canSave = import.meta.env.DEV && preview.ok && localIssues.length === 0 && !duplicateTargetId && !isSaving;

  const handleSave = async () => {
    if (!canSave || !selectedDeckEntry) return;

    const nextDeck = draftRawDeck;
    setIsSaving(true);
    setSaveStatus({
      tone: "idle",
      message: `Salvando ${selectedDeckEntry.filePath}...`,
    });

    try {
      const response = await fetch("/__content-editor/deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          deckId: selectedDeckId,
          deck: nextDeck,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; path?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao salvar o deck bruto.");
      }

      setSourceDecksById((current) => ({
        ...current,
        [selectedDeckId]: cloneRawDeckDefinition(nextDeck),
      }));
      setSaveStatus({
        tone: "success",
        message: `Source bruto regravado com sucesso em ${payload.path ?? selectedDeckEntry.filePath}.`,
      });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Falha ao salvar o deck bruto.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!selectedDeckEntry) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#efe3c8] p-6 text-amber-950">
        <div className="paper-panel w-full max-w-xl rounded-[28px] border-2 border-[#8d6e63]/40 p-6 text-center">
          Nenhum deck registrado para o editor minimo de conteudo.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#efe3c8] text-amber-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#efe3c8]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(140,180,219,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(140,180,219,0.12)_1px,transparent_1px)] bg-[size:120px_120px] opacity-45" />
        <div className="absolute left-[-12%] top-[-22%] h-[44rem] w-[44rem] rounded-full bg-amber-700/6 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[40rem] w-[40rem] rounded-full bg-amber-950/6 blur-[150px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1720px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        <aside className="paper-panel w-full shrink-0 rounded-[28px] border-2 border-[#8d6e63]/35 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.12)] lg:w-[24rem] lg:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/45">Dev Only</div>
              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-amber-950">
                Editor de Conteudo
              </h1>
            </div>
            <Button
              variant="ghost"
              className="border border-amber-900/15 bg-white/70 text-amber-950 hover:bg-amber-100/70"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.location.href = "/?content-inspector=1";
              }}
            >
              Inspecao
            </Button>
          </div>

          <div className="rounded-2xl border border-sky-700/12 bg-sky-100/80 px-4 py-3 text-sm text-sky-950/85 shadow-sm">
            Edita um deck por vez no shape bruto atual. Cards e targetIds seguem derivados pelo pipeline real.
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-700/12 bg-emerald-100/80 px-4 py-3 text-sm text-emerald-950/85 shadow-sm">
            Save dev-only regrava <span className="font-black text-emerald-950">{selectedDeckEntry.filePath}</span>.
          </div>

          <label className="mt-5 block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/50">
              <Search className="h-4 w-4" />
              Decks
            </div>
            <input
              value={deckSearchValue}
              onChange={(event) => setDeckSearchValue(event.target.value)}
              placeholder="Buscar deck por nome ou id"
              className="w-full rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition placeholder:text-amber-900/35 focus:border-amber-500/30"
            />
          </label>

          <div className="mt-5 space-y-3">
            {filteredDeckEntries.map((entry) => {
              const isActive = entry.id === selectedDeckId;
              const isEdited = isActive && isDirty;
              const totalSyllables = Object.values(entry.deck.syllables).reduce((sum, count) => sum + count, 0);

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openDeck(entry.id)}
                  className={cn(
                    "w-full overflow-hidden rounded-[28px] border text-left transition-all",
                    isActive
                      ? "border-amber-700/28 bg-[#fffaf0]/96 shadow-[0_18px_30px_rgba(0,0,0,0.12)]"
                      : "border-amber-900/12 bg-[#fffaf0]/88 hover:border-amber-900/18 hover:bg-[#fffdf7]",
                  )}
                >
                  <div
                    className={cn(
                      "relative border-b border-white/10 bg-gradient-to-br px-4 py-4",
                      DECK_VISUAL_THEME_CLASSES[entry.deck.visualTheme],
                    )}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_45%)]" />
                    <div className="relative flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] border border-amber-100/20 bg-black/15 text-3xl shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
                          {entry.deck.emoji}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-serif text-2xl font-black text-amber-50">{entry.deck.name}</div>
                          <div className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/60">
                            {entry.id}
                          </div>
                        </div>
                      </div>
                      <Badge
                        className={cn(
                          "relative z-10 border",
                          isEdited
                            ? "border-amber-300/20 bg-amber-500/15 text-amber-50"
                            : "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
                        )}
                      >
                        {isEdited ? "draft" : "source"}
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 bg-[rgba(255,248,235,0.94)] px-4 py-3 text-sm">
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-900/45">Targets</div>
                      <div className="mt-1 font-serif text-xl font-black text-amber-950">{entry.deck.targets.length}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-900/45">Silabas</div>
                      <div className="mt-1 font-serif text-xl font-black text-amber-950">{totalSyllables}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col gap-6">
          <div
            className={cn(
              "rounded-[32px] border border-amber-200/10 bg-gradient-to-br p-6 shadow-[0_24px_60px_rgba(0,0,0,0.32)]",
              DECK_VISUAL_THEME_CLASSES[draft.visualTheme],
            )}
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[28px] border border-white/15 bg-black/15 text-5xl shadow-[0_12px_24px_rgba(0,0,0,0.2)]">
                  {draft.emoji || "?"}
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-100/60">
                    Deck-scoped
                  </div>
                  <h2 className="mt-2 font-serif text-4xl font-black tracking-tight text-amber-50">{draft.name}</h2>
                  <p className="mt-3 max-w-3xl font-serif text-sm italic leading-relaxed text-amber-50/80">
                    {draft.description || "Sem descricao ainda."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard
                  label="Targets no draft"
                  value={String(draft.targets.length)}
                  icon={<BookOpenText className="h-4 w-4" />}
                />
                <MetricCard
                  label="Linhas de silaba"
                  value={String(draft.syllableRows.length)}
                  icon={<Layers3 className="h-4 w-4" />}
                />
                <MetricCard
                  label="TargetIds derivados"
                  value={String(draft.targets.length)}
                  icon={<Shield className="h-4 w-4" />}
                />
                <MetricCard
                  label="Cards derivados"
                  value={String(selectedCatalogCards.length)}
                  icon={<BarChart3 className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
            <div className="space-y-6">
              <Panel title="Deck Ativo" icon={<FilePenLine className="h-5 w-5" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Deck id (fixo)">
                    <input
                      value={draft.id}
                      readOnly
                      className="w-full rounded-2xl border border-amber-900/15 bg-amber-100/55 px-4 py-3 text-sm text-amber-950/70 outline-none"
                    />
                  </Field>

                  <Field label="Visual theme seguro">
                    <select
                      value={draft.visualTheme}
                      onChange={(event) => updateDeckField("visualTheme", event.target.value as DeckVisualThemeId)}
                      className="w-full rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                    >
                      {themeIds.map((themeId) => (
                        <option key={themeId} value={themeId}>
                          {themeId}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Nome">
                    <input
                      value={draft.name}
                      onChange={(event) => updateDeckField("name", event.target.value)}
                      className="w-full rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                    />
                  </Field>

                  <Field label="Emoji">
                    <input
                      value={draft.emoji}
                      onChange={(event) => updateDeckField("emoji", event.target.value)}
                      className="w-full rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                    />
                  </Field>

                  <Field label="Descricao" className="md:col-span-2">
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDeckField("description", event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                    />
                  </Field>
                </div>
              </Panel>

              <Panel title="Distribuicao de Silabas" icon={<Layers3 className="h-5 w-5" />}>
                <div className="space-y-3">
                  {draft.syllableRows.map((row) => (
                    <div key={row.id} className="grid gap-3 rounded-[24px] border border-amber-900/12 bg-[rgba(255,252,244,0.88)] p-4 md:grid-cols-[1fr_10rem_auto]">
                      <input
                        value={row.syllable}
                        onChange={(event) => updateSyllableRow(row.id, { syllable: event.target.value.toUpperCase() })}
                        placeholder="Silaba"
                        className="rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition placeholder:text-amber-900/35 focus:border-amber-500/30"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.count}
                        onChange={(event) => updateSyllableRow(row.id, { count: event.target.value })}
                        className="rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                      />
                      <Button
                        variant="ghost"
                        className="border border-amber-900/15 bg-amber-50/45 text-amber-950 hover:bg-amber-100/70"
                        onClick={() => removeSyllableRow(row.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    className="border border-amber-900/15 bg-amber-50/45 text-amber-950 hover:bg-amber-100/70"
                    onClick={addSyllableRow}
                  >
                    <Plus className="h-4 w-4" />
                    Adicionar silaba
                  </Button>
                </div>
              </Panel>

              <Panel title="Validacao e Save" icon={<Save className="h-5 w-5" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <InfoTile label="Modo" value="deck-scoped" />
                  <InfoTile label="Source bruto" value={selectedDeckEntry.filePath} compact />
                  <InfoTile
                    label="Pipeline"
                    value={preview.ok ? "valido" : "com erro"}
                    tone={preview.ok ? "success" : "warning"}
                  />
                  <InfoTile
                    label="Dirty"
                    value={isDirty ? "sim" : "nao"}
                    tone={isDirty ? "warning" : "success"}
                  />
                </div>

                <div
                  className={cn(
                    "mt-4 rounded-2xl border px-4 py-4 text-sm",
                    saveStatus.tone === "success"
                      ? "border-emerald-700/15 bg-emerald-100/85 text-emerald-950"
                      : saveStatus.tone === "error"
                        ? "border-rose-700/15 bg-rose-100/85 text-rose-950"
                        : "border-amber-900/12 bg-[rgba(255,252,244,0.88)] text-amber-950/80",
                  )}
                >
                  {saveStatus.message}
                </div>

                <div className="mt-4 space-y-3">
                  {localIssues.length > 0 ? (
                    localIssues.map((issue) => <IssueRow key={issue} issue={issue} tone="warning" />)
                  ) : null}

                  {!preview.ok
                    ? pipelineIssues.map((issue) => <IssueRow key={issue} issue={issue} tone="warning" />)
                    : (
                        <div className="rounded-2xl border border-emerald-700/15 bg-emerald-100/85 px-4 py-4 text-sm text-emerald-950">
                          O draft recompila no pipeline real e continua gerando o Deck final do runtime via adapter atual.
                        </div>
                      )}

                  {duplicateTargetId ? (
                    <IssueRow
                      issue={`O target selecionado "${selectedTargetDraft?.id}" conflita com um id de outro deck do catalogo.`}
                      tone="warning"
                    />
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    className="border border-amber-900/15 bg-amber-50/45 text-amber-950 hover:bg-amber-100/70"
                    onClick={resetDraft}
                    disabled={!isDirty}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resetar draft
                  </Button>
                  <Button
                    variant="ghost"
                    className="border border-emerald-700/15 bg-emerald-100/85 text-emerald-950 hover:bg-emerald-200/80"
                    onClick={handleSave}
                    disabled={!canSave}
                  >
                    <Save className="h-4 w-4" />
                    {isSaving ? "Salvando..." : "Salvar source bruto"}
                  </Button>
                </div>
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel title="Targets do Deck" icon={<BookOpenText className="h-5 w-5" />}>
                <div className="mb-4 flex flex-wrap gap-3">
                  <Button
                    variant="ghost"
                    className="border border-amber-900/15 bg-amber-50/45 text-amber-950 hover:bg-amber-100/70"
                    onClick={addTarget}
                  >
                    <Plus className="h-4 w-4" />
                    Novo target
                  </Button>
                  <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                    targetIds derivados: {draft.targets.map((target) => target.id).join(", ") || "nenhum"}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                  {draft.targets.map((target) => {
                    const isActive = target.id === selectedTargetDraft?.id;
                    return (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => setSelectedTargetId(target.id)}
                        className="text-left"
                      >
                        <DraftTargetCard target={target} active={isActive} />
                      </button>
                    );
                  })}
                </div>

                {selectedTargetDraft ? (
                  <div className="paper-panel mt-6 rounded-[28px] border-2 border-amber-900/25 p-5 text-amber-950 shadow-[0_20px_40px_rgba(0,0,0,0.15)]">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <Badge className="border border-amber-900/15 bg-amber-900/5 text-amber-950">
                        id interno: {selectedTargetDraft.id}
                      </Badge>
                      <Button
                        variant="ghost"
                        className="border border-amber-900/15 bg-amber-50/50 text-amber-950 hover:bg-amber-100/70"
                        onClick={() => moveTarget(selectedTargetDraft.id, -1)}
                        disabled={draft.targets[0]?.id === selectedTargetDraft.id}
                      >
                        <ArrowUp className="h-4 w-4" />
                        Subir
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-amber-900/15 bg-amber-50/50 text-amber-950 hover:bg-amber-100/70"
                        onClick={() => moveTarget(selectedTargetDraft.id, 1)}
                        disabled={draft.targets[draft.targets.length - 1]?.id === selectedTargetDraft.id}
                      >
                        <ArrowDown className="h-4 w-4" />
                        Descer
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-rose-300/25 bg-rose-500/10 text-rose-900 hover:bg-rose-500/15"
                        onClick={() => removeTarget(selectedTargetDraft.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Remover
                      </Button>
                    </div>

                    <div className="grid gap-4">
                      <Field label="Nome">
                        <input
                          value={selectedTargetDraft.name}
                          onChange={(event) => updateTarget(selectedTargetDraft.id, { name: event.target.value })}
                          className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                        />
                      </Field>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Emoji">
                          <input
                            value={selectedTargetDraft.emoji}
                            onChange={(event) => updateTarget(selectedTargetDraft.id, { emoji: event.target.value })}
                            className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                          />
                        </Field>

                        <Field label="Rarity">
                          <select
                            value={selectedTargetDraft.rarity}
                            onChange={(event) => updateTarget(selectedTargetDraft.id, { rarity: event.target.value })}
                            className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                          >
                            <option value="comum">comum</option>
                            <option value="raro">raro</option>
                            <option value="epico">epico</option>
                            <option value="lendario">lendario</option>
                          </select>
                        </Field>
                      </div>

                      <Field label="Descricao">
                        <textarea
                          value={selectedTargetDraft.description}
                          onChange={(event) => updateTarget(selectedTargetDraft.id, { description: event.target.value })}
                          rows={3}
                          className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                        />
                      </Field>

                      <Field label="Silabas do target">
                        <input
                          value={selectedTargetDraft.syllablesText}
                          onChange={(event) => updateTarget(selectedTargetDraft.id, { syllablesText: event.target.value.toUpperCase() })}
                          placeholder="Ex.: BA, NA, NA"
                          className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition placeholder:text-amber-900/35 focus:border-amber-500/30"
                        />
                      </Field>
                    </div>
                  </div>
                ) : (
                  <EmptyCallout text="Nenhum target no draft atual." />
                )}
              </Panel>

              <Panel title="Cards Derivados por Silaba" icon={<Sparkles className="h-5 w-5" />}>
                {selectedCatalogCards.length === 0 ? (
                  <EmptyCallout text="Sem cards derivados enquanto o draft estiver invalido ou sem card pool valido." />
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    {selectedCatalogCards.map((entry, index) => (
                      <React.Fragment key={entry.card.id}>
                        <DerivedSyllableCard
                          syllable={entry.card.syllable}
                          copies={entry.copiesInDeck}
                          selected={selectedCardEntry?.card.id === entry.card.id}
                          onClick={() =>
                            setSelectedCardId((current) => (current === entry.card.id ? "" : entry.card.id))
                          }
                        />

                        {selectedCardEntry && index === expandedCardRowEndIndex ? (
                          <div className="paper-panel col-span-2 rounded-[28px] border-2 border-amber-900/25 p-5 text-amber-950 shadow-[0_20px_40px_rgba(0,0,0,0.15)] sm:col-span-3">
                            <div>
                              <div>
                                <div className="font-serif text-3xl font-black text-amber-950">{selectedCardEntry.card.syllable}</div>
                                <div className="mt-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                                  {selectedCardEntry.card.id}
                                </div>
                              </div>
                            </div>
                            <div className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/50">
                              Relacao no deck atual
                            </div>
                            <div className="mt-4 grid grid-cols-2 gap-3">
                              <InfoTile label="Copias no deck" value={String(selectedCardEntry.copiesInDeck)} mini />
                              <InfoTile label="Targets usando" value={String(selectedCardEntry.usedByTargets.length)} mini />
                            </div>
                            <div className="mt-4 text-[11px] font-black uppercase tracking-[0.28em] text-amber-900/50">
                              Aparece em
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedCardEntry.usedByTargets.map((target) => (
                                <span
                                  key={`${selectedCardEntry.card.id}-${target.id}`}
                                  className="rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-amber-950 shadow-sm"
                                >
                                  {target.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </Panel>

              <Panel title="Preview do Pipeline" icon={<CheckCircle2 className="h-5 w-5" />}>
                {preview.ok && selectedDeckDefinition && preview.selectedRuntimeDeck ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <InfoTile label="Deck final runtime" value={preview.selectedRuntimeDeck.name} tone="success" />
                      <InfoTile label="Targets finais" value={String(preview.selectedRuntimeDeck.targets.length)} tone="success" />
                      <InfoTile
                        label="Silabas totais runtime"
                        value={String(
                          Object.values(preview.selectedRuntimeDeck.syllables).reduce((sum, count) => sum + count, 0),
                        )}
                        tone="success"
                        mini
                      />
                      <InfoTile label="TargetIds derivados" value={selectedDeckDefinition.targetIds.join(", ")} compact />
                    </div>

                    <div className="rounded-2xl border border-sky-700/12 bg-sky-100/85 px-4 py-4 text-sm text-sky-950">
                      O runtime continua consumindo o mesmo shape final de <span className="font-black">Deck</span>,
                      vindo do adapter atual do catalogo.
                    </div>

                    <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                      {selectedCatalogTargets.map((target) => (
                        <div key={target.id}>
                          <ResolvedTargetCard target={target} />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyCallout text="O preview do pipeline real aparece aqui assim que o draft voltar a ficar valido." />
                )}
              </Panel>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

const DraftTargetCard: React.FC<{
  target: ContentEditorTargetDraft;
  active: boolean;
}> = ({ target, active }) => {
  const normalizedRarity = normalizeRarity(target.rarity);
  const damage = RARITY_DAMAGE[normalizedRarity];
  const syllables = target.syllablesText
    .split(/[\n,]/)
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  return (
    <div
      className={cn(
        "card-base relative flex aspect-[126/176] w-full flex-col overflow-hidden rounded-[1.1rem] border transition-all duration-300",
        active
          ? "border-amber-300 shadow-[0_20px_34px_rgba(0,0,0,0.2)] ring-4 ring-amber-300/35"
          : "border-amber-900/20 shadow-[0_14px_26px_rgba(0,0,0,0.15)] hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(0,0,0,0.18)]",
      )}
    >
      <div
        className={cn(
          "flex h-10 items-center justify-between border-b-2 border-[#d4af37] px-3 text-[10px] font-black uppercase text-white",
          getRarityToneClass(target.rarity),
        )}
      >
        <span className="truncate">{getRarityLabel(target.rarity)}</span>
        <div className="flex items-center gap-1.5">
          <Swords className="h-4 w-4" />
          <span>{damage}</span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-1.5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_42%)]" />
        <div className="relative translate-y-3 text-[4.9rem] leading-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
          {target.emoji || "?"}
        </div>
      </div>

      <div className="mt-auto shrink-0 bg-parchment/90 px-2.5 pb-2.5 pt-4">
        <div className="text-center font-serif text-[0.82rem] font-black tracking-tight text-amber-950">
          {target.name || "NOVO TARGET"}
        </div>
        <div className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.18em] text-amber-900/45">
          {target.id}
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1">
          {syllables.length > 0 ? (
            syllables.map((syllable, index) => (
              <div
                key={`${target.id}-${syllable}-${index}`}
                className="rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-950 shadow-sm"
              >
                {syllable}
              </div>
            ))
          ) : (
            <div className="rounded-full border border-amber-900/12 bg-white/70 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-900/40 shadow-sm">
              SEM SILABAS
            </div>
          )}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
    </div>
  );
};

const ResolvedTargetCard: React.FC<{
  target: TargetDefinition;
}> = ({ target }) => {
  const normalizedRarity = normalizeRarity(target.rarity);
  const damage = RARITY_DAMAGE[normalizedRarity];

  return (
    <div className="card-base relative flex aspect-[126/176] w-full flex-col overflow-hidden rounded-[1.1rem] shadow-[0_14px_26px_rgba(0,0,0,0.15)]">
      <div
        className={cn(
          "flex h-10 items-center justify-between border-b-2 border-[#d4af37] px-3 text-[10px] font-black uppercase text-white",
          getRarityToneClass(target.rarity),
        )}
      >
        <span className="truncate">{getRarityLabel(target.rarity)}</span>
        <div className="flex items-center gap-1.5">
          <Swords className="h-4 w-4" />
          <span>{damage}</span>
        </div>
      </div>

      <div className="relative flex min-h-0 flex-[0.82] items-center justify-center bg-white/10 p-1.5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.12),transparent_42%)]" />
        <div className="relative translate-y-3 text-[4.9rem] leading-none drop-shadow-[0_10px_18px_rgba(0,0,0,0.22)]">
          {target.emoji || "?"}
        </div>
      </div>

      <div className="mt-auto shrink-0 bg-parchment/90 px-2.5 pb-2.5 pt-4">
        <div className="text-center font-serif text-[0.82rem] font-black tracking-tight text-amber-950">
          {target.name}
        </div>
        <div className="mt-2.5 flex flex-wrap justify-center gap-1">
          {target.cardIds.map((cardId, index) => (
            <div
              key={`${target.id}-${cardId}-${index}`}
              className="rounded-full border border-amber-900/12 bg-white/85 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-amber-950 shadow-sm"
            >
              {cardId.replace("syllable.", "").toUpperCase()}
            </div>
          ))}
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
    </div>
  );
};

const DerivedSyllableCard: React.FC<{
  syllable: string;
  copies: number;
  selected: boolean;
  onClick?: () => void;
  interactive?: boolean;
}> = ({ syllable, copies, selected, onClick, interactive = true }) => {
  return (
    <div className="flex w-full flex-col items-center gap-0 text-center">
      <div className={cn("origin-top scale-[0.72] -mb-3", !interactive && "pointer-events-none")}>
          <SyllableCard
            syllable={syllable}
            selected={selected}
            playable={false}
            disabled={false}
            staticDisplay
            onClick={interactive ? () => onClick?.() : () => {}}
          />
      </div>
      <span className="-mt-3 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm">
        x{copies}
      </span>
    </div>
  );
};

const Panel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="paper-panel rounded-[28px] border-2 border-[#8d6e63]/30 p-5 shadow-[0_18px_34px_rgba(0,0,0,0.12)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-900/12 bg-amber-100/55 text-amber-950">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-black tracking-tight text-amber-950">{title}</h3>
    </div>
    {children}
  </section>
);

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <label className={cn("block", className)}>
    <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">{label}</div>
    {children}
  </label>
);

const MetricCard: React.FC<{
  label: string;
  value: string;
  icon?: React.ReactNode;
}> = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.92)] px-4 py-3 text-amber-950 shadow-[0_8px_18px_rgba(0,0,0,0.08)]">
    <div className="flex items-center justify-between gap-3">
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/55">{label}</div>
      {icon ? (
        <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-900/12 bg-amber-100/55 text-amber-900/80">
          {icon}
        </div>
      ) : null}
    </div>
    <div className="mt-1 font-serif text-3xl font-black">{value}</div>
  </div>
);

const InfoTile: React.FC<{
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
  compact?: boolean;
  mini?: boolean;
}> = ({ label, value, tone = "default", compact = false, mini = false }) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-4",
      mini && "px-3 py-3",
      tone === "success"
        ? "border-emerald-700/15 bg-emerald-100/85"
        : tone === "warning"
          ? "border-amber-700/15 bg-amber-100/85"
          : "border-amber-900/12 bg-[rgba(255,252,244,0.88)]",
    )}
  >
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">{label}</div>
    <div
      className={cn(
        "mt-2 font-serif font-black text-amber-950",
        compact ? "text-sm break-all leading-snug" : mini ? "text-xl" : "text-2xl",
      )}
    >
      {value}
    </div>
  </div>
);

const IssueRow: React.FC<{
  issue: string;
  tone: "warning" | "info";
}> = ({ issue, tone }) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-4 text-sm",
      tone === "warning"
        ? "border-amber-700/15 bg-amber-100/85 text-amber-950"
        : "border-sky-700/12 bg-sky-100/85 text-sky-950",
    )}
  >
    <div className="flex items-start gap-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{issue}</span>
    </div>
  </div>
);

const EmptyCallout: React.FC<{
  text: string;
}> = ({ text }) => (
  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.88)] px-4 py-4 text-sm text-amber-950/75">
    {text}
  </div>
);

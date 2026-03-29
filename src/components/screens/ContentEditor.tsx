import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BookOpenText,
  CheckCircle2,
  FilePenLine,
  Layers3,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { getCardsForDeck, getCatalogDeckById, getTargetsForDeck } from "../../data/content";
import {
  ContentEditorDeckDraft,
  buildContentEditorPreview,
  cloneRawDeckDefinition,
  createContentEditorDeckDraft,
  createEmptyContentEditorSyllableRow,
  createEmptyContentEditorTarget,
  getContentEditorLocalIssues,
  hydrateRawDeckDefinitionFromDraft,
} from "../../data/content/editor";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import { DeckVisualThemeId } from "../../data/content/types";
import { getRawDeckCatalogEntry, rawDeckCatalogEntries } from "../../data/content/decks";

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

export const ContentEditor: React.FC = () => {
  const initialSourceDecks = useMemo(createSourceDeckState, []);
  const [sourceDecksById, setSourceDecksById] = useState(initialSourceDecks);
  const [selectedDeckId, setSelectedDeckId] = useState(() => rawDeckCatalogEntries[0]?.id ?? "");
  const [draft, setDraft] = useState<ContentEditorDeckDraft>(() =>
    createDraftForDeck(initialSourceDecks, rawDeckCatalogEntries[0]?.id ?? ""),
  );
  const [selectedTargetId, setSelectedTargetId] = useState(() => draft.targets[0]?.id ?? "");
  const [selectedCardId, setSelectedCardId] = useState("");
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
    () => selectedCatalogCards.find((entry) => entry.card.id === selectedCardId) ?? selectedCatalogCards[0] ?? null,
    [selectedCardId, selectedCatalogCards],
  );

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
    if (!selectedCatalogCards.some((entry) => entry.card.id === selectedCardId)) {
      setSelectedCardId(selectedCatalogCards[0]?.card.id ?? "");
    }
  }, [selectedCardId, selectedCatalogCards]);

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
      <div className="flex min-h-screen items-center justify-center bg-[#140f0c] p-6 text-amber-50">
        <div className="w-full max-w-xl rounded-[28px] border border-amber-200/10 bg-black/25 p-6 text-center">
          Nenhum deck registrado para o editor minimo de conteudo.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full w-full overflow-y-auto bg-[#140f0c] text-amber-50">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/dark-wood.png')] opacity-20" />
        <div className="absolute left-[-12%] top-[-22%] h-[44rem] w-[44rem] rounded-full bg-amber-700/10 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[40rem] w-[40rem] rounded-full bg-emerald-700/10 blur-[150px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1720px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        <aside className="w-full shrink-0 rounded-[28px] border border-amber-200/10 bg-black/25 p-4 shadow-[0_20px_50px_rgba(0,0,0,0.28)] lg:w-[24rem] lg:p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-200/45">Dev Only</div>
              <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-amber-100">
                Editor de Conteudo
              </h1>
            </div>
            <Button
              variant="ghost"
              className="border border-amber-200/10 bg-amber-50/5 text-amber-100 hover:bg-amber-50/10"
              onClick={() => {
                if (typeof window === "undefined") return;
                window.location.href = "/?content-inspector=1";
              }}
            >
              Inspecao
            </Button>
          </div>

          <div className="rounded-2xl border border-sky-300/12 bg-sky-500/8 px-4 py-3 text-sm text-sky-100/90">
            Edita um deck por vez no shape bruto atual. Cards e targetIds seguem derivados pelo pipeline real.
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-300/12 bg-emerald-500/8 px-4 py-3 text-sm text-emerald-100/90">
            Save dev-only regrava <span className="font-black text-emerald-50">{selectedDeckEntry.filePath}</span>.
          </div>

          <label className="mt-5 block">
            <div className="mb-2 flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/50">
              <Search className="h-4 w-4" />
              Decks
            </div>
            <input
              value={deckSearchValue}
              onChange={(event) => setDeckSearchValue(event.target.value)}
              placeholder="Buscar deck por nome ou id"
              className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/30"
            />
          </label>

          <div className="mt-5 space-y-3">
            {filteredDeckEntries.map((entry) => {
              const isActive = entry.id === selectedDeckId;
              const isEdited = isActive && isDirty;

              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => openDeck(entry.id)}
                  className={cn(
                    "w-full rounded-[24px] border p-4 text-left transition-all",
                    isActive
                      ? "border-amber-300/30 bg-amber-200/12 shadow-[0_18px_34px_rgba(0,0,0,0.22)]"
                      : "border-amber-200/10 bg-white/5 hover:border-amber-200/20 hover:bg-white/7",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate font-serif text-xl font-black text-amber-100">{entry.deck.name}</div>
                      <div className="truncate text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                        {entry.id}
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "border",
                        isEdited
                          ? "border-amber-300/20 bg-amber-500/10 text-amber-50"
                          : "border-emerald-300/25 bg-emerald-500/10 text-emerald-100",
                      )}
                    >
                      {isEdited ? "draft" : "source"}
                    </Badge>
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
                <MetricCard label="Targets no draft" value={String(draft.targets.length)} />
                <MetricCard label="Linhas de silaba" value={String(draft.syllableRows.length)} />
                <MetricCard label="TargetIds derivados" value={String(draft.targets.length)} />
                <MetricCard label="Cards derivados" value={String(selectedCatalogCards.length)} />
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
                      className="w-full rounded-2xl border border-amber-200/10 bg-black/30 px-4 py-3 text-sm text-amber-100/65 outline-none"
                    />
                  </Field>

                  <Field label="Visual theme seguro">
                    <select
                      value={draft.visualTheme}
                      onChange={(event) => updateDeckField("visualTheme", event.target.value as DeckVisualThemeId)}
                      className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
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
                      className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                    />
                  </Field>

                  <Field label="Emoji">
                    <input
                      value={draft.emoji}
                      onChange={(event) => updateDeckField("emoji", event.target.value)}
                      className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                    />
                  </Field>

                  <Field label="Descricao" className="md:col-span-2">
                    <textarea
                      value={draft.description}
                      onChange={(event) => updateDeckField("description", event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                    />
                  </Field>
                </div>
              </Panel>

              <Panel title="Distribuicao de Silabas" icon={<Layers3 className="h-5 w-5" />}>
                <div className="space-y-3">
                  {draft.syllableRows.map((row) => (
                    <div key={row.id} className="grid gap-3 rounded-[24px] border border-amber-200/10 bg-black/20 p-4 md:grid-cols-[1fr_10rem_auto]">
                      <input
                        value={row.syllable}
                        onChange={(event) => updateSyllableRow(row.id, { syllable: event.target.value.toUpperCase() })}
                        placeholder="Silaba"
                        className="rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/30"
                      />
                      <input
                        type="number"
                        min={0}
                        value={row.count}
                        onChange={(event) => updateSyllableRow(row.id, { count: event.target.value })}
                        className="rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                      />
                      <Button
                        variant="ghost"
                        className="border border-amber-200/10 bg-white/5 text-amber-100 hover:bg-amber-50/10"
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
                    className="border border-amber-200/10 bg-amber-50/5 text-amber-100 hover:bg-amber-50/10"
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
                  <InfoTile label="Source bruto" value={selectedDeckEntry.filePath} />
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
                      ? "border-emerald-300/25 bg-emerald-500/10 text-emerald-100"
                      : saveStatus.tone === "error"
                        ? "border-rose-300/25 bg-rose-500/10 text-rose-100"
                        : "border-amber-200/10 bg-black/15 text-amber-50/80",
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
                        <div className="rounded-2xl border border-emerald-300/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
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
                    className="border border-amber-200/10 bg-white/5 text-amber-100 hover:bg-amber-50/10"
                    onClick={resetDraft}
                    disabled={!isDirty}
                  >
                    <RotateCcw className="h-4 w-4" />
                    Resetar draft
                  </Button>
                  <Button
                    variant="ghost"
                    className="border border-emerald-300/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
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
                    className="border border-amber-200/10 bg-amber-50/5 text-amber-100 hover:bg-amber-50/10"
                    onClick={addTarget}
                  >
                    <Plus className="h-4 w-4" />
                    Novo target
                  </Button>
                  <Badge className="border border-sky-300/25 bg-sky-500/10 text-sky-100">
                    targetIds derivados: {draft.targets.map((target) => target.id).join(", ") || "nenhum"}
                  </Badge>
                </div>

                <div className="space-y-3">
                  {draft.targets.map((target) => {
                    const isActive = target.id === selectedTargetDraft?.id;
                    return (
                      <button
                        key={target.id}
                        type="button"
                        onClick={() => setSelectedTargetId(target.id)}
                        className={cn(
                          "w-full rounded-[24px] border p-4 text-left transition-all",
                          isActive
                            ? "border-amber-300/30 bg-amber-200/12"
                            : "border-amber-200/10 bg-white/5 hover:border-amber-200/20 hover:bg-white/7",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="font-serif text-xl font-black text-amber-100">{target.name}</div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                              {target.id}
                            </div>
                          </div>
                          <div className="text-3xl leading-none">{target.emoji || "?"}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {selectedTargetDraft ? (
                  <div className="mt-5 rounded-[28px] border border-amber-200/10 bg-black/20 p-5">
                    <div className="mb-4 flex flex-wrap items-center gap-3">
                      <Badge className="border border-amber-300/20 bg-amber-500/10 text-amber-50">
                        id interno: {selectedTargetDraft.id}
                      </Badge>
                      <Button
                        variant="ghost"
                        className="border border-amber-200/10 bg-white/5 text-amber-100 hover:bg-amber-50/10"
                        onClick={() => moveTarget(selectedTargetDraft.id, -1)}
                        disabled={draft.targets[0]?.id === selectedTargetDraft.id}
                      >
                        <ArrowUp className="h-4 w-4" />
                        Subir
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-amber-200/10 bg-white/5 text-amber-100 hover:bg-amber-50/10"
                        onClick={() => moveTarget(selectedTargetDraft.id, 1)}
                        disabled={draft.targets[draft.targets.length - 1]?.id === selectedTargetDraft.id}
                      >
                        <ArrowDown className="h-4 w-4" />
                        Descer
                      </Button>
                      <Button
                        variant="ghost"
                        className="border border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/20"
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
                          className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                        />
                      </Field>

                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Emoji">
                          <input
                            value={selectedTargetDraft.emoji}
                            onChange={(event) => updateTarget(selectedTargetDraft.id, { emoji: event.target.value })}
                            className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                          />
                        </Field>

                        <Field label="Rarity">
                          <select
                            value={selectedTargetDraft.rarity}
                            onChange={(event) => updateTarget(selectedTargetDraft.id, { rarity: event.target.value })}
                            className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
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
                          className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition focus:border-amber-300/30"
                        />
                      </Field>

                      <Field label="Silabas do target">
                        <input
                          value={selectedTargetDraft.syllablesText}
                          onChange={(event) => updateTarget(selectedTargetDraft.id, { syllablesText: event.target.value.toUpperCase() })}
                          placeholder="Ex.: BA, NA, NA"
                          className="w-full rounded-2xl border border-amber-200/10 bg-black/20 px-4 py-3 text-sm text-amber-50 outline-none transition placeholder:text-amber-100/30 focus:border-amber-300/30"
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
                  <div className="grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
                    <div className="space-y-3">
                      {selectedCatalogCards.map((entry) => (
                        <button
                          key={entry.card.id}
                          type="button"
                          onClick={() => setSelectedCardId(entry.card.id)}
                          className={cn(
                            "w-full rounded-[24px] border p-4 text-left transition-all",
                            selectedCardEntry?.card.id === entry.card.id
                              ? "border-amber-300/30 bg-amber-200/12"
                              : "border-amber-200/10 bg-white/5 hover:border-amber-200/20 hover:bg-white/7",
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <div className="font-serif text-xl font-black text-amber-100">{entry.card.syllable}</div>
                              <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                                {entry.card.id}
                              </div>
                            </div>
                            <Badge className="border border-amber-300/20 bg-amber-500/10 text-amber-50">
                              x{entry.copiesInDeck}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>

                    {selectedCardEntry ? (
                      <div className="rounded-[28px] border border-amber-200/10 bg-black/20 p-5">
                        <div className="font-serif text-2xl font-black text-amber-100">{selectedCardEntry.card.syllable}</div>
                        <div className="mt-1 text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">
                          {selectedCardEntry.card.id}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3">
                          <InfoTile label="Copias no deck" value={String(selectedCardEntry.copiesInDeck)} />
                          <InfoTile label="Targets usando" value={String(selectedCardEntry.usedByTargets.length)} />
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {selectedCardEntry.usedByTargets.map((target) => (
                            <span
                              key={`${selectedCardEntry.card.id}-${target.id}`}
                              className="rounded-full border border-amber-200/12 bg-amber-50/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50"
                            >
                              {target.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
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
                      />
                      <InfoTile label="TargetIds derivados" value={selectedDeckDefinition.targetIds.join(", ")} />
                    </div>

                    <div className="rounded-2xl border border-sky-300/20 bg-sky-500/10 px-4 py-4 text-sm text-sky-100">
                      O runtime continua consumindo o mesmo shape final de <span className="font-black">Deck</span>,
                      vindo do adapter atual do catalogo.
                    </div>

                    <div className="space-y-3">
                      {selectedCatalogTargets.map((target) => (
                        <div key={target.id} className="rounded-2xl border border-amber-200/10 bg-black/20 p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="font-serif text-xl font-black text-amber-100">{target.name}</div>
                            <Badge className="border border-sky-300/25 bg-sky-500/10 text-sky-100">
                              {target.cardIds.length} cards
                            </Badge>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {target.cardIds.map((cardId, index) => (
                              <span
                                key={`${target.id}-${cardId}-${index}`}
                                className="rounded-full border border-amber-200/12 bg-amber-50/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-amber-50"
                              >
                                {cardId}
                              </span>
                            ))}
                          </div>
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

const Panel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, children }) => (
  <section className="rounded-[28px] border border-amber-200/10 bg-black/25 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.22)]">
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-200/10 bg-amber-50/8 text-amber-100">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-black tracking-tight text-amber-50">{title}</h3>
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
    <div className="mb-2 text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">{label}</div>
    {children}
  </label>
);

const MetricCard: React.FC<{
  label: string;
  value: string;
}> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/12 bg-black/15 px-4 py-3 text-amber-50 shadow-[0_10px_24px_rgba(0,0,0,0.18)]">
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-50/60">{label}</div>
    <div className="mt-1 font-serif text-3xl font-black">{value}</div>
  </div>
);

const InfoTile: React.FC<{
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}> = ({ label, value, tone = "default" }) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-4",
      tone === "success"
        ? "border-emerald-300/20 bg-emerald-500/10"
        : tone === "warning"
          ? "border-amber-300/20 bg-amber-500/10"
          : "border-amber-200/10 bg-black/15",
    )}
  >
    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/45">{label}</div>
    <div className="mt-2 font-serif text-2xl font-black text-amber-50">{value}</div>
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
        ? "border-amber-300/20 bg-amber-500/10 text-amber-50"
        : "border-sky-300/20 bg-sky-500/10 text-sky-100",
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
  <div className="rounded-2xl border border-amber-200/10 bg-black/15 px-4 py-4 text-sm text-amber-50/75">
    {text}
  </div>
);

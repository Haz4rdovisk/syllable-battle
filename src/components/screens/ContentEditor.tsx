import React, { startTransition, useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  BookOpenText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FilePenLine,
  Layers3,
  Plus,
  RotateCcw,
  Save,
  Search,
  Shield,
  Swords,
  Trash2,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import { SyllableCard } from "../game/GameComponents";
import {
  buildMinimumDeckPoolFromTargets,
  buildContentEditorReviewSummary,
  buildContentEditorTargetNameValidation,
  clampContentEditorSyllableCount,
  cloneRawDeckCatalogEntry,
  ContentEditorDeckDraft,
  ContentEditorTargetDraft,
  buildContentEditorSourceDiff,
  buildContentEditorPreview,
  syncDeckPoolWithTargetMinimums,
  cloneRawDeckDefinition,
  createEmptyContentEditorDeckEntry,
  createContentEditorDeckDraft,
  createEmptyContentEditorTarget,
  createRawDeckCatalogEntry,
  createRawDeckDefinitionSource,
  formatContentEditorTargetSyllables,
  getContentEditorLocalIssues,
  hydratePreviewRawDeckDefinitionFromDraft,
  hydrateRawDeckDefinitionFromDraft,
  normalizeContentEditorPoolAdjustments,
  parseContentEditorTargetSyllables,
  removeContentEditorTargetSyllableAt,
} from "../../data/content/editor";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import { DeckVisualThemeId } from "../../data/content/types";
import { RawDeckCatalogEntry, rawDeckCatalogEntries } from "../../data/content/decks";
import { RARITY_DAMAGE, normalizeRarity } from "../../types/game";

type SaveStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

const themeIds = Object.keys(DECK_VISUAL_THEME_CLASSES) as DeckVisualThemeId[];

const createSourceEntriesState = () => rawDeckCatalogEntries.map((entry) => cloneRawDeckCatalogEntry(entry));

const createDraftForDeck = (entries: RawDeckCatalogEntry[], deckId: string) =>
  createContentEditorDeckDraft(
    entries.find((entry) => entry.id === deckId)?.deck ?? cloneRawDeckDefinition(entries[0]?.deck ?? rawDeckCatalogEntries[0].deck),
  );

const idleSaveStatus: SaveStatus = {
  tone: "idle",
  message: "Edicao local em memoria ate salvar no source bruto do deck selecionado.",
};

const normalizeEditorSyllable = (value: string) => value.trim().toUpperCase();

const getDerivedCardsGridColumns = (width: number) => {
  if (width >= 1280) return 4;
  if (width >= 640) return 3;
  return 2;
};

const getTargetGridColumns = (width: number) => {
  if (width >= 1280) return 3;
  return 2;
};

const getTargetCopiesDisplayValue = (copiesText: string) => {
  const copies = Number(copiesText);
  return Number.isInteger(copies) && copies > 0 ? copies : 0;
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

type LocalizedIssue = {
  scope: string;
  focus?: string;
  message: string;
  raw?: string;
};

const describeEditorIssue = (issue: string): LocalizedIssue => {
  const localTargetCopiesMatch = issue.match(/^Target "([^"]+)" precisa ter copias com inteiro positivo\.$/);
  if (localTargetCopiesMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${localTargetCopiesMatch[1]} · Copia`,
      message: "Use um inteiro positivo maior que zero para definir quantas copias desse alvo entram no deck.",
      raw: issue,
    };
  }

  const localTargetSyllablesMatch = issue.match(/^Target "([^"]+)" precisa ter pelo menos uma silaba informada\.$/);
  if (localTargetSyllablesMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${localTargetSyllablesMatch[1]} · Silabas`,
      message: "Digite pelo menos uma silaba para esse alvo poder gerar o pool minimo.",
      raw: issue,
    };
  }

  const localTargetNameMatch = issue.match(/^Target "([^"]+)" precisa formar o nome "([^"]+)" com as silabas informadas\.$/);
  if (localTargetNameMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${localTargetNameMatch[1]} · Nome x silabas`,
      message: `As silabas digitadas ainda nao formam corretamente o nome ${localTargetNameMatch[2]}.`,
      raw: issue,
    };
  }

  const localDuplicateSyllableMatch = issue.match(/^Deck "([^"]+)" repete a silaba "([^"]+)" nas linhas (\d+) do editor\.$/);
  if (localDuplicateSyllableMatch) {
    return {
      scope: "Cards do Deck",
      focus: `Silaba ${localDuplicateSyllableMatch[2]} · Linha ${localDuplicateSyllableMatch[3]}`,
      message: "A mesma silaba apareceu mais de uma vez no deck. Cada linha deve representar uma silaba unica.",
      raw: issue,
    };
  }

  const pipelineTargetCopiesMatch = issue.match(/^deck "([^"]+)" target "([^"]+)" copies must be a positive integer\.$/i);
  if (pipelineTargetCopiesMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${pipelineTargetCopiesMatch[2]} · Copia`,
      message: "O pipeline real rejeitou esse alvo porque o campo Copia precisa ser um inteiro positivo.",
      raw: issue,
    };
  }

  const pipelineTargetNeedsMatch = issue.match(
    /^deck "([^"]+)" target "([^"]+)" needs (\d+)x "([^"]+)", but the deck provides (\d+)\.$/i,
  );
  if (pipelineTargetNeedsMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${pipelineTargetNeedsMatch[2]} · Silabas`,
      message: `Esse alvo pede ${pipelineTargetNeedsMatch[3]}x ${pipelineTargetNeedsMatch[4]}, mas o deck so fornece ${pipelineTargetNeedsMatch[5]}.`,
      raw: issue,
    };
  }

  const targetSyllablesMissingMatch = issue.match(
    /^deck "([^"]+)" target "([^"]+)" syllables must contain at least one syllable\.$/i,
  );
  if (targetSyllablesMissingMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${targetSyllablesMissingMatch[2]} · Silabas`,
      message: "Cada alvo precisa ter pelo menos uma silaba vinculada.",
      raw: issue,
    };
  }

  const targetSyllableEntryMatch = issue.match(
    /^deck "([^"]+)" target "([^"]+)" syllables\[(\d+)\] must be a non-empty syllable\.$/i,
  );
  if (targetSyllableEntryMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${targetSyllableEntryMatch[2]} · Silabas`,
      message: `Existe uma entrada vazia ou invalida na lista de silabas desse alvo (item ${Number(targetSyllableEntryMatch[3]) + 1}).`,
      raw: issue,
    };
  }

  const duplicateDeckTargetIdMatch = issue.match(/^deck "([^"]+)" has duplicate target id "([^"]+)"\.$/i);
  if (duplicateDeckTargetIdMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${duplicateDeckTargetIdMatch[2]} · id interno`,
      message: "Esse id interno ficou duplicado dentro do deck atual.",
      raw: issue,
    };
  }

  const duplicateTargetIdMatch = issue.match(/^Duplicate target id "([^"]+)"\.$/i);
  if (duplicateTargetIdMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${duplicateTargetIdMatch[1]} · id interno`,
      message: "Esse id interno conflita com outro target ja registrado no catalogo.",
      raw: issue,
    };
  }

  const deckSyllableCountMatch = issue.match(/^deck "([^"]+)" syllable "([^"]+)" must have a positive integer count\.$/i);
  if (deckSyllableCountMatch) {
    return {
      scope: "Cards do Deck",
      focus: `Silaba ${deckSyllableCountMatch[2]} · Copias`,
      message: "Cada linha de silaba precisa ter um numero inteiro positivo de copias.",
      raw: issue,
    };
  }

  const deckMustDefineTargetsMatch = issue.match(/^deck "([^"]+)" must define at least one target\.$/i);
  if (deckMustDefineTargetsMatch) {
    return {
      scope: "Targets do Deck",
      message: "O deck precisa ter pelo menos um alvo para continuar valido.",
      raw: issue,
    };
  }

  const deckMustDefineSyllablesMatch = issue.match(/^deck "([^"]+)" must define at least one syllable count\.$/i);
  if (deckMustDefineSyllablesMatch) {
    return {
      scope: "Targets do Deck",
      message: "O deck precisa de pelo menos um alvo valido para gerar o pool minimo de silabas.",
      raw: issue,
    };
  }

  const deckNameRequiredMatch = issue.match(/^deck "([^"]+)" name is required\.$/i);
  if (deckNameRequiredMatch) {
    return {
      scope: "Deck Ativo",
      focus: "Nome",
      message: "O deck precisa ter um nome preenchido.",
      raw: issue,
    };
  }

  const deckDescriptionRequiredMatch = issue.match(/^deck "([^"]+)" description is required\.$/i);
  if (deckDescriptionRequiredMatch) {
    return {
      scope: "Deck Ativo",
      focus: "Descricao",
      message: "O deck precisa ter uma descricao preenchida.",
      raw: issue,
    };
  }

  const deckEmojiRequiredMatch = issue.match(/^deck "([^"]+)" emoji is required\.$/i);
  if (deckEmojiRequiredMatch) {
    return {
      scope: "Deck Ativo",
      focus: "Emoji",
      message: "O deck precisa ter um emoji preenchido.",
      raw: issue,
    };
  }

  const deckTargetsToFillBoardMatch = issue.match(/^deck "([^"]+)" must define at least (\d+) targets to fill the board\.$/i);
  if (deckTargetsToFillBoardMatch) {
    return {
      scope: "Pipeline real",
      focus: "Board minimo",
      message: `O deck ainda nao tem alvos suficientes para preencher o board minimo (${deckTargetsToFillBoardMatch[2]}).`,
      raw: issue,
    };
  }

  const deckHandSizeMatch = issue.match(/^deck "([^"]+)" must have at least (\d+) syllables to draw the opening hand\.$/i);
  if (deckHandSizeMatch) {
    return {
      scope: "Pipeline real",
      focus: "Mao inicial",
      message: `O deck precisa ter pelo menos ${deckHandSizeMatch[2]} silabas para montar a mao inicial.`,
      raw: issue,
    };
  }

  return {
    scope: "Pipeline real",
    message: issue,
  };
};

export const ContentEditor: React.FC = () => {
  const initialSourceEntries = useMemo(createSourceEntriesState, []);
  const [sourceEntries, setSourceEntries] = useState(initialSourceEntries);
  const [selectedDeckId, setSelectedDeckId] = useState(() => initialSourceEntries[0]?.id ?? "");
  const [draft, setDraft] = useState<ContentEditorDeckDraft>(() =>
    createDraftForDeck(initialSourceEntries, initialSourceEntries[0]?.id ?? ""),
  );
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedSyllableRowId, setSelectedSyllableRowId] = useState("");
  const [targetGridColumns, setTargetGridColumns] = useState(() =>
    typeof window !== "undefined" ? getTargetGridColumns(window.innerWidth) : 2,
  );
  const [derivedCardsGridColumns, setDerivedCardsGridColumns] = useState(() =>
    typeof window !== "undefined" ? getDerivedCardsGridColumns(window.innerWidth) : 2,
  );
  const [deckSearchValue, setDeckSearchValue] = useState("");
  const [isDeckActiveExpanded, setIsDeckActiveExpanded] = useState(false);
  const [isSaveDiffExpanded, setIsSaveDiffExpanded] = useState(true);
  const [isGeneratedSourceExpanded, setIsGeneratedSourceExpanded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>(idleSaveStatus);
  const [poolConstraintMessage, setPoolConstraintMessage] = useState("");
  const deferredDeckSearch = useDeferredValue(deckSearchValue.trim().toLowerCase());
  const sourceDecksById = useMemo(
    () =>
      sourceEntries.reduce<Record<string, ReturnType<typeof cloneRawDeckDefinition>>>((acc, entry) => {
        acc[entry.id] = cloneRawDeckDefinition(entry.deck);
        return acc;
      }, {}),
    [sourceEntries],
  );

  const selectedDeckEntry = useMemo(
    () => sourceEntries.find((entry) => entry.id === selectedDeckId) ?? null,
    [selectedDeckId, sourceEntries],
  );
  const persistedDeck = selectedDeckEntry?.deck ?? null;
  const baselineDraft = useMemo(
    () => (persistedDeck ? createContentEditorDeckDraft(persistedDeck) : draft),
    [draft, persistedDeck],
  );
  const draftRawDeck = useMemo(() => hydrateRawDeckDefinitionFromDraft(draft), [draft]);
  const draftPreviewRawDeck = useMemo(() => hydratePreviewRawDeckDefinitionFromDraft(draft), [draft]);
  const persistedPreviewDeck = useMemo(
    () => (persistedDeck ? hydratePreviewRawDeckDefinitionFromDraft(createContentEditorDeckDraft(persistedDeck)) : null),
    [persistedDeck],
  );
  const isDirty = useMemo(
    () => JSON.stringify(draftPreviewRawDeck) !== JSON.stringify(persistedPreviewDeck),
    [draftPreviewRawDeck, persistedPreviewDeck],
  );

  const localIssues = useMemo(() => getContentEditorLocalIssues(draft), [draft]);
  const preview = useMemo(() => buildContentEditorPreview(sourceEntries, selectedDeckId, draft), [draft, selectedDeckId, sourceEntries]);

  const selectedDeckModel = useMemo(
    () => (preview.ok ? preview.selectedDeckModel : null),
    [preview],
  );
  const selectedDeckDefinition = useMemo(
    () => selectedDeckModel?.definition ?? null,
    [selectedDeckModel],
  );
  const effectivePoolRows = useMemo(
    () => syncDeckPoolWithTargetMinimums(draft.manualPoolAdjustments, draft.targets),
    [draft.manualPoolAdjustments, draft.targets],
  );
  const draftPoolCopies = useMemo(
    () => effectivePoolRows.reduce((sum, row) => sum + Math.max(0, Number(row.count) || 0), 0),
    [effectivePoolRows],
  );
  const pipelineIssues = useMemo(() => ("issues" in preview ? preview.issues : []), [preview]);
  const selectedTargetDraft = useMemo(
    () => draft.targets.find((target) => target.id === selectedTargetId) ?? null,
    [draft.targets, selectedTargetId],
  );
  const selectedTargetSyllables = useMemo(
    () => (selectedTargetDraft ? parseContentEditorTargetSyllables(selectedTargetDraft.syllablesText) : []),
    [selectedTargetDraft],
  );
  const selectedTargetNameValidation = useMemo(
    () => buildContentEditorTargetNameValidation(selectedTargetDraft?.name ?? "", selectedTargetDraft?.syllablesText ?? ""),
    [selectedTargetDraft],
  );
  const targetNameValidationById = useMemo(
    () =>
      draft.targets.reduce<Record<string, ReturnType<typeof buildContentEditorTargetNameValidation>>>((acc, target) => {
        acc[target.id] = buildContentEditorTargetNameValidation(target.name, target.syllablesText);
        return acc;
      }, {}),
    [draft.targets],
  );
  const missingTargetCount = useMemo(
    () => draft.targets.filter((target) => !targetNameValidationById[target.id]?.matchesName).length,
    [draft.targets, targetNameValidationById],
  );
  const totalTargetCopies = useMemo(
    () => draft.targets.reduce((sum, target) => sum + getTargetCopiesDisplayValue(target.copies), 0),
    [draft.targets],
  );
  const requiredPoolCounts = useMemo(
    () => buildMinimumDeckPoolFromTargets(draft.targets),
    [draft.targets],
  );
  const targetMinimumCardCount = useMemo(
    () => [...requiredPoolCounts.values()].reduce((sum, count) => sum + count, 0),
    [requiredPoolCounts],
  );
  const derivedTargetIdsLabel = useMemo(() => {
    if (!preview.ok) return "draft invalido";
    return selectedDeckDefinition?.targetIds.join(", ") || "nenhum";
  }, [preview, selectedDeckDefinition]);
  const derivedTargetIdCount = useMemo(
    () => (preview.ok ? selectedDeckDefinition?.targetIds.length ?? 0 : 0),
    [preview, selectedDeckDefinition],
  );
  const persistedSource = useMemo(
    () =>
      selectedDeckEntry && persistedDeck
        ? createRawDeckDefinitionSource(selectedDeckEntry.exportName, persistedDeck)
        : "",
    [persistedDeck, selectedDeckEntry],
  );
  const nextSaveSource = useMemo(
    () => (selectedDeckEntry ? createRawDeckDefinitionSource(selectedDeckEntry.exportName, draftRawDeck) : ""),
    [draftRawDeck, selectedDeckEntry],
  );
  const saveSourceDiff = useMemo(
    () => buildContentEditorSourceDiff(persistedSource, nextSaveSource),
    [nextSaveSource, persistedSource],
  );
  const targetGridItems = useMemo(
    () => [
      ...draft.targets.map((target) => ({ kind: "target" as const, id: target.id, target })),
      { kind: "add" as const, id: "__add-target__" },
    ],
    [draft.targets],
  );
  const syllableGridItems = useMemo(
    () => effectivePoolRows.map((row) => ({ kind: "row" as const, id: row.id, row })),
    [effectivePoolRows],
  );
  const selectedSyllableRow = useMemo(
    () => effectivePoolRows.find((row) => row.id === selectedSyllableRowId) ?? null,
    [effectivePoolRows, selectedSyllableRowId],
  );
  const selectedSyllableNormalized = useMemo(
    () => (selectedSyllableRow ? normalizeEditorSyllable(selectedSyllableRow.syllable) : ""),
    [selectedSyllableRow],
  );
  const selectedSyllableUsedByTargets = useMemo(
    () =>
      selectedSyllableNormalized
        ? draft.targets.filter((target) =>
            parseContentEditorTargetSyllables(target.syllablesText).includes(selectedSyllableNormalized),
          )
        : [],
    [draft.targets, selectedSyllableNormalized],
  );
  const selectedSyllableMinimumCount = useMemo(
    () => (selectedSyllableNormalized ? requiredPoolCounts.get(selectedSyllableNormalized) ?? 0 : 0),
    [requiredPoolCounts, selectedSyllableNormalized],
  );
  const selectedSyllableCardId = useMemo(
    () => (selectedSyllableNormalized ? `syllable.${selectedSyllableNormalized.toLowerCase()}` : ""),
    [selectedSyllableNormalized],
  );
  const expandedTargetRowEndIndex = useMemo(() => {
    if (!selectedTargetId) return -1;
    const selectedIndex = targetGridItems.findIndex((item) => item.kind === "target" && item.id === selectedTargetId);
    if (selectedIndex < 0) return -1;

    const rowStartIndex = Math.floor(selectedIndex / targetGridColumns) * targetGridColumns;
    return Math.min(targetGridItems.length - 1, rowStartIndex + targetGridColumns - 1);
  }, [selectedTargetId, targetGridColumns, targetGridItems]);
  const expandedSyllableRowEndIndex = useMemo(() => {
    if (!selectedSyllableRowId) return -1;
    const selectedIndex = syllableGridItems.findIndex((item) => item.kind === "row" && item.id === selectedSyllableRowId);
    if (selectedIndex < 0) return -1;

    const rowStartIndex = Math.floor(selectedIndex / derivedCardsGridColumns) * derivedCardsGridColumns;
    return Math.min(syllableGridItems.length - 1, rowStartIndex + derivedCardsGridColumns - 1);
  }, [derivedCardsGridColumns, selectedSyllableRowId, syllableGridItems]);

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
    if (selectedTargetId && !draft.targets.some((target) => target.id === selectedTargetId)) {
      setSelectedTargetId("");
    }
  }, [draft.targets, selectedTargetId]);

  useEffect(() => {
    if (selectedSyllableRowId && !effectivePoolRows.some((row) => row.id === selectedSyllableRowId)) {
      setSelectedSyllableRowId("");
      setPoolConstraintMessage("");
    }
  }, [effectivePoolRows, selectedSyllableRowId]);

  useEffect(() => {
    setPoolConstraintMessage("");
  }, [selectedSyllableRowId]);

  useEffect(() => {
    const syncColumns = () => {
      if (typeof window === "undefined") return;
      setTargetGridColumns(getTargetGridColumns(window.innerWidth));
      setDerivedCardsGridColumns(getDerivedCardsGridColumns(window.innerWidth));
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

    const nextDeck = sourceEntries.find((entry) => entry.id === nextDeckId)?.deck;
    if (!nextDeck) return;

    startTransition(() => {
      const nextDraft = createContentEditorDeckDraft(nextDeck);
      setSelectedDeckId(nextDeckId);
      setDraft(nextDraft);
      setSelectedTargetId("");
      setSelectedSyllableRowId("");
      setSaveStatus(idleSaveStatus);
    });
  };

  const resetDraft = () => {
    const baselineDeck = sourceDecksById[selectedDeckId];
    if (!baselineDeck) return;
    const nextDraft = createContentEditorDeckDraft(baselineDeck);
    setDraft(nextDraft);
    setSelectedTargetId("");
    setSelectedSyllableRowId("");
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
    let constraintMessage = "";

    setDraft((current) => {
      const nextRows = normalizeContentEditorPoolAdjustments(
        syncDeckPoolWithTargetMinimums(current.manualPoolAdjustments, current.targets).map((row) => {
          if (row.id !== rowId) return row;

          const nextRow = { ...row, ...patch, mode: "manual" as const };
          if (patch.count === undefined) {
            return nextRow;
          }

          const minimumRequired = requiredPoolCounts.get(normalizeEditorSyllable(nextRow.syllable)) ?? 0;
          const clampedCount = clampContentEditorSyllableCount(nextRow.count, nextRow.syllable, current.targets);

          if (clampedCount !== nextRow.count && minimumRequired > 0) {
            const blockingTargets = current.targets
              .filter(
                (target) =>
                  targetNameValidationById[target.id]?.matchesName &&
                  parseContentEditorTargetSyllables(target.syllablesText).includes(
                    normalizeEditorSyllable(nextRow.syllable),
                  ),
              )
              .map((target) => target.name);

            constraintMessage = `Nao da para baixar ${normalizeEditorSyllable(nextRow.syllable)} abaixo de ${minimumRequired} porque ${blockingTargets.join(", ")} usam essa silaba.`;
          }

          return {
            ...nextRow,
            count: clampedCount,
            mode: "manual" as const,
          };
        }),
        current.targets,
      );

      return {
        ...current,
        manualPoolAdjustments: nextRows,
      };
    });

    setSaveStatus(idleSaveStatus);
    setPoolConstraintMessage(constraintMessage);
  };

  const addDeck = () => {
    const nextEntry = createEmptyContentEditorDeckEntry(sourceEntries.map((entry) => entry.id));
    if (isDirty && typeof window !== "undefined") {
      const shouldContinue = window.confirm(
        `Descartar alteracoes locais de "${draft.name || selectedDeckId}" e abrir um novo deck?`,
      );
      if (!shouldContinue) return;
    }

    startTransition(() => {
      setSourceEntries((current) => [...current, cloneRawDeckCatalogEntry(nextEntry)]);
      setSelectedDeckId(nextEntry.id);
      setDraft(createContentEditorDeckDraft(nextEntry.deck));
      setSelectedTargetId("");
      setSelectedSyllableRowId("");
      setSaveStatus({
        tone: "idle",
        message: `Novo deck preparado em memoria. O save dev-only vai criar ${nextEntry.filePath} e atualizar o catalogo local.`,
      });
    });
  };

  const updateTarget = (
    targetId: string,
    patch: Partial<ContentEditorDeckDraft["targets"][number]>,
  ) => {
    updateDraft((current) => {
      const nextTargets = current.targets.map((target) => (target.id === targetId ? { ...target, ...patch } : target));
      return {
        ...current,
        targets: nextTargets,
        manualPoolAdjustments: normalizeContentEditorPoolAdjustments(current.manualPoolAdjustments, nextTargets),
      };
    });
  };

  const removeSyllableFromTarget = (targetId: string, index: number) => {
    const target = draft.targets.find((entry) => entry.id === targetId);
    if (!target) return;
    updateTarget(targetId, {
      syllablesText: removeContentEditorTargetSyllableAt(target.syllablesText, index),
    });
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
      const nextTargets = current.targets.filter((target) => target.id !== targetId);
      setSelectedTargetId("");
      return {
        ...current,
        targets: nextTargets,
        manualPoolAdjustments: normalizeContentEditorPoolAdjustments(current.manualPoolAdjustments, nextTargets),
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
  const savePreviewBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (localIssues.length > 0) blockers.push("Corrija os erros locais do draft para liberar o save.");
    if (!preview.ok) blockers.push("O pipeline real ainda esta com erro para este deck.");
    if (duplicateTargetId) blockers.push("Existe um conflito de id interno com outro target do catalogo.");
    return blockers;
  }, [duplicateTargetId, localIssues.length, preview.ok]);
  const canPreviewSaveArtifacts = savePreviewBlockers.length === 0;
  const reviewSummary = useMemo(
    () =>
      buildContentEditorReviewSummary(baselineDraft, draft, {
        pipelineOk: preview.ok,
        sourceReady: canPreviewSaveArtifacts,
        hasSourceChanges: saveSourceDiff.hasChanges,
        localIssueCount: localIssues.length,
        pipelineIssueCount: preview.ok ? 0 : pipelineIssues.length,
        blockerCount: savePreviewBlockers.length,
      }),
    [
      baselineDraft,
      canPreviewSaveArtifacts,
      draft,
      localIssues.length,
      pipelineIssues.length,
      preview.ok,
      savePreviewBlockers.length,
      saveSourceDiff.hasChanges,
    ],
  );
  const localizedLocalIssues = useMemo(() => localIssues.map(describeEditorIssue), [localIssues]);
  const localizedPipelineIssues = useMemo(
    () => (!preview.ok ? pipelineIssues.map(describeEditorIssue) : []),
    [pipelineIssues, preview.ok],
  );
  const duplicateTargetIssue = useMemo<LocalizedIssue | null>(() => {
    if (!duplicateTargetId || !selectedTargetDraft) return null;
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${selectedTargetDraft.id} · id interno`,
      message: "Esse id interno conflita com um target de outro deck do catalogo.",
    };
  }, [duplicateTargetId, selectedTargetDraft]);
  const selectedTargetCopiesHasIssue = useMemo(
    () =>
      Boolean(
        selectedTargetDraft &&
          [...localIssues, ...pipelineIssues].some(
            (issue) =>
              issue.includes(`Target "${selectedTargetDraft.id}" precisa ter copias`) ||
              issue.includes(`target "${selectedTargetDraft.id}" copies must be a positive integer`),
          ),
      ),
    [localIssues, pipelineIssues, selectedTargetDraft],
  );
  const selectedTargetSyllablesHasIssue = useMemo(
    () =>
      Boolean(
        selectedTargetDraft &&
          (!selectedTargetNameValidation.matchesName ||
            pipelineIssues.some(
              (issue) =>
                issue.includes(`target "${selectedTargetDraft.id}" needs`) ||
                issue.includes(`target "${selectedTargetDraft.id}" syllables`),
            )),
      ),
    [pipelineIssues, selectedTargetDraft, selectedTargetNameValidation.matchesName],
  );
  const selectedSyllableCountHasIssue = useMemo(
    () =>
      Boolean(
        selectedSyllableNormalized &&
          pipelineIssues.some((issue) =>
            issue.includes(`syllable "${selectedSyllableNormalized}" must have a positive integer count`),
          ),
      ),
    [pipelineIssues, selectedSyllableNormalized],
  );

  const canSave = import.meta.env.DEV && preview.ok && localIssues.length === 0 && !duplicateTargetId && !isSaving;

  const handleSave = async () => {
    if (!canSave || !selectedDeckEntry) return;

    const nextDeck = draftRawDeck;
    const nextEntry = createRawDeckCatalogEntry(nextDeck);
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
          entry: nextEntry,
          deck: nextDeck,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; path?: string; indexPath?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao salvar o deck bruto.");
      }

      setSourceEntries((current) => {
        const nextEntries = current.some((entry) => entry.id === nextEntry.id)
          ? current.map((entry) => (entry.id === nextEntry.id ? cloneRawDeckCatalogEntry(nextEntry) : cloneRawDeckCatalogEntry(entry)))
          : [...current.map((entry) => cloneRawDeckCatalogEntry(entry)), cloneRawDeckCatalogEntry(nextEntry)];
        return nextEntries;
      });
      setSaveStatus({
        tone: "success",
        message: `Source bruto salvo em ${payload.path ?? nextEntry.filePath} e catalogo bruto atualizado em ${payload.indexPath ?? "src/data/content/decks/index.ts"}.`,
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
            Edita um deck por vez no shape bruto atual. O builder minimo monta o pool via cards canonicos e recompila o deck model antes da projecao legado usada pela battle.
          </div>

          <div className="mt-3 rounded-2xl border border-emerald-700/12 bg-emerald-100/80 px-4 py-3 text-sm text-emerald-950/85 shadow-sm">
            Save dev-only grava <span className="font-black text-emerald-950">{selectedDeckEntry.filePath}</span> e reescreve o indice bruto de decks.
          </div>

          <Button
            variant="ghost"
            className="mt-4 w-full justify-center border border-amber-900/15 bg-amber-50/55 text-amber-950 hover:bg-amber-100/75"
            onClick={addDeck}
          >
            <Plus className="h-4 w-4" />
            Adicionar deck
          </Button>

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
                <div className="flex shrink-0 flex-col items-center gap-3">
                  <div className="flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/15 bg-black/15 text-5xl shadow-[0_12px_24px_rgba(0,0,0,0.2)]">
                    {draft.emoji || "?"}
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsDeckActiveExpanded((current) => !current)}
                    className="flex items-center gap-2 rounded-2xl border border-white/15 bg-black/15 px-3 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-50 transition hover:bg-black/25"
                  >
                    Editar
                    {isDeckActiveExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </button>
                </div>
                <div>
                  <div className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-100/60">
                    Deck sobre catalogo de cards
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
                  label="Cards no pool"
                  value={String(effectivePoolRows.length)}
                  icon={<Layers3 className="h-4 w-4" />}
                />
                <MetricCard
                  label="TargetIds derivados"
                  value={String(derivedTargetIdCount)}
                  icon={<Shield className="h-4 w-4" />}
                />
                <MetricCard
                  label="Copias no pool"
                  value={String(draftPoolCopies)}
                  icon={<BarChart3 className="h-4 w-4" />}
                />
              </div>
            </div>
          </div>

          <div className="space-y-6">
              {isDeckActiveExpanded ? (
                <Panel
                  title="Deck Ativo"
                  icon={<FilePenLine className="h-5 w-5" />}
                >
                  <div className="grid gap-4 xl:grid-cols-[11rem_13rem_minmax(0,1fr)_7rem] xl:items-end">
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

                    <Field label="Descricao" className="xl:col-span-4">
                      <textarea
                        value={draft.description}
                        onChange={(event) => updateDeckField("description", event.target.value)}
                        rows={2}
                        className="w-full resize-none rounded-2xl border border-amber-900/15 bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                      />
                    </Field>
                  </div>
                </Panel>
              ) : null}

              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2 xl:items-start">
                  <Panel
                    title="Targets do Deck"
                    icon={<BookOpenText className="h-5 w-5" />}
                    headerAction={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                          {draft.targets.length} alvo(s)
                        </Badge>
                        <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                          {totalTargetCopies} cartas
                        </Badge>
                      </div>
                    }
                  >
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {targetGridItems.map((item, index) => (
                      <React.Fragment key={item.id}>
                        {item.kind === "target" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedTargetId((current) => (current === item.target.id ? "" : item.target.id))
                            }
                            className="text-left"
                          >
                            <DraftTargetCard
                              target={item.target}
                              active={item.target.id === selectedTargetDraft?.id}
                              copies={getTargetCopiesDisplayValue(item.target.copies)}
                              nameValidation={targetNameValidationById[item.target.id]}
                            />
                          </button>
                        ) : (
                          <button type="button" onClick={addTarget} className="text-left">
                            <AddTargetCard />
                          </button>
                        )}

                        {selectedTargetDraft && index === expandedTargetRowEndIndex ? (
                          <div className="paper-panel col-span-2 rounded-[28px] border-2 border-amber-900/25 p-4 text-amber-950 shadow-[0_20px_40px_rgba(0,0,0,0.15)] xl:col-span-3">
                            <div className="mb-4 flex items-center gap-3">
                              <Badge className="border border-amber-900/15 bg-amber-900/5 text-amber-950">
                                id interno: {selectedTargetDraft.id}
                              </Badge>
                              {selectedTargetNameValidation.canValidate && !selectedTargetNameValidation.matchesName ? (
                                <Badge className="border border-rose-300/25 bg-rose-100/80 text-rose-950">
                                  nome nao fecha
                                </Badge>
                              ) : null}
                              <div className="ml-auto flex items-center gap-2">
                              <Button
                                variant="ghost"
                                className="h-10 min-w-[5.75rem] rounded-2xl border border-amber-900/15 bg-amber-50/50 px-3 text-amber-950 hover:bg-amber-100/70"
                                onClick={() => moveTarget(selectedTargetDraft.id, -1)}
                                disabled={draft.targets[0]?.id === selectedTargetDraft.id}
                              >
                                <ArrowUp className="h-4 w-4" />
                                Subir
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-10 min-w-[5.75rem] rounded-2xl border border-amber-900/15 bg-amber-50/50 px-3 text-amber-950 hover:bg-amber-100/70"
                                onClick={() => moveTarget(selectedTargetDraft.id, 1)}
                                disabled={draft.targets[draft.targets.length - 1]?.id === selectedTargetDraft.id}
                              >
                                <ArrowDown className="h-4 w-4" />
                                Descer
                              </Button>
                              <Button
                                variant="ghost"
                                className="h-10 min-w-[5.75rem] rounded-2xl border border-rose-300/25 bg-rose-500/10 px-3 text-rose-900 hover:bg-rose-500/15"
                                onClick={() => removeTarget(selectedTargetDraft.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                                Remover
                              </Button>
                              </div>
                            </div>

                            <div className="grid gap-4">
                              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_7rem]">
                                <Field label="Nome">
                                  <input
                                    value={selectedTargetDraft.name}
                                    onChange={(event) => updateTarget(selectedTargetDraft.id, { name: event.target.value })}
                                    className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                                  />
                                </Field>

                                <Field label="Copia">
                                  <input
                                    type="number"
                                    min={1}
                                    value={selectedTargetDraft.copies}
                                    onChange={(event) => updateTarget(selectedTargetDraft.id, { copies: event.target.value })}
                                    className={cn(
                                      "w-full rounded-2xl border px-3 py-3 text-sm text-amber-950 outline-none transition",
                                      selectedTargetCopiesHasIssue
                                        ? "border-rose-400/50 bg-rose-50/85 focus:border-rose-500/40"
                                        : "border-amber-900/15 bg-white/70 focus:border-amber-500/30",
                                    )}
                                  />
                                </Field>
                              </div>

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

                              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                <div className="space-y-4">
                                  <Field label="Silabas do target">
                                    <input
                                      value={selectedTargetDraft.syllablesText}
                                      onChange={(event) =>
                                        updateTarget(selectedTargetDraft.id, {
                                          syllablesText: event.target.value.toUpperCase(),
                                        })
                                      }
                                      placeholder="Ex.: BA, NA, NA"
                                      className={cn(
                                        "w-full rounded-2xl border px-4 py-3 text-sm text-amber-950 outline-none transition placeholder:text-amber-900/35",
                                        selectedTargetSyllablesHasIssue
                                          ? "border-rose-400/50 bg-rose-50/85 focus:border-rose-500/40"
                                          : "border-amber-900/15 bg-white/70 focus:border-amber-500/30",
                                      )}
                                    />
                                  </Field>
                                  <div className="text-xs text-amber-950/60">
                                    Digite livremente. Se o nome fechar, o pool minimo entra sozinho.
                                  </div>
                                  <div
                                    className={cn(
                                      "rounded-2xl border px-3 py-3 text-sm",
                                      selectedTargetNameValidation.canValidate && !selectedTargetNameValidation.matchesName
                                        ? "border-rose-300/25 bg-rose-50/80 text-rose-950"
                                        : "border-emerald-700/15 bg-emerald-100/80 text-emerald-950",
                                    )}
                                  >
                                    {selectedTargetNameValidation.canValidate ? (
                                      selectedTargetNameValidation.matchesName ? (
                                        <span>
                                          Nome valido: <span className="font-black">{selectedTargetNameValidation.normalizedName}</span>
                                        </span>
                                      ) : (
                                        <span>
                                          Nome <span className="font-black">{selectedTargetNameValidation.normalizedName || "?"}</span> nao bate com{" "}
                                          <span className="font-black">{selectedTargetNameValidation.normalizedSyllableWord || "?"}</span>.
                                        </span>
                                      )
                                    ) : (
                                      <span>Preencha nome e silabas para validar o alvo.</span>
                                    )}
                                  </div>

                                  <div className="rounded-2xl border border-amber-900/12 bg-white/65 p-4">
                                    <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                                      Sequencia atual do target
                                    </div>
                                    <div className="mt-3 flex flex-wrap gap-2">
                                      {selectedTargetSyllables.length > 0 ? (
                                        selectedTargetSyllables.map((syllable, index) => (
                                          <button
                                            key={`${selectedTargetDraft.id}-${syllable}-${index}`}
                                            type="button"
                                            onClick={() => removeSyllableFromTarget(selectedTargetDraft.id, index)}
                                            className="rounded-full border border-amber-900/12 bg-amber-50/75 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-amber-950 transition hover:bg-rose-100/85"
                                          >
                                            {syllable} · remover
                                          </button>
                                        ))
                                      ) : (
                                        <div className="text-sm text-amber-950/60">
                                          Digite as silabas do alvo.
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>

                              </div>
                            </div>
                          </div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                      targetIds derivados: {derivedTargetIdsLabel}
                    </Badge>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                      <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                        total de silabas: {targetMinimumCardCount}
                      </Badge>
                      {missingTargetCount > 0 ? (
                        <Badge className="border border-amber-900/12 bg-amber-100/85 text-amber-950">
                          {missingTargetCount} alvo(s) ainda pedem validacao
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  </Panel>

                  <Panel
                    title="Silabas do Deck"
                    icon={<Layers3 className="h-5 w-5" />}
                    headerAction={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                          {effectivePoolRows.length} silaba(s)
                        </Badge>
                        <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                          {draftPoolCopies} cartas
                        </Badge>
                      </div>
                    }
                  >
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                      {syllableGridItems.map((item, index) => (
                        <React.Fragment key={item.id}>
                          <DerivedSyllableCard
                            syllable={item.row.syllable || "?"}
                            copies={Math.max(0, Number(item.row.count) || 0)}
                            selected={item.row.id === selectedSyllableRowId}
                            onClick={() =>
                              setSelectedSyllableRowId((current) => (current === item.row.id ? "" : item.row.id))
                            }
                          />

                          {selectedSyllableRow && index === expandedSyllableRowEndIndex ? (
                            <div className="paper-panel col-span-2 rounded-[24px] border-2 border-amber-900/25 p-4 text-amber-950 shadow-[0_16px_30px_rgba(0,0,0,0.12)] sm:col-span-3 xl:col-span-4">
                              <div className="mb-4 flex flex-wrap items-center gap-3">
                                <Badge className="border border-amber-900/15 bg-amber-900/5 text-amber-950">
                                  id interno: {selectedSyllableCardId || "syllable.sem-id"}
                                </Badge>
                                {selectedSyllableRow?.mode === "auto" ? (
                                  <Badge className="border border-emerald-700/15 bg-emerald-100/85 text-emerald-950">
                                    gerada pelos alvos
                                  </Badge>
                                ) : null}
                              </div>

                                <div className="grid gap-4">
                                <div className="grid gap-3 md:grid-cols-2">
                                  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.88)] px-4 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">
                                      Targets usando
                                    </div>
                                    <div className="mt-2 flex items-end justify-between gap-3">
                                      <div className="font-serif text-2xl font-black text-amber-950">
                                        {selectedSyllableUsedByTargets.length}
                                      </div>
                                    </div>
                                  </div>

                                  <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.88)] px-4 py-3 shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">
                                      Copias
                                    </div>
                                    <input
                                      type="number"
                                      min={selectedSyllableMinimumCount}
                                      value={selectedSyllableRow.count}
                                      onChange={(event) => updateSyllableRow(selectedSyllableRow.id, { count: event.target.value })}
                                      className={cn(
                                        "mt-2 w-full rounded-xl border px-3 py-2.5 text-sm font-black text-amber-950 outline-none transition",
                                        selectedSyllableCountHasIssue
                                          ? "border-rose-400/50 bg-rose-50/85 focus:border-rose-500/40"
                                          : "border-amber-900/15 bg-white/80 focus:border-amber-500/30",
                                      )}
                                    />
                                  </div>
                                </div>

                                <div className="rounded-2xl border border-amber-900/12 bg-[rgba(255,252,244,0.88)] px-4 py-4 shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                                  <div className="flex items-center justify-between gap-3">
                                    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">
                                      Aparece em
                                    </div>
                                    <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-900/40">
                                      {selectedSyllableUsedByTargets.length} alvo(s)
                                    </div>
                                  </div>
                                  <div className="mt-3 flex flex-wrap gap-2">
                                    {selectedSyllableUsedByTargets.length > 0 ? (
                                      selectedSyllableUsedByTargets.map((target) => (
                                        <span
                                          key={`${selectedSyllableRow.id}-${target.id}`}
                                          className="rounded-full border border-amber-900/12 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-950 shadow-sm"
                                        >
                                          {target.name}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="rounded-full border border-amber-900/12 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-amber-900/45 shadow-sm">
                                        Nenhum target usa
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {poolConstraintMessage && selectedSyllableMinimumCount > 0 ? (
                                  <div className="rounded-2xl border border-rose-300/25 bg-rose-50/85 px-4 py-3 text-sm text-rose-950">
                                    {poolConstraintMessage}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          ) : null}
                        </React.Fragment>
                      ))}
                    </div>
                    <div className="mt-auto flex flex-wrap gap-3 pt-4">
                      <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                        {preview.ok ? "pool por cards: validado no pipeline" : "pool por cards: aguardando preview valido"}
                      </Badge>
                    </div>
                  </Panel>
                </div>

                <div className="space-y-6">
                  <Panel title="Preview do Pipeline" icon={<CheckCircle2 className="h-5 w-5" />}>
                    {preview.ok && selectedDeckDefinition && preview.selectedRuntimeDeck ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <InfoTile label="Deck final runtime" value={preview.selectedRuntimeDeck.name} tone="success" slim plainValue />
                          <InfoTile label="Targets finais" value={String(preview.selectedRuntimeDeck.targets.length)} tone="success" slim plainValue />
                          <InfoTile
                            label="Silabas totais runtime"
                            value={String(
                              Object.values(preview.selectedRuntimeDeck.syllables).reduce((sum, count) => sum + count, 0),
                            )}
                            tone="success"
                            mini
                            slim
                            plainValue
                          />
                          <InfoTile label="CardIds derivados" value={selectedDeckDefinition.cardIds.join(", ")} compact slim plainValue />
                          <InfoTile label="TargetIds derivados" value={selectedDeckDefinition.targetIds.join(", ")} compact slim plainValue />
                        </div>

                        <div className="rounded-2xl border border-sky-700/12 bg-sky-100/85 px-4 py-4 text-sm text-sky-950">
                          O runtime continua consumindo o mesmo shape final de <span className="font-black">Deck</span>,
                          agora derivado explicitamente do <span className="font-black">deck model</span> central via adapter legado.
                        </div>
                      </div>
                    ) : (
                      <EmptyCallout text="O preview do pipeline real aparece aqui assim que o draft voltar a ficar valido." />
                    )}
                  </Panel>
                  <Panel title="Validacao e Save" icon={<Save className="h-5 w-5" />}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <InfoTile label="Modo" value="deck-scoped sobre card catalog" slim plainValue />
                      <InfoTile label="Source bruto" value={selectedDeckEntry.filePath} slim plainValue />
                      <InfoTile
                        label="Pipeline"
                        value={preview.ok ? "valido" : "com erro"}
                        tone={preview.ok ? "success" : "warning"}
                        slim
                        plainValue
                      />
                      <InfoTile
                        label="Dirty"
                        value={isDirty ? "sim" : "nao"}
                        tone={isDirty ? "warning" : "success"}
                        slim
                        plainValue
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
                        localizedLocalIssues.map((issue) => (
                          <IssueRow key={`local-${issue.scope}-${issue.focus}-${issue.message}`} issue={issue} tone="warning" />
                        ))
                      ) : null}

                      {!preview.ok
                        ? localizedPipelineIssues.map((issue) => (
                            <IssueRow key={`pipeline-${issue.scope}-${issue.focus}-${issue.message}`} issue={issue} tone="warning" />
                          ))
                        : (
                            <div className="rounded-2xl border border-emerald-700/15 bg-emerald-100/85 px-4 py-4 text-sm text-emerald-950">
                              O draft recompila no pipeline real e continua gerando o Deck final do runtime via adapter atual.
                            </div>
                          )}

                      {duplicateTargetIssue ? <IssueRow issue={duplicateTargetIssue} tone="warning" /> : null}
                    </div>

                    <div className="mt-5 rounded-[24px] border border-amber-900/12 bg-[rgba(255,252,244,0.88)] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                            Review gate antes do save
                          </div>
                          <div className="mt-1 text-sm text-amber-950/70">
                            Resumo curto do que mudou neste deck antes de gravar o source bruto.
                          </div>
                        </div>
                        <Badge className="border border-amber-900/12 bg-white/80 text-amber-950">
                          {reviewSummary.hasMeaningfulChanges ? "com mudancas" : "sem mudancas"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                        {reviewSummary.categories.map((category) => (
                          <ReviewGateTile
                            key={category.id}
                            label={category.label}
                            headline={category.headline}
                            detail={category.detail}
                            tone={category.tone}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 space-y-4">
                      <div className="rounded-[24px] border border-amber-900/12 bg-[rgba(255,252,244,0.88)] p-4">
                        <button
                          type="button"
                          onClick={() => setIsSaveDiffExpanded((current) => !current)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                              Diff antes do save
                            </div>
                            <div className="mt-1 text-sm text-amber-950/70">
                              O que vai entrar no arquivo bruto quando o save estiver liberado.
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {canPreviewSaveArtifacts ? (
                              <Badge className="border border-amber-900/12 bg-white/80 text-amber-950">
                                {saveSourceDiff.hasChanges
                                  ? `+${saveSourceDiff.addedCount} / -${saveSourceDiff.removedCount}`
                                  : "sem mudancas"}
                              </Badge>
                            ) : null}
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-900/12 bg-amber-100/55 text-amber-950">
                              {isSaveDiffExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </div>
                          </div>
                        </button>

                        {isSaveDiffExpanded ? (
                          canPreviewSaveArtifacts ? (
                            saveSourceDiff.hasChanges ? (
                              <pre className="mt-4 max-h-64 overflow-auto rounded-2xl border border-amber-900/10 bg-[#2b2119] p-4 font-mono text-[11px] leading-6 text-amber-50 shadow-inner">
                                {saveSourceDiff.lines.map((line, index) => (
                                  <div
                                    key={`${line.type}-${index}-${line.value}`}
                                    className={cn(
                                      "whitespace-pre-wrap rounded px-2",
                                      line.type === "added" && "bg-emerald-500/20 text-emerald-100",
                                      line.type === "removed" && "bg-rose-500/20 text-rose-100",
                                      line.type === "context" && "text-amber-50/85",
                                    )}
                                  >
                                    <span className="mr-2 inline-block w-4 text-center">
                                      {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
                                    </span>
                                    {line.value}
                                  </div>
                                ))}
                              </pre>
                            ) : (
                              <div className="mt-4">
                                <EmptyCallout text="Nao ha mudancas no source bruto em relacao ao que ja esta salvo." />
                              </div>
                            )
                          ) : (
                            <div className="mt-4 space-y-2">
                              {savePreviewBlockers.map((blocker) => (
                                <IssueRow
                                  key={`preview-blocker-${blocker}`}
                                  issue={{ scope: "Preview de save", message: blocker }}
                                  tone="info"
                                />
                              ))}
                            </div>
                          )
                        ) : null}
                      </div>

                      <div className="rounded-[24px] border border-amber-900/12 bg-[rgba(255,252,244,0.88)] p-4">
                        <button
                          type="button"
                          onClick={() => setIsGeneratedSourceExpanded((current) => !current)}
                          className="flex w-full items-center justify-between gap-3 text-left"
                        >
                          <div>
                            <div className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45">
                              Source gerado para save
                            </div>
                            <div className="mt-1 text-sm text-amber-950/70">
                              Preview do arquivo TypeScript que sera gravado no deck selecionado.
                            </div>
                          </div>
                          <div className="flex h-8 w-8 items-center justify-center rounded-xl border border-amber-900/12 bg-amber-100/55 text-amber-950">
                            {isGeneratedSourceExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </div>
                        </button>

                        {isGeneratedSourceExpanded ? (
                          canPreviewSaveArtifacts ? (
                            <pre className="mt-4 max-h-80 overflow-auto rounded-2xl border border-amber-900/10 bg-[#201710] p-4 font-mono text-[11px] leading-6 text-amber-50 shadow-inner">
                              {nextSaveSource}
                            </pre>
                          ) : (
                            <div className="mt-4">
                              <EmptyCallout text="O source gerado para save aparece aqui assim que o draft voltar a ficar valido para gravacao." />
                            </div>
                          )
                        ) : null}
                      </div>
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
  copies: number;
  nameValidation?: ReturnType<typeof buildContentEditorTargetNameValidation>;
}> = ({ target, active, copies, nameValidation }) => {
  const normalizedRarity = normalizeRarity(target.rarity);
  const damage = RARITY_DAMAGE[normalizedRarity];
  const syllables = parseContentEditorTargetSyllables(target.syllablesText);
  const hasNameIssue = Boolean(nameValidation?.canValidate && !nameValidation.matchesName);

  return (
    <div className="relative flex w-full items-start justify-center pb-10 text-center">
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
          {hasNameIssue ? (
            <div className="mt-2 flex justify-center">
              <span className="rounded-full border border-rose-300/25 bg-rose-100/85 px-2 py-0.5 text-[9px] font-black tracking-[0.14em] text-rose-950 shadow-sm">
                NOME INVALIDO
              </span>
            </div>
          ) : null}
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

      <span className="absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm">
        x{copies}
      </span>
    </div>
  );
};

const AddTargetCard: React.FC = () => (
  <div className="relative flex w-full items-start justify-center pb-10 text-center">
    <div className="relative flex aspect-[126/176] w-full flex-col items-center justify-center overflow-hidden rounded-[1.1rem] border border-dashed border-amber-900/18 bg-amber-50/45 p-3 text-amber-950 shadow-[0_14px_26px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:bg-amber-100/70 hover:shadow-[0_20px_34px_rgba(0,0,0,0.14)]">
      <Plus className="h-10 w-10" />
      <div className="mt-3 px-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-amber-950">
        Adicionar target
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
    </div>
  </div>
);

const DerivedSyllableCard: React.FC<{
  syllable: string;
  copies: number;
  selected: boolean;
  onClick?: () => void;
  interactive?: boolean;
}> = ({ syllable, copies, selected, onClick, interactive = true }) => {
  return (
    <div className="relative flex min-h-[168px] w-full items-start justify-center pb-3 text-center">
      <div className={cn("origin-top scale-[0.84]", !interactive && "pointer-events-none")}>
          <SyllableCard
            syllable={syllable}
            selected={selected}
            playable={false}
            disabled={false}
            staticDisplay
            sizePreset="hand-desktop"
            onClick={interactive ? () => onClick?.() : () => {}}
          />
      </div>
      <span className="absolute bottom-[9px] left-1/2 -translate-x-1/2 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm">
        x{copies}
      </span>
    </div>
  );
};

const Panel: React.FC<{
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}> = ({ title, icon, children, className, headerAction }) => (
  <section className={cn("paper-panel flex flex-col rounded-[28px] border-2 border-[#8d6e63]/30 p-5 shadow-[0_18px_34px_rgba(0,0,0,0.12)]", className)}>
    <div className="mb-4 flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-amber-900/12 bg-amber-100/55 text-amber-950">
        {icon}
      </div>
      <h3 className="font-serif text-2xl font-black tracking-tight text-amber-950">{title}</h3>
      {headerAction ? <div className="ml-auto">{headerAction}</div> : null}
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
  slim?: boolean;
  plainValue?: boolean;
}> = ({ label, value, tone = "default", compact = false, mini = false, slim = false, plainValue = false }) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-4",
      mini && "px-3 py-3",
      slim && "px-3.5 py-3",
      tone === "success"
        ? "border-emerald-700/15 bg-emerald-100/85"
        : tone === "warning"
          ? "border-amber-700/15 bg-amber-100/85"
          : "border-amber-900/12 bg-[rgba(255,252,244,0.88)]",
    )}
  >
    <div className={cn("text-[11px] font-black uppercase tracking-[0.22em] text-amber-900/45", slim && "text-[10px] tracking-[0.18em]")}>{label}</div>
    <div
      className={cn(
        "mt-2 font-black text-amber-950",
        plainValue ? "font-sans" : "font-serif",
        compact
          ? cn("text-sm break-all leading-snug", slim && "text-[12px]")
          : mini
            ? cn("text-xl", slim && "text-lg")
            : cn("text-2xl", slim && "text-lg"),
      )}
    >
      {value}
    </div>
  </div>
);

const ReviewGateTile: React.FC<{
  label: string;
  headline: string;
  detail: string;
  tone: "default" | "success" | "warning";
}> = ({ label, headline, detail, tone }) => (
  <div
    className={cn(
      "rounded-2xl border px-4 py-4",
      tone === "success"
        ? "border-emerald-700/15 bg-emerald-100/85 text-emerald-950"
        : tone === "warning"
          ? "border-amber-900/15 bg-amber-100/80 text-amber-950"
          : "border-amber-900/12 bg-white/80 text-amber-950",
    )}
  >
    <div className="text-[10px] font-black uppercase tracking-[0.18em] text-current/55">{label}</div>
    <div className="mt-2 font-serif text-lg font-black text-current">{headline}</div>
    <div className="mt-2 text-sm leading-relaxed text-current/75">{detail}</div>
  </div>
);

const IssueRow: React.FC<{
  issue: LocalizedIssue;
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
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-black uppercase tracking-[0.16em] text-current/70">{issue.scope}</span>
          {issue.focus ? (
            <span className="rounded-full border border-current/15 bg-white/50 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.1em] text-current/80">
              {issue.focus}
            </span>
          ) : null}
        </div>
        <div className="mt-2 leading-relaxed">{issue.message}</div>
        {issue.raw && issue.raw !== issue.message ? (
          <div className="mt-2 text-[11px] text-current/60">{issue.raw}</div>
        ) : null}
      </div>
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

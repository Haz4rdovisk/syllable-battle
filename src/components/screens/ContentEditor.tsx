import React, { startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
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
  createContentEditorTargetDraftFromRawTarget,
  createContentEditorDeckDraft,
  createDeckIdCandidate,
  createDuplicatedContentEditorDeckEntry,
  createEmptyContentEditorTarget,
  createRawDeckCatalogEntry,
  createRawDeckDefinitionSource,
  createRawTargetCatalogSource,
  getContentEditorLocalIssues,
  hydrateRawDeckDefinitionFromDraft,
  hydrateRawTargetCatalogFromDraftTargets,
  normalizeContentEditorPoolAdjustments,
  parseContentEditorTargetSyllables,
  RAW_TARGET_CATALOG_FILE_PATH,
  removeContentEditorTargetSyllableAt,
  removeRawDeckFromCatalog,
  upsertRawDeckInCatalog,
  cloneRawTargetDefinition,
} from "../../data/content/editor";
import { DECK_VISUAL_THEME_CLASSES } from "../../data/content/themes";
import { DeckVisualThemeId } from "../../data/content/types";
import { RawDeckCatalogEntry, rawDeckCatalogEntries } from "../../data/content/decks";
import { rawTargetCatalog } from "../../data/content/targets";
import { RARITY_DAMAGE, normalizeRarity } from "../../types/game";

type SaveStatus = {
  tone: "idle" | "success" | "error";
  message: string;
};

const themeIds = Object.keys(DECK_VISUAL_THEME_CLASSES) as DeckVisualThemeId[];

const createSourceEntriesState = () => rawDeckCatalogEntries.map((entry) => cloneRawDeckCatalogEntry(entry));
const createSourceTargetsState = () => rawTargetCatalog.map((target) => cloneRawTargetDefinition(target));
const createCatalogDraftTargetsState = (targets: typeof rawTargetCatalog) =>
  targets.map((target) => createContentEditorTargetDraftFromRawTarget(target, target.id, 1));
const createDeckCompositionTargetFromCatalog = (target: ContentEditorTargetDraft, copies = "1"): ContentEditorTargetDraft => ({
  ...target,
  copies,
});
const syncDeckCompositionTargetsFromCatalog = (
  deckTargets: ContentEditorTargetDraft[],
  catalogTargets: ContentEditorTargetDraft[],
) =>
  deckTargets.map((target) => {
    const catalogTarget = catalogTargets.find((entry) => entry.id === target.id);
    return catalogTarget ? createDeckCompositionTargetFromCatalog(catalogTarget, target.copies) : target;
  });

const createDraftForDeck = (entries: RawDeckCatalogEntry[], targets: typeof rawTargetCatalog, deckId: string) =>
  createContentEditorDeckDraft(
    entries.find((entry) => entry.id === deckId)?.deck ?? cloneRawDeckDefinition(entries[0]?.deck ?? rawDeckCatalogEntries[0].deck),
    targets,
  );

const idleSaveStatus: SaveStatus = {
  tone: "idle",
  message:
    "Edicao local em memoria ate salvar no source bruto do deck selecionado. Os alvos salvam no catalogo global bruto compartilhado, o pool segue derivado e o deck recompila no pipeline real antes da projecao legado usada pela battle.",
};

const DEFAULT_DECK_CLASS_LABEL = "Animais";

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

const getCatalogTargetGridColumns = (width: number) => {
  if (width >= 1280) return 6;
  if (width >= 768) return 3;
  return 2;
};

const findNearestScrollContainer = (element: HTMLElement | null) => {
  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);

    if ((style.overflowY === "auto" || style.overflowY === "scroll") && current.scrollHeight > current.clientHeight) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
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
      focus: `Alvo ${localTargetCopiesMatch[1]} Â· Copia`,
      message: "Use um inteiro positivo maior que zero para definir quantas copias desse alvo entram no deck.",
      raw: issue,
    };
  }

  const localTargetSyllablesMatch = issue.match(/^Target "([^"]+)" precisa ter pelo menos uma silaba informada\.$/);
  if (localTargetSyllablesMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${localTargetSyllablesMatch[1]} Â· Silabas`,
      message: "Digite pelo menos uma silaba para esse alvo poder gerar o pool minimo.",
      raw: issue,
    };
  }

  const localTargetNameMatch = issue.match(/^Target "([^"]+)" precisa formar o nome "([^"]+)" com as silabas informadas\.$/);
  if (localTargetNameMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${localTargetNameMatch[1]} Â· Nome x silabas`,
      message: `As silabas digitadas ainda nao formam corretamente o nome ${localTargetNameMatch[2]}.`,
      raw: issue,
    };
  }

  const localTargetSegmentationMatch = issue.match(/^Target "([^"]+)" precisa separar as silabas corretamente\.$/);
  if (localTargetSegmentationMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${localTargetSegmentationMatch[1]} Â· Nome x silabas`,
      message: "Separe as silabas. Nao use a palavra inteira.",
      raw: issue,
    };
  }

  const localDuplicateSyllableMatch = issue.match(/^Deck "([^"]+)" repete a silaba "([^"]+)" nas linhas (\d+) do editor\.$/);
  if (localDuplicateSyllableMatch) {
    return {
      scope: "Cards do Deck",
      focus: `Silaba ${localDuplicateSyllableMatch[2]} Â· Linha ${localDuplicateSyllableMatch[3]}`,
      message: "A mesma silaba apareceu mais de uma vez no deck. Cada linha deve representar uma silaba unica.",
      raw: issue,
    };
  }

  const pipelineTargetCopiesMatch = issue.match(/^deck "([^"]+)" target "([^"]+)" copies must be a positive integer\.$/i);
  if (pipelineTargetCopiesMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${pipelineTargetCopiesMatch[2]} Â· Copia`,
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
      focus: `Alvo ${pipelineTargetNeedsMatch[2]} Â· Silabas`,
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
      focus: `Alvo ${targetSyllablesMissingMatch[2]} Â· Silabas`,
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
      focus: `Alvo ${targetSyllableEntryMatch[2]} Â· Silabas`,
      message: `Existe uma entrada vazia ou invalida na lista de silabas desse alvo (item ${Number(targetSyllableEntryMatch[3]) + 1}).`,
      raw: issue,
    };
  }

  const duplicateDeckTargetIdMatch = issue.match(/^deck "([^"]+)" has duplicate target id "([^"]+)"\.$/i);
  if (duplicateDeckTargetIdMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${duplicateDeckTargetIdMatch[2]} Â· id interno`,
      message: "Esse id interno ficou duplicado dentro do deck atual.",
      raw: issue,
    };
  }

  const duplicateTargetIdMatch = issue.match(/^Duplicate target id "([^"]+)"\.$/i);
  if (duplicateTargetIdMatch) {
    return {
      scope: "Targets do Deck",
      focus: `Alvo ${duplicateTargetIdMatch[1]} Â· id interno`,
      message: "Esse id interno conflita com outro target ja registrado no catalogo.",
      raw: issue,
    };
  }

  const deckSyllableCountMatch = issue.match(/^deck "([^"]+)" syllable "([^"]+)" must have a positive integer count\.$/i);
  if (deckSyllableCountMatch) {
    return {
      scope: "Cards do Deck",
      focus: `Silaba ${deckSyllableCountMatch[2]} Â· Copias`,
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
  const initialSourceTargets = useMemo(createSourceTargetsState, []);
  const initialCatalogDraftTargets = useMemo(() => createCatalogDraftTargetsState(initialSourceTargets), [initialSourceTargets]);
  const [sourceEntries, setSourceEntries] = useState(initialSourceEntries);
  const [sourceTargets, setSourceTargets] = useState(initialSourceTargets);
  const [catalogDraftTargets, setCatalogDraftTargets] = useState(initialCatalogDraftTargets);
  const [persistedDeckIds, setPersistedDeckIds] = useState(() => new Set(initialSourceEntries.map((entry) => entry.id)));
  const [selectedDeckId, setSelectedDeckId] = useState(() => initialSourceEntries[0]?.id ?? "");
  const [draft, setDraft] = useState<ContentEditorDeckDraft>(() =>
    createDraftForDeck(initialSourceEntries, initialSourceTargets, initialSourceEntries[0]?.id ?? ""),
  );
  const [selectedTargetId, setSelectedTargetId] = useState("");
  const [selectedCatalogTargetId, setSelectedCatalogTargetId] = useState("");
  const [selectedSyllableRowId, setSelectedSyllableRowId] = useState("");
  const [targetGridColumns, setTargetGridColumns] = useState(() =>
    typeof window !== "undefined" ? getTargetGridColumns(window.innerWidth) : 2,
  );
  const [catalogTargetGridColumns, setCatalogTargetGridColumns] = useState(() =>
    typeof window !== "undefined" ? getCatalogTargetGridColumns(window.innerWidth) : 2,
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
  const contentTopRef = useRef<HTMLDivElement | null>(null);
  const previousSelectedDeckIdRef = useRef(selectedDeckId);
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
  const selectedDeckIsPersisted = useMemo(() => persistedDeckIds.has(selectedDeckId), [persistedDeckIds, selectedDeckId]);
  const persistedDeck = selectedDeckEntry?.deck ?? null;
  const baselineDraft = useMemo(
    () => (persistedDeck ? createContentEditorDeckDraft(persistedDeck, sourceTargets) : draft),
    [draft, persistedDeck, sourceTargets],
  );
  const baselineCatalogDraftTargets = useMemo(() => createCatalogDraftTargetsState(sourceTargets), [sourceTargets]);
  const draftRawDeck = useMemo(() => hydrateRawDeckDefinitionFromDraft(draft), [draft]);
  const draftDeckIdCandidate = useMemo(() => createDeckIdCandidate(draft.name, draft.id), [draft.id, draft.name]);
  const deckNameConflictEntry = useMemo(
    () =>
      draft.name.trim().length === 0
        ? null
        : sourceEntries.find((entry) => entry.id === draftDeckIdCandidate && entry.id !== selectedDeckId) ?? null,
    [draft.name, draftDeckIdCandidate, selectedDeckId, sourceEntries],
  );
  const draftSaveDeck = useMemo(
    () => ({
      ...draftRawDeck,
      id: draftDeckIdCandidate,
    }),
    [draftDeckIdCandidate, draftRawDeck],
  );
  const draftSaveEntry = useMemo(() => createRawDeckCatalogEntry(draftSaveDeck), [draftSaveDeck]);
  const nextSourceTargets = useMemo(
    () => hydrateRawTargetCatalogFromDraftTargets(sourceTargets, catalogDraftTargets),
    [catalogDraftTargets, sourceTargets],
  );
  const isDirty = useMemo(
    () =>
      JSON.stringify(draft) !== JSON.stringify(baselineDraft) ||
      JSON.stringify(catalogDraftTargets) !== JSON.stringify(baselineCatalogDraftTargets),
    [baselineCatalogDraftTargets, baselineDraft, catalogDraftTargets, draft],
  );

  const localIssues = useMemo(() => getContentEditorLocalIssues(draft), [draft]);
  const preview = useMemo(
    () => buildContentEditorPreview(sourceEntries, sourceTargets, selectedDeckId, draft, catalogDraftTargets),
    [catalogDraftTargets, draft, selectedDeckId, sourceEntries, sourceTargets],
  );

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
  const selectedCatalogTargetDraft = useMemo(
    () => catalogDraftTargets.find((target) => target.id === selectedCatalogTargetId) ?? null,
    [catalogDraftTargets, selectedCatalogTargetId],
  );
  const selectedCatalogTargetSyllables = useMemo(
    () => (selectedCatalogTargetDraft ? parseContentEditorTargetSyllables(selectedCatalogTargetDraft.syllablesText) : []),
    [selectedCatalogTargetDraft],
  );
  const selectedCatalogTargetNameValidation = useMemo(
    () =>
      buildContentEditorTargetNameValidation(
        selectedCatalogTargetDraft?.name ?? "",
        selectedCatalogTargetDraft?.syllablesText ?? "",
      ),
    [selectedCatalogTargetDraft],
  );
  const targetNameValidationById = useMemo(
    () =>
      draft.targets.reduce<Record<string, ReturnType<typeof buildContentEditorTargetNameValidation>>>((acc, target) => {
        acc[target.id] = buildContentEditorTargetNameValidation(target.name, target.syllablesText);
        return acc;
      }, {}),
    [draft.targets],
  );
  const catalogTargetNameValidationById = useMemo(
    () =>
      catalogDraftTargets.reduce<Record<string, ReturnType<typeof buildContentEditorTargetNameValidation>>>((acc, target) => {
        acc[target.id] = buildContentEditorTargetNameValidation(target.name, target.syllablesText);
        return acc;
      }, {}),
    [catalogDraftTargets],
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
  const catalogTargetUsageById = useMemo(() => {
    const usage = new Map<string, string[]>();

    sourceEntries.forEach((entry) => {
      const targetIds =
        entry.id === selectedDeckId
          ? draft.targets.flatMap((target) =>
              Array.from({ length: Math.max(0, Number(target.copies) || 0) }, () => target.id),
            )
          : entry.deck.targetIds;

      [...new Set(targetIds)].forEach((targetId) => {
        const nextDeckNames = usage.get(targetId) ?? [];
        nextDeckNames.push(entry.deck.name);
        usage.set(targetId, nextDeckNames);
      });
    });

    return usage;
  }, [draft.targets, selectedDeckId, sourceEntries]);
  const selectedCatalogTargetUsageDeckNames = useMemo(
    () => (selectedCatalogTargetDraft ? catalogTargetUsageById.get(selectedCatalogTargetDraft.id) ?? [] : []),
    [catalogTargetUsageById, selectedCatalogTargetDraft],
  );
  const selectedCatalogTargetIsInDeck = useMemo(
    () => (selectedCatalogTargetDraft ? draft.targets.some((target) => target.id === selectedCatalogTargetDraft.id) : false),
    [draft.targets, selectedCatalogTargetDraft],
  );
  const persistedSource = useMemo(
    () =>
      selectedDeckEntry && persistedDeck
        ? createRawDeckDefinitionSource(selectedDeckEntry.exportName, persistedDeck)
        : "",
    [persistedDeck, selectedDeckEntry],
  );
  const nextSaveSource = useMemo(
    () => (selectedDeckEntry ? createRawDeckDefinitionSource(draftSaveEntry.exportName, draftSaveDeck) : ""),
    [draftSaveDeck, draftSaveEntry, selectedDeckEntry],
  );
  const saveSourceDiff = useMemo(
    () => buildContentEditorSourceDiff(persistedSource, nextSaveSource),
    [nextSaveSource, persistedSource],
  );
  const persistedTargetSource = useMemo(() => createRawTargetCatalogSource(sourceTargets), [sourceTargets]);
  const nextTargetSource = useMemo(() => createRawTargetCatalogSource(nextSourceTargets), [nextSourceTargets]);
  const targetSourceDiff = useMemo(
    () => buildContentEditorSourceDiff(persistedTargetSource, nextTargetSource),
    [nextTargetSource, persistedTargetSource],
  );
  const hasSaveSourceChanges = saveSourceDiff.hasChanges || targetSourceDiff.hasChanges;
  const targetGridItems = useMemo(
    () => draft.targets.map((target) => ({ kind: "target" as const, id: target.id, target })),
    [draft.targets],
  );
  const catalogTargetGridItems = useMemo(
    () => [
      { kind: "add" as const, id: "__add-catalog-target__" },
      ...catalogDraftTargets.map((target) => ({ kind: "target" as const, id: target.id, target })),
    ],
    [catalogDraftTargets],
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
  const expandedCatalogTargetRowEndIndex = useMemo(() => {
    if (!selectedCatalogTargetId) return -1;
    const selectedIndex = catalogTargetGridItems.findIndex(
      (item) => item.kind === "target" && item.id === selectedCatalogTargetId,
    );
    if (selectedIndex < 0) return -1;

    const rowStartIndex = Math.floor(selectedIndex / catalogTargetGridColumns) * catalogTargetGridColumns;
    return Math.min(catalogTargetGridItems.length - 1, rowStartIndex + catalogTargetGridColumns - 1);
  }, [catalogTargetGridColumns, catalogTargetGridItems, selectedCatalogTargetId]);
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
    if (selectedCatalogTargetId && !catalogDraftTargets.some((target) => target.id === selectedCatalogTargetId)) {
      setSelectedCatalogTargetId("");
    }
  }, [catalogDraftTargets, selectedCatalogTargetId]);

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
      setCatalogTargetGridColumns(getCatalogTargetGridColumns(window.innerWidth));
      setDerivedCardsGridColumns(getDerivedCardsGridColumns(window.innerWidth));
    };

    syncColumns();
    if (typeof window === "undefined") return;
    window.addEventListener("resize", syncColumns);
    return () => window.removeEventListener("resize", syncColumns);
  }, []);

  useEffect(() => {
    const previousDeckId = previousSelectedDeckIdRef.current;
    previousSelectedDeckIdRef.current = selectedDeckId;

    if (!previousDeckId || previousDeckId === selectedDeckId || typeof window === "undefined") return;

    let innerFrameId = 0;
    const frameId = window.requestAnimationFrame(() => {
      innerFrameId = window.requestAnimationFrame(() => {
        const scrollContainer = findNearestScrollContainer(contentTopRef.current);

        if (scrollContainer) {
          scrollContainer.scrollTo({ top: 0, behavior: "auto" });
          return;
        }

        contentTopRef.current?.scrollIntoView({ block: "start", behavior: "auto" });
      });
    });

    return () => {
      window.cancelAnimationFrame(frameId);
      window.cancelAnimationFrame(innerFrameId);
    };
  }, [selectedDeckId]);

  useEffect(() => {
    if (!selectedTargetId || typeof window === "undefined") return;

    const frameId = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-editor-niche="target"]')
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedTargetRowEndIndex, selectedTargetId]);

  useEffect(() => {
    if (!selectedSyllableRowId || typeof window === "undefined") return;

    const frameId = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-editor-niche="syllable"]')
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedSyllableRowEndIndex, selectedSyllableRowId]);

  useEffect(() => {
    if (!selectedCatalogTargetId || typeof window === "undefined") return;

    const frameId = window.requestAnimationFrame(() => {
      document
        .querySelector<HTMLElement>('[data-editor-niche="catalog-target"]')
        ?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [expandedCatalogTargetRowEndIndex, selectedCatalogTargetId]);

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
      const nextDraft = createContentEditorDeckDraft(nextDeck, sourceTargets);
      setSelectedDeckId(nextDeckId);
      setDraft(nextDraft);
      setSelectedTargetId("");
      setSelectedCatalogTargetId("");
      setCatalogDraftTargets(createCatalogDraftTargetsState(sourceTargets));
      setSelectedSyllableRowId("");
      setSaveStatus(idleSaveStatus);
    });
  };

  const resetDraft = () => {
    const baselineDeck = sourceDecksById[selectedDeckId];
    if (!baselineDeck) return;
    const nextDraft = createContentEditorDeckDraft(baselineDeck, sourceTargets);
    setDraft(nextDraft);
    setSelectedTargetId("");
    setSelectedCatalogTargetId("");
    setCatalogDraftTargets(createCatalogDraftTargetsState(sourceTargets));
    setSelectedSyllableRowId("");
    setSaveStatus(idleSaveStatus);
  };

  const updateDraft = (updater: (current: ContentEditorDeckDraft) => ContentEditorDeckDraft) => {
    setDraft((current) => updater(current));
    setSaveStatus(idleSaveStatus);
  };

  const updateCatalogTarget = (
    targetId: string,
    patch: Partial<ContentEditorDeckDraft["targets"][number]>,
  ) => {
    setCatalogDraftTargets((currentCatalogTargets) => {
      const nextCatalogTargets = currentCatalogTargets.map((target) =>
        target.id === targetId ? { ...target, ...patch } : target,
      );

      setDraft((currentDraft) => {
        const nextDeckTargets = syncDeckCompositionTargetsFromCatalog(currentDraft.targets, nextCatalogTargets);
        return {
          ...currentDraft,
          targets: nextDeckTargets,
          manualPoolAdjustments: normalizeContentEditorPoolAdjustments(
            currentDraft.manualPoolAdjustments,
            nextDeckTargets,
          ),
        };
      });

      return nextCatalogTargets;
    });
    setSaveStatus(idleSaveStatus);
  };

  const getFallbackDeckId = (entries: RawDeckCatalogEntry[], removedDeckId: string) => {
    if (entries.length === 0) return "";
    const removedIndex = sourceEntries.findIndex((entry) => entry.id === removedDeckId);
    if (removedIndex < 0) return entries[0]?.id ?? "";
    return entries[Math.min(removedIndex, entries.length - 1)]?.id ?? entries[0]?.id ?? "";
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
      const currentRows = syncDeckPoolWithTargetMinimums(current.manualPoolAdjustments, current.targets);
      const currentRow = currentRows.find((row) => row.id === rowId);
      if (!currentRow) return current;

      const currentSyllable = normalizeEditorSyllable(currentRow.syllable);
      const nextSyllable = normalizeEditorSyllable(patch.syllable ?? currentRow.syllable);
      const minimumRequired = buildMinimumDeckPoolFromTargets(current.targets).get(nextSyllable) ?? 0;
      const requestedCount = patch.count ?? currentRow.count;
      const clampedCount =
        patch.count === undefined ? requestedCount : clampContentEditorSyllableCount(requestedCount, nextSyllable, current.targets);

      if (patch.count !== undefined && clampedCount !== requestedCount && minimumRequired > 0) {
        const blockingTargets = current.targets
          .filter(
            (target) =>
              targetNameValidationById[target.id]?.matchesName &&
              parseContentEditorTargetSyllables(target.syllablesText).includes(nextSyllable),
          )
          .map((target) => target.name);

        constraintMessage = `Nao da para baixar ${nextSyllable} abaixo de ${minimumRequired} porque ${blockingTargets.join(", ")} usam essa silaba.`;
      }

      const nextExtraCount = Math.max(0, Number(clampedCount) - minimumRequired);
      const nextRows = normalizeContentEditorPoolAdjustments(
        [
          ...current.manualPoolAdjustments.filter((adjustment) => {
            const normalizedAdjustmentSyllable = normalizeEditorSyllable(adjustment.syllable);
            return adjustment.id !== rowId && normalizedAdjustmentSyllable !== currentSyllable && normalizedAdjustmentSyllable !== nextSyllable;
          }),
          ...(nextExtraCount > 0
            ? [
                {
                  id: rowId,
                  syllable: nextSyllable,
                  count: String(nextExtraCount),
                  mode: "manual" as const,
                },
              ]
            : []),
        ],
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
      setDraft(createContentEditorDeckDraft(nextEntry.deck, sourceTargets));
      setSelectedTargetId("");
      setSelectedCatalogTargetId("");
      setCatalogDraftTargets(createCatalogDraftTargetsState(sourceTargets));
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

  const handleDuplicateDeck = async () => {
    if (!selectedDeckEntry || !canSave) return;

    const nextEntry = createDuplicatedContentEditorDeckEntry(
      draft,
      sourceEntries.map((entry) => entry.id),
    );

    setIsSaving(true);
    setSaveStatus({
      tone: "idle",
      message: `Duplicando ${selectedDeckEntry.id} em ${nextEntry.filePath}...`,
    });

    try {
      const response = await fetch("/__content-editor/deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          entry: nextEntry,
          deck: nextEntry.deck,
          targetCatalog: nextSourceTargets,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; path?: string; indexPath?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao duplicar o deck.");
      }

      setSourceEntries((current) => upsertRawDeckInCatalog(current, nextEntry));
      setSourceTargets(nextSourceTargets);
      setCatalogDraftTargets(createCatalogDraftTargetsState(nextSourceTargets));
      setPersistedDeckIds((current) => new Set([...current, nextEntry.id]));
      setSelectedDeckId(nextEntry.id);
      setDraft(createContentEditorDeckDraft(nextEntry.deck, nextSourceTargets));
      setSelectedTargetId("");
      setSelectedCatalogTargetId("");
      setSelectedSyllableRowId("");
      setSaveStatus({
        tone: "success",
        message: `Deck duplicado em ${payload.path ?? nextEntry.filePath}, indice reescrito e catalogo global mantido em ${RAW_TARGET_CATALOG_FILE_PATH}.`,
      });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Falha ao duplicar o deck.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDeck = async () => {
    if (!selectedDeckEntry || sourceEntries.length <= 1 || typeof window === "undefined") return;

    const confirmed = window.confirm(`Excluir o deck "${selectedDeckEntry.deck.name}" (${selectedDeckEntry.id})?`);
    if (!confirmed) return;

    const nextEntries = removeRawDeckFromCatalog(sourceEntries, selectedDeckId);
    const nextDeckId = getFallbackDeckId(nextEntries, selectedDeckId);
    const nextDeck = nextEntries.find((entry) => entry.id === nextDeckId);

    if (!nextDeck) {
      setSaveStatus({
        tone: "error",
        message: "Nao foi possivel escolher um deck restante apos a exclusao.",
      });
      return;
    }

    if (!selectedDeckIsPersisted) {
      setSourceEntries(nextEntries);
      setSelectedDeckId(nextDeckId);
      setDraft(createContentEditorDeckDraft(nextDeck.deck, sourceTargets));
      setSelectedTargetId("");
      setSelectedCatalogTargetId("");
      setSelectedSyllableRowId("");
      setSaveStatus({
        tone: "success",
        message: `Deck local ${selectedDeckEntry.id} removido da sessao atual do builder.`,
      });
      return;
    }

    setIsSaving(true);
    setSaveStatus({
      tone: "idle",
      message: `Excluindo ${selectedDeckEntry.filePath}...`,
    });

    try {
      const response = await fetch("/__content-editor/deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "delete",
          deckId: selectedDeckId,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; indexPath?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao excluir o deck.");
      }

      setSourceEntries(nextEntries);
      setPersistedDeckIds((current) => {
        const nextIds = new Set(current);
        nextIds.delete(selectedDeckId);
        return nextIds;
      });
      setSelectedDeckId(nextDeckId);
      setDraft(createContentEditorDeckDraft(nextDeck.deck, sourceTargets));
      setSelectedTargetId("");
      setSelectedCatalogTargetId("");
      setSelectedSyllableRowId("");
      setSaveStatus({
        tone: "success",
        message: `Deck ${selectedDeckEntry.id} removido do source bruto e do indice ${payload.indexPath ?? "src/data/content/decks/index.ts"}.`,
      });
    } catch (error) {
      setSaveStatus({
        tone: "error",
        message: error instanceof Error ? error.message : "Falha ao excluir o deck.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addCatalogTarget = () => {
    const targetIds = new Set<string>();
    sourceTargets.forEach((target) => targetIds.add(target.id));
    catalogDraftTargets.forEach((target) => targetIds.add(target.id));

    const nextTarget = createEmptyContentEditorTarget(targetIds);
    setCatalogDraftTargets((current) => [nextTarget, ...current]);
    setSelectedCatalogTargetId(nextTarget.id);
    setSaveStatus(idleSaveStatus);
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

  const addCatalogTargetToDeck = (targetId: string) => {
    const catalogTarget = catalogDraftTargets.find((target) => target.id === targetId);
    if (!catalogTarget) return;

    updateDraft((current) => {
      if (current.targets.some((target) => target.id === targetId)) {
        return current;
      }

      const nextTargets = [...current.targets, createDeckCompositionTargetFromCatalog(catalogTarget)];
      return {
        ...current,
        targets: nextTargets,
        manualPoolAdjustments: normalizeContentEditorPoolAdjustments(current.manualPoolAdjustments, nextTargets),
      };
    });
    setSelectedTargetId(targetId);
  };

  const removeCatalogTarget = (targetId: string) => {
    const usageDeckNames = catalogTargetUsageById.get(targetId) ?? [];
    if (usageDeckNames.length > 0) {
      setSaveStatus({
        tone: "error",
        message: `Nao da para excluir ${targetId} do catalogo enquanto ele estiver em uso em ${usageDeckNames.join(", ")}.`,
      });
      return;
    }

    setCatalogDraftTargets((current) => current.filter((target) => target.id !== targetId));
    setSelectedCatalogTargetId("");
    setSaveStatus(idleSaveStatus);
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
    const selectedDeckTargetIds = new Set((selectedDeckEntry?.deck.targetIds ?? []).filter(Boolean));
    return sourceTargets.some(
      (target) => target.id === selectedTargetDraft.id && !selectedDeckTargetIds.has(selectedTargetDraft.id),
    );
  }, [selectedDeckEntry?.deck.targetIds, selectedTargetDraft, sourceTargets]);
  const savePreviewBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (localIssues.length > 0) blockers.push("Corrija os erros locais do draft para liberar o save.");
    if (!preview.ok) blockers.push("O pipeline real ainda esta com erro para este deck.");
    if (duplicateTargetId) blockers.push("Existe um conflito de id interno com outro target do catalogo.");
    if (deckNameConflictEntry) {
      blockers.push(`O nome atual gera o deckId "${draftDeckIdCandidate}", que ja esta em uso por outro deck.`);
    }
    return blockers;
  }, [deckNameConflictEntry, draftDeckIdCandidate, duplicateTargetId, localIssues.length, preview.ok]);
  const canPreviewSaveArtifacts = savePreviewBlockers.length === 0;
  const reviewSummary = useMemo(
    () =>
      buildContentEditorReviewSummary(baselineDraft, draft, {
        pipelineOk: preview.ok,
        sourceReady: canPreviewSaveArtifacts,
        hasSourceChanges: hasSaveSourceChanges,
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
      hasSaveSourceChanges,
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
      focus: `Alvo ${selectedTargetDraft.id} Â· id interno`,
      message: "Esse id interno conflita com um target de outro deck do catalogo.",
    };
  }, [duplicateTargetId, selectedTargetDraft]);
  const deckNameConflictIssue = useMemo<LocalizedIssue | null>(() => {
    if (!deckNameConflictEntry) return null;
    return {
      scope: "Deck Ativo",
      focus: "Nome",
      message: `Esse nome gera o deckId tecnico "${draftDeckIdCandidate}", que ja pertence ao deck ${deckNameConflictEntry.deck.name}.`,
    };
  }, [deckNameConflictEntry, draftDeckIdCandidate]);
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
  const selectedCatalogTargetSyllablesHasIssue = useMemo(() => {
    if (!selectedCatalogTargetDraft) return false;
    const hasSyllablesInput = selectedCatalogTargetDraft.syllablesText.trim().length > 0;
    if (!hasSyllablesInput) return false;
    if (selectedCatalogTargetNameValidation.canValidate && !selectedCatalogTargetNameValidation.matchesName) return true;

    return pipelineIssues.some(
      (issue) =>
        issue.includes(`Target "${selectedCatalogTargetDraft.id}"`) ||
        issue.includes(`target "${selectedCatalogTargetDraft.id}"`),
    );
  }, [
    pipelineIssues,
    selectedCatalogTargetDraft,
    selectedCatalogTargetNameValidation.canValidate,
    selectedCatalogTargetNameValidation.matchesName,
  ]);
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

  const canSave =
    import.meta.env.DEV && preview.ok && localIssues.length === 0 && !duplicateTargetId && !deckNameConflictEntry && !isSaving;

  const handleSave = async () => {
    if (!canSave || !selectedDeckEntry) return;

    const nextDeck = draftSaveDeck;
    const nextEntry = draftSaveEntry;
    const previousDeckId = nextEntry.id !== selectedDeckId ? selectedDeckId : undefined;
    setIsSaving(true);
    setSaveStatus({
      tone: "idle",
      message: previousDeckId
        ? `Salvando ${selectedDeckEntry.filePath} como ${nextEntry.filePath}...`
        : `Salvando ${selectedDeckEntry.filePath}...`,
    });

    try {
      const response = await fetch("/__content-editor/deck", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(previousDeckId ? { previousDeckId } : {}),
          entry: nextEntry,
          deck: nextDeck,
          targetCatalog: nextSourceTargets,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string; path?: string; indexPath?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "Falha ao salvar o deck bruto.");
      }

      setSourceEntries((current) => {
        const baseEntries = previousDeckId ? removeRawDeckFromCatalog(current, previousDeckId) : current;
        return upsertRawDeckInCatalog(baseEntries, nextEntry);
      });
      setSourceTargets(nextSourceTargets);
      setCatalogDraftTargets(createCatalogDraftTargetsState(nextSourceTargets));
      setPersistedDeckIds((current) => {
        const nextIds = new Set(current);
        if (previousDeckId) nextIds.delete(previousDeckId);
        nextIds.add(nextEntry.id);
        return nextIds;
      });
      setSelectedDeckId(nextEntry.id);
      setDraft(createContentEditorDeckDraft(nextEntry.deck, nextSourceTargets));
      setSelectedTargetId("");
      setSelectedCatalogTargetId("");
      setSelectedSyllableRowId("");
      setSaveStatus({
        tone: "success",
        message: `Deck salvo em ${payload.path ?? nextEntry.filePath}, indice reescrito e catalogo global salvo em ${RAW_TARGET_CATALOG_FILE_PATH}.`,
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
    <div className="min-h-full w-full bg-[#efe3c8] text-amber-950">
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#efe3c8]" />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/old-mathematics.png')] opacity-70" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(140,180,219,0.14)_1px,transparent_1px),linear-gradient(to_bottom,rgba(140,180,219,0.12)_1px,transparent_1px)] bg-[size:120px_120px] opacity-45" />
        <div className="absolute left-[-12%] top-[-22%] h-[44rem] w-[44rem] rounded-full bg-amber-700/6 blur-[150px]" />
        <div className="absolute bottom-[-18%] right-[-12%] h-[40rem] w-[40rem] rounded-full bg-amber-950/6 blur-[150px]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1720px] flex-col gap-6 p-4 sm:p-6 lg:flex-row lg:gap-8 lg:p-8">
        <aside className="relative paper-panel w-full shrink-0 rounded-[28px] border-2 border-[#8d6e63]/35 p-4 shadow-[0_20px_40px_rgba(0,0,0,0.12)] lg:sticky lg:top-8 lg:flex lg:max-h-[calc(100vh-4rem)] lg:w-[24rem] lg:self-start lg:flex-col lg:p-5">
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

          <label className="mt-4 block">
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

          <div className="mt-5 space-y-3 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:py-6 no-scrollbar">
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
                    "w-full overflow-hidden rounded-[28px] border text-left shadow-[0_14px_26px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_34px_rgba(0,0,0,0.16)]",
                    isActive
                      ? "border-amber-300/60 bg-[#fffaf0]/96 ring-2 ring-amber-300/35"
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
                          <div className="mt-1 truncate text-[11px] font-black uppercase tracking-[0.22em] text-amber-100/68">
                            {DEFAULT_DECK_CLASS_LABEL}
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
                      <div className="mt-1 font-serif text-xl font-black text-amber-950">{new Set(entry.deck.targetIds).size}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-900/45">Silabas</div>
                      <div className="mt-1 font-serif text-xl font-black text-amber-950">{totalSyllables}</div>
                    </div>
                  </div>
                </button>
              );
            })}

            <button type="button" onClick={addDeck} className="w-full text-left">
              <AddDeckCard />
            </button>
          </div>
        </aside>

        <section className="relative flex min-w-0 flex-1 flex-col gap-6">
          <div
            ref={contentTopRef}
            className={cn(
              "rounded-[26px] border border-amber-200/10 bg-gradient-to-br px-4 py-2.5 shadow-[0_10px_22px_rgba(0,0,0,0.16)] sm:px-5 sm:py-3",
              DECK_VISUAL_THEME_CLASSES[draft.visualTheme],
            )}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] border border-white/15 bg-black/15 text-[1.75rem] shadow-[0_10px_20px_rgba(0,0,0,0.18)] sm:h-14 sm:w-14 sm:text-[2rem]">
                {draft.emoji || "?"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h2 className="truncate font-serif text-[1.7rem] font-black leading-none tracking-tight text-amber-50 sm:text-[2rem]">
                    {draft.name}
                  </h2>
                  <span className="hidden h-1 w-1 rounded-full bg-amber-100/50 sm:block" />
                  <p className="hidden min-w-0 flex-1 truncate font-serif text-[12px] italic leading-none text-amber-50/76 sm:block">
                    {draft.description || "Sem descricao ainda."}
                  </p>
                </div>
                <p className="mt-0.5 truncate font-serif text-[11px] italic leading-snug text-amber-50/76 sm:hidden">
                  {draft.description || "Sem descricao ainda."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDeckActiveExpanded((current) => !current)}
                className="flex shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-white/15 bg-black/15 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50 transition hover:bg-black/25"
              >
                Editar
                {isDeckActiveExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <div className="space-y-6 pb-6">
              {isDeckActiveExpanded ? (
                <Panel
                  title="Deck Ativo"
                  icon={<FilePenLine className="h-5 w-5" />}
                >
                  <div className="grid gap-4 xl:grid-cols-[11rem_13rem_minmax(0,1fr)_7rem] xl:items-end">
                    <Field label="Deck id tecnico">
                      <input
                        value={draftSaveEntry.id}
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
                        className={cn(
                          "w-full rounded-2xl border bg-white/75 px-4 py-3 text-sm text-amber-950 outline-none transition",
                          deckNameConflictEntry
                            ? "border-rose-400/55 focus:border-rose-500/60"
                            : "border-amber-900/15 focus:border-amber-500/30",
                        )}
                      />
                      {deckNameConflictEntry ? (
                        <div className="mt-2 text-[11px] font-bold text-rose-900">
                          Esse nome gera o id tecnico <span className="font-black">{draftDeckIdCandidate}</span>, que ja existe no deck{" "}
                          <span className="font-black">{deckNameConflictEntry.deck.name}</span>.
                        </div>
                      ) : null}
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

                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button
                      variant="ghost"
                      className="border border-amber-900/15 bg-amber-50/55 text-amber-950 hover:bg-amber-100/75"
                      onClick={handleDuplicateDeck}
                      disabled={!canSave}
                    >
                      <Plus className="h-4 w-4" />
                      Duplicar deck
                    </Button>
                    <Button
                      variant="ghost"
                      className="border border-rose-300/25 bg-rose-500/10 text-rose-900 hover:bg-rose-500/15"
                      onClick={handleDeleteDeck}
                      disabled={sourceEntries.length <= 1 || isSaving}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir deck
                    </Button>
                  </div>
                </Panel>
              ) : null}

              <div className="space-y-6">
                <div className="grid gap-6 xl:grid-cols-2 xl:items-stretch">
                  <div className="xl:h-[min(83.5vh,64.8rem)] xl:min-h-0">
                    <Panel
                      title="Targets do Deck"
                      icon={<BookOpenText className="h-5 w-5" />}
                      className="h-full min-h-0"
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
                  <div className="flex min-h-0 flex-1 flex-col">
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 no-scrollbar">
                  <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
                    {targetGridItems.map((item, index) => (
                      <React.Fragment key={item.id}>
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

                        {selectedTargetDraft && index === expandedTargetRowEndIndex ? (
                          <div
                            data-editor-niche="target"
                            className="paper-panel col-span-2 rounded-[28px] border-2 border-amber-900/25 p-4 text-amber-950 shadow-[0_20px_40px_rgba(0,0,0,0.15)] xl:col-span-3"
                          >
                            <div className="grid gap-4 lg:grid-cols-[6.5rem_minmax(0,1fr)] lg:items-end">
                              <Field label="Copias">
                                <input
                                  type="number"
                                  min={1}
                                  value={selectedTargetDraft.copies}
                                  onChange={(event) => updateTarget(selectedTargetDraft.id, { copies: event.target.value })}
                                  className={cn(
                                    "w-full rounded-2xl border px-3 py-2.5 text-center text-base font-black text-amber-950 outline-none transition",
                                    selectedTargetCopiesHasIssue
                                      ? "border-rose-400/50 bg-rose-50/85 focus:border-rose-500/40"
                                      : "border-amber-900/15 bg-white/70 focus:border-amber-500/30",
                                  )}
                                />
                              </Field>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <Button
                                  variant="ghost"
                                  className="h-11 w-full rounded-2xl border border-amber-900/15 bg-amber-50/50 px-4 text-amber-950 hover:bg-amber-100/70"
                                  onClick={() => moveTarget(selectedTargetDraft.id, -1)}
                                  disabled={draft.targets[0]?.id === selectedTargetDraft.id}
                                >
                                  <ArrowUp className="h-4 w-4" />
                                  Subir
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-11 w-full rounded-2xl border border-amber-900/15 bg-amber-50/50 px-4 text-amber-950 hover:bg-amber-100/70"
                                  onClick={() => moveTarget(selectedTargetDraft.id, 1)}
                                  disabled={draft.targets[draft.targets.length - 1]?.id === selectedTargetDraft.id}
                                >
                                  <ArrowDown className="h-4 w-4" />
                                  Descer
                                </Button>
                                <Button
                                  variant="ghost"
                                  className="h-11 w-full rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 text-rose-900 hover:bg-rose-500/15"
                                  onClick={() => removeTarget(selectedTargetDraft.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Remover
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </React.Fragment>
                    ))}
                  </div>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                      targetIds derivados: {derivedTargetIdsLabel}
                    </Badge>
                    <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
                      <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                        silabas: {targetMinimumCardCount}
                      </Badge>
                      {missingTargetCount > 0 ? (
                        <Badge className="border border-amber-900/12 bg-amber-100/85 text-amber-950">
                          {missingTargetCount} alvo(s) ainda pedem validacao
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                  </div>
                  </Panel>
                  </div>

                  <div className="xl:h-[min(83.5vh,64.8rem)] xl:min-h-0">
                    <Panel
                      title="Silabas do Deck"
                      icon={<Layers3 className="h-5 w-5" />}
                      className="h-full min-h-0"
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
                      <div className="flex min-h-0 flex-1 flex-col">
                        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 no-scrollbar">
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
                                <div
                                  data-editor-niche="syllable"
                                  className="paper-panel col-span-2 rounded-[24px] border-2 border-amber-900/25 p-4 text-amber-950 shadow-[0_16px_30px_rgba(0,0,0,0.12)] sm:col-span-3 xl:col-span-4"
                                >
                                  <div className="grid gap-4 lg:grid-cols-[6.5rem_minmax(0,1fr)] lg:items-end">
                                    <Field label="Copias">
                                      <input
                                        type="number"
                                        min={selectedSyllableMinimumCount}
                                        value={selectedSyllableRow.count}
                                        onChange={(event) => updateSyllableRow(selectedSyllableRow.id, { count: event.target.value })}
                                        className={cn(
                                          "w-full rounded-2xl border px-3 py-2.5 text-center text-base font-black text-amber-950 outline-none transition",
                                          selectedSyllableCountHasIssue
                                            ? "border-rose-400/50 bg-rose-50/85 focus:border-rose-500/40"
                                            : "border-amber-900/15 bg-white/80 focus:border-amber-500/30",
                                        )}
                                      />
                                    </Field>

                                    <div className="rounded-2xl border border-amber-900/12 bg-amber-50/50 px-4 py-4 shadow-[0_8px_18px_rgba(0,0,0,0.06)]">
                                      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">
                                        Aparece em {selectedSyllableUsedByTargets.length} alvo(s)
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
                                  </div>

                                  {poolConstraintMessage && selectedSyllableMinimumCount > 0 ? (
                                    <div className="mt-4 rounded-2xl border border-rose-300/25 bg-rose-50/85 px-4 py-3 text-sm text-rose-950">
                                      {poolConstraintMessage}
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div className="mt-auto flex flex-wrap gap-3 pt-4">
                        <Badge className="border border-sky-700/12 bg-sky-100/85 text-sky-950">
                          {preview.ok ? "pool por cards: validado no pipeline" : "pool por cards: aguardando preview valido"}
                        </Badge>
                      </div>
                      </div>
                    </Panel>
                  </div>
                </div>

                <div className="xl:h-[min(86.7vh,67rem)] xl:min-h-0">
                  <Panel
                    title="Catalogo de Alvos"
                    icon={<BookOpenText className="h-5 w-5" />}
                    className="h-full min-h-0"
                    headerAction={
                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                          {catalogDraftTargets.length} alvo(s)
                        </Badge>
                      </div>
                    }
                  >
                    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6 no-scrollbar">
                      <div className="grid grid-cols-2 gap-x-3 gap-y-3 md:grid-cols-3 xl:grid-cols-6">
                        {catalogTargetGridItems.map((item, index) => (
                          <React.Fragment key={item.id}>
                            {item.kind === "target" ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedCatalogTargetId((current) => (current === item.target.id ? "" : item.target.id))
                                }
                                className="text-left"
                              >
                                <DraftTargetCard
                                  target={item.target}
                                  active={item.target.id === selectedCatalogTargetDraft?.id}
                                  copies={1}
                                  showCopies={false}
                                  nameValidation={catalogTargetNameValidationById[item.target.id]}
                                />
                              </button>
                            ) : (
                              <button type="button" onClick={addCatalogTarget} className="text-left">
                                <AddTargetCard compact />
                              </button>
                            )}

                            {selectedCatalogTargetDraft && index === expandedCatalogTargetRowEndIndex ? (
                              <div
                                data-editor-niche="catalog-target"
                                className="paper-panel col-span-2 rounded-[28px] border-2 border-amber-900/25 p-4 text-amber-950 shadow-[0_20px_40px_rgba(0,0,0,0.15)] md:col-span-3 xl:col-span-6"
                              >
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                              <Badge className="border border-amber-900/15 bg-amber-900/5 text-amber-950">
                                id interno: {selectedCatalogTargetDraft.id}
                              </Badge>
                              <Badge className="border border-amber-900/12 bg-white/85 text-amber-950">
                                {selectedCatalogTargetUsageDeckNames.length} deck(s) usando
                              </Badge>
                              <div className="ml-auto flex flex-wrap items-center gap-2">
                                {selectedCatalogTargetIsInDeck ? (
                                  <Badge className="h-10 min-w-[7rem] justify-center rounded-2xl border border-emerald-700/15 bg-emerald-100/85 px-3 text-emerald-950">
                                    Adicionado
                                  </Badge>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    className="h-10 min-w-[7rem] rounded-2xl border border-emerald-700/15 bg-emerald-100/85 px-3 text-emerald-950 hover:bg-emerald-200/80"
                                    onClick={() => addCatalogTargetToDeck(selectedCatalogTargetDraft.id)}
                                  >
                                    <Plus className="h-4 w-4" />
                                    No deck
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  className="h-10 min-w-[7rem] rounded-2xl border border-rose-300/25 bg-rose-500/10 px-3 text-rose-900 hover:bg-rose-500/15"
                                  onClick={() => removeCatalogTarget(selectedCatalogTargetDraft.id)}
                                  disabled={selectedCatalogTargetUsageDeckNames.length > 0}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  Excluir
                                </Button>
                              </div>
                            </div>

                            <div className="grid gap-4">
                              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,7rem)]">
                                <Field label="Nome">
                                  <input
                                    value={selectedCatalogTargetDraft.name}
                                    onChange={(event) => updateCatalogTarget(selectedCatalogTargetDraft.id, { name: event.target.value })}
                                    className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                                  />
                                </Field>

                                <Field label="Emoji">
                                  <input
                                    value={selectedCatalogTargetDraft.emoji}
                                    onChange={(event) => updateCatalogTarget(selectedCatalogTargetDraft.id, { emoji: event.target.value })}
                                    className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                                  />
                                </Field>
                              </div>

                              <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Rarity">
                                  <select
                                    value={selectedCatalogTargetDraft.rarity}
                                    onChange={(event) => updateCatalogTarget(selectedCatalogTargetDraft.id, { rarity: event.target.value })}
                                    className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                                  >
                                    <option value="comum">comum</option>
                                    <option value="raro">raro</option>
                                    <option value="epico">epico</option>
                                    <option value="lendario">lendario</option>
                                  </select>
                                </Field>

                                <Field label="Silabas do alvo">
                                  <input
                                    value={selectedCatalogTargetDraft.syllablesText}
                                    onChange={(event) =>
                                      updateCatalogTarget(selectedCatalogTargetDraft.id, {
                                        syllablesText: event.target.value.toUpperCase(),
                                      })
                                    }
                                    placeholder="Ex.: BA, NA, NA"
                                    className={cn(
                                      "w-full rounded-2xl border px-4 py-3 text-sm text-amber-950 outline-none transition placeholder:text-amber-900/35",
                                      selectedCatalogTargetSyllablesHasIssue
                                        ? "border-rose-400/50 bg-rose-50/85 focus:border-rose-500/40"
                                        : "border-amber-900/15 bg-white/70 focus:border-amber-500/30",
                                    )}
                                  />
                                </Field>
                              </div>

                              <Field label="Descricao">
                                <textarea
                                  value={selectedCatalogTargetDraft.description}
                                  onChange={(event) =>
                                    updateCatalogTarget(selectedCatalogTargetDraft.id, { description: event.target.value })
                                  }
                                  rows={3}
                                  className="w-full rounded-2xl border border-amber-900/15 bg-white/70 px-4 py-3 text-sm text-amber-950 outline-none transition focus:border-amber-500/30"
                                />
                              </Field>

                              <div
                                className={cn(
                                  "rounded-2xl border px-3 py-3 text-sm",
                                  !selectedCatalogTargetNameValidation.canValidate
                                    ? "border-amber-900/12 bg-white/65 text-amber-950/75"
                                    : !selectedCatalogTargetNameValidation.matchesName
                                      ? "border-rose-300/25 bg-rose-50/80 text-rose-950"
                                      : "border-emerald-700/15 bg-emerald-100/80 text-emerald-950",
                                )}
                              >
                                {selectedCatalogTargetNameValidation.canValidate ? (
                                  selectedCatalogTargetNameValidation.matchesName ? (
                                    <span>
                                      Nome valido: <span className="font-black">{selectedCatalogTargetNameValidation.normalizedName}</span>
                                    </span>
                                  ) : (
                                    <span>
                                      {selectedCatalogTargetNameValidation.respectsExplicitSegmentation ? (
                                        <>
                                          Nome <span className="font-black">{selectedCatalogTargetNameValidation.normalizedName || "?"}</span> nao bate com{" "}
                                          <span className="font-black">{selectedCatalogTargetNameValidation.normalizedSyllableWord || "?"}</span>.
                                        </>
                                      ) : (
                                        <>Separe as silabas. Nao use a palavra inteira.</>
                                      )}
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
                                  {selectedCatalogTargetSyllables.length > 0 ? (
                                    selectedCatalogTargetSyllables.map((syllable, syllableIndex) => (
                                      <button
                                        key={`${selectedCatalogTargetDraft.id}-${syllable}-${syllableIndex}`}
                                        type="button"
                                        onClick={() =>
                                          updateCatalogTarget(selectedCatalogTargetDraft.id, {
                                            syllablesText: removeContentEditorTargetSyllableAt(
                                              selectedCatalogTargetDraft.syllablesText,
                                              syllableIndex,
                                            ),
                                          })
                                        }
                                        className="rounded-full border border-amber-900/12 bg-amber-50/75 px-3 py-1 text-[11px] font-black tracking-[0.16em] text-amber-950 transition hover:bg-rose-100/85"
                                      >
                                        {syllable} Â· remover
                                      </button>
                                    ))
                                  ) : (
                                    <div className="text-sm text-amber-950/60">Digite as silabas do alvo.</div>
                                  )}
                                </div>
                              </div>
                            </div>
                              </div>
                            ) : null}
                          </React.Fragment>
                        ))}
                      </div>
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
                      <InfoTile label="Modo" value="deck por targetIds + catalogo global" slim plainValue />
                      <InfoTile
                        label="Source bruto"
                        value={`${draftSaveEntry.filePath} + ${RAW_TARGET_CATALOG_FILE_PATH}`}
                        slim
                        plainValue
                      />
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
                              O draft recompila no pipeline real e continua gerando o Deck final do runtime via adapter atual. O save dev-only grava{" "}
                              <span className="font-black">{draftSaveEntry.filePath}</span>, reescreve o indice bruto de decks e atualiza{" "}
                              <span className="font-black">{RAW_TARGET_CATALOG_FILE_PATH}</span>.
                            </div>
                          )}

                      {deckNameConflictIssue ? <IssueRow issue={deckNameConflictIssue} tone="warning" /> : null}
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
                                {hasSaveSourceChanges
                                  ? `+${saveSourceDiff.addedCount + targetSourceDiff.addedCount} / -${saveSourceDiff.removedCount + targetSourceDiff.removedCount}`
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
                            hasSaveSourceChanges ? (
                              <div className="mt-4 space-y-4">
                                <div>
                                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">
                                    Deck bruto
                                  </div>
                                  {saveSourceDiff.hasChanges ? (
                                    <pre className="max-h-48 overflow-auto rounded-2xl border border-amber-900/10 bg-[#2b2119] p-4 font-mono text-[11px] leading-6 text-amber-50 shadow-inner">
                                      {saveSourceDiff.lines.map((line, index) => (
                                        <div
                                          key={`deck-${line.type}-${index}-${line.value}`}
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
                                    <EmptyCallout text="Sem mudancas no arquivo bruto do deck." />
                                  )}
                                </div>

                                <div>
                                  <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100/70">
                                    Catalogo global de alvos
                                  </div>
                                  {targetSourceDiff.hasChanges ? (
                                    <pre className="max-h-48 overflow-auto rounded-2xl border border-amber-900/10 bg-[#2b2119] p-4 font-mono text-[11px] leading-6 text-amber-50 shadow-inner">
                                      {targetSourceDiff.lines.map((line, index) => (
                                        <div
                                          key={`target-${line.type}-${index}-${line.value}`}
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
                                    <EmptyCallout text="Sem mudancas no catalogo global de alvos." />
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="mt-4">
                                <EmptyCallout text="Nao ha mudancas no source bruto nem no catalogo global de alvos." />
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
                            <div className="mt-4 space-y-4">
                              <div>
                                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">
                                  {draftSaveEntry.filePath}
                                </div>
                                <pre className="max-h-56 overflow-auto rounded-2xl border border-amber-900/10 bg-[#201710] p-4 font-mono text-[11px] leading-6 text-amber-50 shadow-inner">
                                  {nextSaveSource}
                                </pre>
                              </div>

                              <div>
                                <div className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-900/45">
                                  {RAW_TARGET_CATALOG_FILE_PATH}
                                </div>
                                <pre className="max-h-56 overflow-auto rounded-2xl border border-amber-900/10 bg-[#201710] p-4 font-mono text-[11px] leading-6 text-amber-50 shadow-inner">
                                  {nextTargetSource}
                                </pre>
                              </div>
                            </div>
                          ) : (
                            <div className="mt-4">
                              <EmptyCallout text="Os arquivos gerados para save aparecem aqui assim que o draft voltar a ficar valido para gravacao." />
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
  showCopies?: boolean;
  nameValidation?: ReturnType<typeof buildContentEditorTargetNameValidation>;
}> = ({ target, active, copies, showCopies = true, nameValidation }) => {
  const normalizedRarity = normalizeRarity(target.rarity);
  const damage = RARITY_DAMAGE[normalizedRarity];
  const syllables = parseContentEditorTargetSyllables(target.syllablesText);
  const hasNameIssue = Boolean(nameValidation?.canValidate && !nameValidation.matchesName);

  return (
    <div className={cn("relative flex w-full items-start justify-center text-center", showCopies ? "pb-10" : "pb-3")}>
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

      {showCopies ? (
        <span className="absolute bottom-[6px] left-1/2 -translate-x-1/2 rounded-full border border-amber-900/12 bg-white/90 px-2.5 py-0.5 text-xs font-black text-amber-950 shadow-sm">
          x{copies}
        </span>
      ) : null}
    </div>
  );
};

const AddTargetCard: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => (
  <div className={cn("relative flex w-full items-start justify-center text-center", compact ? "pb-3" : "pb-10")}>
    <div className="relative flex aspect-[126/176] w-full flex-col items-center justify-center overflow-hidden rounded-[1.1rem] border border-dashed border-amber-900/18 bg-amber-50/45 p-3 text-amber-950 shadow-[0_14px_26px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:bg-amber-100/70 hover:shadow-[0_20px_34px_rgba(0,0,0,0.14)]">
      <Plus className="h-10 w-10" />
      <div className="mt-3 px-3 text-center text-[11px] font-black uppercase tracking-[0.18em] text-amber-950">
        Adicionar target
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
    </div>
  </div>
);

const AddDeckCard: React.FC = () => (
  <div className="relative flex min-h-[132px] w-full items-center justify-center overflow-hidden rounded-[28px] border border-dashed border-amber-900/18 bg-amber-50/45 p-4 text-amber-950 shadow-[0_14px_26px_rgba(0,0,0,0.1)] transition-all duration-300 hover:-translate-y-1 hover:bg-amber-100/70 hover:shadow-[0_20px_34px_rgba(0,0,0,0.14)]">
    <div className="flex items-center gap-3 text-center">
      <Plus className="h-7 w-7" />
      <div className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-950">
        Criar deck
      </div>
    </div>

    <div className="pointer-events-none absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-30" />
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


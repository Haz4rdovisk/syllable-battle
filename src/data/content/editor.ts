import { Deck } from "../../types/game";
import { ContentPipeline, DeckContentError, buildContentPipeline } from "./index";
import { RawDeckCatalogEntry } from "./decks";
import { DeckModel, DeckVisualThemeId, RawDeckDefinition, RawTargetDefinition } from "./types";

const isValidIdentifier = (value: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);
const DECK_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const serializeValue = (value: unknown, indentLevel = 0): string => {
  const indent = "  ".repeat(indentLevel);
  const nextIndent = "  ".repeat(indentLevel + 1);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const primitivesOnly = value.every((entry) => entry === null || typeof entry !== "object");
    if (primitivesOnly) {
      return `[${value.map((entry) => serializeValue(entry, indentLevel)).join(", ")}]`;
    }

    return `[\n${value
      .map((entry) => `${nextIndent}${serializeValue(entry, indentLevel + 1)}`)
      .join(",\n")}\n${indent}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined);
    if (entries.length === 0) return "{}";

    return `{\n${entries
      .map(([key, entryValue]) => {
        const serializedKey = isValidIdentifier(key) ? key : JSON.stringify(key);
        return `${nextIndent}${serializedKey}: ${serializeValue(entryValue, indentLevel + 1)}`;
      })
      .join(",\n")}\n${indent}}`;
  }

  return JSON.stringify(value);
};

export interface ContentEditorPoolAdjustment {
  id: string;
  syllable: string;
  count: string;
  mode?: "auto" | "manual";
}

export interface ContentEditorTargetDraft {
  id: string;
  name: string;
  copies: string;
  description: string;
  emoji: string;
  rarity: string;
  syllablesText: string;
}

export interface ContentEditorTargetNameValidation {
  normalizedName: string;
  normalizedSyllableWord: string;
  syllables: string[];
  canValidate: boolean;
  respectsExplicitSegmentation: boolean;
  matchesName: boolean;
}

export interface ContentEditorDeckDraft {
  id: string;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckVisualThemeId;
  manualPoolAdjustments: ContentEditorPoolAdjustment[];
  targets: ContentEditorTargetDraft[];
}

export type ContentEditorPreviewResult =
  | {
      ok: true;
      pipeline: ContentPipeline;
      selectedDeckModel: DeckModel | null;
      selectedRuntimeDeck: Deck | null;
    }
  | {
      ok: false;
      issues: string[];
    };

export interface ContentEditorSourceDiffLine {
  type: "context" | "added" | "removed";
  value: string;
}

export interface ContentEditorSourceDiff {
  hasChanges: boolean;
  addedCount: number;
  removedCount: number;
  lines: ContentEditorSourceDiffLine[];
}

export interface ContentEditorReviewCategory {
  id: "metadata" | "targets" | "syllables" | "pipeline" | "source";
  label: string;
  tone: "default" | "success" | "warning";
  headline: string;
  detail: string;
  changed: boolean;
}

export interface ContentEditorReviewSummary {
  hasMeaningfulChanges: boolean;
  categories: ContentEditorReviewCategory[];
}

const normalizeDeckSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export function createDeckIdCandidate(preferredName: string, fallback = "novo-deck") {
  return normalizeDeckSlug(preferredName) || normalizeDeckSlug(fallback) || "novo-deck";
}

const normalizeEditorSyllable = (value: string) => value.trim().toUpperCase();

const createContentEditorPoolAdjustmentId = (syllable: string) =>
  `syllable-${normalizeEditorSyllable(syllable).toLowerCase()}`;

const toExportIdentifier = (deckId: string) => {
  const parts = deckId
    .split(/[^a-zA-Z0-9]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const normalized =
    parts
      .map((part, index) => {
        const lower = part.toLowerCase();
        return index === 0 ? lower : `${lower[0]?.toUpperCase() ?? ""}${lower.slice(1)}`;
      })
      .join("") || "newDeck";

  const prefixed = /^[A-Za-z_$]/.test(normalized) ? normalized : `deck${normalized}`;
  return `${prefixed}Deck`;
};

export function cloneRawDeckDefinition(deck: RawDeckDefinition): RawDeckDefinition {
  return {
    ...deck,
    syllables: { ...deck.syllables },
    targets: deck.targets.map((target) => ({ ...target, syllables: [...target.syllables] })),
  };
}

export function cloneRawDeckCatalogEntry(entry: RawDeckCatalogEntry): RawDeckCatalogEntry {
  return {
    ...entry,
    deck: cloneRawDeckDefinition(entry.deck),
  };
}

export function createContentEditorDeckDraft(deck: RawDeckDefinition): ContentEditorDeckDraft {
  const targets = deck.targets.map((target) => ({
    id: target.id,
    name: target.name,
    copies: String(target.copies ?? 1),
    description: target.description ?? "",
    emoji: target.emoji,
    rarity: target.rarity,
    syllablesText: target.syllables.join(", "),
  }));
  const requiredCounts = buildMinimumDeckPoolFromTargets(targets);

  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    emoji: deck.emoji,
    visualTheme: deck.visualTheme,
    manualPoolAdjustments: normalizeContentEditorPoolAdjustments(
      Object.entries(deck.syllables).map(([syllable, count]) => ({
        id: createContentEditorPoolAdjustmentId(syllable),
        syllable,
        count: String(Math.max(0, count - (requiredCounts.get(normalizeEditorSyllable(syllable)) ?? 0))),
        mode: "manual",
      })),
      targets,
    ),
    targets,
  };
}

export function createUniqueDeckId(existingIds: Iterable<string>, preferredName = "novo-deck") {
  const normalizedBase = createDeckIdCandidate(preferredName);
  const ids = new Set(existingIds);

  if (!ids.has(normalizedBase)) return normalizedBase;

  let suffix = 2;
  while (ids.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBase}-${suffix}`;
}

export function createDeckExportName(deckId: string) {
  return toExportIdentifier(deckId);
}

export function createDeckFilePath(deckId: string) {
  return `src/data/content/decks/${deckId}.ts`;
}

export function createRawDeckCatalogEntry(deck: RawDeckDefinition): RawDeckCatalogEntry {
  return {
    id: deck.id,
    exportName: createDeckExportName(deck.id),
    filePath: createDeckFilePath(deck.id),
    deck: cloneRawDeckDefinition(deck),
  };
}

export function createEmptyRawDeckDefinition(existingDeckIds: Iterable<string>): RawDeckDefinition {
  const deckId = createUniqueDeckId(existingDeckIds);
  return {
    id: deckId,
    name: "Novo Deck",
    description: "Deck novo em construcao.",
    emoji: "🃏",
    visualTheme: "harvest",
    syllables: {},
    targets: [],
  };
}

export function createEmptyContentEditorDeckEntry(existingDeckIds: Iterable<string>): RawDeckCatalogEntry {
  return createRawDeckCatalogEntry(createEmptyRawDeckDefinition(existingDeckIds));
}

export function validateContentDeckSaveEntry(entry: RawDeckCatalogEntry): RawDeckCatalogEntry {
  const deckId = entry.id.trim();
  if (!DECK_ID_PATTERN.test(deckId)) {
    throw new Error(`Deck id "${entry.id}" is not safe for dev-only save.`);
  }

  const expectedExportName = createDeckExportName(deckId);
  if (entry.exportName !== expectedExportName) {
    throw new Error(`Deck "${deckId}" must use exportName "${expectedExportName}".`);
  }

  const expectedFilePath = createDeckFilePath(deckId);
  if (entry.filePath !== expectedFilePath) {
    throw new Error(`Deck "${deckId}" must use filePath "${expectedFilePath}".`);
  }

  if (entry.deck.id !== deckId) {
    throw new Error(`Deck "${deckId}" must match the raw deck id for dev-only save.`);
  }

  return {
    id: deckId,
    exportName: expectedExportName,
    filePath: expectedFilePath,
    deck: cloneRawDeckDefinition(entry.deck),
  };
}

function buildRawDeckDefinitionFromDraft(
  draft: ContentEditorDeckDraft,
  options: {
    preserveDraftCopies: boolean;
  },
): RawDeckDefinition {
  const { preserveDraftCopies } = options;
  const syllables = syncDeckPoolWithTargetMinimums(draft.manualPoolAdjustments, draft.targets).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.syllable] = Number(row.count);
      return acc;
    },
    {},
  );

  const targets: RawTargetDefinition[] = draft.targets.map((target) => {
    const description = target.description.trim();
    const copies = Number(target.copies);
    const copiesText = target.copies.trim();
    const copiesValue =
      preserveDraftCopies && copiesText.length === 0
        ? 0
        : Number.isFinite(copies)
          ? copies
          : Number.NaN;
    const shouldPersistCopies = preserveDraftCopies
      ? target.copies.length > 0 || copiesValue !== 1
      : Number.isInteger(copies) && copies > 1;

    return {
      id: target.id,
      name: target.name,
      ...(shouldPersistCopies ? { copies: copiesValue } : {}),
      ...(description ? { description } : {}),
      emoji: target.emoji,
      rarity: target.rarity,
      syllables: parseContentEditorTargetSyllables(target.syllablesText),
    };
  });

  return {
    id: draft.id,
    name: draft.name,
    description: draft.description,
    emoji: draft.emoji,
    visualTheme: draft.visualTheme,
    syllables,
    targets,
  };
}

export function hydrateRawDeckDefinitionFromDraft(draft: ContentEditorDeckDraft): RawDeckDefinition {
  return buildRawDeckDefinitionFromDraft(draft, { preserveDraftCopies: false });
}

export function hydratePreviewRawDeckDefinitionFromDraft(draft: ContentEditorDeckDraft): RawDeckDefinition {
  return buildRawDeckDefinitionFromDraft(draft, { preserveDraftCopies: true });
}

export function upsertRawDeckInCatalog(
  entries: RawDeckCatalogEntry[],
  nextEntry: RawDeckCatalogEntry,
) {
  const hasEntry = entries.some((entry) => entry.id === nextEntry.id);
  const clonedEntries = entries.map((entry) =>
    entry.id === nextEntry.id ? cloneRawDeckCatalogEntry(nextEntry) : cloneRawDeckCatalogEntry(entry),
  );

  return hasEntry ? clonedEntries : [...clonedEntries, cloneRawDeckCatalogEntry(nextEntry)];
}

export function removeRawDeckFromCatalog(
  entries: RawDeckCatalogEntry[],
  deckId: string,
) {
  return entries
    .filter((entry) => entry.id !== deckId)
    .map((entry) => cloneRawDeckCatalogEntry(entry));
}

export function replaceRawDeckInCatalog(
  entries: RawDeckCatalogEntry[],
  deckId: string,
  deck: RawDeckDefinition,
) {
  return upsertRawDeckInCatalog(entries, createRawDeckCatalogEntry({ ...deck, id: deckId })).map((entry) => entry.deck);
}

export function buildContentEditorPreview(
  entries: RawDeckCatalogEntry[],
  deckId: string,
  draft: ContentEditorDeckDraft,
): ContentEditorPreviewResult {
  const nextDeck = hydratePreviewRawDeckDefinitionFromDraft(draft);

  try {
    const pipeline = buildContentPipeline(
      upsertRawDeckInCatalog(entries, createRawDeckCatalogEntry({ ...nextDeck, id: deckId })).map((entry) => entry.deck),
    );
    return {
      ok: true,
      pipeline,
      selectedDeckModel: pipeline.deckModelsById[deckId] ?? null,
      selectedRuntimeDeck: pipeline.runtimeDecksById[deckId] ?? null,
    };
  } catch (error) {
    if (error instanceof DeckContentError) {
      return {
        ok: false,
        issues: error.issues,
      };
    }

    throw error;
  }
}

export function createUniqueTargetId(existingIds: Iterable<string>, preferredName = "NOVO TARGET") {
  const normalizedBase =
    preferredName
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "novo-target";
  const ids = new Set(existingIds);

  if (!ids.has(normalizedBase)) return normalizedBase;

  let suffix = 2;
  while (ids.has(`${normalizedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${normalizedBase}-${suffix}`;
}

export function createEmptyContentEditorTarget(existingIds: Iterable<string>): ContentEditorTargetDraft {
  return {
    id: createUniqueTargetId(existingIds),
    name: "NOVO TARGET",
    copies: "1",
    description: "",
    emoji: "?",
    rarity: "comum",
    syllablesText: "",
  };
}

export function createDuplicatedContentEditorDeckEntry(
  draft: ContentEditorDeckDraft,
  existingDeckIds: Iterable<string>,
  existingTargetIds: Iterable<string>,
  preferredName = `${draft.name || draft.id} copia`,
): RawDeckCatalogEntry {
  const nextDeckId = createUniqueDeckId(existingDeckIds, preferredName);
  const nextTargetIds = new Set(existingTargetIds);
  const duplicatedTargets = draft.targets.map((target) => {
    const nextTargetId = createUniqueTargetId(nextTargetIds, `${target.name || target.id} copia`);
    nextTargetIds.add(nextTargetId);
    return {
      ...target,
      id: nextTargetId,
    };
  });

  const duplicatedDeck = hydrateRawDeckDefinitionFromDraft({
    ...draft,
    id: nextDeckId,
    name: preferredName,
    targets: duplicatedTargets,
    manualPoolAdjustments: draft.manualPoolAdjustments.map((adjustment) => ({
      ...adjustment,
    })),
  });

  return createRawDeckCatalogEntry({
    ...duplicatedDeck,
    id: nextDeckId,
  });
}

export function parseContentEditorTargetSyllables(value: string) {
  const normalizeSyllableToken = (entry: string) =>
    entry
      .trim()
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[\s-]+/g, "")
      .replace(/[^A-Z0-9]/g, "");

  return value
    .split(/[\n,]/)
    .map((entry) => normalizeSyllableToken(entry))
    .filter((entry) => entry.length > 0);
}

export function normalizeContentEditorTargetName(value: string) {
  return value
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s-]+/g, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function formatContentEditorTargetSyllables(syllables: string[]) {
  return syllables.join(", ");
}

export function appendContentEditorTargetSyllable(value: string, syllable: string) {
  return formatContentEditorTargetSyllables([
    ...parseContentEditorTargetSyllables(value),
    syllable.trim().toUpperCase(),
  ]);
}

export function removeContentEditorTargetSyllableAt(value: string, index: number) {
  const nextSyllables = parseContentEditorTargetSyllables(value);
  if (index < 0 || index >= nextSyllables.length) return formatContentEditorTargetSyllables(nextSyllables);
  nextSyllables.splice(index, 1);
  return formatContentEditorTargetSyllables(nextSyllables);
}

export function buildContentEditorTargetNameValidation(
  name: string,
  syllablesText: string,
): ContentEditorTargetNameValidation {
  const syllables = parseContentEditorTargetSyllables(syllablesText);
  const normalizedName = normalizeContentEditorTargetName(name);
  const normalizedSyllableWord = syllables.join("");
  const canValidate = normalizedName.length > 0 && syllables.length > 0;
  const respectsExplicitSegmentation =
    syllables.length !== 1 || normalizedSyllableWord.length <= 3 || /[,\n]/.test(syllablesText);

  return {
    normalizedName,
    normalizedSyllableWord,
    syllables,
    canValidate,
    respectsExplicitSegmentation,
    matchesName: canValidate && respectsExplicitSegmentation && normalizedName === normalizedSyllableWord,
  };
}

export function buildMinimumDeckPoolFromTargets(targets: ContentEditorTargetDraft[]) {
  const requiredCounts = new Map<string, number>();

  targets.forEach((target) => {
    const validation = buildContentEditorTargetNameValidation(target.name, target.syllablesText);
    if (!validation.matchesName) return;

    validation.syllables.forEach((syllable) => {
      requiredCounts.set(syllable, (requiredCounts.get(syllable) ?? 0) + 1);
    });
  });

  return requiredCounts;
}

export function normalizeContentEditorPoolAdjustments(
  adjustments: ContentEditorPoolAdjustment[],
  targets: ContentEditorTargetDraft[],
) {
  const requiredCounts = buildMinimumDeckPoolFromTargets(targets);
  if (requiredCounts.size === 0) return [];

  const normalizedRows = new Map<string, ContentEditorPoolAdjustment>();

  adjustments.forEach((adjustment) => {
    const syllable = normalizeEditorSyllable(adjustment.syllable);
    if (!syllable || !requiredCounts.has(syllable)) return;

    const parsedCount = Number(adjustment.count);
    const extraCount = Math.max(0, Number.isFinite(parsedCount) ? parsedCount : 0);
    if (extraCount <= 0) return;

    const existingRow = normalizedRows.get(syllable);
    if (!existingRow || Number(existingRow.count) < extraCount) {
      normalizedRows.set(syllable, {
        id: existingRow?.id ?? adjustment.id ?? createContentEditorPoolAdjustmentId(syllable),
        syllable,
        count: String(extraCount),
        mode: "manual",
      });
    }
  });

  return [...normalizedRows.values()];
}

export function getContentEditorRequiredSyllableCount(
  targets: ContentEditorTargetDraft[],
  syllable: string,
) {
  const normalized = String(syllable ?? "").trim().toUpperCase();
  if (!normalized) return 0;
  return buildMinimumDeckPoolFromTargets(targets).get(normalized) ?? 0;
}

export function clampContentEditorSyllableCount(
  nextCount: string,
  syllable: string,
  targets: ContentEditorTargetDraft[],
) {
  const requiredCount = getContentEditorRequiredSyllableCount(targets, syllable);
  const parsed = Number(nextCount);

  if (!nextCount.trim() || !Number.isFinite(parsed)) {
    return String(requiredCount);
  }

  return String(Math.max(requiredCount, parsed));
}

export function syncDeckPoolWithTargetMinimums(
  manualPoolAdjustments: ContentEditorPoolAdjustment[],
  targets: ContentEditorTargetDraft[],
) {
  const requiredCounts = buildMinimumDeckPoolFromTargets(targets);
  if (requiredCounts.size === 0) return [];

  const normalizedAdjustments = normalizeContentEditorPoolAdjustments(manualPoolAdjustments, targets);
  const adjustmentsBySyllable = normalizedAdjustments.reduce<Map<string, ContentEditorPoolAdjustment>>((acc, row) => {
    acc.set(row.syllable, row);
    return acc;
  }, new Map());

  return [...requiredCounts.entries()].map(([syllable, requiredCount]) => {
    const adjustment = adjustmentsBySyllable.get(syllable);
    const extraCount = Number(adjustment?.count ?? 0);

    return {
      id: adjustment?.id ?? createContentEditorPoolAdjustmentId(syllable),
      syllable,
      count: String(requiredCount + Math.max(0, Number.isFinite(extraCount) ? extraCount : 0)),
      mode: adjustment ? ("manual" as const) : ("auto" as const),
    };
  });
}

export function getContentEditorLocalIssues(draft: ContentEditorDeckDraft) {
  const issues: string[] = [];

  draft.targets.forEach((target) => {
    const copies = Number(target.copies);
    if (!Number.isInteger(copies) || copies <= 0) {
      issues.push(`Target "${target.id}" precisa ter copias com inteiro positivo.`);
    }

    const validation = buildContentEditorTargetNameValidation(target.name, target.syllablesText);
    if (validation.syllables.length === 0) {
      issues.push(`Target "${target.id}" precisa ter pelo menos uma silaba informada.`);
    }
    if (validation.canValidate && !validation.matchesName) {
      if (!validation.respectsExplicitSegmentation) {
        issues.push(`Target "${target.id}" precisa separar as silabas corretamente.`);
      } else {
        issues.push(`Target "${target.id}" precisa formar o nome "${target.name}" com as silabas informadas.`);
      }
    }
  });

  return issues;
}

export function createRawDeckDefinitionSource(exportName: string, deck: RawDeckDefinition) {
  return `import { RawDeckDefinition } from "../types";\n\nexport const ${exportName}: RawDeckDefinition = ${serializeValue(
    deck,
  )};\n`;
}

export function createRawDeckCatalogIndexSource(entries: RawDeckCatalogEntry[]) {
  const normalizedEntries = entries.map((entry) => cloneRawDeckCatalogEntry(entry));
  const imports = normalizedEntries
    .map((entry) => `import { ${entry.exportName} } from "./${entry.id}";`)
    .join("\n");
  const entrySource = normalizedEntries
    .map(
      (entry) => `  {
    id: ${JSON.stringify(entry.id)},
    exportName: ${JSON.stringify(entry.exportName)},
    filePath: ${JSON.stringify(entry.filePath)},
    deck: ${entry.exportName},
  },`,
    )
    .join("\n");

  return `${imports}
import { RawDeckDefinition } from "../types";

export interface RawDeckCatalogEntry {
  id: string;
  exportName: string;
  filePath: string;
  deck: RawDeckDefinition;
}

export const rawDeckCatalogEntries: RawDeckCatalogEntry[] = [
${entrySource}
];

export function getRawDeckCatalogEntry(deckId: string) {
  return rawDeckCatalogEntries.find((entry) => entry.id === deckId) ?? null;
}

export const rawDeckCatalog = rawDeckCatalogEntries.map((entry) => entry.deck);
`;
}

export function buildContentEditorSourceDiff(
  currentSource: string,
  nextSource: string,
  contextLines = 2,
): ContentEditorSourceDiff {
  if (currentSource === nextSource) {
    return {
      hasChanges: false,
      addedCount: 0,
      removedCount: 0,
      lines: [],
    };
  }

  const currentLines = currentSource.split("\n");
  const nextLines = nextSource.split("\n");

  let start = 0;
  while (
    start < currentLines.length &&
    start < nextLines.length &&
    currentLines[start] === nextLines[start]
  ) {
    start += 1;
  }

  let currentEnd = currentLines.length - 1;
  let nextEnd = nextLines.length - 1;
  while (
    currentEnd >= start &&
    nextEnd >= start &&
    currentLines[currentEnd] === nextLines[nextEnd]
  ) {
    currentEnd -= 1;
    nextEnd -= 1;
  }

  const contextStart = Math.max(0, start - contextLines);
  const contextAfterStart = nextEnd + 1;
  const contextAfterEnd = Math.min(nextLines.length, contextAfterStart + contextLines);
  const lines: ContentEditorSourceDiffLine[] = [];

  currentLines.slice(contextStart, start).forEach((line) => {
    lines.push({ type: "context", value: line });
  });

  currentLines.slice(start, currentEnd + 1).forEach((line) => {
    lines.push({ type: "removed", value: line });
  });

  nextLines.slice(start, nextEnd + 1).forEach((line) => {
    lines.push({ type: "added", value: line });
  });

  nextLines.slice(contextAfterStart, contextAfterEnd).forEach((line) => {
    lines.push({ type: "context", value: line });
  });

  return {
    hasChanges: true,
    addedCount: Math.max(0, nextEnd - start + 1),
    removedCount: Math.max(0, currentEnd - start + 1),
    lines,
  };
}

const normalizeDraftTargetSyllables = (value: string) =>
  value
    .split(/[\n,]/)
    .map((entry) => entry.trim().toUpperCase())
    .filter((entry) => entry.length > 0)
    .join("|");

const buildSyllableCountMap = (rows: ContentEditorPoolAdjustment[]) => {
  const counts = new Map<string, number>();

  rows.forEach((row) => {
    const normalized = row.syllable.trim().toUpperCase();
    if (!normalized) return;
    counts.set(normalized, Number(row.count));
  });

  return counts;
};

export function buildContentEditorReviewSummary(
  baseline: ContentEditorDeckDraft,
  draft: ContentEditorDeckDraft,
  options: {
    pipelineOk: boolean;
    sourceReady: boolean;
    hasSourceChanges: boolean;
    localIssueCount: number;
    pipelineIssueCount: number;
    blockerCount: number;
  },
): ContentEditorReviewSummary {
  const metadataChanges: string[] = [];
  if (baseline.name !== draft.name) metadataChanges.push("nome");
  if (baseline.emoji !== draft.emoji) metadataChanges.push("emoji");
  if (baseline.description !== draft.description) metadataChanges.push("descricao");
  if (baseline.visualTheme !== draft.visualTheme) metadataChanges.push("theme");

  const baselineTargetsById = new Map(baseline.targets.map((target) => [target.id, target]));
  const draftTargetsById = new Map(draft.targets.map((target) => [target.id, target]));
  const addedTargets = draft.targets.filter((target) => !baselineTargetsById.has(target.id)).length;
  const removedTargets = baseline.targets.filter((target) => !draftTargetsById.has(target.id)).length;
  const editedTargets = draft.targets.filter((target) => {
    const baselineTarget = baselineTargetsById.get(target.id);
    if (!baselineTarget) return false;

    return (
      baselineTarget.name !== target.name ||
      baselineTarget.copies !== target.copies ||
      baselineTarget.emoji !== target.emoji ||
      baselineTarget.rarity !== target.rarity ||
      baselineTarget.description !== target.description ||
      normalizeDraftTargetSyllables(baselineTarget.syllablesText) !== normalizeDraftTargetSyllables(target.syllablesText)
    );
  }).length;
  const baselineTargetOrder = baseline.targets.map((target) => target.id).join("|");
  const draftTargetOrder = draft.targets.map((target) => target.id).join("|");
  const targetOrderChanged = baselineTargetOrder !== draftTargetOrder;

  const baselineSyllableMap = buildSyllableCountMap(
    syncDeckPoolWithTargetMinimums(baseline.manualPoolAdjustments, baseline.targets),
  );
  const draftSyllableMap = buildSyllableCountMap(
    syncDeckPoolWithTargetMinimums(draft.manualPoolAdjustments, draft.targets),
  );
  const addedSyllables = [...draftSyllableMap.keys()].filter((syllable) => !baselineSyllableMap.has(syllable)).length;
  const removedSyllables = [...baselineSyllableMap.keys()].filter((syllable) => !draftSyllableMap.has(syllable)).length;
  const changedSyllableCounts = [...draftSyllableMap.entries()].filter(
    ([syllable, count]) => baselineSyllableMap.has(syllable) && baselineSyllableMap.get(syllable) !== count,
  ).length;

  const formatDetail = (parts: string[], fallback: string) => (parts.length > 0 ? parts.join(" · ") : fallback);

  const categories: ContentEditorReviewCategory[] = [
    {
      id: "metadata",
      label: "Metadados",
      tone: metadataChanges.length > 0 ? "warning" : "default",
      headline: metadataChanges.length > 0 ? `${metadataChanges.length} alteracao(oes)` : "sem mudancas",
      detail: metadataChanges.length > 0 ? metadataChanges.join(", ") : "nome, emoji, descricao e theme intactos",
      changed: metadataChanges.length > 0,
    },
    {
      id: "targets",
      label: "Targets",
      tone: addedTargets + removedTargets + editedTargets + Number(targetOrderChanged) > 0 ? "warning" : "default",
      headline:
        addedTargets + removedTargets + editedTargets + Number(targetOrderChanged) > 0
          ? `${addedTargets + removedTargets + editedTargets + Number(targetOrderChanged)} alteracao(oes)`
          : "sem mudancas",
      detail: formatDetail(
        [
          addedTargets > 0 ? `${addedTargets} novo(s)` : "",
          removedTargets > 0 ? `${removedTargets} removido(s)` : "",
          editedTargets > 0 ? `${editedTargets} editado(s)` : "",
          targetOrderChanged ? "ordem alterada" : "",
        ].filter(Boolean),
        "nenhum target alterado",
      ),
      changed: addedTargets + removedTargets + editedTargets + Number(targetOrderChanged) > 0,
    },
    {
      id: "syllables",
      label: "Cards do pool",
      tone: addedSyllables + removedSyllables + changedSyllableCounts > 0 ? "warning" : "default",
      headline:
        addedSyllables + removedSyllables + changedSyllableCounts > 0
          ? `${addedSyllables + removedSyllables + changedSyllableCounts} alteracao(oes)`
          : "sem mudancas",
      detail: formatDetail(
        [
          addedSyllables > 0 ? `${addedSyllables} nova(s)` : "",
          removedSyllables > 0 ? `${removedSyllables} removida(s)` : "",
          changedSyllableCounts > 0 ? `${changedSyllableCounts} contagem(ns)` : "",
        ].filter(Boolean),
        "pool bruto derivado dos cards intacto",
      ),
      changed: addedSyllables + removedSyllables + changedSyllableCounts > 0,
    },
    {
      id: "pipeline",
      label: "Pipeline",
      tone: options.pipelineOk ? "success" : "warning",
      headline: options.pipelineOk ? "pipeline ok" : "com erro",
      detail: options.pipelineOk
        ? "preview coerente com o Deck final do runtime"
        : `${options.localIssueCount + options.pipelineIssueCount} pendencia(s) antes do save`,
      changed: !options.pipelineOk,
    },
    {
      id: "source",
      label: "Source",
      tone: options.sourceReady ? "success" : "warning",
      headline: options.sourceReady ? (options.hasSourceChanges ? "pronto para save" : "sem mudancas") : "bloqueado",
      detail: options.sourceReady
        ? options.hasSourceChanges
          ? "diff e source gerado disponiveis"
          : "arquivo bruto igual ao persistido"
        : `${options.blockerCount} bloqueador(es) ativos`,
      changed: options.hasSourceChanges,
    },
  ];

  return {
    hasMeaningfulChanges: categories.some((category) => category.changed),
    categories,
  };
}

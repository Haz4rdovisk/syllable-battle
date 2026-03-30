import { Deck } from "../../types/game";
import { ContentPipeline, DeckContentError, buildContentPipeline } from "./index";
import { RawDeckCatalogEntry } from "./decks";
import { DeckVisualThemeId, RawDeckDefinition, RawTargetDefinition } from "./types";

let draftSequence = 0;

const nextDraftId = (prefix: string) => `${prefix}-${++draftSequence}`;

const isValidIdentifier = (value: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(value);

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

export interface ContentEditorSyllableRow {
  id: string;
  syllable: string;
  count: string;
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

export interface ContentEditorDeckDraft {
  id: string;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckVisualThemeId;
  syllableRows: ContentEditorSyllableRow[];
  targets: ContentEditorTargetDraft[];
}

export type ContentEditorPreviewResult =
  | {
      ok: true;
      pipeline: ContentPipeline;
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

export function cloneRawDeckDefinition(deck: RawDeckDefinition): RawDeckDefinition {
  return {
    ...deck,
    syllables: { ...deck.syllables },
    targets: deck.targets.map((target) => ({ ...target, syllables: [...target.syllables] })),
  };
}

export function createContentEditorDeckDraft(deck: RawDeckDefinition): ContentEditorDeckDraft {
  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    emoji: deck.emoji,
    visualTheme: deck.visualTheme,
    syllableRows: Object.entries(deck.syllables).map(([syllable, count]) => ({
      id: nextDraftId("syllable"),
      syllable,
      count: String(count),
    })),
    targets: deck.targets.map((target) => ({
      id: target.id,
      name: target.name,
      copies: String(target.copies ?? 1),
      description: target.description ?? "",
      emoji: target.emoji,
      rarity: target.rarity,
      syllablesText: target.syllables.join(", "),
    })),
  };
}

function buildRawDeckDefinitionFromDraft(
  draft: ContentEditorDeckDraft,
  options: {
    preserveDraftCopies: boolean;
  },
): RawDeckDefinition {
  const { preserveDraftCopies } = options;
  const syllables = draft.syllableRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.syllable] = Number(row.count);
    return acc;
  }, {});

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
      syllables: target.syllablesText
        .split(/[\n,]/)
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0),
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

export function replaceRawDeckInCatalog(
  entries: RawDeckCatalogEntry[],
  deckId: string,
  deck: RawDeckDefinition,
) {
  return entries.map((entry) => (entry.id === deckId ? deck : cloneRawDeckDefinition(entry.deck)));
}

export function buildContentEditorPreview(
  entries: RawDeckCatalogEntry[],
  deckId: string,
  draft: ContentEditorDeckDraft,
): ContentEditorPreviewResult {
  const nextDeck = hydratePreviewRawDeckDefinitionFromDraft(draft);

  try {
    const pipeline = buildContentPipeline(replaceRawDeckInCatalog(entries, deckId, nextDeck));
    return {
      ok: true,
      pipeline,
      selectedRuntimeDeck: pipeline.runtimeDecks.find((deck) => deck.id === deckId) ?? null,
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

export function createEmptyContentEditorSyllableRow(): ContentEditorSyllableRow {
  return {
    id: nextDraftId("syllable"),
    syllable: "",
    count: "1",
  };
}

export function getContentEditorLocalIssues(draft: ContentEditorDeckDraft) {
  const issues: string[] = [];
  const seenDeckSyllables = new Set<string>();

  draft.syllableRows.forEach((row, index) => {
    const normalized = row.syllable.trim().toUpperCase();
    if (!normalized) return;
    if (seenDeckSyllables.has(normalized)) {
      issues.push(`Deck "${draft.id}" repete a silaba "${normalized}" nas linhas ${index + 1} do editor.`);
      return;
    }
    seenDeckSyllables.add(normalized);
  });

  draft.targets.forEach((target) => {
    const copies = Number(target.copies);
    if (!Number.isInteger(copies) || copies <= 0) {
      issues.push(`Target "${target.id}" precisa ter copias com inteiro positivo.`);
    }
  });

  return issues;
}

export function createRawDeckDefinitionSource(exportName: string, deck: RawDeckDefinition) {
  return `import { RawDeckDefinition } from "../types";\n\nexport const ${exportName}: RawDeckDefinition = ${serializeValue(
    deck,
  )};\n`;
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

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
      description: target.description ?? "",
      emoji: target.emoji,
      rarity: target.rarity,
      syllablesText: target.syllables.join(", "),
    })),
  };
}

export function hydrateRawDeckDefinitionFromDraft(draft: ContentEditorDeckDraft): RawDeckDefinition {
  const syllables = draft.syllableRows.reduce<Record<string, number>>((acc, row) => {
    acc[row.syllable] = Number(row.count);
    return acc;
  }, {});

  const targets: RawTargetDefinition[] = draft.targets.map((target) => {
    const description = target.description.trim();

    return {
      id: target.id,
      name: target.name,
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
  const nextDeck = hydrateRawDeckDefinitionFromDraft(draft);

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

  return issues;
}

export function createRawDeckDefinitionSource(exportName: string, deck: RawDeckDefinition) {
  return `import { RawDeckDefinition } from "../types";\n\nexport const ${exportName}: RawDeckDefinition = ${serializeValue(
    deck,
  )};\n`;
}

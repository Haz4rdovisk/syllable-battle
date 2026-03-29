import { CONFIG } from "../../logic/gameLogic";
import { Deck, Rarity, Target, normalizeRarity } from "../../types/game";
import { rawDeckCatalog } from "./decks";
import { DECK_VISUAL_THEME_CLASSES } from "./themes";
import { RawDeckDefinition, RawTargetDefinition } from "./types";

const normalizeSyllable = (value: string) =>
  value.trim().toUpperCase();

const normalizeContentId = (value: string) =>
  value.trim().toLowerCase();

const normalizeFreeText = (value: string) =>
  value.trim().replace(/\s+/g, " ");

const normalizeOptionalText = (value: string | undefined) => {
  if (value === undefined) return undefined;
  const normalized = normalizeFreeText(value);
  return normalized.length > 0 ? normalized : undefined;
};

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readRarity = (value: string): Rarity | null => {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    normalized === "comum" ||
    normalized === "raro" ||
    normalized === "epico" ||
    normalized === "lendario"
  ) {
    return normalizeRarity(value);
  }

  return null;
};

const countOccurrences = (syllables: string[]) => {
  const counts = new Map<string, number>();
  syllables.forEach((syllable) => {
    counts.set(syllable, (counts.get(syllable) ?? 0) + 1);
  });
  return counts;
};

export class DeckContentError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Deck content is invalid:\n- ${issues.join("\n- ")}`);
    this.name = "DeckContentError";
  }
}

function validateRequiredText(value: string, label: string, issues: string[]) {
  const normalized = normalizeFreeText(value);
  if (!normalized) {
    issues.push(`${label} is required.`);
  }
  return normalized;
}

function validateSyllableList(
  syllables: string[],
  label: string,
  issues: string[],
) {
  if (!Array.isArray(syllables) || syllables.length === 0) {
    issues.push(`${label} must contain at least one syllable.`);
    return [] as string[];
  }

  return syllables.map((syllable, index) => {
    const normalized = normalizeSyllable(String(syllable ?? ""));
    if (!normalized) {
      issues.push(`${label}[${index}] must be a non-empty syllable.`);
    }
    return normalized;
  });
}

function validateTarget(
  rawTarget: RawTargetDefinition,
  deckLabel: string,
  issues: string[],
): Target {
  const targetId = normalizeContentId(rawTarget.id);
  if (!targetId) {
    issues.push(`${deckLabel} target id is required.`);
  }

  const rarity = readRarity(String(rawTarget.rarity ?? ""));
  if (!rarity) {
    issues.push(`${deckLabel} target "${targetId || rawTarget.name || "unknown"}" has invalid rarity "${rawTarget.rarity}".`);
  }

  const name = validateRequiredText(String(rawTarget.name ?? ""), `${deckLabel} target "${targetId || "unknown"}" name`, issues);
  const emoji = validateRequiredText(String(rawTarget.emoji ?? ""), `${deckLabel} target "${targetId || name || "unknown"}" emoji`, issues);
  const syllables = validateSyllableList(rawTarget.syllables, `${deckLabel} target "${targetId || name || "unknown"}" syllables`, issues);

  return {
    id: targetId,
    name,
    emoji,
    syllables,
    rarity: rarity ?? "comum",
    description: normalizeOptionalText(rawTarget.description),
  };
}

function validateDeck(rawDeck: RawDeckDefinition, issues: string[]): Deck {
  const deckId = normalizeContentId(rawDeck.id);
  const deckLabel = deckId ? `deck "${deckId}"` : "deck";
  const name = validateRequiredText(String(rawDeck.name ?? ""), `${deckLabel} name`, issues);
  const description = validateRequiredText(String(rawDeck.description ?? ""), `${deckLabel} description`, issues);
  const emoji = validateRequiredText(String(rawDeck.emoji ?? ""), `${deckLabel} emoji`, issues);
  const color = DECK_VISUAL_THEME_CLASSES[rawDeck.visualTheme];

  if (!color) {
    issues.push(`${deckLabel} uses unknown visualTheme "${String(rawDeck.visualTheme)}".`);
  }

  if (!isPlainObject(rawDeck.syllables) || Object.keys(rawDeck.syllables).length === 0) {
    issues.push(`${deckLabel} must define at least one syllable count.`);
  }

  const syllables = Object.entries(rawDeck.syllables ?? {}).reduce<Record<string, number>>((acc, [rawSyllable, rawCount]) => {
    const syllable = normalizeSyllable(rawSyllable);
    const count = Number(rawCount);
    if (!syllable) {
      issues.push(`${deckLabel} contains an empty syllable key.`);
      return acc;
    }
    if (!Number.isInteger(count) || count <= 0) {
      issues.push(`${deckLabel} syllable "${syllable}" must have a positive integer count.`);
      return acc;
    }
    acc[syllable] = count;
    return acc;
  }, {});

  const normalizedTargets = Array.isArray(rawDeck.targets)
    ? rawDeck.targets.map((target) => validateTarget(target, deckLabel, issues))
    : [];

  if (!Array.isArray(rawDeck.targets) || rawDeck.targets.length === 0) {
    issues.push(`${deckLabel} must define at least one target.`);
  }

  if (normalizedTargets.length < CONFIG.targetsInPlay) {
    issues.push(`${deckLabel} must define at least ${CONFIG.targetsInPlay} targets to fill the board.`);
  }

  const totalSyllableCount = Object.values(syllables).reduce((sum, count) => sum + count, 0);
  if (totalSyllableCount < CONFIG.handSize) {
    issues.push(`${deckLabel} must have at least ${CONFIG.handSize} syllables to draw the opening hand.`);
  }

  const targetIds = new Set<string>();
  normalizedTargets.forEach((target) => {
    if (!target.id) return;
    if (targetIds.has(target.id)) {
      issues.push(`${deckLabel} has duplicate target id "${target.id}".`);
    }
    targetIds.add(target.id);

    const deckCounts = countOccurrences(
      Object.entries(syllables).flatMap(([syllable, count]) => Array.from({ length: count }, () => syllable)),
    );
    const targetCounts = countOccurrences(target.syllables);
    targetCounts.forEach((requiredCount, syllable) => {
      if ((deckCounts.get(syllable) ?? 0) < requiredCount) {
        issues.push(`${deckLabel} target "${target.id}" needs ${requiredCount}x "${syllable}", but the deck provides ${(deckCounts.get(syllable) ?? 0)}.`);
      }
    });
  });

  return {
    id: deckId,
    name,
    description,
    emoji,
    color: color ?? DECK_VISUAL_THEME_CLASSES.harvest,
    syllables,
    targets: normalizedTargets,
  };
}

export function loadDeckCatalog(rawDecks: RawDeckDefinition[]): Deck[] {
  const issues: string[] = [];
  const deckIds = new Set<string>();
  const decks = rawDecks.map((rawDeck) => validateDeck(rawDeck, issues));

  decks.forEach((deck) => {
    if (!deck.id) return;
    if (deckIds.has(deck.id)) {
      issues.push(`Duplicate deck id "${deck.id}".`);
      return;
    }
    deckIds.add(deck.id);
  });

  if (issues.length > 0) {
    throw new DeckContentError(issues);
  }

  return decks;
}

export { rawDeckCatalog };

export const DECKS = loadDeckCatalog(rawDeckCatalog);

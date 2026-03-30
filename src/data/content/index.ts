import { CONFIG } from "../../logic/gameLogic";
import { Deck, Rarity, Target, normalizeRarity } from "../../types/game";
import { rawDeckCatalog } from "./decks";
import { DECK_VISUAL_THEME_CLASSES } from "./themes";
import {
  CardDefinition,
  ContentCatalog,
  DeckDefinition,
  NormalizedContentCatalog,
  RawDeckDefinition,
  RawTargetDefinition,
  TargetDefinition,
} from "./types";

const CARD_ID_PREFIX = "syllable.";

const normalizeSyllable = (value: string) => value.trim().toUpperCase();

const normalizeContentId = (value: string) => value.trim().toLowerCase();

const normalizeFreeText = (value: string) => value.trim().replace(/\s+/g, " ");

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

const countOccurrences = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  });
  return counts;
};

const createCardId = (syllable: string) => `${CARD_ID_PREFIX}${normalizeContentId(syllable)}`;

const createIndex = <T extends { id: string }>(entries: T[]) =>
  entries.reduce<Record<string, T>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {});

export interface ContentPipeline {
  catalog: NormalizedContentCatalog;
  runtimeDecks: Deck[];
}

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

function getOrCreateCard(cardsById: Map<string, CardDefinition>, syllable: string): CardDefinition {
  const normalizedSyllable = normalizeSyllable(syllable);
  const cardId = createCardId(normalizedSyllable);
  const existing = cardsById.get(cardId);

  if (existing) {
    return existing;
  }

  const cardDefinition: CardDefinition = {
    id: cardId,
    syllable: normalizedSyllable,
  };

  cardsById.set(cardId, cardDefinition);
  return cardDefinition;
}

function validateTarget(
  rawTarget: RawTargetDefinition,
  deckLabel: string,
  issues: string[],
  cardsById: Map<string, CardDefinition>,
): TargetDefinition {
  const targetId = normalizeContentId(rawTarget.id);
  if (!targetId) {
    issues.push(`${deckLabel} target id is required.`);
  }

  const rarity = readRarity(String(rawTarget.rarity ?? ""));
  if (!rarity) {
    issues.push(
      `${deckLabel} target "${targetId || rawTarget.name || "unknown"}" has invalid rarity "${rawTarget.rarity}".`,
    );
  }

  const name = validateRequiredText(
    String(rawTarget.name ?? ""),
    `${deckLabel} target "${targetId || "unknown"}" name`,
    issues,
  );
  const emoji = validateRequiredText(
    String(rawTarget.emoji ?? ""),
    `${deckLabel} target "${targetId || name || "unknown"}" emoji`,
    issues,
  );
  const syllables = validateSyllableList(
    rawTarget.syllables,
    `${deckLabel} target "${targetId || name || "unknown"}" syllables`,
    issues,
  );

  return {
    id: targetId,
    name,
    emoji,
    cardIds: syllables.map((syllable) => getOrCreateCard(cardsById, syllable).id),
    rarity: rarity ?? "comum",
    description: normalizeOptionalText(rawTarget.description),
  };
}

function readTargetCopies(
  rawTarget: RawTargetDefinition,
  deckLabel: string,
  targetLabel: string,
  issues: string[],
) {
  if (rawTarget.copies === undefined) return 1;

  const copies = Number(rawTarget.copies);
  if (!Number.isInteger(copies) || copies <= 0) {
    issues.push(`${deckLabel} target "${targetLabel}" copies must be a positive integer.`);
    return 1;
  }

  return copies;
}

function validateDeckDefinition(
  rawDeck: RawDeckDefinition,
  issues: string[],
  cardsById: Map<string, CardDefinition>,
): { deck: DeckDefinition; targets: TargetDefinition[] } {
  const deckId = normalizeContentId(rawDeck.id);
  const deckLabel = deckId ? `deck "${deckId}"` : "deck";
  const name = validateRequiredText(String(rawDeck.name ?? ""), `${deckLabel} name`, issues);
  const description = validateRequiredText(
    String(rawDeck.description ?? ""),
    `${deckLabel} description`,
    issues,
  );
  const emoji = validateRequiredText(String(rawDeck.emoji ?? ""), `${deckLabel} emoji`, issues);

  if (!DECK_VISUAL_THEME_CLASSES[rawDeck.visualTheme]) {
    issues.push(`${deckLabel} uses unknown visualTheme "${String(rawDeck.visualTheme)}".`);
  }

  if (!isPlainObject(rawDeck.syllables) || Object.keys(rawDeck.syllables).length === 0) {
    issues.push(`${deckLabel} must define at least one syllable count.`);
  }

  const cardPool = Object.entries(rawDeck.syllables ?? {}).reduce<Record<string, number>>(
    (acc, [rawSyllable, rawCount]) => {
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

      const card = getOrCreateCard(cardsById, syllable);
      acc[card.id] = count;
      return acc;
    },
    {},
  );

  const normalizedTargets = Array.isArray(rawDeck.targets)
    ? rawDeck.targets.map((target) => {
        const normalizedTarget = validateTarget(target, deckLabel, issues, cardsById);
        return {
          target: normalizedTarget,
          copies: readTargetCopies(
            target,
            deckLabel,
            normalizedTarget.id || normalizedTarget.name || "unknown",
            issues,
          ),
        };
      })
    : [];

  if (!Array.isArray(rawDeck.targets) || rawDeck.targets.length === 0) {
    issues.push(`${deckLabel} must define at least one target.`);
  }

  const totalTargetCopies = normalizedTargets.reduce((sum, entry) => sum + entry.copies, 0);
  if (totalTargetCopies < CONFIG.targetsInPlay) {
    issues.push(`${deckLabel} must define at least ${CONFIG.targetsInPlay} targets to fill the board.`);
  }

  const totalCardCount = Object.values(cardPool).reduce((sum, count) => sum + count, 0);
  if (totalCardCount < CONFIG.handSize) {
    issues.push(`${deckLabel} must have at least ${CONFIG.handSize} syllables to draw the opening hand.`);
  }

  const targetIds = new Set<string>();
  normalizedTargets.forEach(({ target }) => {
    if (!target.id) return;
    if (targetIds.has(target.id)) {
      issues.push(`${deckLabel} has duplicate target id "${target.id}".`);
    }
    targetIds.add(target.id);

    const targetCounts = countOccurrences(target.cardIds);
    targetCounts.forEach((requiredCount, cardId) => {
      const availableCount = cardPool[cardId] ?? 0;
      if (availableCount < requiredCount) {
        const syllable = cardsById.get(cardId)?.syllable ?? cardId;
        issues.push(
          `${deckLabel} target "${target.id}" needs ${requiredCount}x "${syllable}", but the deck provides ${availableCount}.`,
        );
      }
    });
  });

  return {
    deck: {
      id: deckId,
      name,
      description,
      emoji,
      visualTheme: rawDeck.visualTheme,
      cardPool,
      targetIds: normalizedTargets.flatMap(({ target, copies }) => Array.from({ length: copies }, () => target.id)),
    },
    targets: normalizedTargets.map(({ target }) => target),
  };
}

export function loadContentCatalog(rawDecks: RawDeckDefinition[]): NormalizedContentCatalog {
  const issues: string[] = [];
  const cardsRegistry = new Map<string, CardDefinition>();
  const decks: DeckDefinition[] = [];
  const targets: TargetDefinition[] = [];
  const deckIds = new Set<string>();
  const targetIds = new Set<string>();

  rawDecks.forEach((rawDeck) => {
    const normalized = validateDeckDefinition(rawDeck, issues, cardsRegistry);
    decks.push(normalized.deck);
    targets.push(...normalized.targets);
  });

  decks.forEach((deck) => {
    if (!deck.id) return;
    if (deckIds.has(deck.id)) {
      issues.push(`Duplicate deck id "${deck.id}".`);
      return;
    }
    deckIds.add(deck.id);
  });

  targets.forEach((target) => {
    if (!target.id) return;
    if (targetIds.has(target.id)) {
      issues.push(`Duplicate target id "${target.id}".`);
      return;
    }
    targetIds.add(target.id);
  });

  const cards = [...cardsRegistry.values()];
  const catalog: ContentCatalog = {
    cards,
    targets,
    decks,
  };

  const normalizedCatalog: NormalizedContentCatalog = {
    ...catalog,
    cardsById: createIndex(cards),
    targetsById: createIndex(targets),
    decksById: createIndex(decks),
  };

  normalizedCatalog.decks.forEach((deck) => {
    deck.targetIds.forEach((targetId) => {
      if (!normalizedCatalog.targetsById[targetId]) {
        issues.push(`Deck "${deck.id}" references unknown target "${targetId}".`);
      }
    });

    Object.keys(deck.cardPool).forEach((cardId) => {
      if (!normalizedCatalog.cardsById[cardId]) {
        issues.push(`Deck "${deck.id}" references unknown card "${cardId}".`);
      }
    });
  });

  normalizedCatalog.targets.forEach((target) => {
    target.cardIds.forEach((cardId) => {
      if (!normalizedCatalog.cardsById[cardId]) {
        issues.push(`Target "${target.id}" references unknown card "${cardId}".`);
      }
    });
  });

  if (issues.length > 0) {
    throw new DeckContentError(issues);
  }

  return normalizedCatalog;
}

export function adaptTargetDefinitionToRuntimeTarget(
  target: TargetDefinition,
  catalog: NormalizedContentCatalog,
): Target {
  return {
    id: target.id,
    name: target.name,
    emoji: target.emoji,
    syllables: target.cardIds.map((cardId) => catalog.cardsById[cardId]?.syllable ?? cardId),
    rarity: target.rarity,
    description: target.description,
  };
}

export function adaptDeckDefinitionToRuntimeDeck(
  deck: DeckDefinition,
  catalog: NormalizedContentCatalog,
): Deck {
  const color = DECK_VISUAL_THEME_CLASSES[deck.visualTheme] ?? DECK_VISUAL_THEME_CLASSES.harvest;
  const syllables = Object.entries(deck.cardPool).reduce<Record<string, number>>((acc, [cardId, count]) => {
    const syllable = catalog.cardsById[cardId]?.syllable;
    if (!syllable) return acc;
    acc[syllable] = (acc[syllable] ?? 0) + count;
    return acc;
  }, {});

  return {
    id: deck.id,
    name: deck.name,
    description: deck.description,
    emoji: deck.emoji,
    color,
    syllables,
    targets: deck.targetIds.map((targetId) =>
      adaptTargetDefinitionToRuntimeTarget(catalog.targetsById[targetId], catalog),
    ),
  };
}

export function adaptCatalogToRuntimeDecks(catalog: NormalizedContentCatalog): Deck[] {
  return catalog.decks.map((deck) => adaptDeckDefinitionToRuntimeDeck(deck, catalog));
}

export function buildContentPipeline(rawDecks: RawDeckDefinition[]): ContentPipeline {
  const catalog = loadContentCatalog(rawDecks);
  return {
    catalog,
    runtimeDecks: adaptCatalogToRuntimeDecks(catalog),
  };
}

export function loadDeckCatalog(rawDecks: RawDeckDefinition[]): Deck[] {
  return buildContentPipeline(rawDecks).runtimeDecks;
}

export { rawDeckCatalog };
export * from "./selectors";

export const CONTENT_PIPELINE = buildContentPipeline(rawDeckCatalog);
export const CONTENT_CATALOG = CONTENT_PIPELINE.catalog;
export const DECKS = CONTENT_PIPELINE.runtimeDecks;

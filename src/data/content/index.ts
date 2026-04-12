import { CONFIG } from "../../logic/gameLogic";
import { Deck, Rarity, Target, normalizeRarity } from "../../types/game";
import { rawDeckCatalog } from "./decks";
import { rawTargetCatalog } from "./targets";
import { DECK_VISUAL_THEME_CLASSES } from "./themes";
import {
  CardCatalogEntry,
  CardDefinition,
  ContentCatalog,
  DeckDefinition,
  DeckModel,
  DeckModelCardEntry,
  DeckModelTargetInstance,
  NormalizedContentCatalog,
  RawTargetDefinition,
  RawDeckDefinition,
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
  cardCatalog: CardCatalogEntry[];
  cardCatalogById: Record<string, CardCatalogEntry>;
  deckModels: DeckModel[];
  deckModelsById: Record<string, DeckModel>;
  runtimeDecks: Deck[];
  runtimeDecksById: Record<string, Deck>;
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

function validateTargetDefinition(
  rawTarget: RawTargetDefinition,
  issues: string[],
  cardsById: Map<string, CardDefinition>,
): TargetDefinition {
  const targetId = normalizeContentId(rawTarget.id);
  if (!targetId) {
    issues.push(`Target id is required.`);
  }

  const rarity = readRarity(String(rawTarget.rarity ?? ""));
  if (!rarity) {
    issues.push(
      `Target "${targetId || rawTarget.name || "unknown"}" has invalid rarity "${rawTarget.rarity}".`,
    );
  }

  const name = validateRequiredText(
    String(rawTarget.name ?? ""),
    `Target "${targetId || "unknown"}" name`,
    issues,
  );
  const emoji = validateRequiredText(
    String(rawTarget.emoji ?? ""),
    `Target "${targetId || name || "unknown"}" emoji`,
    issues,
  );
  const superclass = normalizeContentId(String(rawTarget.superclass ?? "animal")) || "animal";
  const classKey = normalizeContentId(String(rawTarget.classKey ?? "fazenda")) || "fazenda";
  const syllables = validateSyllableList(
    rawTarget.syllables,
    `Target "${targetId || name || "unknown"}" syllables`,
    issues,
  );

  return {
    id: targetId,
    name,
    emoji,
    cardIds: syllables.map((syllable) => getOrCreateCard(cardsById, syllable).id),
    rarity: rarity ?? "comum",
    description: normalizeOptionalText(rawTarget.description),
    superclass,
    classKey,
  };
}

function validateDeckDefinition(
  rawDeck: RawDeckDefinition,
  issues: string[],
  cardsById: Map<string, CardDefinition>,
  targetsById: Record<string, TargetDefinition>,
): DeckDefinition {
  const deckId = normalizeContentId(rawDeck.id);
  const deckLabel = deckId ? `deck "${deckId}"` : "deck";
  const name = validateRequiredText(String(rawDeck.name ?? ""), `${deckLabel} name`, issues);
  const description = validateRequiredText(
    String(rawDeck.description ?? ""),
    `${deckLabel} description`,
    issues,
  );
  const emoji = validateRequiredText(String(rawDeck.emoji ?? ""), `${deckLabel} emoji`, issues);
  const superclass = normalizeContentId(String(rawDeck.superclass ?? "animal")) || "animal";

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

  const normalizedTargetIds = Array.isArray(rawDeck.targetIds)
    ? rawDeck.targetIds.map((targetId, index) => {
        const normalizedTargetId = normalizeContentId(String(targetId ?? ""));
        if (!normalizedTargetId) {
          issues.push(`${deckLabel} targetIds[${index}] must reference a non-empty target id.`);
        }
        return normalizedTargetId;
      })
    : [];

  if (!Array.isArray(rawDeck.targetIds) || rawDeck.targetIds.length === 0) {
    issues.push(`${deckLabel} must define at least one target.`);
  }

  const totalTargetCopies = normalizedTargetIds.length;
  if (totalTargetCopies < CONFIG.targetsInPlay) {
    issues.push(`${deckLabel} must define at least ${CONFIG.targetsInPlay} targets to fill the board.`);
  }

  const totalCardCount = Object.values(cardPool).reduce((sum, count) => sum + count, 0);
  if (totalCardCount < CONFIG.handSize) {
    issues.push(`${deckLabel} must have at least ${CONFIG.handSize} syllables to draw the opening hand.`);
  }

  [...new Set(normalizedTargetIds)].forEach((targetId) => {
    if (!targetId) return;
    const target = targetsById[targetId];
    if (!target) {
      issues.push(`${deckLabel} references unknown target "${targetId}".`);
      return;
    }

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
    id: deckId,
    name,
    description,
    emoji,
    superclass,
    visualTheme: rawDeck.visualTheme,
    cardIds: Object.keys(cardPool),
    cardPool,
    targetIds: normalizedTargetIds,
  };
}

function validateTargetCatalog(
  rawTargets: RawTargetDefinition[],
  issues: string[],
  cardsById: Map<string, CardDefinition>,
) {
  const targetIds = new Set<string>();

  return rawTargets.map((rawTarget) => {
    const normalizedTarget = validateTargetDefinition(rawTarget, issues, cardsById);
    if (normalizedTarget.id) {
      if (targetIds.has(normalizedTarget.id)) {
        issues.push(`Duplicate target id "${normalizedTarget.id}".`);
      } else {
        targetIds.add(normalizedTarget.id);
      }
    }
    return normalizedTarget;
  });
}

export function loadContentCatalog(
  rawDecks: RawDeckDefinition[],
  rawTargets: RawTargetDefinition[],
): NormalizedContentCatalog {
  const issues: string[] = [];
  const cardsRegistry = new Map<string, CardDefinition>();
  const targets = validateTargetCatalog(rawTargets, issues, cardsRegistry);
  const targetsById = createIndex(targets);
  const decks = rawDecks.map((rawDeck) =>
    validateDeckDefinition(rawDeck, issues, cardsRegistry, targetsById),
  );
  const deckIds = new Set<string>();

  decks.forEach((deck) => {
    if (!deck.id) return;
    if (deckIds.has(deck.id)) {
      issues.push(`Duplicate deck id "${deck.id}".`);
      return;
    }
    deckIds.add(deck.id);
  });

  const cards = [...cardsRegistry.values()].sort((left, right) =>
    left.syllable.localeCompare(right.syllable),
  );
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
    deck.cardIds.forEach((cardId) => {
      if (!normalizedCatalog.cardsById[cardId]) {
        issues.push(`Deck "${deck.id}" references unknown card "${cardId}".`);
      }
    });

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

function buildDeckModelTargetDefinitions(
  deck: DeckDefinition,
  catalog: NormalizedContentCatalog,
): TargetDefinition[] {
  return [...new Set(deck.targetIds)]
    .map((targetId) => catalog.targetsById[targetId] ?? null)
    .filter((target): target is TargetDefinition => !!target);
}

function buildDeckModelTargetInstances(
  deck: DeckDefinition,
  catalog: NormalizedContentCatalog,
): DeckModelTargetInstance[] {
  return deck.targetIds
    .map((targetId, instanceIndex) => {
      const target = catalog.targetsById[targetId];
      if (!target) return null;

      return {
        instanceKey: `${target.id}-${instanceIndex}`,
        instanceIndex,
        targetId,
        target,
      };
    })
    .filter((entry): entry is DeckModelTargetInstance => !!entry);
}

function buildDeckModelCardEntries(
  deck: DeckDefinition,
  targetDefinitions: TargetDefinition[],
  catalog: NormalizedContentCatalog,
): DeckModelCardEntry[] {
  return deck.cardIds
    .map((cardId) => {
      const card = catalog.cardsById[cardId];
      const copiesInDeck = deck.cardPool[cardId] ?? 0;
      if (!card) return null;

      return {
        cardId,
        card,
        copiesInDeck,
        usedByTargets: targetDefinitions.filter((target) => target.cardIds.includes(cardId)),
      };
    })
    .filter((entry): entry is DeckModelCardEntry => !!entry)
    .sort((left, right) => {
      if (right.copiesInDeck !== left.copiesInDeck) return right.copiesInDeck - left.copiesInDeck;
      if (right.usedByTargets.length !== left.usedByTargets.length) {
        return right.usedByTargets.length - left.usedByTargets.length;
      }
      return left.card.syllable.localeCompare(right.card.syllable);
    });
}

function buildCardCatalogEntry(
  card: CardDefinition,
  catalog: NormalizedContentCatalog,
): CardCatalogEntry {
  const decksUsingCard = catalog.decks.filter((deck) => deck.cardIds.includes(card.id));
  const targetsUsingCard = catalog.targets.filter((target) => target.cardIds.includes(card.id));

  return {
    id: card.id,
    card,
    deckIds: decksUsingCard.map((deck) => deck.id),
    targetIds: targetsUsingCard.map((target) => target.id),
    copiesByDeckId: decksUsingCard.reduce<Record<string, number>>((acc, deck) => {
      acc[deck.id] = deck.cardPool[card.id] ?? 0;
      return acc;
    }, {}),
    totalCopies: decksUsingCard.reduce((sum, deck) => sum + (deck.cardPool[card.id] ?? 0), 0),
  };
}

export function buildCardCatalog(catalog: NormalizedContentCatalog): CardCatalogEntry[] {
  return catalog.cards.map((card) => buildCardCatalogEntry(card, catalog));
}

export function createDeckModel(
  deck: DeckDefinition,
  catalog: NormalizedContentCatalog,
): DeckModel {
  const targetDefinitions = buildDeckModelTargetDefinitions(deck, catalog);

  return {
    id: deck.id,
    definition: deck,
    cards: buildDeckModelCardEntries(deck, targetDefinitions, catalog),
    targetDefinitions,
    targetInstances: buildDeckModelTargetInstances(deck, catalog),
  };
}

export function buildDeckModels(catalog: NormalizedContentCatalog): DeckModel[] {
  return catalog.decks.map((deck) => createDeckModel(deck, catalog));
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

export function adaptDeckModelToRuntimeDeck(
  deckModel: DeckModel,
  catalog: NormalizedContentCatalog,
): Deck {
  const { definition } = deckModel;
  const color = DECK_VISUAL_THEME_CLASSES[definition.visualTheme] ?? DECK_VISUAL_THEME_CLASSES.harvest;
  const syllables = deckModel.cards.reduce<Record<string, number>>((acc, entry) => {
    const syllable = catalog.cardsById[entry.cardId]?.syllable;
    if (!syllable) return acc;
    acc[syllable] = (acc[syllable] ?? 0) + entry.copiesInDeck;
    return acc;
  }, {});

  return {
    id: definition.id,
    name: definition.name,
    description: definition.description,
    emoji: definition.emoji,
    color,
    syllables,
    targets: deckModel.targetInstances.map((entry) => adaptTargetDefinitionToRuntimeTarget(entry.target, catalog)),
  };
}

export function adaptDeckDefinitionToRuntimeDeck(
  deck: DeckDefinition,
  catalog: NormalizedContentCatalog,
): Deck {
  return adaptDeckModelToRuntimeDeck(createDeckModel(deck, catalog), catalog);
}

export function adaptDeckModelsToRuntimeDecks(
  deckModels: DeckModel[],
  catalog: NormalizedContentCatalog,
): Deck[] {
  return deckModels.map((deckModel) => adaptDeckModelToRuntimeDeck(deckModel, catalog));
}

export function adaptCatalogToRuntimeDecks(catalog: NormalizedContentCatalog): Deck[] {
  return adaptDeckModelsToRuntimeDecks(buildDeckModels(catalog), catalog);
}

export function buildContentPipeline(
  rawDecks: RawDeckDefinition[],
  rawTargets: RawTargetDefinition[],
): ContentPipeline {
  const catalog = loadContentCatalog(rawDecks, rawTargets);
  const cardCatalog = buildCardCatalog(catalog);
  const deckModels = buildDeckModels(catalog);
  const runtimeDecks = adaptDeckModelsToRuntimeDecks(deckModels, catalog);
  return {
    catalog,
    cardCatalog,
    cardCatalogById: createIndex(cardCatalog),
    deckModels,
    deckModelsById: createIndex(deckModels),
    runtimeDecks,
    runtimeDecksById: createIndex(runtimeDecks),
  };
}

export function loadDeckCatalog(rawDecks: RawDeckDefinition[], rawTargets: RawTargetDefinition[]): Deck[] {
  return buildContentPipeline(rawDecks, rawTargets).runtimeDecks;
}

export { rawDeckCatalog };
export { rawTargetCatalog };
export * from "./helpers";
export * from "./readModels";
export * from "./selectors";
export * from "./battleSetup";
export * from "./playerCollection";
export * from "./playerInventoryLocal";

export const CONTENT_PIPELINE = buildContentPipeline(rawDeckCatalog, rawTargetCatalog);
export const CONTENT_CATALOG = CONTENT_PIPELINE.catalog;
export const CARD_CATALOG = CONTENT_PIPELINE.cardCatalog;
export const CARD_CATALOG_BY_ID = CONTENT_PIPELINE.cardCatalogById;
// Central read layer for app/tooling outside the battle runtime.
export const DECK_MODELS = CONTENT_PIPELINE.deckModels;
export const DECK_MODELS_BY_ID = CONTENT_PIPELINE.deckModelsById;
// Legacy runtime projection kept for the current battle implementation.
export const DECKS = CONTENT_PIPELINE.runtimeDecks;
export const RUNTIME_DECKS_BY_ID = CONTENT_PIPELINE.runtimeDecksById;

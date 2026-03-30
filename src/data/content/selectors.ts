import {
  CardDefinition,
  DeckDefinition,
  NormalizedContentCatalog,
  TargetDefinition,
} from "./types";

export interface CatalogCardUsage {
  card: CardDefinition;
  copiesInDeck: number;
  usedByTargets: TargetDefinition[];
}

export interface CatalogTargetInstance {
  instanceKey: string;
  instanceIndex: number;
  targetId: string;
  target: TargetDefinition;
}

export interface CatalogCardReuse {
  card: CardDefinition;
  deckCount: number;
  targetCount: number;
  totalCopies: number;
}

export interface CatalogSharedTarget {
  target: TargetDefinition;
  deckIds: string[];
}

export function getCatalogDeckById(catalog: NormalizedContentCatalog, deckId: string) {
  return catalog.decksById[deckId] ?? null;
}

export function getCatalogTargetById(catalog: NormalizedContentCatalog, targetId: string) {
  return catalog.targetsById[targetId] ?? null;
}

export function getCatalogCardById(catalog: NormalizedContentCatalog, cardId: string) {
  return catalog.cardsById[cardId] ?? null;
}

export function getTargetsForDeck(catalog: NormalizedContentCatalog, deckId: string): TargetDefinition[] {
  const deck = getCatalogDeckById(catalog, deckId);
  if (!deck) return [];

  return [...new Set(deck.targetIds)]
    .map((targetId) => getCatalogTargetById(catalog, targetId))
    .filter((target): target is TargetDefinition => !!target);
}

export function getTargetInstancesForDeck(
  catalog: NormalizedContentCatalog,
  deckId: string,
): CatalogTargetInstance[] {
  const deck = getCatalogDeckById(catalog, deckId);
  if (!deck) return [];

  return deck.targetIds
    .map((targetId, instanceIndex) => {
      const target = getCatalogTargetById(catalog, targetId);
      if (!target) return null;

      return {
        instanceKey: `${target.id}-${instanceIndex}`,
        instanceIndex,
        targetId,
        target,
      };
    })
    .filter((entry): entry is CatalogTargetInstance => !!entry);
}

export function getCardsForDeck(catalog: NormalizedContentCatalog, deckId: string): CatalogCardUsage[] {
  const deck = getCatalogDeckById(catalog, deckId);
  if (!deck) return [];

  const deckTargets = getTargetsForDeck(catalog, deckId);

  return Object.entries(deck.cardPool)
    .map(([cardId, copiesInDeck]) => {
      const card = getCatalogCardById(catalog, cardId);
      if (!card) return null;

      return {
        card,
        copiesInDeck,
        usedByTargets: deckTargets.filter((target) => target.cardIds.includes(cardId)),
      };
    })
    .filter((entry): entry is CatalogCardUsage => !!entry)
    .sort((left, right) => {
      if (right.copiesInDeck !== left.copiesInDeck) return right.copiesInDeck - left.copiesInDeck;
      if (right.usedByTargets.length !== left.usedByTargets.length) {
        return right.usedByTargets.length - left.usedByTargets.length;
      }
      return left.card.syllable.localeCompare(right.card.syllable);
    });
}

export function getTargetsUsingCard(catalog: NormalizedContentCatalog, cardId: string): TargetDefinition[] {
  return catalog.targets.filter((target) => target.cardIds.includes(cardId));
}

export function getDecksUsingCard(catalog: NormalizedContentCatalog, cardId: string): DeckDefinition[] {
  return catalog.decks.filter((deck) => (deck.cardPool[cardId] ?? 0) > 0);
}

export function getMostReusedCards(
  catalog: NormalizedContentCatalog,
  limit = 5,
): CatalogCardReuse[] {
  return catalog.cards
    .map((card) => {
      const decksUsingCard = getDecksUsingCard(catalog, card.id);
      const targetsUsingCard = getTargetsUsingCard(catalog, card.id);
      const totalCopies = decksUsingCard.reduce((sum, deck) => sum + (deck.cardPool[card.id] ?? 0), 0);

      return {
        card,
        deckCount: decksUsingCard.length,
        targetCount: targetsUsingCard.length,
        totalCopies,
      };
    })
    .sort((left, right) => {
      if (right.deckCount !== left.deckCount) return right.deckCount - left.deckCount;
      if (right.targetCount !== left.targetCount) return right.targetCount - left.targetCount;
      if (right.totalCopies !== left.totalCopies) return right.totalCopies - left.totalCopies;
      return left.card.syllable.localeCompare(right.card.syllable);
    })
    .slice(0, limit);
}

export function getSharedTargetsBetweenDecks(
  catalog: NormalizedContentCatalog,
  deckId: string,
): CatalogSharedTarget[] {
  const deck = getCatalogDeckById(catalog, deckId);
  if (!deck) return [];

  return getTargetsForDeck(catalog, deckId)
    .map((target) => {
      const deckIds = catalog.decks
        .filter((entry) => entry.targetIds.includes(target.id))
        .map((entry) => entry.id);

      return {
        target,
        deckIds,
      };
    })
    .filter((entry) => entry.deckIds.length > 1)
    .sort((left, right) => {
      if (right.deckIds.length !== left.deckIds.length) return right.deckIds.length - left.deckIds.length;
      return left.target.name.localeCompare(right.target.name);
    });
}

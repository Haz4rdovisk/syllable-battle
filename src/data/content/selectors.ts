import {
  CardCatalogEntry,
  CardDefinition,
  DeckDefinition,
  DeckModel,
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

export function getCardCatalogEntryById(
  cardCatalogById: Record<string, CardCatalogEntry>,
  cardId: string,
) {
  return cardCatalogById[cardId] ?? null;
}

export function getDeckModelById(
  deckModelsById: Record<string, DeckModel>,
  deckId: string,
) {
  return deckModelsById[deckId] ?? null;
}

export function getTargetsForDeckModel(deckModel: DeckModel): TargetDefinition[] {
  return deckModel.targetDefinitions;
}

export function getTargetInstancesForDeckModel(
  deckModel: DeckModel,
): CatalogTargetInstance[] {
  return deckModel.targetInstances.map((entry) => ({
    instanceKey: entry.instanceKey,
    instanceIndex: entry.instanceIndex,
    targetId: entry.targetId,
    target: entry.target,
  }));
}

export function getCardsForDeckModel(deckModel: DeckModel): CatalogCardUsage[] {
  return deckModel.cards.map((entry) => ({
    card: entry.card,
    copiesInDeck: entry.copiesInDeck,
    usedByTargets: entry.usedByTargets,
  }));
}

export function getCardCatalogEntriesForDeckModel(
  cardCatalogById: Record<string, CardCatalogEntry>,
  deckModel: DeckModel,
): CardCatalogEntry[] {
  return deckModel.definition.cardIds
    .map((cardId) => getCardCatalogEntryById(cardCatalogById, cardId))
    .filter((entry): entry is CardCatalogEntry => !!entry);
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

export function getDeckModelsUsingCard(deckModels: DeckModel[], cardId: string): DeckModel[] {
  return deckModels.filter((deckModel) =>
    deckModel.cards.some((entry) => entry.card.id === cardId && entry.copiesInDeck > 0),
  );
}

export function getDecksUsingCard(catalog: NormalizedContentCatalog, cardId: string): DeckDefinition[] {
  return catalog.decks.filter((deck) => (deck.cardPool[cardId] ?? 0) > 0);
}

export function getMostReusedCards(
  catalog: NormalizedContentCatalog,
  deckModels: DeckModel[],
  limit = 5,
): CatalogCardReuse[] {
  return catalog.cards
    .map((card) => {
      const decksUsingCard = getDeckModelsUsingCard(deckModels, card.id);
      const targetsUsingCard = getTargetsUsingCard(catalog, card.id);
      const totalCopies = decksUsingCard.reduce((sum, deckModel) => {
        const cardEntry = deckModel.cards.find((entry) => entry.card.id === card.id);
        return sum + (cardEntry?.copiesInDeck ?? 0);
      }, 0);

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

export function getSharedTargetsBetweenDeckModels(
  deckModel: DeckModel,
  deckModels: DeckModel[],
): CatalogSharedTarget[] {
  return getTargetsForDeckModel(deckModel)
    .map((target) => {
      const deckIds = deckModels
        .filter((entry) => entry.targetInstances.some((instance) => instance.targetId === target.id))
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

import { CONTENT_PIPELINE } from "../data/content";
import { Deck, GameMode } from "../types/game";
import {
  DeckDefinition,
  DeckModel,
  DeckModelTargetInstance,
} from "../data/content/types";

export interface AppResolvedDeck {
  deckId: string;
  deckModel: DeckModel;
  runtimeDeck: Deck;
  definition: DeckDefinition;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckDefinition["visualTheme"];
  runtimeColorClass: string;
  targetCardCount: number;
  syllableReserveCount: number;
  previewTargets: DeckModelTargetInstance[];
}

export interface AppResolvedDeckPair {
  localDeck: AppResolvedDeck;
  remoteDeck: AppResolvedDeck;
}

export interface AppBattleDeckSelection {
  playerDeck: AppResolvedDeck | null;
  enemyDeck: AppResolvedDeck | null;
  fallbackEnemyDeck: AppResolvedDeck | null;
}

export const APP_RESOLVED_DECKS: AppResolvedDeck[] = CONTENT_PIPELINE.deckModels
  .map((deckModel) => {
    const runtimeDeck = CONTENT_PIPELINE.runtimeDecksById[deckModel.id] ?? null;
    if (!runtimeDeck) return null;

    return {
      deckId: deckModel.id,
      deckModel,
      runtimeDeck,
      definition: deckModel.definition,
      name: deckModel.definition.name,
      description: deckModel.definition.description,
      emoji: deckModel.definition.emoji,
      visualTheme: deckModel.definition.visualTheme,
      runtimeColorClass: runtimeDeck.color,
      targetCardCount: deckModel.targetInstances.length,
      syllableReserveCount: deckModel.cards.reduce((total, entry) => total + entry.copiesInDeck, 0),
      previewTargets: deckModel.targetInstances.slice(0, 4),
    };
  })
  .filter((entry): entry is AppResolvedDeck => !!entry);

export const APP_RESOLVED_DECKS_BY_ID = APP_RESOLVED_DECKS.reduce<Record<string, AppResolvedDeck>>(
  (acc, entry) => {
    acc[entry.deckId] = entry;
    return acc;
  },
  {},
);

export function resolveAppDeck(deckId: string | null | undefined) {
  if (!deckId) return null;
  return APP_RESOLVED_DECKS_BY_ID[deckId] ?? null;
}

export function resolveAppDeckPair(
  localDeckId: string | null | undefined,
  remoteDeckId: string | null | undefined,
): AppResolvedDeckPair | null {
  const localDeck = resolveAppDeck(localDeckId);
  const remoteDeck = resolveAppDeck(remoteDeckId);
  if (!localDeck || !remoteDeck) return null;
  return {
    localDeck,
    remoteDeck,
  };
}

export function getFirstResolvedDeck() {
  return APP_RESOLVED_DECKS[0] ?? null;
}

export function getRandomResolvedDeck() {
  if (APP_RESOLVED_DECKS.length === 0) return null;
  return APP_RESOLVED_DECKS[Math.floor(Math.random() * APP_RESOLVED_DECKS.length)] ?? null;
}

export function getFallbackResolvedEnemyDeck(mode: GameMode) {
  return mode === "multiplayer" ? getFirstResolvedDeck() : getRandomResolvedDeck();
}

export function resolveAppBattleDeckSelection(
  mode: GameMode,
  playerDeckId: string | null | undefined,
  enemyDeckId: string | null | undefined,
): AppBattleDeckSelection {
  return {
    playerDeck: resolveAppDeck(playerDeckId),
    enemyDeck: resolveAppDeck(enemyDeckId),
    fallbackEnemyDeck: getFallbackResolvedEnemyDeck(mode),
  };
}

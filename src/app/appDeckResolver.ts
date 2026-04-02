import { CONTENT_PIPELINE, createBattleDeckSpec, createBattleSetupSpec } from "../data/content";
import type { BattleDeckSpec, BattleSetupSpec } from "../data/content";
import type { GameMode, BattleSide } from "../types/game";
import {
  DeckDefinition,
  DeckModel,
  DeckModelTargetInstance,
} from "../data/content/types";

export interface AppResolvedDeck {
  deckId: string;
  deckModel: DeckModel;
  battleDeck: BattleDeckSpec;
  definition: DeckDefinition;
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckDefinition["visualTheme"];
  targetCardCount: number;
  syllableReserveCount: number;
  previewTargets: DeckModelTargetInstance[];
}

export interface AppResolvedDeckPair {
  localDeck: AppResolvedDeck;
  remoteDeck: AppResolvedDeck;
}

export interface ResolveAppBattleSetupParams {
  mode: GameMode;
  localDeckId: string | null | undefined;
  remoteDeckId: string | null | undefined;
  localSide?: BattleSide;
  roomId?: string;
  allowFallbackRemoteDeck?: boolean;
}

export interface AppBattleSetupSelection {
  localDeck: AppResolvedDeck | null;
  remoteDeck: AppResolvedDeck | null;
  fallbackRemoteDeck: AppResolvedDeck | null;
  battleSetup: BattleSetupSpec | null;
}

export const APP_RESOLVED_DECKS: AppResolvedDeck[] = CONTENT_PIPELINE.deckModels.map((deckModel) => ({
  deckId: deckModel.id,
  deckModel,
  battleDeck: createBattleDeckSpec(deckModel),
  definition: deckModel.definition,
  name: deckModel.definition.name,
  description: deckModel.definition.description,
  emoji: deckModel.definition.emoji,
  visualTheme: deckModel.definition.visualTheme,
  targetCardCount: deckModel.targetInstances.length,
  syllableReserveCount: deckModel.cards.reduce((total, entry) => total + entry.copiesInDeck, 0),
  previewTargets: deckModel.targetInstances.slice(0, 4),
}));

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

function createBattleSetupFromResolvedDecks({
  mode,
  localDeck,
  remoteDeck,
  localSide = "player",
  roomId,
}: {
  mode: GameMode;
  localDeck: AppResolvedDeck;
  remoteDeck: AppResolvedDeck;
  localSide?: BattleSide;
  roomId?: string;
}): BattleSetupSpec {
  return createBattleSetupSpec({
    mode,
    roomId,
    playerDeck: localSide === "player" ? localDeck.deckModel : remoteDeck.deckModel,
    enemyDeck: localSide === "player" ? remoteDeck.deckModel : localDeck.deckModel,
  });
}

export function resolveAppBattleSetup({
  mode,
  localDeckId,
  remoteDeckId,
  localSide = "player",
  roomId,
  allowFallbackRemoteDeck = false,
}: ResolveAppBattleSetupParams): BattleSetupSpec | null {
  const localDeck = resolveAppDeck(localDeckId);
  if (!localDeck) return null;

  const remoteDeck =
    resolveAppDeck(remoteDeckId) ??
    (allowFallbackRemoteDeck ? getFallbackResolvedEnemyDeck(mode) : null) ??
    (allowFallbackRemoteDeck ? localDeck : null);
  if (!remoteDeck) return null;

  return createBattleSetupFromResolvedDecks({
    mode,
    localDeck,
    remoteDeck,
    localSide,
    roomId,
  });
}

export function resolveAppBattleSetupSelection({
  mode,
  localDeckId,
  remoteDeckId,
  localSide = "player",
  roomId,
}: ResolveAppBattleSetupParams): AppBattleSetupSelection {
  const localDeck = resolveAppDeck(localDeckId);
  const remoteDeck = resolveAppDeck(remoteDeckId);
  const fallbackRemoteDeck = getFallbackResolvedEnemyDeck(mode);

  return {
    localDeck,
    remoteDeck,
    fallbackRemoteDeck,
    battleSetup: resolveAppBattleSetup({
      mode,
      localDeckId,
      remoteDeckId,
      localSide,
      roomId,
      allowFallbackRemoteDeck: true,
    }),
  };
}

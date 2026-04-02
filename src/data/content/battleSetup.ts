import type { GameMode, Rarity } from "../../types/game";
import type { DeckModel, DeckModelCardEntry, DeckModelTargetInstance, DeckVisualThemeId } from "./types";

export interface BattleCardSpec {
  cardId: string;
  syllable: string;
  label?: string;
  copiesInDeck: number;
}

export interface BattleTargetSpec {
  targetInstanceId: string;
  targetInstanceIndex: number;
  targetId: string;
  name: string;
  emoji: string;
  rarity: Rarity;
  description?: string;
  requiredCardIds: string[];
  requiredSyllables: string[];
  taxonomy: {
    superclass: string;
    classKey: string;
  };
}

export interface BattleDeckPresentationSpec {
  name: string;
  description: string;
  emoji: string;
  visualTheme: DeckVisualThemeId;
}

export interface BattleDeckSpec {
  deckId: string;
  cards: BattleCardSpec[];
  targetPool: BattleTargetSpec[];
  gameplay: {
    cardPool: Record<string, number>;
    targetOrder: string[];
  };
  taxonomy: {
    superclass: string;
  };
  presentation: BattleDeckPresentationSpec;
}

export interface BattleSetupParticipantSpec {
  side: "player" | "enemy";
  deck: BattleDeckSpec;
}

export interface BattleSetupSpec {
  mode: GameMode;
  roomId?: string;
  opening: {
    startPolicy: "coin";
  };
  participants: {
    player: BattleSetupParticipantSpec;
    enemy: BattleSetupParticipantSpec;
  };
}

export interface CreateBattleSetupSpecParams {
  mode: GameMode;
  playerDeck: DeckModel;
  enemyDeck: DeckModel;
  roomId?: string;
}

export function createBattleCardSpec(entry: DeckModelCardEntry): BattleCardSpec {
  return {
    cardId: entry.cardId,
    syllable: entry.card.syllable,
    label: entry.card.label,
    copiesInDeck: entry.copiesInDeck,
  };
}

export function createBattleTargetSpec(
  entry: DeckModelTargetInstance,
  syllableByCardId: Record<string, string>,
): BattleTargetSpec {
  return {
    targetInstanceId: entry.instanceKey,
    targetInstanceIndex: entry.instanceIndex,
    targetId: entry.targetId,
    name: entry.target.name,
    emoji: entry.target.emoji,
    rarity: entry.target.rarity,
    description: entry.target.description,
    requiredCardIds: [...entry.target.cardIds],
    requiredSyllables: entry.target.cardIds.map((cardId) => syllableByCardId[cardId] ?? cardId),
    taxonomy: {
      superclass: entry.target.superclass,
      classKey: entry.target.classKey,
    },
  };
}

export function createBattleDeckSpec(deckModel: DeckModel): BattleDeckSpec {
  const syllableByCardId = deckModel.cards.reduce<Record<string, string>>((acc, entry) => {
    acc[entry.cardId] = entry.card.syllable;
    return acc;
  }, {});

  return {
    deckId: deckModel.id,
    cards: deckModel.cards.map(createBattleCardSpec),
    targetPool: deckModel.targetInstances.map((entry) => createBattleTargetSpec(entry, syllableByCardId)),
    gameplay: {
      cardPool: { ...deckModel.definition.cardPool },
      targetOrder: deckModel.targetInstances.map((entry) => entry.instanceKey),
    },
    taxonomy: {
      superclass: deckModel.definition.superclass,
    },
    presentation: {
      name: deckModel.definition.name,
      description: deckModel.definition.description,
      emoji: deckModel.definition.emoji,
      visualTheme: deckModel.definition.visualTheme,
    },
  };
}

export function createBattleSetupSpec({
  mode,
  playerDeck,
  enemyDeck,
  roomId,
}: CreateBattleSetupSpecParams): BattleSetupSpec {
  return {
    mode,
    roomId,
    opening: {
      startPolicy: "coin",
    },
    participants: {
      player: {
        side: "player",
        deck: createBattleDeckSpec(playerDeck),
      },
      enemy: {
        side: "enemy",
        deck: createBattleDeckSpec(enemyDeck),
      },
    },
  };
}

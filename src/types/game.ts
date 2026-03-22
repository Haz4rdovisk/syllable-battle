export type Syllable = string;

export type Rarity = "comum" | "raro" | "\u00E9pico" | "lend\u00E1rio";

export const RARITY_DAMAGE: Record<Rarity, number> = {
  comum: 1,
  raro: 2,
  "\u00E9pico": 3,
  "lend\u00E1rio": 4,
};

export function normalizeRarity(rarity: string): Rarity {
  const normalized = rarity
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (normalized === "comum") return "comum";
  if (normalized === "raro") return "raro";
  if (normalized === "epico") return "\u00E9pico";
  if (normalized === "lendario") return "lend\u00E1rio";
  return "comum";
}

export interface Target {
  id: string;
  name: string;
  emoji: string;
  syllables: Syllable[];
  rarity: Rarity;
  description?: string;
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  emoji: string;
  color: string;
  syllables: Record<Syllable, number>;
  targets: Target[];
}

export interface GameMessage {
  title: string;
  detail?: string;
  kind: "turn" | "damage" | "info" | "error";
}

export type BattleSide = "player" | "enemy";

export type BattleTurnAction =
  | {
      type: "play";
      handIndex: number;
      targetIndex: number;
    }
  | {
      type: "mulligan";
      handIndexes: number[];
    }
  | {
      type: "pass";
    };

export interface BattleSubmittedAction {
  id: string;
  setupVersion: number;
  sequence: number;
  turn: number;
  side: BattleSide;
  action: BattleTurnAction;
}

export type BattleEvent =
  | {
      id: string;
      type: "TURN_STARTED";
      createdAt: number;
      turn: number;
      side: BattleSide;
    }
  | {
      id: string;
      type: "CARD_PLAYED";
      createdAt: number;
      turn: number;
      side: BattleSide;
      syllable: Syllable;
      targetSlot: number;
      targetName: string;
    }
  | {
      id: string;
      type: "CARD_DRAWN";
      createdAt: number;
      turn: number;
      side: BattleSide;
      reason: "play" | "mulligan";
      syllables: Syllable[];
    }
  | {
      id: string;
      type: "TARGET_COMPLETED";
      createdAt: number;
      turn: number;
      side: BattleSide;
      slotIndex: number;
      targetName: string;
      damage: number;
    }
  | {
      id: string;
      type: "DAMAGE_APPLIED";
      createdAt: number;
      turn: number;
      sourceSide: BattleSide;
      targetSide: BattleSide;
      amount: number;
      sourceTargetName: string;
      lifeAfter: number;
    }
  | {
      id: string;
      type: "TARGET_REPLACED";
      createdAt: number;
      turn: number;
      side: BattleSide;
      slotIndex: number;
      previousTargetName: string;
      nextTargetName: string;
    }
  | {
      id: string;
      type: "MULLIGAN_RESOLVED";
      createdAt: number;
      turn: number;
      side: BattleSide;
      returned: Syllable[];
      drawn: Syllable[];
    };

export interface PlayerState {
  id: string;
  name: string;
  life: number;
  hand: Syllable[];
  syllableDeck: Syllable[];
  discard: Syllable[];
  targetDeck: Target[];
  targets: UITarget[];
  lastDrawnCount: number;
  flashDamage: number;
  deckId: string;
  mulliganUsedThisRound: boolean;
}

export interface UITarget extends Target {
  progress: Syllable[];
  uiId: string;
  entering: boolean;
  attacking: boolean;
  leaving: boolean;
  justArrived: boolean;
}

export type GameMode = "bot" | "multiplayer" | "local";

export interface GameState {
  players: PlayerState[];
  turn: number;
  winner: number | null;
  actedThisTurn: boolean;
  selectedHandIndexes: number[];
  selectedCardForPlay: number | null;
  log: string[];
  messageQueue: GameMessage[];
  currentMessage: GameMessage | null;
  setupVersion: number;
  combatLocked: boolean;
  mode: GameMode;
  roomId?: string;
}

export type Syllable = string;
export type CoinFace = "cara" | "coroa";
export type OpeningIntroStep = "coin-choice" | "coin-fall" | "coin-result" | "targets" | "done";

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
  canonicalTargetId?: string;
  targetInstanceId?: string;
  requiredCardIds?: string[];
  targetSuperclass?: string;
  targetClassKey?: string;
  sourceDeckId?: string;
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

export interface PlayerProfile {
  name: string;
  avatar: string;
}

export const MAX_PLAYER_NAME_LENGTH = 12;

export function normalizePlayerName(name: string, fallback = "Duelista") {
  const normalized = name.trim().replace(/\s+/g, " ").slice(0, MAX_PLAYER_NAME_LENGTH);
  return normalized || fallback;
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
  /**
   * Legacy domain slot reserved for a future discard system.
   * It exists in the state shape, but the current playable loop does not actively send cards here.
   */
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

export interface ChronicleEntry {
  text: string;
  tone: "player" | "enemy" | "system";
}

export interface GameState {
  players: PlayerState[];
  turn: number;
  turnDeadlineAt: number | null;
  winner: number | null;
  actedThisTurn: boolean;
  selectedHandIndexes: number[];
  selectedCardForPlay: number | null;
  log: ChronicleEntry[];
  messageQueue: GameMessage[];
  currentMessage: GameMessage | null;
  setupVersion: number;
  combatLocked: boolean;
  mode: GameMode;
  openingCoinChoice: CoinFace | null;
  openingCoinResult: CoinFace | null;
  openingIntroStep: OpeningIntroStep;
  roomId?: string;
}

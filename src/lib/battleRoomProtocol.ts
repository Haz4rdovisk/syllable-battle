import { BattleSide, BattleSubmittedAction, GameState } from "../types/game";

export type BattleRoomPhase = "lobby" | "deck-selection" | "battle";

export interface BattleRoomParticipantState {
  side: BattleSide;
  connected: boolean;
  deckId?: string;
  name?: string;
  avatar?: string;
}

export interface BattleRoomState {
  roomId: string;
  phase: BattleRoomPhase;
  host: BattleRoomParticipantState;
  guest: BattleRoomParticipantState;
  initialGame?: GameState;
  battleSnapshot?: GameState;
}

export type BattleRoomActionMessage = {
  type: "action";
  senderId: string;
  action: BattleSubmittedAction;
};

export type BattleRoomStateMessage =
  | {
      type: "hello";
      senderId: string;
      side: BattleSide;
      name?: string;
      avatar?: string;
    }
  | {
      type: "snapshot";
      senderId: string;
      state: BattleRoomState;
    }
  | {
      type: "presence";
      senderId: string;
      side: BattleSide;
      connected: boolean;
      name?: string;
      avatar?: string;
    }
  | {
      type: "phase";
      senderId: string;
      phase: BattleRoomPhase;
    }
  | {
      type: "deck";
      senderId: string;
      side: BattleSide;
      deckId: string;
    }
  | {
      type: "battle-setup";
      senderId: string;
      game: GameState;
    }
  | {
      type: "battle-snapshot";
      senderId: string;
      game: GameState;
    };

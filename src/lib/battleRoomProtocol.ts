import { BattleSide, BattleSubmittedAction, GameState } from "../types/game";

export type BattleRoomPhase = "lobby" | "deck-selection" | "battle";

export interface BattleRoomParticipantState {
  side: BattleSide;
  connected: boolean;
  deckId?: string;
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

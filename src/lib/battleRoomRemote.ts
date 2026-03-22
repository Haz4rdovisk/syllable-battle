import { BattleSide, BattleSubmittedAction } from "../types/game";
import { BattleRoomStateMessage } from "./battleRoomProtocol";

export interface RemoteBattleRoomConnection {
  sendAction(action: BattleSubmittedAction): void | Promise<void>;
  sendState(message: BattleRoomStateMessage): void | Promise<void>;
  subscribeActions(listener: (action: BattleSubmittedAction) => void): () => void;
  subscribeState(listener: (message: BattleRoomStateMessage) => void): () => void;
  disconnect(): void | Promise<void>;
}

export interface RemoteBattleRoomConnector {
  connect(params: {
    roomId: string;
    clientId: string;
    localSide: BattleSide;
  }): RemoteBattleRoomConnection | Promise<RemoteBattleRoomConnection>;
}

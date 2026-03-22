import { BattleSide, GameState } from "../types/game";
import { BattleRoomStateMessage } from "./battleRoomProtocol";
import { BattleRoomDriver } from "./battleRoomDriver";
import { RemoteBattleRoomConnection } from "./battleRoomRemote";
import {
  cloneRoomState,
  createEmptyRoomState,
  getParticipant,
  normalizeRoomId,
  RoomStateController,
} from "./battleRoomStateController";
import { BattleRoomTransport } from "./battleRoomTransport";

class RemoteBattleRoomTransportAdapter implements BattleRoomTransport {
  private listeners = new Set<(action: import("../types/game").BattleSubmittedAction) => void>();
  private readonly unsubscribe: () => void;

  constructor(private readonly connection: RemoteBattleRoomConnection) {
    this.unsubscribe = this.connection.subscribeActions((action) => {
      this.listeners.forEach((listener) => listener(action));
    });
  }

  submitAction(action: import("../types/game").BattleSubmittedAction) {
    this.listeners.forEach((listener) => listener(action));
    void this.connection.sendAction(action);
  }

  subscribe(listener: (action: import("../types/game").BattleSubmittedAction) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset() {
    this.unsubscribe();
  }
}

class RemoteRoomStateController implements RoomStateController {
  private state = createEmptyRoomState(this.roomId);
  private listeners = new Set<(state: ReturnType<typeof cloneRoomState>) => void>();
  private readonly unsubscribe: () => void;

  constructor(
    private readonly roomId: string,
    private readonly localSide: BattleSide,
    private readonly clientId: string,
    private readonly connection: RemoteBattleRoomConnection,
  ) {
    this.unsubscribe = this.connection.subscribeState((message) => {
      this.handleMessage(message);
    });
  }

  getState() {
    return cloneRoomState(this.state);
  }

  subscribe(listener: (state: ReturnType<typeof cloneRoomState>) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  connect(side: BattleSide) {
    this.state = {
      ...cloneRoomState(this.state),
      [side === "player" ? "host" : "guest"]: {
        ...getParticipant(this.state, side),
        connected: true,
      },
    };
    this.emitLocal();
    this.post({ type: "hello", senderId: this.clientId, side });
    this.post({ type: "presence", senderId: this.clientId, side, connected: true });
  }

  startDeckSelection() {
    this.state = {
      ...cloneRoomState(this.state),
      phase: "deck-selection",
      initialGame: undefined,
      battleSnapshot: undefined,
      host: { ...this.state.host, deckId: undefined },
      guest: { ...this.state.guest, deckId: undefined },
    };
    this.emitLocal();
    this.post({ type: "phase", senderId: this.clientId, phase: "deck-selection" });
  }

  selectDeck(side: BattleSide, deckId: string) {
    this.state = {
      ...cloneRoomState(this.state),
      [side === "player" ? "host" : "guest"]: {
        ...getParticipant(this.state, side),
        deckId,
      },
    };
    this.emitLocal();
    this.post({ type: "deck", senderId: this.clientId, side, deckId });
  }

  publishBattleSetup(game: GameState) {
    this.state = {
      ...cloneRoomState(this.state),
      phase: "battle",
      initialGame: structuredClone(game),
      battleSnapshot: structuredClone(game),
    };
    this.emitLocal();
    this.post({ type: "battle-setup", senderId: this.clientId, game });
    this.post({ type: "phase", senderId: this.clientId, phase: "battle" });
  }

  publishBattleSnapshot(game: GameState) {
    this.state = {
      ...cloneRoomState(this.state),
      battleSnapshot: structuredClone(game),
    };
    this.emitLocal();
    this.post({ type: "battle-snapshot", senderId: this.clientId, game });
  }

  disconnect(side: BattleSide) {
    this.state = {
      ...cloneRoomState(this.state),
      [side === "player" ? "host" : "guest"]: {
        ...getParticipant(this.state, side),
        connected: false,
        deckId: undefined,
      },
      phase: "lobby",
      initialGame: undefined,
      battleSnapshot: undefined,
    };
    this.emitLocal();
    this.post({ type: "presence", senderId: this.clientId, side, connected: false });
    this.post({ type: "phase", senderId: this.clientId, phase: "lobby" });
  }

  reset() {
    this.listeners.clear();
    this.unsubscribe();
  }

  private handleMessage(message: BattleRoomStateMessage) {
    switch (message.type) {
      case "snapshot":
        this.state = cloneRoomState(message.state);
        this.emitLocal();
        break;
      case "presence":
        this.state = {
          ...cloneRoomState(this.state),
          [message.side === "player" ? "host" : "guest"]: {
            ...getParticipant(this.state, message.side),
            connected: message.connected,
            deckId: message.connected ? getParticipant(this.state, message.side).deckId : undefined,
          },
        };
        this.emitLocal();
        break;
      case "phase":
        this.state = { ...cloneRoomState(this.state), phase: message.phase };
        if (message.phase === "deck-selection") {
          this.state.initialGame = undefined;
          this.state.battleSnapshot = undefined;
          this.state.host.deckId = undefined;
          this.state.guest.deckId = undefined;
        }
        this.emitLocal();
        break;
      case "deck":
        this.state = {
          ...cloneRoomState(this.state),
          [message.side === "player" ? "host" : "guest"]: {
            ...getParticipant(this.state, message.side),
            deckId: message.deckId,
          },
        };
        this.emitLocal();
        break;
      case "battle-setup":
        this.state = {
          ...cloneRoomState(this.state),
          phase: "battle",
          initialGame: structuredClone(message.game),
          battleSnapshot: structuredClone(message.game),
        };
        this.emitLocal();
        break;
      case "battle-snapshot":
        this.state = {
          ...cloneRoomState(this.state),
          battleSnapshot: structuredClone(message.game),
        };
        this.emitLocal();
        break;
      case "hello":
        this.post({ type: "snapshot", senderId: this.clientId, state: this.state });
        this.post({
          type: "presence",
          senderId: this.clientId,
          side: this.localSide,
          connected: getParticipant(this.state, this.localSide).connected,
        });
        break;
    }
  }

  private emitLocal() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private post(message: BattleRoomStateMessage) {
    void this.connection.sendState(message);
  }
}

export class RemoteBattleRoomDriver implements BattleRoomDriver {
  readonly kind = "remote" as const;

  constructor(private readonly connection: RemoteBattleRoomConnection) {}

  normalizeRoomId(roomId: string) {
    return normalizeRoomId(roomId);
  }

  createTransport(_roomId?: string, _clientId?: string) {
    return new RemoteBattleRoomTransportAdapter(this.connection);
  }

  createStateController(roomId: string, localSide: BattleSide, clientId: string) {
    return new RemoteRoomStateController(normalizeRoomId(roomId), localSide, clientId, this.connection);
  }

  disposeRoom() {
    void this.connection.disconnect();
  }
}

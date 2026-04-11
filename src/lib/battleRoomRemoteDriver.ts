import { BattleSide, GameState, PlayerProfile } from "../types/game";
import { BattleRoomStateMessage } from "./battleRoomProtocol";
import { BattleRoomDriver } from "./battleRoomDriver";
import { RemoteBattleRoomConnection } from "./battleRoomRemote";
import {
  cloneRoomState,
  createEmptyRoomState,
  getParticipant,
  mergeRoomState,
  normalizeActiveRoomPhase,
  normalizeRoomId,
  RoomStateController,
} from "./battleRoomStateController";
import { BattleRoomTransport } from "./battleRoomTransport";

const PHASE_ORDER: Record<"lobby" | "deck-selection" | "battle", number> = {
  lobby: 0,
  "deck-selection": 1,
  battle: 2,
};

class RemoteBattleRoomTransportAdapter implements BattleRoomTransport {
  private listeners = new Set<(action: import("../types/game").BattleSubmittedAction) => void>();
  private readonly unsubscribe: () => void;

  constructor(private readonly connection: RemoteBattleRoomConnection) {
    this.unsubscribe = this.connection.subscribeActions((action) => {
      this.listeners.forEach((listener) => listener(action));
    });
  }

  submitAction(action: import("../types/game").BattleSubmittedAction) {
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

  connect(side: BattleSide, profile: PlayerProfile) {
    this.state = {
      ...cloneRoomState(this.state),
      [side === "player" ? "host" : "guest"]: {
        ...getParticipant(this.state, side),
        connected: true,
        name: profile.name,
        avatar: profile.avatar,
      },
    };
    this.emitLocal();
    this.post({ type: "hello", senderId: this.clientId, side, name: profile.name, avatar: profile.avatar });
    this.post({ type: "presence", senderId: this.clientId, side, connected: true, name: profile.name, avatar: profile.avatar });
  }

  returnToLobby() {
    this.state = {
      ...cloneRoomState(this.state),
      phase: "lobby",
      initialGame: undefined,
      battleSnapshot: undefined,
      host: { ...this.state.host, deckId: undefined },
      guest: { ...this.state.guest, deckId: undefined },
    };
    this.emitLocal();
    this.post({ type: "phase", senderId: this.clientId, phase: "lobby" });
  }

  startDeckSelection() {
    this.returnToLobby();
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
      case "snapshot": {
        const mergedState = mergeRoomState(this.state, message.state);
        const disconnectedLobbyState =
          (!mergedState.host.connected || !mergedState.guest.connected) &&
          (this.state.phase === "lobby" || message.state.phase === "lobby");

        this.state = disconnectedLobbyState
          ? {
              ...mergedState,
              phase: "lobby",
              initialGame: undefined,
              battleSnapshot: undefined,
              host: {
                ...mergedState.host,
                deckId: mergedState.host.connected ? mergedState.host.deckId : undefined,
              },
              guest: {
                ...mergedState.guest,
                deckId: mergedState.guest.connected ? mergedState.guest.deckId : undefined,
              },
            }
          : mergedState;
        this.emitLocal();
        break;
      }
      case "presence":
        this.state = {
          ...cloneRoomState(this.state),
          [message.side === "player" ? "host" : "guest"]: {
            ...getParticipant(this.state, message.side),
            connected: message.connected,
            deckId: message.connected ? getParticipant(this.state, message.side).deckId : undefined,
            name: message.name ?? getParticipant(this.state, message.side).name,
            avatar: message.avatar ?? getParticipant(this.state, message.side).avatar,
          },
        };
        if (!message.connected) {
          this.state = {
            ...cloneRoomState(this.state),
            phase: "lobby",
            initialGame: undefined,
            battleSnapshot: undefined,
            host: {
              ...this.state.host,
              deckId: message.side === "player" ? undefined : this.state.host.deckId,
            },
            guest: {
              ...this.state.guest,
              deckId: message.side === "enemy" ? undefined : this.state.guest.deckId,
            },
          };
        }
        this.emitLocal();
        break;
      case "phase":
        if ((!this.state.host.connected || !this.state.guest.connected) && this.state.phase === "lobby" && message.phase !== "lobby") {
          this.emitLocal();
          break;
        }
        if (message.phase === "deck-selection") {
          if (PHASE_ORDER[message.phase] < PHASE_ORDER[normalizeActiveRoomPhase(this.state.phase)]) {
            this.emitLocal();
            break;
          }

          this.state = {
            ...cloneRoomState(this.state),
            phase: "lobby",
            initialGame: undefined,
            battleSnapshot: undefined,
          };
          this.emitLocal();
          break;
        }
        if (PHASE_ORDER[message.phase] < PHASE_ORDER[this.state.phase] && message.phase !== "lobby") {
          this.emitLocal();
          break;
        }
        this.state = { ...cloneRoomState(this.state), phase: message.phase };
        if (message.phase === "lobby") {
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
          name: getParticipant(this.state, this.localSide).name,
          avatar: getParticipant(this.state, this.localSide).avatar,
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

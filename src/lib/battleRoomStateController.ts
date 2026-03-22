import { BattleSide, GameState } from "../types/game";
import { BattleRoomPhase, BattleRoomState, BattleRoomStateMessage } from "./battleRoomProtocol";

const PHASE_ORDER: Record<BattleRoomPhase, number> = {
  lobby: 0,
  "deck-selection": 1,
  battle: 2,
};

export function normalizeRoomId(roomId: string) {
  return roomId.trim().toUpperCase();
}

export function createEmptyRoomState(roomId: string): BattleRoomState {
  return {
    roomId,
    phase: "lobby",
    host: { side: "player", connected: false },
    guest: { side: "enemy", connected: false },
  };
}

export function cloneRoomState(state: BattleRoomState): BattleRoomState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    host: { ...state.host },
    guest: { ...state.guest },
    initialGame: state.initialGame ? structuredClone(state.initialGame) : undefined,
    battleSnapshot: state.battleSnapshot ? structuredClone(state.battleSnapshot) : undefined,
  };
}

function getParticipantKey(side: BattleSide) {
  return side === "player" ? "host" : "guest";
}

export function getParticipant(state: BattleRoomState, side: BattleSide) {
  return state[getParticipantKey(side)];
}

function withParticipantUpdate(
  state: BattleRoomState,
  side: BattleSide,
  patch: Partial<BattleRoomState["host"]>,
) {
  const next = cloneRoomState(state);
  Object.assign(getParticipant(next, side), patch);
  return next;
}

function mergeRoomState(base: BattleRoomState, incoming: BattleRoomState) {
  const merged = cloneRoomState(base);
  merged.phase = PHASE_ORDER[incoming.phase] > PHASE_ORDER[merged.phase] ? incoming.phase : merged.phase;
  merged.host.connected = merged.host.connected || incoming.host.connected;
  merged.guest.connected = merged.guest.connected || incoming.guest.connected;
  merged.host.deckId = merged.host.deckId ?? incoming.host.deckId;
  merged.guest.deckId = merged.guest.deckId ?? incoming.guest.deckId;
  merged.initialGame = merged.initialGame ?? (incoming.initialGame ? structuredClone(incoming.initialGame) : undefined);
  merged.battleSnapshot =
    merged.battleSnapshot ?? (incoming.battleSnapshot ? structuredClone(incoming.battleSnapshot) : undefined);
  return merged;
}

export interface RoomStateController {
  getState(): BattleRoomState;
  subscribe(listener: (state: BattleRoomState) => void): () => void;
  connect(side: BattleSide): void;
  startDeckSelection(): void;
  selectDeck(side: BattleSide, deckId: string): void;
  publishBattleSetup(game: GameState): void;
  publishBattleSnapshot(game: GameState): void;
  disconnect(side: BattleSide): void;
  reset(): void;
}

export interface MockRoomStore {
  state: BattleRoomState;
  listeners: Set<(state: BattleRoomState) => void>;
}

export class MockRoomStateController implements RoomStateController {
  constructor(
    private readonly store: MockRoomStore,
    private readonly clearStore: () => void,
  ) {}

  getState() {
    return cloneRoomState(this.store.state);
  }

  subscribe(listener: (state: BattleRoomState) => void) {
    this.store.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.store.listeners.delete(listener);
    };
  }

  connect(side: BattleSide) {
    this.update((state) => withParticipantUpdate(state, side, { connected: true }));
  }

  startDeckSelection() {
    this.update((state) => ({
      ...cloneRoomState(state),
      phase: "deck-selection",
      initialGame: undefined,
      battleSnapshot: undefined,
      host: { ...state.host, deckId: undefined },
      guest: { ...state.guest, deckId: undefined },
    }));
  }

  selectDeck(side: BattleSide, deckId: string) {
    this.update((state) => withParticipantUpdate(state, side, { deckId }));
  }

  publishBattleSetup(game: GameState) {
    this.update((state) => ({
      ...cloneRoomState(state),
      phase: "battle",
      initialGame: structuredClone(game),
      battleSnapshot: structuredClone(game),
    }));
  }

  publishBattleSnapshot(game: GameState) {
    this.update((state) => ({
      ...cloneRoomState(state),
      battleSnapshot: structuredClone(game),
    }));
  }

  disconnect(side: BattleSide) {
    this.update((state) => {
      const next = withParticipantUpdate(state, side, {
        connected: false,
        deckId: undefined,
      });
      next.phase = "lobby";
      next.initialGame = undefined;
      next.battleSnapshot = undefined;
      return next;
    });
  }

  reset() {
    if (!this.store.state.host.connected && !this.store.state.guest.connected) {
      this.clearStore();
    }
  }

  private update(updater: (state: BattleRoomState) => BattleRoomState) {
    this.store.state = updater(this.store.state);
    const snapshot = this.getState();
    this.store.listeners.forEach((listener) => listener(snapshot));
  }
}

export class BroadcastRoomStateController implements RoomStateController {
  private state: BattleRoomState;
  private listeners = new Set<(state: BattleRoomState) => void>();
  private readonly channel: BroadcastChannel;

  constructor(roomId: string, private readonly localSide: BattleSide, private readonly clientId: string) {
    this.state = createEmptyRoomState(roomId);
    this.channel = new BroadcastChannel(`syllable-battle-room-state:${roomId}`);
    this.channel.onmessage = (event: MessageEvent<BattleRoomStateMessage>) => {
      const payload = event.data;
      if (!payload || payload.senderId === this.clientId) return;
      this.handleMessage(payload);
    };
  }

  getState() {
    return cloneRoomState(this.state);
  }

  subscribe(listener: (state: BattleRoomState) => void) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  connect(side: BattleSide) {
    this.state = withParticipantUpdate(this.state, side, { connected: true });
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
    this.state = withParticipantUpdate(this.state, side, { deckId });
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
    this.state = withParticipantUpdate(this.state, side, {
      connected: false,
      deckId: undefined,
    });
    this.state = { ...cloneRoomState(this.state), phase: "lobby", initialGame: undefined, battleSnapshot: undefined };
    this.emitLocal();
    this.post({ type: "presence", senderId: this.clientId, side, connected: false });
    this.post({ type: "phase", senderId: this.clientId, phase: "lobby" });
  }

  reset() {
    this.listeners.clear();
    this.channel.close();
  }

  private handleMessage(message: BattleRoomStateMessage) {
    switch (message.type) {
      case "hello":
        this.state = withParticipantUpdate(this.state, message.side, { connected: true });
        this.emitLocal();
        this.post({ type: "snapshot", senderId: this.clientId, state: this.state });
        this.post({
          type: "presence",
          senderId: this.clientId,
          side: this.localSide,
          connected: getParticipant(this.state, this.localSide).connected,
        });
        break;
      case "snapshot":
        this.state = mergeRoomState(this.state, message.state);
        this.emitLocal();
        break;
      case "presence":
        this.state = withParticipantUpdate(this.state, message.side, {
          connected: message.connected,
          deckId: message.connected ? getParticipant(this.state, message.side).deckId : undefined,
        });
        if (!message.connected) {
          this.state = { ...cloneRoomState(this.state), phase: "lobby" };
        }
        this.emitLocal();
        break;
      case "phase":
        if (PHASE_ORDER[message.phase] >= PHASE_ORDER[this.state.phase] || message.phase === "lobby") {
          this.state = { ...cloneRoomState(this.state), phase: message.phase };
          if (message.phase === "deck-selection") {
            this.state.initialGame = undefined;
            this.state.battleSnapshot = undefined;
            this.state.host.deckId = undefined;
            this.state.guest.deckId = undefined;
          }
          this.emitLocal();
        }
        break;
      case "deck":
        this.state = withParticipantUpdate(this.state, message.side, { deckId: message.deckId });
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
    }
  }

  private emitLocal() {
    const snapshot = this.getState();
    this.listeners.forEach((listener) => listener(snapshot));
  }

  private post(message: BattleRoomStateMessage) {
    this.channel.postMessage(message);
  }
}

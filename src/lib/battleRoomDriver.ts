import { BattleSide } from "../types/game";
import {
  BroadcastRoomStateController,
  createEmptyRoomState,
  MockRoomStateController,
  MockRoomStore,
  normalizeRoomId,
  RoomStateController,
} from "./battleRoomStateController";
import {
  BattleRoomTransport,
  BroadcastBattleRoomTransport,
  MockBattleRoomTransport,
} from "./battleRoomTransport";

export interface BattleRoomDriver {
  readonly kind: "mock" | "broadcast" | "remote";
  normalizeRoomId(roomId: string): string;
  createTransport(roomId: string, clientId: string): BattleRoomTransport;
  createStateController(roomId: string, localSide: BattleSide, clientId: string): RoomStateController;
  disposeRoom(roomId: string): void;
}

export class MockBattleRoomDriver implements BattleRoomDriver {
  readonly kind = "mock" as const;
  private transports = new Map<string, MockBattleRoomTransport>();
  private stores = new Map<string, MockRoomStore>();

  constructor(private readonly latencyMs: number) {}

  normalizeRoomId(roomId: string) {
    return normalizeRoomId(roomId);
  }

  createTransport(roomId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const existing = this.transports.get(normalizedRoomId);
    if (existing) return existing;

    const transport = new MockBattleRoomTransport(this.latencyMs);
    this.transports.set(normalizedRoomId, transport);
    return transport;
  }

  createStateController(roomId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    const existing = this.stores.get(normalizedRoomId);
    const store =
      existing ??
      (() => {
        const nextStore: MockRoomStore = {
          state: createEmptyRoomState(normalizedRoomId),
          listeners: new Set(),
        };
        this.stores.set(normalizedRoomId, nextStore);
        return nextStore;
      })();

    return new MockRoomStateController(store, () => {
      this.stores.delete(normalizedRoomId);
    });
  }

  disposeRoom(roomId: string) {
    const normalizedRoomId = normalizeRoomId(roomId);
    this.transports.get(normalizedRoomId)?.reset();
    this.transports.delete(normalizedRoomId);
    this.stores.delete(normalizedRoomId);
  }
}

export class BroadcastBattleRoomDriver implements BattleRoomDriver {
  readonly kind = "broadcast" as const;

  normalizeRoomId(roomId: string) {
    return normalizeRoomId(roomId);
  }

  createTransport(roomId: string, clientId: string) {
    return new BroadcastBattleRoomTransport(normalizeRoomId(roomId), clientId);
  }

  createStateController(roomId: string, localSide: BattleSide, clientId: string) {
    return new BroadcastRoomStateController(normalizeRoomId(roomId), localSide, clientId);
  }

  disposeRoom() {}
}

export function createBattleRoomDriver(latencyMs: number): BattleRoomDriver {
  if (typeof BroadcastChannel !== "undefined") {
    return new BroadcastBattleRoomDriver();
  }

  return new MockBattleRoomDriver(latencyMs);
}

import { BattleSide, BattleSubmittedAction, GameState } from "../types/game";
import type { BattleRoomParticipantState, BattleRoomPhase, BattleRoomState } from "./battleRoomProtocol";
import { BattleRoomDriver, createBattleRoomDriver } from "./battleRoomDriver";
import { RemoteBattleRoomConnector } from "./battleRoomRemote";
import { RemoteBattleRoomDriver } from "./battleRoomRemoteDriver";
import { RoomStateController } from "./battleRoomStateController";
import { BattleRoomTransport } from "./battleRoomTransport";

export type { BattleRoomParticipantState, BattleRoomPhase, BattleRoomState } from "./battleRoomProtocol";

export interface BattleRoomSession {
  roomId: string;
  localSide: BattleSide;
  remoteSide: BattleSide;
  submitAction(action: BattleSubmittedAction): void;
  subscribe(listener: (action: BattleSubmittedAction) => void): () => void;
  getState(): BattleRoomState;
  subscribeState(listener: (state: BattleRoomState) => void): () => void;
  startDeckSelection(): void;
  selectDeck(deckId: string): void;
  publishBattleSetup(game: GameState): void;
  publishBattleSnapshot(game: GameState): void;
  reset(): void;
}

export interface BattleRoomService {
  kind: "mock" | "broadcast" | "remote";
  createRoom(roomId: string): BattleRoomSession;
  joinRoom(roomId: string): BattleRoomSession;
  leaveRoom(roomId: string): void;
}

class BattleRoomSessionImpl implements BattleRoomSession {
  constructor(
    public readonly roomId: string,
    public readonly localSide: BattleSide,
    public readonly remoteSide: BattleSide,
    private readonly transport: BattleRoomTransport,
    private readonly stateController: RoomStateController,
  ) {
    this.stateController.connect(localSide);
  }

  submitAction(action: BattleSubmittedAction) {
    this.transport.submitAction(action);
  }

  subscribe(listener: (action: BattleSubmittedAction) => void) {
    return this.transport.subscribe(listener);
  }

  getState() {
    return this.stateController.getState();
  }

  subscribeState(listener: (state: BattleRoomState) => void) {
    return this.stateController.subscribe(listener);
  }

  startDeckSelection() {
    this.stateController.startDeckSelection();
  }

  selectDeck(deckId: string) {
    this.stateController.selectDeck(this.localSide, deckId);
  }

  publishBattleSetup(game: GameState) {
    this.stateController.publishBattleSetup(game);
  }

  publishBattleSnapshot(game: GameState) {
    this.stateController.publishBattleSnapshot(game);
  }

  reset() {
    this.stateController.disconnect(this.localSide);
    this.transport.reset();
    this.stateController.reset();
  }
}

export class MockBattleRoomService implements BattleRoomService {
  readonly kind = "mock" as const;
  constructor(private readonly driver: BattleRoomDriver) {}

  createRoom(roomId: string): BattleRoomSession {
    return this.openSession(roomId, "player", "enemy");
  }

  joinRoom(roomId: string): BattleRoomSession {
    return this.openSession(roomId, "enemy", "player");
  }

  leaveRoom(roomId: string) {
    this.driver.disposeRoom(roomId);
  }

  private openSession(roomId: string, localSide: BattleSide, remoteSide: BattleSide) {
    const normalizedRoomId = this.driver.normalizeRoomId(roomId);
    return new BattleRoomSessionImpl(
      normalizedRoomId,
      localSide,
      remoteSide,
      this.driver.createTransport(normalizedRoomId, `${localSide}-mock`),
      this.driver.createStateController(normalizedRoomId, localSide, `${localSide}-mock`),
    );
  }
}

export class BroadcastBattleRoomService implements BattleRoomService {
  readonly kind = "broadcast" as const;
  private sessions = new Map<string, BattleRoomSession>();

  constructor(private readonly driver: BattleRoomDriver) {}

  createRoom(roomId: string): BattleRoomSession {
    return this.openSession(roomId, "player", "enemy");
  }

  joinRoom(roomId: string): BattleRoomSession {
    return this.openSession(roomId, "enemy", "player");
  }

  leaveRoom(roomId: string) {
    const normalizedRoomId = this.driver.normalizeRoomId(roomId);
    for (const [key, session] of this.sessions.entries()) {
      if (!key.startsWith(`${normalizedRoomId}:`)) continue;
      session.reset();
      this.sessions.delete(key);
    }
    this.driver.disposeRoom(normalizedRoomId);
  }

  private openSession(roomId: string, localSide: BattleSide, remoteSide: BattleSide) {
    const normalizedRoomId = this.driver.normalizeRoomId(roomId);
    const key = `${normalizedRoomId}:${localSide}`;
    this.sessions.get(key)?.reset();

    const clientId = `${localSide}-${Math.random().toString(36).slice(2, 10)}`;
    const session = new BattleRoomSessionImpl(
      normalizedRoomId,
      localSide,
      remoteSide,
      this.driver.createTransport(normalizedRoomId, clientId),
      this.driver.createStateController(normalizedRoomId, localSide, clientId),
    );

    this.sessions.set(key, session);
    return session;
  }
}

export class RemoteBattleRoomService implements BattleRoomService {
  readonly kind = "remote" as const;
  private sessions = new Map<string, BattleRoomSession>();

  constructor(private readonly connector: RemoteBattleRoomConnector) {}

  createRoom(roomId: string): BattleRoomSession {
    return this.openSession(roomId, "player", "enemy");
  }

  joinRoom(roomId: string): BattleRoomSession {
    return this.openSession(roomId, "enemy", "player");
  }

  leaveRoom(roomId: string) {
    const normalizedRoomId = roomId.trim().toUpperCase();
    for (const [key, session] of this.sessions.entries()) {
      if (!key.startsWith(`${normalizedRoomId}:`)) continue;
      session.reset();
      this.sessions.delete(key);
    }
  }

  private openSession(roomId: string, localSide: BattleSide, remoteSide: BattleSide) {
    const normalizedRoomId = roomId.trim().toUpperCase();
    const key = `${normalizedRoomId}:${localSide}`;
    this.sessions.get(key)?.reset();

    const clientId = `${localSide}-${Math.random().toString(36).slice(2, 10)}`;
    const connection = this.connector.connect({
      roomId: normalizedRoomId,
      clientId,
      localSide,
    });

    if (connection instanceof Promise) {
      throw new Error("Remote connector must resolve synchronously in the current app flow.");
    }

    const driver = new RemoteBattleRoomDriver(connection);
    const session = new BattleRoomSessionImpl(
      normalizedRoomId,
      localSide,
      remoteSide,
      driver.createTransport(normalizedRoomId, clientId),
      driver.createStateController(normalizedRoomId, localSide, clientId),
    );

    this.sessions.set(key, session);
    return session;
  }
}

export function createBattleRoomService(
  latencyMs: number,
  remoteConnector?: RemoteBattleRoomConnector,
): BattleRoomService {
  if (remoteConnector) {
    return new RemoteBattleRoomService(remoteConnector);
  }

  const driver = createBattleRoomDriver(latencyMs);

  if (driver.kind === "broadcast") {
    return new BroadcastBattleRoomService(driver);
  }

  return new MockBattleRoomService(driver);
}

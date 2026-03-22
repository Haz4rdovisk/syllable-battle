import { BattleSubmittedAction } from "../types/game";
import { BattleRoomActionMessage } from "./battleRoomProtocol";

export interface BattleRoomTransport {
  submitAction(action: BattleSubmittedAction): void;
  subscribe(listener: (action: BattleSubmittedAction) => void): () => void;
  reset(): void;
}

type BattleRoomTransportListener = (action: BattleSubmittedAction) => void;

export class MockBattleRoomTransport implements BattleRoomTransport {
  private listeners = new Set<BattleRoomTransportListener>();
  private timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly latencyMs: number) {}

  submitAction(action: BattleSubmittedAction) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      this.listeners.forEach((listener) => listener(action));
    }, this.latencyMs);

    this.timers.add(timer);
  }

  subscribe(listener: BattleRoomTransportListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

export class BroadcastBattleRoomTransport implements BattleRoomTransport {
  private listeners = new Set<BattleRoomTransportListener>();
  private readonly channel: BroadcastChannel;

  constructor(roomId: string, private readonly clientId: string) {
    this.channel = new BroadcastChannel(`syllable-battle-room:${roomId}`);
    this.channel.onmessage = (event: MessageEvent<BattleRoomActionMessage>) => {
      const payload = event.data;
      if (!payload || payload.type !== "action" || payload.senderId === this.clientId) return;
      this.notify(payload.action);
    };
  }

  submitAction(action: BattleSubmittedAction) {
    this.notify(action);
    this.channel.postMessage({
      type: "action",
      senderId: this.clientId,
      action,
    } satisfies BattleRoomActionMessage);
  }

  subscribe(listener: BattleRoomTransportListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  reset() {
    this.listeners.clear();
    this.channel.close();
  }

  private notify(action: BattleSubmittedAction) {
    this.listeners.forEach((listener) => listener(action));
  }
}

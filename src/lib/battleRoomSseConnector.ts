import { BattleSide, BattleSubmittedAction } from "../types/game";
import { BattleRoomStateMessage } from "./battleRoomProtocol";
import { RemoteBattleRoomConnection, RemoteBattleRoomConnector } from "./battleRoomRemote";

type RelayEnvelope =
  | {
      channel: "action";
      payload: BattleSubmittedAction;
    }
  | {
      channel: "state";
      payload: BattleRoomStateMessage;
    };

export class SseBattleRoomConnector implements RemoteBattleRoomConnector {
  constructor(private readonly baseUrl: string) {}

  connect(params: { roomId: string; clientId: string; localSide: BattleSide }): RemoteBattleRoomConnection {
    const actionListeners = new Set<(action: BattleSubmittedAction) => void>();
    const stateListeners = new Set<(message: BattleRoomStateMessage) => void>();
    const url = new URL(`/rooms/${params.roomId}/events`, this.baseUrl);
    url.searchParams.set("clientId", params.clientId);
    url.searchParams.set("side", params.localSide);

    const eventSource = new EventSource(url.toString());
    eventSource.onmessage = (event) => {
      const envelope = JSON.parse(event.data) as RelayEnvelope;
      if (envelope.channel === "action") {
        actionListeners.forEach((listener) => listener(envelope.payload));
        return;
      }
      stateListeners.forEach((listener) => listener(envelope.payload));
    };

    return {
      sendAction: async (action) => {
        await fetch(new URL(`/rooms/${params.roomId}/action`, this.baseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: params.clientId,
            action,
          }),
        });
      },
      sendState: async (message) => {
        await fetch(new URL(`/rooms/${params.roomId}/state`, this.baseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(message),
        });
      },
      subscribeActions: (listener) => {
        actionListeners.add(listener);
        return () => {
          actionListeners.delete(listener);
        };
      },
      subscribeState: (listener) => {
        stateListeners.add(listener);
        return () => {
          stateListeners.delete(listener);
        };
      },
      disconnect: async () => {
        eventSource.close();
        await fetch(new URL(`/rooms/${params.roomId}/disconnect`, this.baseUrl), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            senderId: params.clientId,
            side: params.localSide,
          }),
        }).catch(() => undefined);
      },
    };
  }
}

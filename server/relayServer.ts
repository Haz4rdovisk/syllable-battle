import express from "express";

type ActionEnvelope = {
  channel: "action";
  payload: unknown;
};

type StateEnvelope = {
  channel: "state";
  payload: unknown;
};

type RelayEnvelope = ActionEnvelope | StateEnvelope;

type RoomClient = {
  clientId: string;
  side?: string;
  response: express.Response;
};

const app = express();
const port = Number(process.env.PORT ?? 3010);
const rooms = new Map<string, Map<string, RoomClient>>();

app.use(express.json({ limit: "1mb" }));
app.use((_, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  if (_.method === "OPTIONS") {
    res.status(204).end();
    return;
  }
  next();
});

app.get("/health", (_, res) => {
  res.json({ ok: true });
});

app.get("/rooms/:roomId/events", (req, res) => {
  const roomId = String(req.params.roomId).trim().toUpperCase();
  const clientId = String(req.query.clientId ?? "").trim();
  const side = String(req.query.side ?? "").trim();
  if (!clientId) {
    res.status(400).json({ error: "clientId is required" });
    return;
  }

  const clients = getRoomClients(roomId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ channel: "state", payload: { type: "hello", senderId: "relay", side } })}\n\n`);

  clients.set(clientId, { clientId, side, response: res });

  req.on("close", () => {
    clients.delete(clientId);
    if (clients.size === 0) {
      rooms.delete(roomId);
      return;
    }

    broadcast(roomId, {
      channel: "state",
      payload: {
        type: "presence",
        senderId: clientId,
        side,
        connected: false,
      },
    });
  });
});

app.post("/rooms/:roomId/action", (req, res) => {
  const roomId = String(req.params.roomId).trim().toUpperCase();
  const senderId = String(req.body?.senderId ?? "").trim();
  const action = req.body?.action;
  if (!senderId || !action) {
    res.status(400).json({ error: "senderId and action are required" });
    return;
  }

  broadcast(roomId, { channel: "action", payload: action }, senderId);
  res.status(202).json({ ok: true });
});

app.post("/rooms/:roomId/state", (req, res) => {
  const roomId = String(req.params.roomId).trim().toUpperCase();
  const message = req.body;
  if (!message?.type || !message?.senderId) {
    res.status(400).json({ error: "state message is invalid" });
    return;
  }

  broadcast(roomId, { channel: "state", payload: message }, String(message.senderId));
  res.status(202).json({ ok: true });
});

app.post("/rooms/:roomId/disconnect", (req, res) => {
  const roomId = String(req.params.roomId).trim().toUpperCase();
  const senderId = String(req.body?.senderId ?? "").trim();
  const side = String(req.body?.side ?? "").trim();
  const clients = rooms.get(roomId);
  clients?.delete(senderId);

  if (clients && clients.size === 0) {
    rooms.delete(roomId);
  } else if (senderId && side) {
    broadcast(roomId, {
      channel: "state",
      payload: {
        type: "presence",
        senderId,
        side,
        connected: false,
      },
    });
  }

  res.status(202).json({ ok: true });
});

app.listen(port, () => {
  console.log(`Battle relay listening on http://localhost:${port}`);
});

function getRoomClients(roomId: string) {
  const existing = rooms.get(roomId);
  if (existing) return existing;
  const created = new Map<string, RoomClient>();
  rooms.set(roomId, created);
  return created;
}

function broadcast(roomId: string, envelope: RelayEnvelope, excludeClientId?: string) {
  const clients = rooms.get(roomId);
  if (!clients) return;

  const serialized = `data: ${JSON.stringify(envelope)}\n\n`;
  for (const client of clients.values()) {
    if (excludeClientId && client.clientId === excludeClientId) continue;
    client.response.write(serialized);
  }
}

import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { COOKIE_NAME } from "../../config/constants.js";
import { db } from "../../db/client.js";
import { sessionService } from "../sessions/sessions.service.js";
import { realtimeService } from "./realtime.service.js";

export async function registerRealtimeGateway(app: FastifyInstance) {
  app.get("/ws", { websocket: true }, (socket, request) => {
    const ws = socket.socket;
    const token = request.cookies[COOKIE_NAME];
    if (!token) {
      ws.close();
      return;
    }

    const session = sessionService.getActiveSessionByToken(token);
    if (!session) {
      ws.close();
      return;
    }

    const connectionId = randomUUID();
    const now = new Date().toISOString();

    db.prepare(
      "INSERT INTO online_connections (user_id, session_token, connection_id, connected_at, last_ping_at) VALUES (?, ?, ?, ?, ?)"
    ).run(session.userId, token, connectionId, now, now);

    realtimeService.register(session.userId, token, {
      send(payload) {
        ws.send(payload);
      },
      close() {
        ws.close();
      }
    });
    realtimeService.broadcast("user:online", { userId: session.userId });

    ws.on("message", (raw: Buffer) => {
      try {
        const payload = JSON.parse(String(raw)) as { type?: string };
        if (payload.type === "heartbeat:ping") {
          db.prepare("UPDATE online_connections SET last_ping_at = ? WHERE connection_id = ?").run(
            new Date().toISOString(),
            connectionId
          );
          ws.send(JSON.stringify({ type: "heartbeat:pong", data: {} }));
        }
      } catch {
        ws.send(JSON.stringify({ type: "system:notice", data: { message: "Unsupported payload." } }));
      }
    });

    ws.on("close", () => {
      db.prepare("DELETE FROM online_connections WHERE connection_id = ?").run(connectionId);
      realtimeService.unregister(session.userId, token);
      realtimeService.broadcast("user:offline", { userId: session.userId });
    });
  });
}

import type { FastifyInstance } from "fastify";
import { conversationsRepository } from "../conversations/conversations.repository.js";
import { messagesService } from "./messages.service.js";
import { realtimeService } from "../realtime/realtime.service.js";

export async function registerMessagesRoutes(app: FastifyInstance) {
  app.get("/api/conversations/:id/messages", { preHandler: app.requireAuth }, async (request) => {
    const params = request.params as { id: string };
    const query = request.query as { beforeMessageId?: string; limit?: string };
    const items = messagesService.list(
      request.authUser!.id,
      Number(params.id),
      query.beforeMessageId ? Number(query.beforeMessageId) : null,
      Math.min(Number(query.limit ?? 20), 50)
    );

    return {
      code: "OK",
      data: {
        items,
        hasMore: items.length === Math.min(Number(query.limit ?? 20), 50)
      }
    };
  });

  app.post("/api/conversations/:id/messages", { preHandler: app.requireAuth }, async (request) => {
    const params = request.params as { id: string };
    const body = request.body as { type: string; content?: string; fileId?: number };
    const message = messagesService.create(request.authUser!.id, Number(params.id), body);
    const members = conversationsRepository.getMembers(Number(params.id));
    for (const member of members) {
      realtimeService.pushToUser(member.userId, "message:new", {
        conversationId: Number(params.id),
        message
      });
    }

    return {
      code: "OK",
      data: {
        message
      }
    };
  });
}

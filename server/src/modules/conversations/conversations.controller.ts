import type { FastifyInstance } from "fastify";
import { conversationsRepository } from "./conversations.repository.js";
import { conversationsService } from "./conversations.service.js";
import { realtimeService } from "../realtime/realtime.service.js";

export async function registerConversationsRoutes(app: FastifyInstance) {
  app.get("/api/conversations", { preHandler: app.requireAuth }, async (request) => {
    return {
      code: "OK",
      data: {
        items: conversationsService.listForUser(request.authUser!.id)
      }
    };
  });

  app.post("/api/conversations/private", { preHandler: app.requireAuth }, async (request) => {
    const body = request.body as { targetUserId: number };
    const conversationId = conversationsService.createPrivateConversation(request.authUser!.id, Number(body.targetUserId));
    realtimeService.pushToUser(Number(body.targetUserId), "conversation:new", { conversationId });
    return {
      code: "OK",
      data: {
        conversation: conversationsService.getConversation(request.authUser!.id, conversationId)
      }
    };
  });

  app.post("/api/conversations/group", { preHandler: app.requireAuth }, async (request) => {
    const body = request.body as { name: string; memberIds?: number[] };
    const conversationId = conversationsService.createGroup(request.authUser!.id, body.name, body.memberIds ?? []);
    for (const member of conversationsRepository.getMembers(conversationId)) {
      realtimeService.pushToUser(member.userId, "conversation:new", { conversationId });
    }
    return {
      code: "OK",
      data: {
        conversation: conversationsService.getConversation(request.authUser!.id, conversationId)
      }
    };
  });

  app.get("/api/conversations/:id", { preHandler: app.requireAuth }, async (request) => {
    const conversationId = Number((request.params as { id: string }).id);
    return {
      code: "OK",
      data: {
        conversation: conversationsService.getConversation(request.authUser!.id, conversationId)
      }
    };
  });

  app.get("/api/conversations/:id/members", { preHandler: app.requireAuth }, async (request) => {
    const conversationId = Number((request.params as { id: string }).id);
    return {
      code: "OK",
      data: {
        items: conversationsService.getConversation(request.authUser!.id, conversationId).members
      }
    };
  });

  app.post("/api/conversations/:id/members", { preHandler: app.requireAuth }, async (request) => {
    const conversationId = Number((request.params as { id: string }).id);
    const body = request.body as { userId: number };
    conversationsService.addMember(request.authUser!.id, conversationId, Number(body.userId));
    const members = conversationsRepository.getMembers(conversationId);
    for (const member of members) {
      realtimeService.pushToUser(member.userId, "conversation:member_joined", {
        conversationId,
        userId: Number(body.userId)
      });
    }
    return { code: "OK", data: {} };
  });

  app.delete("/api/conversations/:id/members/:userId", { preHandler: app.requireAuth }, async (request) => {
    const params = request.params as { id: string; userId: string };
    const conversationId = Number(params.id);
    const targetUserId = Number(params.userId);
    conversationsService.removeMember(request.authUser!.id, conversationId, targetUserId);
    for (const member of conversationsRepository.getMembers(conversationId)) {
      realtimeService.pushToUser(member.userId, "conversation:member_left", { conversationId, userId: targetUserId });
    }
    realtimeService.pushToUser(targetUserId, "conversation:member_left", { conversationId, userId: targetUserId });
    return { code: "OK", data: {} };
  });
}

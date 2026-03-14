import { AppError, assert } from "../../common/errors.js";
import { conversationsRepository } from "./conversations.repository.js";

class ConversationsService {
  joinLobby(userId: number): void {
    conversationsRepository.ensureMember(conversationsRepository.getLobbyId(), userId);
  }

  listForUser(userId: number) {
    return conversationsRepository.listForUser(userId);
  }

  createPrivateConversation(userId: number, targetUserId: number): number {
    assert(userId !== targetUserId, 400, "INVALID_PARAMS", "Cannot chat with yourself.");
    return conversationsRepository.createPrivateConversation(userId, targetUserId);
  }

  createGroup(userId: number, name: string, memberIds: number[]): number {
    assert(name.trim().length >= 2, 400, "INVALID_PARAMS", "Group name is too short.");
    return conversationsRepository.createGroup(userId, name.trim(), memberIds);
  }

  getConversation(userId: number, conversationId: number) {
    assert(conversationsRepository.isMember(conversationId, userId), 403, "FORBIDDEN", "Conversation access denied.");
    const conversation = conversationsRepository.getById(conversationId);
    assert(conversation, 404, "NOT_FOUND", "Conversation not found.");
    return {
      id: Number(conversation.id),
      type: String(conversation.type),
      name: conversation.name ? String(conversation.name) : null,
      createdBy: Number(conversation.createdBy),
      members: conversationsRepository.getMembers(conversationId)
    };
  }

  addMember(actorUserId: number, conversationId: number, targetUserId: number): void {
    const conversation = conversationsRepository.getById(conversationId);
    assert(conversation, 404, "NOT_FOUND", "Conversation not found.");
    assert(String(conversation.type) === "group", 400, "INVALID_PARAMS", "Only groups support adding members.");
    assert(conversationsRepository.isOwner(conversationId, actorUserId), 403, "FORBIDDEN", "Only group owners can add members.");
    if (conversationsRepository.isMember(conversationId, targetUserId)) {
      throw new AppError(409, "ALREADY_IN_CONVERSATION", "User already in this group.");
    }
    conversationsRepository.addMember(conversationId, targetUserId);
  }

  removeMember(actorUserId: number, conversationId: number, targetUserId: number): void {
    const conversation = conversationsRepository.getById(conversationId);
    assert(conversation, 404, "NOT_FOUND", "Conversation not found.");
    assert(String(conversation.type) === "group", 400, "INVALID_PARAMS", "Only groups support member removal.");

    if (actorUserId === targetUserId) {
      assert(!conversationsRepository.isOwner(conversationId, actorUserId), 400, "OWNER_CANNOT_LEAVE", "Owner cannot leave group.");
      conversationsRepository.removeMember(conversationId, targetUserId);
      return;
    }

    assert(conversationsRepository.isOwner(conversationId, actorUserId), 403, "FORBIDDEN", "Only group owners can remove members.");
    conversationsRepository.removeMember(conversationId, targetUserId);
  }
}

export const conversationsService = new ConversationsService();

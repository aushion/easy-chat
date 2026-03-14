import { AppError, assert } from "../../common/errors.js";
import { conversationsRepository } from "../conversations/conversations.repository.js";
import { filesRepository } from "../files/files.repository.js";
import { messagesRepository } from "./messages.repository.js";

function mapMessage(row: ReturnType<typeof messagesRepository.findById> extends infer T ? Exclude<T, undefined> : never) {
  return {
    id: row.id,
    conversationId: row.conversationId,
    type: row.type,
    content: row.content,
    createdAt: row.createdAt,
    sender: {
      id: row.senderId,
      username: row.senderUsername,
      nickname: row.senderNickname,
      avatarUrl: row.senderAvatarFileId ? `/api/files/${row.senderAvatarFileId}/download` : null
    },
    file: row.fileId
      ? {
          id: row.fileId,
          name: row.fileOriginalName,
          mimeType: row.fileMimeType,
          size: row.fileSize,
          downloadUrl: `/api/files/${row.fileId}/download`
        }
      : null
  };
}

class MessagesService {
  list(userId: number, conversationId: number, beforeMessageId: number | null, limit: number) {
    assert(conversationsRepository.isMember(conversationId, userId), 403, "FORBIDDEN", "Conversation access denied.");
    const rows = messagesRepository.list(conversationId, beforeMessageId, limit);
    return rows.reverse().map((row) => mapMessage(row));
  }

  create(userId: number, conversationId: number, input: { type: string; content?: string; fileId?: number | null }) {
    assert(conversationsRepository.isMember(conversationId, userId), 403, "FORBIDDEN", "Conversation access denied.");
    assert(["text", "image", "file"].includes(input.type), 400, "INVALID_PARAMS", "Unsupported message type.");

    if (input.type === "text") {
      assert(input.content && input.content.trim().length > 0, 400, "INVALID_PARAMS", "Message content is required.");
    }

    let fileId: number | null = null;
    if (input.type !== "text") {
      assert(input.fileId, 400, "INVALID_PARAMS", "File id is required.");
      const file = filesRepository.findById(input.fileId);
      if (!file) {
        throw new AppError(404, "FILE_NOT_FOUND", "File not found.");
      }
      fileId = file.id;
    }

    const messageId = messagesRepository.create({
      conversationId,
      senderId: userId,
      type: input.type,
      content: input.content?.trim() || null,
      fileId
    });
    conversationsRepository.touchConversation(conversationId);
    return mapMessage(messagesRepository.findById(messageId)!);
  }
}

export const messagesService = new MessagesService();

import { db } from "../../db/client.js";

export type MessageRow = {
  id: number;
  conversationId: number;
  senderId: number;
  type: string;
  content: string | null;
  fileId: number | null;
  createdAt: string;
  senderNickname: string;
  senderUsername: string;
  senderAvatarFileId: number | null;
  fileOriginalName: string | null;
  fileMimeType: string | null;
  fileSize: number | null;
};

function mapMessage(row: Record<string, unknown>): MessageRow {
  return {
    id: Number(row.id),
    conversationId: Number(row.conversation_id),
    senderId: Number(row.sender_id),
    type: String(row.type),
    content: row.content ? String(row.content) : null,
    fileId: row.file_id === null ? null : Number(row.file_id),
    createdAt: String(row.created_at),
    senderNickname: String(row.sender_nickname),
    senderUsername: String(row.sender_username),
    senderAvatarFileId: row.sender_avatar_file_id === null ? null : Number(row.sender_avatar_file_id),
    fileOriginalName: row.file_original_name ? String(row.file_original_name) : null,
    fileMimeType: row.file_mime_type ? String(row.file_mime_type) : null,
    fileSize: row.file_size === null ? null : Number(row.file_size)
  };
}

class MessagesRepository {
  create(input: {
    conversationId: number;
    senderId: number;
    type: string;
    content: string | null;
    fileId: number | null;
  }): number {
    const result = db
      .prepare("INSERT INTO messages (conversation_id, sender_id, type, content, file_id, created_at) VALUES (?, ?, ?, ?, ?, ?)")
      .run(input.conversationId, input.senderId, input.type, input.content, input.fileId, new Date().toISOString());
    return Number(result.lastInsertRowid);
  }

  findById(id: number): MessageRow | undefined {
    const row = db
      .prepare(
        `
          SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.type,
            m.content,
            m.file_id,
            m.created_at,
            u.nickname AS sender_nickname,
            u.username AS sender_username,
            u.avatar_file_id AS sender_avatar_file_id,
            f.original_name AS file_original_name,
            f.mime_type AS file_mime_type,
            f.size AS file_size
          FROM messages m
          INNER JOIN users u ON u.id = m.sender_id
          LEFT JOIN files f ON f.id = m.file_id
          WHERE m.id = ?
        `
      )
      .get(id) as Record<string, unknown> | undefined;

    return row ? mapMessage(row) : undefined;
  }

  list(conversationId: number, beforeMessageId: number | null, limit: number): MessageRow[] {
    const rows = (beforeMessageId
      ? db
          .prepare(
            `
              SELECT
                m.id,
                m.conversation_id,
                m.sender_id,
                m.type,
                m.content,
                m.file_id,
                m.created_at,
                u.nickname AS sender_nickname,
                u.username AS sender_username,
                u.avatar_file_id AS sender_avatar_file_id,
                f.original_name AS file_original_name,
                f.mime_type AS file_mime_type,
                f.size AS file_size
              FROM messages m
              INNER JOIN users u ON u.id = m.sender_id
              LEFT JOIN files f ON f.id = m.file_id
              WHERE m.conversation_id = ? AND m.id < ?
              ORDER BY m.id DESC
              LIMIT ?
            `
          )
          .all(conversationId, beforeMessageId, limit)
      : db
          .prepare(
            `
              SELECT
                m.id,
                m.conversation_id,
                m.sender_id,
                m.type,
                m.content,
                m.file_id,
                m.created_at,
                u.nickname AS sender_nickname,
                u.username AS sender_username,
                u.avatar_file_id AS sender_avatar_file_id,
                f.original_name AS file_original_name,
                f.mime_type AS file_mime_type,
                f.size AS file_size
              FROM messages m
              INNER JOIN users u ON u.id = m.sender_id
              LEFT JOIN files f ON f.id = m.file_id
              WHERE m.conversation_id = ?
              ORDER BY m.id DESC
              LIMIT ?
            `
          )
          .all(conversationId, limit)) as Array<Record<string, unknown>>;

    return rows.map(mapMessage);
  }
}

export const messagesRepository = new MessagesRepository();

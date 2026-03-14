import { db } from "../../db/client.js";
import { LOBBY_NAME } from "../../config/constants.js";

export type ConversationSummary = {
  id: number;
  type: "private" | "group";
  name: string | null;
  createdBy: number;
  privateKey: string | null;
  updatedAt: string;
  lastMessage: null | {
    id: number;
    type: string;
    content: string | null;
    createdAt: string;
  };
};

class ConversationsRepository {
  getLobbyId(): number {
    const row = db
      .prepare("SELECT id FROM conversations WHERE type = 'group' AND name = ? LIMIT 1")
      .get(LOBBY_NAME) as { id: number };
    return row.id;
  }

  ensureMember(conversationId: number, userId: number, role = "member"): void {
    db.prepare(
      "INSERT OR IGNORE INTO conversation_members (conversation_id, user_id, role, joined_at) VALUES (?, ?, ?, ?)"
    ).run(conversationId, userId, role, new Date().toISOString());
  }

  findPrivateConversation(userA: number, userB: number): { id: number } | undefined {
    const key = [userA, userB].sort((a, b) => a - b).join(":");
    return db.prepare("SELECT id FROM conversations WHERE private_key = ? LIMIT 1").get(key) as { id: number } | undefined;
  }

  createPrivateConversation(createdBy: number, otherUserId: number): number {
    const key = [createdBy, otherUserId].sort((a, b) => a - b).join(":");
    const existing = this.findPrivateConversation(createdBy, otherUserId);
    if (existing) {
      return existing.id;
    }

    const now = new Date().toISOString();
    const result = db
      .prepare(
        "INSERT INTO conversations (type, name, created_by, private_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("private", null, createdBy, key, now, now);
    const conversationId = Number(result.lastInsertRowid);
    this.ensureMember(conversationId, createdBy);
    this.ensureMember(conversationId, otherUserId);
    return conversationId;
  }

  createGroup(createdBy: number, name: string, memberIds: number[]): number {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        "INSERT INTO conversations (type, name, created_by, private_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
      )
      .run("group", name, createdBy, null, now, now);
    const conversationId = Number(result.lastInsertRowid);
    this.ensureMember(conversationId, createdBy, "owner");
    for (const memberId of memberIds) {
      if (memberId !== createdBy) {
        this.ensureMember(conversationId, memberId);
      }
    }
    return conversationId;
  }

  listForUser(userId: number): ConversationSummary[] {
    const rows = db
      .prepare(
        `
          SELECT
            c.id,
            c.type,
            c.name,
            c.created_by,
            c.private_key,
            c.updated_at,
            m.id AS message_id,
            m.type AS message_type,
            m.content AS message_content,
            m.created_at AS message_created_at
          FROM conversation_members cm
          INNER JOIN conversations c ON c.id = cm.conversation_id
          LEFT JOIN messages m ON m.id = (
            SELECT id
            FROM messages
            WHERE conversation_id = c.id
            ORDER BY id DESC
            LIMIT 1
          )
          WHERE cm.user_id = ?
          ORDER BY c.updated_at DESC, c.id DESC
        `
      )
      .all(userId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: Number(row.id),
      type: String(row.type) as "private" | "group",
      name: row.name ? String(row.name) : null,
      createdBy: Number(row.created_by),
      privateKey: row.private_key ? String(row.private_key) : null,
      updatedAt: String(row.updated_at),
      lastMessage: row.message_id
        ? {
            id: Number(row.message_id),
            type: String(row.message_type),
            content: row.message_content ? String(row.message_content) : null,
            createdAt: String(row.message_created_at)
          }
        : null
    }));
  }

  getById(conversationId: number): Record<string, unknown> | undefined {
    return db.prepare("SELECT * FROM conversations WHERE id = ? LIMIT 1").get(conversationId) as Record<string, unknown> | undefined;
  }

  getMembers(
    conversationId: number
  ): Array<{ userId: number; role: string; username: string; nickname: string; avatarFileId: number | null }> {
    const rows = db
      .prepare(
        `
          SELECT cm.user_id, cm.role, u.username, u.nickname, u.avatar_file_id
          FROM conversation_members cm
          INNER JOIN users u ON u.id = cm.user_id
          WHERE cm.conversation_id = ?
          ORDER BY cm.role DESC, u.nickname COLLATE NOCASE ASC
        `
      )
      .all(conversationId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      userId: Number(row.user_id),
      role: String(row.role),
      username: String(row.username),
      nickname: String(row.nickname),
      avatarFileId: row.avatar_file_id === null ? null : Number(row.avatar_file_id)
    }));
  }

  isMember(conversationId: number, userId: number): boolean {
    const row = db
      .prepare("SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ? LIMIT 1")
      .get(conversationId, userId) as { 1: number } | undefined;
    return Boolean(row);
  }

  isOwner(conversationId: number, userId: number): boolean {
    const row = db
      .prepare(
        "SELECT 1 FROM conversation_members WHERE conversation_id = ? AND user_id = ? AND role = 'owner' LIMIT 1"
      )
      .get(conversationId, userId) as { 1: number } | undefined;
    return Boolean(row);
  }

  addMember(conversationId: number, userId: number): void {
    this.ensureMember(conversationId, userId);
  }

  removeMember(conversationId: number, userId: number): void {
    db.prepare("DELETE FROM conversation_members WHERE conversation_id = ? AND user_id = ?").run(conversationId, userId);
  }

  touchConversation(conversationId: number): void {
    db.prepare("UPDATE conversations SET updated_at = ? WHERE id = ?").run(new Date().toISOString(), conversationId);
  }
}

export const conversationsRepository = new ConversationsRepository();

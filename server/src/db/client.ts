import fs from "node:fs";
import Database from "better-sqlite3";
import { env } from "../config/env.js";
import { LOBBY_NAME } from "../config/constants.js";
import { initSql } from "./schema/init.js";

type LegacyDataModel = {
  users?: Array<{
    id: number;
    username: string;
    passwordHash: string;
    nickname: string;
    avatarFileId: number | null;
    registerIp: string;
    lastLoginIp: string | null;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  userSessions?: Array<{
    id: number;
    userId: number;
    sessionToken: string;
    status: string;
    loginIp: string;
    userAgent: string | null;
    createdAt: string;
    lastSeenAt: string;
    expiredAt: string | null;
  }>;
  conversations?: Array<{
    id: number;
    type: "private" | "group";
    name: string | null;
    createdBy: number;
    privateKey: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  conversationMembers?: Array<{
    id: number;
    conversationId: number;
    userId: number;
    role: string;
    joinedAt: string;
  }>;
  files?: Array<{
    id: number;
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    uploadedBy: number;
    createdAt: string;
  }>;
  messages?: Array<{
    id: number;
    conversationId: number;
    senderId: number;
    type: string;
    content: string | null;
    fileId: number | null;
    createdAt: string;
  }>;
};

export const db = new Database(env.sqlitePath);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
fs.mkdirSync(env.uploadDir, { recursive: true });
db.exec(initSql);

function updateSequence(tableName: string, seq: number): void {
  db.prepare("DELETE FROM sqlite_sequence WHERE name = ?").run(tableName);
  db.prepare("INSERT INTO sqlite_sequence(name, seq) VALUES (?, ?)").run(tableName, seq);
}

function importLegacyJson(): void {
  if (!fs.existsSync(env.legacyDataPath)) {
    return;
  }

  const userCount = (db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number }).count;
  const messageCount = (db.prepare("SELECT COUNT(*) AS count FROM messages").get() as { count: number }).count;
  const fileCount = (db.prepare("SELECT COUNT(*) AS count FROM files").get() as { count: number }).count;
  const conversationCount = (db.prepare("SELECT COUNT(*) AS count FROM conversations").get() as { count: number }).count;

  if (userCount > 0 || messageCount > 0 || fileCount > 0 || conversationCount > 1) {
    return;
  }

  const content = fs.readFileSync(env.legacyDataPath, "utf8");
  const legacy = JSON.parse(content) as LegacyDataModel;

  const insertUsers = db.prepare(
    "INSERT INTO users (id, username, password_hash, nickname, avatar_file_id, register_ip, last_login_ip, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertConversations = db.prepare(
    "INSERT INTO conversations (id, type, name, created_by, private_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  const insertMembers = db.prepare(
    "INSERT INTO conversation_members (id, conversation_id, user_id, role, joined_at) VALUES (?, ?, ?, ?, ?)"
  );
  const insertFiles = db.prepare(
    "INSERT INTO files (id, original_name, stored_name, mime_type, size, storage_path, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  );
  const insertMessages = db.prepare(
    "INSERT INTO messages (id, conversation_id, sender_id, type, content, file_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );

  const transaction = db.transaction(() => {
    db.exec(`
      DELETE FROM online_connections;
      DELETE FROM user_sessions;
      DELETE FROM messages;
      DELETE FROM conversation_members;
      DELETE FROM conversations;
      DELETE FROM files;
      DELETE FROM users;
      DELETE FROM sqlite_sequence;
    `);

    for (const user of legacy.users ?? []) {
      insertUsers.run(
        user.id,
        user.username,
        user.passwordHash,
        user.nickname,
        user.avatarFileId,
        user.registerIp,
        user.lastLoginIp,
        user.status,
        user.createdAt,
        user.updatedAt
      );
    }

    for (const conversation of legacy.conversations ?? []) {
      insertConversations.run(
        conversation.id,
        conversation.type,
        conversation.name,
        conversation.createdBy,
        conversation.privateKey,
        conversation.createdAt,
        conversation.updatedAt
      );
    }

    for (const member of legacy.conversationMembers ?? []) {
      insertMembers.run(member.id, member.conversationId, member.userId, member.role, member.joinedAt);
    }

    for (const file of legacy.files ?? []) {
      insertFiles.run(
        file.id,
        file.originalName,
        file.storedName,
        file.mimeType,
        file.size,
        file.storagePath,
        file.uploadedBy,
        file.createdAt
      );
    }

    for (const message of legacy.messages ?? []) {
      insertMessages.run(
        message.id,
        message.conversationId,
        message.senderId,
        message.type,
        message.content,
        message.fileId,
        message.createdAt
      );
    }

    updateSequence("users", Math.max(0, ...(legacy.users ?? []).map((item) => item.id)));
    updateSequence("user_sessions", 0);
    updateSequence("conversations", Math.max(0, ...(legacy.conversations ?? []).map((item) => item.id)));
    updateSequence(
      "conversation_members",
      Math.max(0, ...(legacy.conversationMembers ?? []).map((item) => item.id))
    );
    updateSequence("files", Math.max(0, ...(legacy.files ?? []).map((item) => item.id)));
    updateSequence("messages", Math.max(0, ...(legacy.messages ?? []).map((item) => item.id)));
  });

  transaction();
}

function ensureLobby(): void {
  const lobby = db
    .prepare("SELECT id FROM conversations WHERE type = 'group' AND name = ? LIMIT 1")
    .get(LOBBY_NAME) as { id: number } | undefined;

  if (lobby) {
    return;
  }

  const now = new Date().toISOString();
  db.prepare(
    "INSERT INTO conversations (type, name, created_by, private_key, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
  ).run("group", LOBBY_NAME, 0, null, now, now);
}

importLegacyJson();
ensureLobby();

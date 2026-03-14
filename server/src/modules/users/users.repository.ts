import { db } from "../../db/client.js";

export type UserRecord = {
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
};

function mapUser(row: Record<string, unknown>): UserRecord {
  return {
    id: Number(row.id),
    username: String(row.username),
    passwordHash: String(row.password_hash),
    nickname: String(row.nickname),
    avatarFileId: row.avatar_file_id === null ? null : Number(row.avatar_file_id),
    registerIp: String(row.register_ip),
    lastLoginIp: row.last_login_ip ? String(row.last_login_ip) : null,
    status: String(row.status),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

class UserRepository {
  countUsers(): number {
    const row = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
    return row.count;
  }

  findById(id: number): UserRecord | undefined {
    const row = db.prepare("SELECT * FROM users WHERE id = ? LIMIT 1").get(id) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : undefined;
  }

  findByUsername(username: string): UserRecord | undefined {
    const row = db
      .prepare("SELECT * FROM users WHERE username = ? LIMIT 1")
      .get(username) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : undefined;
  }

  findByRegisterIp(ip: string): UserRecord | undefined {
    const row = db
      .prepare("SELECT * FROM users WHERE register_ip = ? LIMIT 1")
      .get(ip) as Record<string, unknown> | undefined;
    return row ? mapUser(row) : undefined;
  }

  create(input: { username: string; passwordHash: string; nickname: string; registerIp: string }): UserRecord {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        "INSERT INTO users (username, password_hash, nickname, avatar_file_id, register_ip, last_login_ip, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(input.username, input.passwordHash, input.nickname, null, input.registerIp, null, "active", now, now);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  updateProfile(userId: number, data: { nickname?: string; avatarFileId?: number | null }): UserRecord {
    const existing = this.findById(userId)!;
    const nickname = data.nickname ?? existing.nickname;
    const avatarFileId = data.avatarFileId === undefined ? existing.avatarFileId : data.avatarFileId;
    const now = new Date().toISOString();

    db.prepare("UPDATE users SET nickname = ?, avatar_file_id = ?, updated_at = ? WHERE id = ?").run(
      nickname,
      avatarFileId,
      now,
      userId
    );

    return this.findById(userId)!;
  }

  updatePassword(userId: number, passwordHash: string): void {
    db.prepare("UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?").run(
      passwordHash,
      new Date().toISOString(),
      userId
    );
  }

  updateLastLoginIp(userId: number, ip: string): void {
    db.prepare("UPDATE users SET last_login_ip = ?, updated_at = ? WHERE id = ?").run(ip, new Date().toISOString(), userId);
  }

  listOnlineUsers(
    excludeUserId: number
  ): Array<{ id: number; username: string; nickname: string; avatarFileId: number | null; lastSeenAt: string }> {
    const rows = db
      .prepare(
        `
          SELECT DISTINCT u.id, u.username, u.nickname, u.avatar_file_id, s.last_seen_at
          FROM users u
          INNER JOIN user_sessions s ON s.user_id = u.id AND s.status = 'active'
          WHERE u.id != ?
          ORDER BY u.nickname COLLATE NOCASE ASC
        `
      )
      .all(excludeUserId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: Number(row.id),
      username: String(row.username),
      nickname: String(row.nickname),
      avatarFileId: row.avatar_file_id === null ? null : Number(row.avatar_file_id),
      lastSeenAt: String(row.last_seen_at)
    }));
  }
}

export const userRepository = new UserRepository();

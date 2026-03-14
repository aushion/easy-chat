import { db } from "../../db/client.js";

export type SessionRecord = {
  id: number;
  userId: number;
  sessionToken: string;
  status: string;
  loginIp: string;
  userAgent: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiredAt: string | null;
};

function mapSession(row: Record<string, unknown>): SessionRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    sessionToken: String(row.session_token),
    status: String(row.status),
    loginIp: String(row.login_ip),
    userAgent: row.user_agent ? String(row.user_agent) : null,
    createdAt: String(row.created_at),
    lastSeenAt: String(row.last_seen_at),
    expiredAt: row.expired_at ? String(row.expired_at) : null
  };
}

class SessionsRepository {
  findActiveByToken(token: string): SessionRecord | undefined {
    const row = db
      .prepare("SELECT * FROM user_sessions WHERE session_token = ? AND status = 'active' LIMIT 1")
      .get(token) as Record<string, unknown> | undefined;
    return row ? mapSession(row) : undefined;
  }

  findActiveByUserId(userId: number): SessionRecord | undefined {
    const row = db
      .prepare("SELECT * FROM user_sessions WHERE user_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1")
      .get(userId) as Record<string, unknown> | undefined;
    return row ? mapSession(row) : undefined;
  }

  create(input: { userId: number; sessionToken: string; loginIp: string; userAgent: string | null }): SessionRecord {
    const now = new Date().toISOString();
    const result = db
      .prepare(
        "INSERT INTO user_sessions (user_id, session_token, status, login_ip, user_agent, created_at, last_seen_at, expired_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
      )
      .run(input.userId, input.sessionToken, "active", input.loginIp, input.userAgent, now, now, null);

    return this.findById(Number(result.lastInsertRowid))!;
  }

  findById(id: number): SessionRecord | undefined {
    const row = db.prepare("SELECT * FROM user_sessions WHERE id = ? LIMIT 1").get(id) as Record<string, unknown> | undefined;
    return row ? mapSession(row) : undefined;
  }

  updateStatusByUser(userId: number, status: string): void {
    const now = new Date().toISOString();
    db.prepare("UPDATE user_sessions SET status = ?, expired_at = ? WHERE user_id = ? AND status = 'active'").run(status, now, userId);
  }

  updateStatusByToken(token: string, status: string): void {
    const now = new Date().toISOString();
    db.prepare("UPDATE user_sessions SET status = ?, expired_at = ? WHERE session_token = ? AND status = 'active'").run(status, now, token);
  }

  touch(token: string): void {
    db.prepare("UPDATE user_sessions SET last_seen_at = ? WHERE session_token = ?").run(new Date().toISOString(), token);
  }
}

export const sessionsRepository = new SessionsRepository();

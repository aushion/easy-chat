import { createToken } from "../../common/security.js";
import { realtimeService } from "../realtime/realtime.service.js";
import { sessionsRepository, type SessionRecord } from "./sessions.repository.js";

class SessionService {
  createSession(userId: number, loginIp: string, userAgent: string | null): SessionRecord {
    sessionsRepository.updateStatusByUser(userId, "kicked");
    const sessionToken = createToken();
    const session = sessionsRepository.create({ userId, sessionToken, loginIp, userAgent });
    realtimeService.kickUser(userId, sessionToken);
    return session;
  }

  logout(token: string): void {
    sessionsRepository.updateStatusByToken(token, "logout");
  }

  getActiveSessionByToken(token: string): SessionRecord | undefined {
    return sessionsRepository.findActiveByToken(token);
  }

  touchSession(token: string): void {
    sessionsRepository.touch(token);
  }
}

export const sessionService = new SessionService();

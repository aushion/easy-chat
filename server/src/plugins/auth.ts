import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { COOKIE_NAME } from "../config/constants.js";
import { AppError } from "../common/errors.js";
import { sessionService } from "../modules/sessions/sessions.service.js";
import { userRepository } from "../modules/users/users.repository.js";

declare module "fastify" {
  interface FastifyRequest {
    authUser?: {
      id: number;
      username: string;
      nickname: string;
      avatarFileId: number | null;
    };
    sessionToken?: string;
  }

  interface FastifyInstance {
    requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}

export const authPlugin = fp(async (app) => {
  app.decorate("requireAuth", async (request: FastifyRequest) => {
    const token = request.cookies[COOKIE_NAME];
    if (!token) {
      throw new AppError(401, "UNAUTHORIZED", "Authentication required.");
    }

    const session = sessionService.getActiveSessionByToken(token);
    if (!session) {
      throw new AppError(401, "SESSION_EXPIRED", "Session has expired.");
    }

    const user = userRepository.findById(session.userId);
    if (!user || user.status !== "active") {
      throw new AppError(401, "UNAUTHORIZED", "User is unavailable.");
    }

    request.sessionToken = token;
    request.authUser = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatarFileId: user.avatarFileId
    };

    sessionService.touchSession(token);
  });
});

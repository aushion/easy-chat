import type { FastifyInstance } from "fastify";
import { COOKIE_NAME } from "../../config/constants.js";
import { getRequestIp } from "../../common/ip.js";
import { authService } from "./auth.service.js";
import { sessionService } from "../sessions/sessions.service.js";

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post("/api/auth/register", async (request, reply) => {
    const body = request.body as { username: string; password: string; nickname: string };
    const { user, session } = authService.register({
      username: body.username,
      password: body.password,
      nickname: body.nickname,
      registerIp: getRequestIp(request),
      userAgent: request.headers["user-agent"] ?? null
    });

    reply.setCookie(COOKIE_NAME, session.sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax"
    });

    return {
      code: "OK",
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null
        }
      }
    };
  });

  app.post("/api/auth/login", async (request, reply) => {
    const body = request.body as { username: string; password: string };
    const { user, session } = authService.login({
      username: body.username,
      password: body.password,
      loginIp: getRequestIp(request),
      userAgent: request.headers["user-agent"] ?? null
    });

    reply.setCookie(COOKIE_NAME, session.sessionToken, {
      path: "/",
      httpOnly: true,
      sameSite: "lax"
    });

    return {
      code: "OK",
      data: {
        user: {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null
        }
      }
    };
  });

  app.get("/api/auth/me", { preHandler: app.requireAuth }, async (request) => {
    const user = request.authUser;
    return {
      code: "OK",
      data: {
        user: user
          ? {
              id: user.id,
              username: user.username,
              nickname: user.nickname,
              avatarUrl: user.avatarFileId ? `/api/files/${user.avatarFileId}/download` : null
            }
          : null
      }
    };
  });

  app.post("/api/auth/logout", { preHandler: app.requireAuth }, async (request, reply) => {
    if (request.sessionToken) {
      sessionService.logout(request.sessionToken);
    }
    reply.clearCookie(COOKIE_NAME, { path: "/" });
    return { code: "OK", data: {} };
  });
}

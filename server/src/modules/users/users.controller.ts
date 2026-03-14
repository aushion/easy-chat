import type { FastifyInstance } from "fastify";
import { filesService } from "../files/files.service.js";
import { usersService } from "./users.service.js";

export async function registerUsersRoutes(app: FastifyInstance) {
  app.get("/api/users/online", { preHandler: app.requireAuth }, async (request) => {
    return {
      code: "OK",
      data: {
        items: usersService.listOnline(request.authUser!.id)
      }
    };
  });

  app.get("/api/users/:id", { preHandler: app.requireAuth }, async (request) => {
    return {
      code: "OK",
      data: {
        user: usersService.getById(Number((request.params as { id: string }).id))
      }
    };
  });

  app.patch("/api/users/me", { preHandler: app.requireAuth }, async (request) => {
    const body = request.body as { nickname?: string };
    return {
      code: "OK",
      data: {
        user: usersService.updateProfile(request.authUser!.id, { nickname: body.nickname })
      }
    };
  });

  app.patch("/api/users/me/password", { preHandler: app.requireAuth }, async (request) => {
    const body = request.body as { oldPassword: string; newPassword: string };
    usersService.updatePassword(request.authUser!.id, body.oldPassword, body.newPassword);
    return { code: "OK", data: {} };
  });

  app.post("/api/users/me/avatar", { preHandler: app.requireAuth }, async (request) => {
    const file = await request.file();
    if (!file) {
      throw new Error("Missing avatar file.");
    }
    const saved = await filesService.saveUpload(file, request.authUser!.id, "avatar");
    const user = usersService.updateProfile(request.authUser!.id, { avatarFileId: saved.id });
    return {
      code: "OK",
      data: {
        user
      }
    };
  });
}

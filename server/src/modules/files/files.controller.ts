import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import { filesService } from "./files.service.js";

export async function registerFilesRoutes(app: FastifyInstance) {
  app.post("/api/files/upload", { preHandler: app.requireAuth }, async (request) => {
    const file = await request.file();
    if (!file) {
      throw new Error("Missing file.");
    }

    const saved = await filesService.saveUpload(file, request.authUser!.id, "attachment");
    return {
      code: "OK",
      data: {
        file: {
          id: saved.id,
          originalName: saved.originalName,
          size: saved.size,
          mimeType: saved.mimeType
        }
      }
    };
  });

  app.get("/api/files/:id/download", { preHandler: app.requireAuth }, async (request, reply) => {
    const file = filesService.getFileForDownload(Number((request.params as { id: string }).id), request.authUser!.id);
    reply.header("Content-Type", file.mimeType);
    reply.header("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
    return reply.send(fs.createReadStream(file.storagePath));
  });
}

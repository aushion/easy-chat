import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import websocket from "@fastify/websocket";
import { AppError } from "./common/errors.js";
import { env } from "./config/env.js";
import { authPlugin } from "./plugins/auth.js";
import { registerAuthRoutes } from "./modules/auth/auth.controller.js";
import { registerUsersRoutes } from "./modules/users/users.controller.js";
import { registerConversationsRoutes } from "./modules/conversations/conversations.controller.js";
import { registerMessagesRoutes } from "./modules/messages/messages.controller.js";
import { registerFilesRoutes } from "./modules/files/files.controller.js";
import { registerRealtimeGateway } from "./modules/realtime/realtime.gateway.js";

export async function buildApp() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(cookie);
  await app.register(multipart);
  await app.register(websocket);
  await app.register(authPlugin);

  await registerAuthRoutes(app);
  await registerUsersRoutes(app);
  await registerConversationsRoutes(app);
  await registerMessagesRoutes(app);
  await registerFilesRoutes(app);
  await registerRealtimeGateway(app);

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({ code: error.code, message: error.message });
    }

    app.log.error(error);
    return reply.status(500).send({ code: "INTERNAL_SERVER_ERROR", message: error.message || "Unexpected server error." });
  });

  return app;
}

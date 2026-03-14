import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { startCleanupScheduler } from "./modules/cleanup/cleanup.scheduler.js";

async function start() {
  const app = await buildApp();
  startCleanupScheduler();
  await app.listen({ port: env.port, host: env.host });
  console.log(`easy-chat server listening on ${env.host}:${env.port}`);
}

start();

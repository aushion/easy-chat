import fs from "node:fs";
import { db } from "../../db/client.js";
import { MESSAGE_RETENTION_DAYS } from "../../config/constants.js";

export function startCleanupScheduler(): void {
  const intervalMs = 24 * 60 * 60 * 1000;
  setInterval(() => {
    const cutoff = new Date(Date.now() - MESSAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    db.prepare("DELETE FROM messages WHERE created_at < ?").run(cutoff);

    const unusedFiles = db
      .prepare(
        `
          SELECT f.id, f.storage_path
          FROM files f
          LEFT JOIN messages m ON m.file_id = f.id
          LEFT JOIN users u ON u.avatar_file_id = f.id
          WHERE m.id IS NULL AND u.id IS NULL AND f.created_at < ?
        `
      )
      .all(cutoff) as Array<{ id: number; storage_path: string }>;

    for (const file of unusedFiles) {
      if (fs.existsSync(file.storage_path)) {
        fs.unlinkSync(file.storage_path);
      }
    }

    db.prepare(
      `
        DELETE FROM files
        WHERE id IN (
          SELECT f.id
          FROM files f
          LEFT JOIN messages m ON m.file_id = f.id
          LEFT JOIN users u ON u.avatar_file_id = f.id
          WHERE m.id IS NULL AND u.id IS NULL AND f.created_at < ?
        )
      `
    ).run(cutoff);
  }, intervalMs).unref();
}

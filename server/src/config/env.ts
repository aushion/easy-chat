import path from "node:path";

const rootDir = process.cwd();

export const env = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? "0.0.0.0",
  sqlitePath: process.env.SQLITE_PATH ?? path.join(rootDir, "data.sqlite"),
  legacyDataPath: process.env.LEGACY_DATA_PATH ?? path.join(rootDir, "data.json"),
  uploadDir: process.env.UPLOAD_DIR ?? path.join(rootDir, "src", "storage", "uploads"),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:5173"
};

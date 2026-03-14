import { db } from "../../db/client.js";

export type FileRecord = {
  id: number;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  storagePath: string;
  uploadedBy: number;
  createdAt: string;
};

function mapFile(row: Record<string, unknown>): FileRecord {
  return {
    id: Number(row.id),
    originalName: String(row.original_name),
    storedName: String(row.stored_name),
    mimeType: String(row.mime_type),
    size: Number(row.size),
    storagePath: String(row.storage_path),
    uploadedBy: Number(row.uploaded_by),
    createdAt: String(row.created_at)
  };
}

class FilesRepository {
  create(input: {
    originalName: string;
    storedName: string;
    mimeType: string;
    size: number;
    storagePath: string;
    uploadedBy: number;
  }): FileRecord {
    const result = db
      .prepare(
        "INSERT INTO files (original_name, stored_name, mime_type, size, storage_path, uploaded_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)"
      )
      .run(
        input.originalName,
        input.storedName,
        input.mimeType,
        input.size,
        input.storagePath,
        input.uploadedBy,
        new Date().toISOString()
      );

    return this.findById(Number(result.lastInsertRowid))!;
  }

  findById(id: number): FileRecord | undefined {
    const row = db.prepare("SELECT * FROM files WHERE id = ? LIMIT 1").get(id) as Record<string, unknown> | undefined;
    return row ? mapFile(row) : undefined;
  }
}

export const filesRepository = new FilesRepository();

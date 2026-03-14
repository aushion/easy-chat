import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import crypto from "node:crypto";
import type { MultipartFile } from "@fastify/multipart";
import { AppError, assert } from "../../common/errors.js";
import { AVATAR_FILE_SIZE, MAX_FILE_SIZE } from "../../config/constants.js";
import { env } from "../../config/env.js";
import { filesRepository } from "./files.repository.js";
import { db } from "../../db/client.js";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed"
]);

function randomName(filename: string): string {
  const ext = path.extname(filename);
  return `${crypto.randomUUID()}${ext}`;
}

class FilesService {
  async saveUpload(file: MultipartFile, userId: number, mode: "attachment" | "avatar") {
    const maxSize = mode === "avatar" ? AVATAR_FILE_SIZE : MAX_FILE_SIZE;
    const mimeType = file.mimetype;
    if (mode === "attachment") {
      assert(allowedMimeTypes.has(mimeType), 400, "INVALID_FILE_TYPE", "File type is not allowed.");
    } else {
      assert(mimeType.startsWith("image/"), 400, "INVALID_FILE_TYPE", "Avatar must be an image.");
    }

    const storedName = randomName(file.filename);
    const storagePath = path.join(env.uploadDir, storedName);

    let writtenSize = 0;
    file.file.on("data", (chunk: Buffer) => {
      writtenSize += chunk.length;
      if (writtenSize > maxSize) {
        file.file.destroy(new AppError(400, "FILE_TOO_LARGE", "File exceeds the allowed size."));
      }
    });

    try {
      await pipeline(file.file, fs.createWriteStream(storagePath));
    } catch (error) {
      if (fs.existsSync(storagePath)) {
        fs.unlinkSync(storagePath);
      }
      throw error;
    }

    return filesRepository.create({
      originalName: file.filename,
      storedName,
      mimeType,
      size: writtenSize,
      storagePath,
      uploadedBy: userId
    });
  }

  getFileForDownload(fileId: number, userId: number) {
    const file = filesRepository.findById(fileId);
    assert(file, 404, "FILE_NOT_FOUND", "File not found.");

    const isAvatar = db
      .prepare("SELECT 1 FROM users WHERE avatar_file_id = ? LIMIT 1")
      .get(fileId) as { 1: number } | undefined;

    const permitted = isAvatar
      ? true
      : db
          .prepare(
            `
              SELECT 1
              FROM messages m
              INNER JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
              WHERE m.file_id = ? AND cm.user_id = ?
              LIMIT 1
            `
          )
          .get(fileId, userId);

    assert(permitted, 403, "FORBIDDEN", "You do not have access to this file.");
    return file;
  }
}

export const filesService = new FilesService();

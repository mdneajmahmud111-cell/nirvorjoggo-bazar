import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { env } from "@/lib/env";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const ALLOWED_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "application/pdf": ".pdf",
};

export class UploadError extends Error {}

/**
 * Securely persists an uploaded file (payment receipts, product images):
 * - validates size and MIME type against an allowlist (never trusts the client-supplied filename)
 * - generates a random filename to avoid path traversal / overwrite attacks
 * - stores outside of any executable path
 */
export async function saveUploadedFile(file: File, subdir: "receipts" | "products"): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new UploadError(`Unsupported file type: ${file.type}`);
  }

  const maxBytes = env.upload.maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new UploadError(`File exceeds maximum size of ${env.upload.maxSizeMb}MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = ALLOWED_EXTENSIONS[file.type];
  const filename = `${randomUUID()}${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/${subdir}/${filename}`;
}

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

/**
 * Verifies the file's actual leading bytes match its claimed type — the browser-supplied
 * Content-Type on a multipart field is just a client-asserted label, trivially spoofed by
 * renaming an arbitrary file, so it must never be trusted alone for what gets written to disk.
 */
function matchesMagicBytes(buffer: Buffer, mimeType: string): boolean {
  switch (mimeType) {
    case "image/jpeg":
      return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case "image/webp":
      return buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    case "application/pdf":
      return buffer.length >= 4 && buffer.subarray(0, 4).toString("ascii") === "%PDF";
    default:
      return false;
  }
}

export class UploadError extends Error {}

/**
 * Securely persists an uploaded file (payment receipts, product images):
 * - validates size and MIME type against an allowlist, and verifies the actual file bytes match
 *   that type (never trusts the client-supplied MIME type or filename alone)
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
  if (!matchesMagicBytes(buffer, file.type)) {
    throw new UploadError("File content does not match its declared type");
  }

  const ext = ALLOWED_EXTENSIONS[file.type];
  const filename = `${randomUUID()}${ext}`;

  const dir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, filename);
  await writeFile(filePath, buffer);

  return `/uploads/${subdir}/${filename}`;
}

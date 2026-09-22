import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("fs/promises", () => ({ mkdir: vi.fn().mockResolvedValue(undefined), writeFile: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/env", () => ({ env: { upload: { maxSizeMb: 5 } } }));

import { saveUploadedFile, UploadError } from "@/lib/upload";

function makeFile(bytes: number[], type: string, name = "upload"): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

const REAL_JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10];
const REAL_PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

describe("saveUploadedFile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a file whose bytes genuinely match its declared image/jpeg type", async () => {
    const url = await saveUploadedFile(makeFile(REAL_JPEG_HEADER, "image/jpeg"), "receipts");
    expect(url).toMatch(/^\/uploads\/receipts\/.+\.jpg$/);
  });

  it("accepts a real PNG", async () => {
    const url = await saveUploadedFile(makeFile(REAL_PNG_HEADER, "image/png"), "products");
    expect(url).toMatch(/^\/uploads\/products\/.+\.png$/);
  });

  it("rejects a file claiming image/jpeg whose bytes don't match the JPEG magic number (spoofed Content-Type)", async () => {
    // e.g. a renamed HTML/script file relabeled with an image Content-Type on the multipart field
    const fakeBytes = Buffer.from("<script>alert(1)</script>").toJSON().data;
    await expect(saveUploadedFile(makeFile(fakeBytes, "image/jpeg"), "receipts")).rejects.toThrow(UploadError);
  });

  it("rejects a disallowed MIME type outright, before even checking bytes", async () => {
    await expect(saveUploadedFile(makeFile(REAL_JPEG_HEADER, "application/x-php"), "receipts")).rejects.toThrow(UploadError);
  });

  it("rejects a PNG's bytes mislabeled as a PDF", async () => {
    await expect(saveUploadedFile(makeFile(REAL_PNG_HEADER, "application/pdf"), "receipts")).rejects.toThrow(UploadError);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "crypto";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    idempotencyKey: { findUnique: vi.fn(), create: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import { withIdempotency } from "@/lib/idempotency";

describe("withIdempotency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("runs the handler once when no key is provided", async () => {
    const handler = vi.fn(async () => ({ status: 201, body: { ok: true } }));
    const result = await withIdempotency(null, "checkout", { a: 1 }, handler);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.replayed).toBe(false);
  });

  it("runs the handler on first use of a key and persists the response", async () => {
    (prisma.idempotencyKey.findUnique as any).mockResolvedValue(null);
    (prisma.idempotencyKey.create as any).mockResolvedValue({});
    const handler = vi.fn(async () => ({ status: 201, body: { orderId: "abc" } }));

    const result = await withIdempotency("key-1", "checkout", { a: 1 }, handler);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(result.replayed).toBe(false);
    expect(prisma.idempotencyKey.create).toHaveBeenCalledTimes(1);
  });

  it("replays the stored response instead of re-running the handler for a repeated key + identical payload", async () => {
    (prisma.idempotencyKey.findUnique as any).mockResolvedValue({
      key: "key-1",
      requestHash: createHash("sha256").update(JSON.stringify({ a: 1 })).digest("hex"),
      statusCode: 201,
      responseBody: { orderId: "abc" },
    });
    const handler = vi.fn(async () => ({ status: 201, body: { orderId: "should-not-run" } }));

    const result = await withIdempotency("key-1", "checkout", { a: 1 }, handler);

    expect(handler).not.toHaveBeenCalled();
    expect(result.replayed).toBe(true);
    expect(result.body).toEqual({ orderId: "abc" });
  });

  it("rejects when the same key is reused with a different payload (prevents cross-order key reuse)", async () => {
    (prisma.idempotencyKey.findUnique as any).mockResolvedValue({
      key: "key-1",
      requestHash: "different-hash",
      statusCode: 201,
      responseBody: { orderId: "abc" },
    });
    const handler = vi.fn(async () => ({ status: 201, body: { orderId: "xyz" } }));

    const result = await withIdempotency("key-1", "checkout", { a: 2 }, handler);

    expect(handler).not.toHaveBeenCalled();
    expect(result.status).toBe(409);
  });
});

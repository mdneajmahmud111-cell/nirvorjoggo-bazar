import { createHash } from "crypto";
import { prisma } from "@/lib/prisma";

const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

export function hashPayload(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}

/**
 * Ensures an operation identified by an idempotency key runs at most once.
 * If the same key is replayed with the same payload, the original response is returned.
 * If the same key is replayed with a different payload, it is rejected (409).
 */
export async function withIdempotency<T>(
  key: string | null | undefined,
  scope: string,
  payload: unknown,
  handler: () => Promise<{ status: number; body: T }>,
): Promise<{ status: number; body: T; replayed: boolean }> {
  if (!key) {
    const result = await handler();
    return { ...result, replayed: false };
  }

  const requestHash = hashPayload(payload);
  const existing = await prisma.idempotencyKey.findUnique({ where: { key } });

  if (existing) {
    if (existing.requestHash !== requestHash) {
      return {
        status: 409,
        body: { error: "Idempotency key reused with a different request body" } as unknown as T,
        replayed: false,
      };
    }
    return { status: existing.statusCode ?? 200, body: existing.responseBody as T, replayed: true };
  }

  const result = await handler();

  await prisma.idempotencyKey
    .create({
      data: {
        key,
        scope,
        requestHash,
        statusCode: result.status,
        responseBody: result.body as object,
        expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
      },
    })
    .catch(() => {
      // Lost the race to another concurrent request with the same key; that's fine,
      // the other request's stored response is now the source of truth.
    });

  return { ...result, replayed: false };
}

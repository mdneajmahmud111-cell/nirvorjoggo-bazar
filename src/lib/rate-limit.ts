import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

/**
 * Fixed-window rate limiter backed by Postgres so it works correctly across
 * multiple serverless/edge instances without requiring a separate cache service.
 */
export async function rateLimit(
  bucketKey: string,
  opts: { windowMs?: number; max?: number } = {},
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
  const windowMs = opts.windowMs ?? env.rateLimit.windowMs;
  const max = opts.max ?? env.rateLimit.maxRequests;
  const now = new Date();

  const existing = await prisma.rateLimitBucket.findUnique({ where: { bucketKey } });

  if (!existing || now.getTime() - existing.windowStart.getTime() > windowMs) {
    await prisma.rateLimitBucket.upsert({
      where: { bucketKey },
      create: { bucketKey, count: 1, windowStart: now },
      update: { count: 1, windowStart: now },
    });
    return { allowed: true, remaining: max - 1, resetAt: new Date(now.getTime() + windowMs) };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(existing.windowStart.getTime() + windowMs),
    };
  }

  const updated = await prisma.rateLimitBucket.update({
    where: { bucketKey },
    data: { count: { increment: 1 } },
  });

  return {
    allowed: true,
    remaining: Math.max(0, max - updated.count),
    resetAt: new Date(existing.windowStart.getTime() + windowMs),
  };
}

export function clientKeyFromRequest(req: Request, scope: string) {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ?? "unknown";
  return `${scope}:${ip}`;
}

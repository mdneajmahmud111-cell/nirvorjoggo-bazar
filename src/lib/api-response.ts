import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { UnauthorizedError, ForbiddenError } from "@/lib/rbac";

export function jsonError(message: string, status: number, details?: unknown) {
  return NextResponse.json({ error: message, details }, { status });
}

/** Uniform error handling for route handlers: catch(err) { return handleApiError(err) } */
export function handleApiError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError("Validation failed", 422, err.flatten());
  }
  if (err instanceof UnauthorizedError) {
    return jsonError(err.message, 401);
  }
  if (err instanceof ForbiddenError) {
    return jsonError(err.message, 403);
  }
  if (err instanceof Error) {
    // eslint-disable-next-line no-console
    console.error(err);
    return jsonError(err.message, 400);
  }
  // eslint-disable-next-line no-console
  console.error(err);
  return jsonError("Internal server error", 500);
}

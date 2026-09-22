import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Role } from "@prisma/client";

export class UnauthorizedError extends Error {
  status = 401;
  constructor(message = "Authentication required") {
    super(message);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = "You do not have permission to perform this action") {
    super(message);
  }
}

export async function getCurrentSession() {
  return getServerSession(authOptions);
}

/** Throws UnauthorizedError/ForbiddenError; use inside route handlers and catch to map to HTTP responses. */
export async function requireRole(...roles: Role[]) {
  const session = await getCurrentSession();
  if (!session?.user) throw new UnauthorizedError();
  if (roles.length > 0 && !roles.includes(session.user.role)) {
    throw new ForbiddenError();
  }
  return session;
}

export async function requireUser() {
  const session = await getCurrentSession();
  if (!session?.user) throw new UnauthorizedError();
  return session;
}

export const ADMIN_ROLES: Role[] = ["ADMIN", "STAFF"];

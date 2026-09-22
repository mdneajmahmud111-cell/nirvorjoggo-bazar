import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { handleApiError } from "@/lib/api-response";
import { requireRole } from "@/lib/rbac";
import { isProviderConfigured } from "@/lib/env";

export async function GET() {
  try {
    await requireRole("ADMIN", "STAFF");
    const methods = await prisma.paymentMethod.findMany({ orderBy: { displayOrder: "asc" } });
    // isConfigured only reflects whether the required env vars are *present* on the server —
    // never the secret values themselves, which never leave env.ts.
    const withConfigStatus = methods.map((m) => ({ ...m, isConfigured: isProviderConfigured(m.code) }));
    return NextResponse.json({ methods: withConfigStatus });
  } catch (err) {
    return handleApiError(err);
  }
}

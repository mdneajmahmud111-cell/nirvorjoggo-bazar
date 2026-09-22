import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireUser } from "@/lib/rbac";

// Deliberately narrow: only name/email are editable here. Phone, password and role
// changes must go through their own dedicated, more carefully-guarded flows.
const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z
    .string()
    .trim()
    .email()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? v : undefined)),
});

export async function PATCH(req: Request) {
  try {
    const session = await requireUser();
    const data = profileSchema.parse(await req.json());

    if (data.email) {
      const existing = await prisma.user.findUnique({ where: { email: data.email } });
      if (existing && existing.id !== session.user.id) {
        return jsonError("An account with this email already exists", 409);
      }
    }

    const user = await prisma.user.update({
      where: { id: session.user.id },
      data: { name: data.name, email: data.email ?? null },
      select: { id: true, name: true, phone: true, email: true },
    });

    return NextResponse.json({ user });
  } catch (err) {
    return handleApiError(err);
  }
}

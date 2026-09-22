import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { handleApiError, jsonError } from "@/lib/api-response";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const { allowed } = await rateLimit(clientKeyFromRequest(req, "auth:register"), { max: 10, windowMs: 60_000 });
    if (!allowed) return jsonError("Too many registration attempts. Please try again shortly.", 429);

    const body = await req.json();
    const data = registerSchema.parse(body);

    const existing = await prisma.user.findUnique({ where: { phone: data.phone } });
    if (existing) return jsonError("An account with this phone number already exists", 409);

    if (data.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: data.email } });
      if (existingEmail) return jsonError("An account with this email already exists", 409);
    }

    const passwordHash = await bcrypt.hash(data.password, 12);
    const user = await prisma.user.create({
      data: { name: data.name, phone: data.phone, email: data.email, passwordHash, role: "CUSTOMER" },
      select: { id: true, name: true, phone: true, email: true },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}

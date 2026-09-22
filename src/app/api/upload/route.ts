import { NextResponse } from "next/server";
import { saveUploadedFile, UploadError } from "@/lib/upload";
import { handleApiError, jsonError } from "@/lib/api-response";
import { requireUser } from "@/lib/rbac";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    await requireUser();
    const { allowed } = await rateLimit(clientKeyFromRequest(req, "upload"), { max: 20, windowMs: 60_000 });
    if (!allowed) return jsonError("Too many uploads. Please wait a moment.", 429);

    const form = await req.formData();
    const file = form.get("file");
    const subdir = form.get("subdir") === "products" ? "products" : "receipts";

    if (!(file instanceof File)) return jsonError("No file provided", 422);

    const url = await saveUploadedFile(file, subdir);
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return jsonError(err.message, 422);
    return handleApiError(err);
  }
}

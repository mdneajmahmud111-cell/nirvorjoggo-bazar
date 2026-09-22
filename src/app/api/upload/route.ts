import { NextResponse } from "next/server";
import { saveUploadedFile, UploadError } from "@/lib/upload";
import { handleApiError, jsonError } from "@/lib/api-response";
import { getCurrentSession, ForbiddenError } from "@/lib/rbac";
import { rateLimit, clientKeyFromRequest } from "@/lib/rate-limit";

/**
 * Product image uploads require an ADMIN/STAFF session (they get attached to catalog data).
 * Payment receipt uploads are intentionally allowed for guests too — checkout (including
 * Bank Transfer / Rocket manual verification) does not require an account, so a guest must
 * still be able to attach a deposit slip / transaction screenshot to their payment.
 * Both paths are rate-limited by IP and strictly validated (MIME allowlist, size cap, random
 * filename) in saveUploadedFile to keep this safe for unauthenticated use.
 */
export async function POST(req: Request) {
  try {
    const { allowed } = await rateLimit(clientKeyFromRequest(req, "upload"), { max: 20, windowMs: 60_000 });
    if (!allowed) return jsonError("Too many uploads. Please wait a moment.", 429);

    const form = await req.formData();
    const file = form.get("file");
    const subdir = form.get("subdir") === "products" ? "products" : "receipts";

    if (subdir === "products") {
      const session = await getCurrentSession();
      if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
        throw new ForbiddenError("Only admin/staff can upload product images");
      }
    }

    if (!(file instanceof File)) return jsonError("No file provided", 422);

    const url = await saveUploadedFile(file, subdir);
    return NextResponse.json({ url }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) return jsonError(err.message, 422);
    return handleApiError(err);
  }
}

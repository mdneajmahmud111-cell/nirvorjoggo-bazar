"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function ProductDeactivateButton({ productId }: { productId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function deactivate() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to deactivate product");
      toast.success("Product deactivated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-danger" disabled={loading} onClick={deactivate}>
      {loading ? "..." : "Deactivate"}
    </button>
  );
}

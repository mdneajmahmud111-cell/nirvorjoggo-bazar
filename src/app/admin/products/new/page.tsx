import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "../_components/product-form";

export default async function NewProductPage() {
  await requireRole("ADMIN", "STAFF");

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">New Product</h1>
      <ProductForm categories={categories} />
    </div>
  );
}

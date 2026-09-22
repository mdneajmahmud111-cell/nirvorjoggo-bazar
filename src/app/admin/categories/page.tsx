import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { CategoryList } from "./_components/category-list";

export default async function AdminCategoriesPage() {
  await requireRole("ADMIN", "STAFF");

  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
    include: { _count: { select: { products: true } } },
  });

  const rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    description: c.description,
    parentId: c.parentId,
    isActive: c.isActive,
    displayOrder: c.displayOrder,
    productCount: c._count.products,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
      <CategoryList categories={rows} />
    </div>
  );
}

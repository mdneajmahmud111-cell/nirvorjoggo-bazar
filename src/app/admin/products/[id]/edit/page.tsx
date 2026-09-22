import { notFound } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { ProductForm, type ProductData } from "../../_components/product-form";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requireRole("ADMIN", "STAFF");

  const [product, categories] = await Promise.all([
    prisma.product.findUnique({ where: { id: params.id }, include: { images: { orderBy: { displayOrder: "asc" } } } }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!product) notFound();

  const productData: ProductData = JSON.parse(JSON.stringify(product));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <ProductForm product={productData} categories={categories} />
    </div>
  );
}

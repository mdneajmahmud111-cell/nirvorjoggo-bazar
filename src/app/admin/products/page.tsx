import Link from "next/link";
import Image from "next/image";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatBDT } from "@/lib/format";
import { ActiveBadge } from "../_components/badges";
import { AdminPagination } from "../_components/pagination";
import { ProductsFilter } from "./_components/products-filter";
import { ProductDeactivateButton } from "./_components/product-row-actions";
import type { Prisma } from "@prisma/client";

const PAGE_SIZE = 20;

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: { q?: string; categoryId?: string; page?: string };
}) {
  await requireRole("ADMIN", "STAFF");

  const q = searchParams.q ?? "";
  const categoryId = searchParams.categoryId ?? "";
  const page = Math.max(1, Number(searchParams.page ?? "1"));

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [{ name: { contains: q, mode: "insensitive" } }, { sku: { contains: q, mode: "insensitive" } }];
  }
  if (categoryId) where.categoryId = categoryId;

  const [items, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { category: true, images: { take: 1 } },
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <Link href="/admin/products/new" className="btn-primary">
          + New Product
        </Link>
      </div>

      <ProductsFilter q={q} categoryId={categoryId} categories={categories} />

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
              {items.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-gray-100">
                        {product.images[0] && (
                          <Image src={product.images[0].url} alt={product.name} fill sizes="40px" className="object-cover" />
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/products/${product.id}/edit`}
                          className="font-medium text-brand-700 hover:underline"
                        >
                          {product.name}
                        </Link>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{product.category.name}</td>
                  <td className="px-4 py-3">{formatBDT(Number(product.price))}</td>
                  <td className="px-4 py-3">
                    <span className={product.stock <= 5 ? "font-medium text-red-600" : ""}>{product.stock}</span>
                  </td>
                  <td className="px-4 py-3">
                    <ActiveBadge isActive={product.isActive} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link href={`/admin/products/${product.id}/edit`} className="btn-secondary">
                        Edit
                      </Link>
                      {product.isActive && <ProductDeactivateButton productId={product.id} />}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <AdminPagination page={page} totalPages={totalPages} basePath="/admin/products" searchParams={{ q, categoryId }} />
      </div>
    </div>
  );
}

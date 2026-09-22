import { prisma } from "@/lib/prisma";
import { queryProducts, toProductCardData } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { PaginationControls } from "@/components/pagination-controls";

export const revalidate = 30;

export default async function ShopPage({
  searchParams,
}: {
  searchParams: { category?: string; q?: string; sort?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;

  const [categories, result] = await Promise.all([
    prisma.category.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
    queryProducts({
      categorySlug: searchParams.category,
      q: searchParams.q,
      sort: searchParams.sort,
      page,
    }),
  ]);

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">All Products</h1>

      <ShopFilters
        categories={categories}
        currentCategory={searchParams.category}
        currentSort={searchParams.sort}
        currentQ={searchParams.q}
      />

      {result.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">
          No products match your filters. Try a different search or category.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">{result.total} products found</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={toProductCardData(product)} />
            ))}
          </div>
          <PaginationControls
            basePath="/shop"
            params={{ category: searchParams.category, q: searchParams.q, sort: searchParams.sort }}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}

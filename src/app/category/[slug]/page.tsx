import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { queryProducts } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { ShopFilters } from "@/components/shop-filters";
import { PaginationControls } from "@/components/pagination-controls";

export const revalidate = 30;

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { q?: string; sort?: string; page?: string };
}) {
  const page = Number(searchParams.page ?? "1") || 1;

  const [category, categories] = await Promise.all([
    prisma.category.findUnique({ where: { slug: params.slug } }),
    prisma.category.findMany({ where: { isActive: true }, orderBy: { displayOrder: "asc" } }),
  ]);

  if (!category || !category.isActive) notFound();

  const result = await queryProducts({
    categorySlug: params.slug,
    q: searchParams.q,
    sort: searchParams.sort,
    page,
  });

  return (
    <div className="container-page py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
        {category.description && <p className="mt-1 text-sm text-gray-600">{category.description}</p>}
      </div>

      <ShopFilters
        categories={categories}
        currentCategory={params.slug}
        currentSort={searchParams.sort}
        currentQ={searchParams.q}
        showCategoryFilter={false}
      />

      {result.items.length === 0 ? (
        <p className="py-16 text-center text-sm text-gray-500">
          No products in this category yet.
        </p>
      ) : (
        <>
          <p className="mb-4 text-sm text-gray-500">{result.total} products found</p>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {result.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
          <PaginationControls
            basePath={`/category/${params.slug}`}
            params={{ q: searchParams.q, sort: searchParams.sort }}
            page={result.page}
            totalPages={result.totalPages}
          />
        </>
      )}
    </div>
  );
}

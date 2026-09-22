import { queryProducts, toProductCardData } from "@/lib/products";
import { ProductCard } from "@/components/product-card";
import { PaginationControls } from "@/components/pagination-controls";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  const page = Number(searchParams.page ?? "1") || 1;
  const result = q ? await queryProducts({ q, page }) : null;

  return (
    <div className="container-page py-8">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Search Products</h1>

      <form method="GET" action="/search" className="mb-8 flex max-w-xl gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search for products…"
          className="input"
          autoFocus
        />
        <button type="submit" className="btn-primary shrink-0">
          Search
        </button>
      </form>

      {!q ? (
        <p className="text-sm text-gray-500">Enter a search term to find products.</p>
      ) : result && result.items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-500">
            No products found for &ldquo;{q}&rdquo;. Try a different search term.
          </p>
        </div>
      ) : (
        result && (
          <>
            <p className="mb-4 text-sm text-gray-500">
              {result.total} results for &ldquo;{q}&rdquo;
            </p>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {result.items.map((product) => (
                <ProductCard key={product.id} product={toProductCardData(product)} />
              ))}
            </div>
            <PaginationControls
              basePath="/search"
              params={{ q }}
              page={result.page}
              totalPages={result.totalPages}
            />
          </>
        )
      )}
    </div>
  );
}

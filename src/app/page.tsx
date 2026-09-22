import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/product-card";

export const revalidate = 60;

export default async function HomePage() {
  const [categories, featuredProducts] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      take: 8,
      include: { _count: { select: { products: true } } },
    }),
    prisma.product.findMany({
      where: { isActive: true, isFeatured: true },
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { images: { orderBy: { displayOrder: "asc" }, take: 1 }, category: true },
    }),
  ]);

  return (
    <div>
      <section className="bg-gradient-to-br from-brand-700 to-brand-600 text-white">
        <div className="container-page flex flex-col items-start gap-4 py-16 sm:py-24">
          <h1 className="max-w-2xl text-3xl font-bold sm:text-5xl">
            Everything you need, delivered across Bangladesh
          </h1>
          <p className="max-w-xl text-base text-brand-50 sm:text-lg">
            Shop thousands of products with cash on delivery, bKash, Nagad, Rocket and bank
            transfer — with real-time shipping estimates for your area.
          </p>
          <Link href="/shop" className="btn bg-white text-brand-700 hover:bg-brand-50">
            Start Shopping
          </Link>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="container-page py-12">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Shop by Category</h2>
            <Link href="/shop" className="text-sm font-medium text-brand-700 hover:underline">
              View all products
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="card flex flex-col items-center gap-2 p-5 text-center transition-shadow hover:shadow-md"
              >
                <span className="font-medium text-gray-900">{category.name}</span>
                <span className="text-xs text-gray-500">{category._count.products} products</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="container-page pb-16">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">Featured Products</h2>
          <Link href="/shop" className="text-sm font-medium text-brand-700 hover:underline">
            View all
          </Link>
        </div>
        {featuredProducts.length === 0 ? (
          <p className="text-sm text-gray-500">No featured products yet — check back soon.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {featuredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

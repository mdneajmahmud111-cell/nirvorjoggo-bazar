import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";
import { StarRating } from "@/components/star-rating";
import { ProductGallery } from "./product-gallery";
import { ProductActions } from "./product-actions";

export const revalidate = 30;

export default async function ProductDetailPage({ params }: { params: { slug: string } }) {
  const product = await prisma.product.findUnique({
    where: { slug: params.slug },
    include: {
      images: { orderBy: { displayOrder: "asc" } },
      variants: true,
      category: true,
      reviews: {
        where: { isApproved: true },
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!product || !product.isActive) notFound();

  const ratingAvg = Number(product.ratingAvg);

  return (
    <div className="container-page py-8">
      <nav className="mb-6 text-sm text-gray-500">
        <Link href="/shop" className="hover:text-brand-700">
          Shop
        </Link>
        {" / "}
        <Link href={`/category/${product.category.slug}`} className="hover:text-brand-700">
          {product.category.name}
        </Link>
        {" / "}
        <span className="text-gray-700">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery
          images={product.images.map((img) => ({ url: img.url, altText: img.altText }))}
          productName={product.name}
        />

        <div>
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
          <div className="mt-2 flex items-center gap-2 text-sm">
            {product.ratingCount > 0 ? (
              <>
                <StarRating rating={ratingAvg} />
                <span className="text-gray-500">
                  {ratingAvg.toFixed(1)} ({product.ratingCount} review{product.ratingCount === 1 ? "" : "s"})
                </span>
              </>
            ) : (
              <span className="text-gray-400">No reviews yet</span>
            )}
          </div>

          <ProductActions
            productId={product.id}
            basePrice={Number(product.price)}
            comparePrice={product.comparePrice ? Number(product.comparePrice) : null}
            baseStock={product.stock}
            variants={product.variants.map((v) => ({ id: v.id, name: v.name, price: Number(v.price), stock: v.stock }))}
          />

          <div className="mt-8 border-t border-gray-200 pt-6">
            <h2 className="mb-2 text-sm font-semibold text-gray-900">Description</h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{product.description}</p>
          </div>
        </div>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="mb-4 text-lg font-bold text-gray-900">Customer Reviews</h2>
        {product.reviews.length === 0 ? (
          <p className="text-sm text-gray-500">No reviews yet for this product.</p>
        ) : (
          <ul className="space-y-4">
            {product.reviews.map((review) => (
              <li key={review.id} className="card p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <StarRating rating={review.rating} />
                    <span className="text-sm font-medium text-gray-900">{review.user.name}</span>
                  </div>
                  <span className="text-xs text-gray-400">{formatDate(review.createdAt)}</span>
                </div>
                {review.title && <p className="mt-2 text-sm font-medium text-gray-900">{review.title}</p>}
                <p className="mt-1 text-sm text-gray-700">{review.comment}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

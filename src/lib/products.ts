import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import type { ProductCardData } from "@/components/product-card";

export const PRODUCTS_PAGE_SIZE = 12;

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "rating", label: "Top Rated" },
] as const;

export type SortOption = (typeof SORT_OPTIONS)[number]["value"];

export interface ProductQueryParams {
  categorySlug?: string;
  q?: string;
  sort?: string;
  page?: number;
  featured?: boolean;
  pageSize?: number;
}

/** Mirrors the filtering/sorting logic of GET /api/products so server components can query
 *  Prisma directly instead of round-tripping through the API. */
export async function queryProducts(params: ProductQueryParams) {
  const { categorySlug, q, sort = "newest", featured, pageSize = PRODUCTS_PAGE_SIZE } = params;
  const page = Math.max(1, params.page ?? 1);

  const where: Prisma.ProductWhereInput = { isActive: true };
  if (categorySlug) where.category = { slug: categorySlug };
  if (featured) where.isFeatured = true;
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    sort === "price_asc"
      ? { price: "asc" }
      : sort === "price_desc"
        ? { price: "desc" }
        : sort === "rating"
          ? { ratingAvg: "desc" }
          : { createdAt: "desc" };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { images: { orderBy: { displayOrder: "asc" }, take: 1 }, category: true },
    }),
    prisma.product.count({ where }),
  ]);

  return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

/** Converts a Prisma Product (Decimal fields) into the plain-number shape ProductCard expects. */
export function toProductCardData(product: {
  id: string;
  name: string;
  slug: string;
  price: unknown;
  comparePrice: unknown;
  ratingAvg: unknown;
  ratingCount: number;
  images: { url: string; altText?: string | null }[];
}): ProductCardData {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: Number(product.price),
    comparePrice: product.comparePrice != null ? Number(product.comparePrice) : null,
    ratingAvg: Number(product.ratingAvg),
    ratingCount: product.ratingCount,
    images: product.images,
  };
}

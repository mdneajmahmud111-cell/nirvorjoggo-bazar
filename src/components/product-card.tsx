import Link from "next/link";
import Image from "next/image";
import { formatBDT } from "@/lib/format";

export interface ProductCardData {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  comparePrice?: number | string | null;
  ratingAvg: number | string;
  ratingCount: number;
  images: { url: string; altText?: string | null }[];
}

export function ProductCard({ product }: { product: ProductCardData }) {
  const image = product.images[0]?.url ?? "/images/placeholder.svg";
  return (
    <Link href={`/product/${product.slug}`} className="card group block overflow-hidden">
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        <Image
          src={image}
          alt={product.images[0]?.altText ?? product.name}
          fill
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover transition-transform group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</h3>
        <div className="mt-1 flex items-center gap-2">
          <span className="font-semibold text-brand-700">{formatBDT(product.price)}</span>
          {product.comparePrice && (
            <span className="text-xs text-gray-400 line-through">{formatBDT(product.comparePrice)}</span>
          )}
        </div>
        {product.ratingCount > 0 && (
          <div className="mt-1 text-xs text-gray-500">
            ★ {Number(product.ratingAvg).toFixed(1)} ({product.ratingCount})
          </div>
        )}
      </div>
    </Link>
  );
}

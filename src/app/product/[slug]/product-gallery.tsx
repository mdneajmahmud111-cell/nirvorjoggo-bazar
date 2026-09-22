"use client";

import { useState } from "react";
import Image from "next/image";

export interface GalleryImage {
  url: string;
  altText?: string | null;
}

export function ProductGallery({ images, productName }: { images: GalleryImage[]; productName: string }) {
  const list = images.length > 0 ? images : [{ url: "/uploads/products/placeholder.svg", altText: productName }];
  const [active, setActive] = useState(0);
  const current = list[Math.min(active, list.length - 1)];

  return (
    <div>
      <div className="relative aspect-square w-full overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
        <Image
          src={current.url}
          alt={current.altText ?? productName}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          priority
        />
      </div>
      {list.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto">
          {list.map((img, idx) => (
            <button
              key={img.url + idx}
              type="button"
              onClick={() => setActive(idx)}
              className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border ${
                idx === active ? "border-brand-600 ring-2 ring-brand-500" : "border-gray-200"
              }`}
              aria-label={`View image ${idx + 1}`}
            >
              <Image src={img.url} alt={img.altText ?? productName} fill sizes="64px" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

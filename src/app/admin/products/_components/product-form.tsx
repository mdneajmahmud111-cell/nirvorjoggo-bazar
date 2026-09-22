"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { productSchema } from "@/lib/validation/admin";
import type { z } from "zod";

type FormValues = z.infer<typeof productSchema>;

export interface CategoryOption {
  id: string;
  name: string;
}

export interface ProductData {
  id: string;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  price: string;
  comparePrice: string | null;
  sku: string;
  stock: number;
  weightKg: string;
  isActive: boolean;
  isFeatured: boolean;
  images: { url: string; altText: string | null }[];
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ProductForm({ product, categories }: { product?: ProductData; categories: CategoryOption[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [images, setImages] = useState<{ url: string; altText?: string }[]>(
    product?.images.map((img) => ({ url: img.url, altText: img.altText ?? undefined })) ?? [],
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product
      ? {
          name: product.name,
          slug: product.slug,
          description: product.description,
          categoryId: product.categoryId,
          price: Number(product.price),
          comparePrice: product.comparePrice !== null ? Number(product.comparePrice) : null,
          sku: product.sku,
          stock: product.stock,
          weightKg: Number(product.weightKg),
          isActive: product.isActive,
          isFeatured: product.isFeatured,
        }
      : {
          name: "",
          slug: "",
          description: "",
          categoryId: categories[0]?.id ?? "",
          price: 0,
          comparePrice: null,
          sku: "",
          stock: 0,
          weightKg: 0.5,
          isActive: true,
          isFeatured: false,
        },
  });

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("subdir", "products");
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to upload image");
      setImages((prev) => [...prev, { url: data.url as string }]);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const payload = { ...values, images };
      const res = await fetch(product ? `/api/admin/products/${product.id}` : "/api/admin/products", {
        method: product ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save product");
      toast.success(product ? "Product updated" : "Product created");
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="card space-y-4 p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              {...register("name", {
                onChange: (e) => {
                  if (!slugTouched) setValue("slug", slugify(e.target.value));
                },
              })}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label className="label">Slug</label>
            <input className="input" {...register("slug", { onChange: () => setSlugTouched(true) })} />
            {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" {...register("categoryId")}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <p className="mt-1 text-xs text-red-600">{errors.categoryId.message}</p>}
          </div>
          <div>
            <label className="label">SKU</label>
            <input className="input" {...register("sku")} />
            {errors.sku && <p className="mt-1 text-xs text-red-600">{errors.sku.message}</p>}
          </div>
        </div>

        <div>
          <label className="label">Description</label>
          <textarea className="input" rows={4} {...register("description")} />
          {errors.description && <p className="mt-1 text-xs text-red-600">{errors.description.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <label className="label">Price (Tk)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              {...register("price", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
            />
            {errors.price && <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>}
          </div>
          <div>
            <label className="label">Compare price (Tk)</label>
            <input
              type="number"
              step="0.01"
              className="input"
              {...register("comparePrice", { setValueAs: (v) => (v === "" || v === null ? null : Number(v)) })}
            />
          </div>
          <div>
            <label className="label">Stock</label>
            <input
              type="number"
              className="input"
              {...register("stock", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
            />
            {errors.stock && <p className="mt-1 text-xs text-red-600">{errors.stock.message}</p>}
          </div>
          <div>
            <label className="label">Weight (kg)</label>
            <input
              type="number"
              step="0.001"
              className="input"
              {...register("weightKg", { setValueAs: (v) => (v === "" ? 0.5 : Number(v)) })}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <input id="product-active" type="checkbox" {...register("isActive")} />
            <label htmlFor="product-active" className="text-sm font-medium text-gray-700">
              Active
            </label>
          </div>
          <div className="flex items-center gap-2">
            <input id="product-featured" type="checkbox" {...register("isFeatured")} />
            <label htmlFor="product-featured" className="text-sm font-medium text-gray-700">
              Featured
            </label>
          </div>
        </div>
      </div>

      <div className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold text-gray-900">Images</h2>
        <div className="flex flex-wrap gap-3">
          {images.map((img, idx) => (
            <div key={img.url} className="relative h-24 w-24 overflow-hidden rounded-md border border-gray-200">
              <Image src={img.url} alt={img.altText ?? ""} fill sizes="96px" className="object-cover" />
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute right-1 top-1 rounded-full bg-white/90 px-1.5 text-xs font-bold text-red-600 shadow"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div>
          <label className="label">Add image</label>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            disabled={uploading}
            className="text-sm"
          />
          {uploading && <p className="mt-1 text-xs text-gray-500">Uploading...</p>}
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading || uploading}>
          {loading ? "Saving..." : product ? "Save changes" : "Create product"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { categorySchema } from "@/lib/validation/admin";
import type { z } from "zod";

type FormValues = z.infer<typeof categorySchema>;

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parentId: string | null;
  isActive: boolean;
  displayOrder: number;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function CategoryForm({
  category,
  categories,
  onDone,
}: {
  category?: CategoryData;
  categories: CategoryData[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [slugTouched, setSlugTouched] = useState(Boolean(category));

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: category
      ? {
          name: category.name,
          slug: category.slug,
          description: category.description,
          parentId: category.parentId,
          isActive: category.isActive,
          displayOrder: category.displayOrder,
        }
      : { name: "", slug: "", description: null, parentId: null, isActive: true, displayOrder: 0 },
  });

  async function onSubmit(values: FormValues) {
    setLoading(true);
    try {
      const res = await fetch(category ? `/api/admin/categories/${category.id}` : "/api/admin/categories", {
        method: category ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save category");
      toast.success(category ? "Category updated" : "Category created");
      router.refresh();
      onDone?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save category");
    } finally {
      setLoading(false);
    }
  }

  const parentOptions = categories.filter((c) => c.id !== category?.id);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
          <input
            className="input"
            {...register("slug", { onChange: () => setSlugTouched(true) })}
          />
          {errors.slug && <p className="mt-1 text-xs text-red-600">{errors.slug.message}</p>}
        </div>
        <div>
          <label className="label">Parent category</label>
          <select
            className="input"
            {...register("parentId", { setValueAs: (v) => (v === "" ? null : v) })}
          >
            <option value="">None (top-level)</option>
            {parentOptions.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Display order</label>
          <input
            type="number"
            className="input"
            {...register("displayOrder", { setValueAs: (v) => (v === "" ? 0 : Number(v)) })}
          />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input id="category-active" type="checkbox" {...register("isActive")} />
          <label htmlFor="category-active" className="text-sm font-medium text-gray-700">
            Active
          </label>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input"
          rows={2}
          {...register("description", { setValueAs: (v) => (v === "" ? null : v) })}
        />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? "Saving..." : category ? "Save changes" : "Create category"}
        </button>
        {onDone && (
          <button type="button" className="btn-secondary" onClick={onDone}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

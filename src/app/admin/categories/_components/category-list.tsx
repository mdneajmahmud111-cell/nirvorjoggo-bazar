"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ActiveBadge } from "../../_components/badges";
import { CategoryForm, type CategoryData } from "./category-form";

export function CategoryList({ categories }: { categories: (CategoryData & { productCount: number })[] }) {
  const router = useRouter();
  const [addingNew, setAddingNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  async function deactivate(id: string) {
    setDeactivatingId(id);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to deactivate category");
      toast.success("Category deactivated");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to deactivate category");
    } finally {
      setDeactivatingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card p-4">
        {addingNew ? (
          <CategoryForm categories={categories} onDone={() => setAddingNew(false)} />
        ) : (
          <button className="btn-primary" onClick={() => setAddingNew(true)}>
            + Add category
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs uppercase text-gray-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Parent</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-gray-500">
                    No categories yet.
                  </td>
                </tr>
              )}
              {categories.map((category) => (
                <Fragment key={category.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{category.name}</td>
                    <td className="px-4 py-3 text-gray-500">{category.slug}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {categories.find((c) => c.id === category.parentId)?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3">{category.productCount}</td>
                    <td className="px-4 py-3">
                      <ActiveBadge isActive={category.isActive} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          className="btn-secondary"
                          onClick={() => setEditingId(editingId === category.id ? null : category.id)}
                        >
                          {editingId === category.id ? "Close" : "Edit"}
                        </button>
                        {category.isActive && (
                          <button
                            className="btn-danger"
                            disabled={deactivatingId === category.id}
                            onClick={() => deactivate(category.id)}
                          >
                            {deactivatingId === category.id ? "..." : "Deactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {editingId === category.id && (
                    <tr>
                      <td colSpan={6} className="bg-gray-50 px-4 py-4">
                        <CategoryForm category={category} categories={categories} onDone={() => setEditingId(null)} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

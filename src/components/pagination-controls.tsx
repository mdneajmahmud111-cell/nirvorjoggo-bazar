import Link from "next/link";

function buildHref(basePath: string, params: Record<string, string | undefined>, page: number) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }
  if (page > 1) search.set("page", String(page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function PaginationControls({
  basePath,
  params,
  page,
  totalPages,
}: {
  basePath: string;
  params: Record<string, string | undefined>;
  page: number;
  totalPages: number;
}) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={buildHref(basePath, params, Math.max(1, page - 1))}
        className={`btn-secondary ${page <= 1 ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={page <= 1}
      >
        Prev
      </Link>
      {pages.map((p, idx) => (
        <span key={p} className="flex items-center gap-1">
          {idx > 0 && pages[idx - 1] !== p - 1 && <span className="px-1 text-gray-400">…</span>}
          <Link
            href={buildHref(basePath, params, p)}
            className={p === page ? "btn-primary" : "btn-secondary"}
          >
            {p}
          </Link>
        </span>
      ))}
      <Link
        href={buildHref(basePath, params, Math.min(totalPages, page + 1))}
        className={`btn-secondary ${page >= totalPages ? "pointer-events-none opacity-50" : ""}`}
        aria-disabled={page >= totalPages}
      >
        Next
      </Link>
    </nav>
  );
}

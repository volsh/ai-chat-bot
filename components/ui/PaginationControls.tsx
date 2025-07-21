// components/ui/PaginationControls.tsx

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function PaginationControls({
  page,
  total,
  pageSize,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onPageChange: (newPage: number) => void;
  onPageSizeChange?: (newSize: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  const canGoBack = page > 1;
  const canGoForward = page < totalPages;

  const visibleRangeStart = (page - 1) * pageSize + 1;
  const visibleRangeEnd = Math.min(page * pageSize, total);

  const visiblePages = Array.from({ length: totalPages }, (_, i) => i + 1).slice(
    Math.max(0, page - 3),
    page + 2
  );

  const pageSizes = [10, 25, 50, 100];

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 text-sm text-zinc-600 dark:text-zinc-300">
      <div>
        Showing {visibleRangeStart}–{visibleRangeEnd} of {total} logs
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={!canGoBack}
          onClick={() => onPageChange(page - 1)}
          className="rounded px-2 py-1 text-sm font-medium hover:bg-zinc-200 disabled:text-zinc-400 dark:hover:bg-zinc-700 dark:disabled:text-zinc-500"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {visiblePages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`rounded px-3 py-1 text-sm font-medium ${
              p === page
                ? "bg-zinc-300 text-zinc-900 dark:bg-zinc-700 dark:text-white"
                : "hover:bg-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {p}
          </button>
        ))}

        <button
          disabled={!canGoForward}
          onClick={() => onPageChange(page + 1)}
          className="rounded px-2 py-1 text-sm font-medium hover:bg-zinc-200 disabled:text-zinc-400 dark:hover:bg-zinc-700 dark:disabled:text-zinc-500"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="ml-2 rounded border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-600 dark:bg-zinc-900"
          >
            {pageSizes.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}

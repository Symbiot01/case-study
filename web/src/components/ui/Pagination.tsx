type PaginationProps = {
  page: number;
  limit: number;
  total?: number;
  totalPages?: number;
  hasNext?: boolean;
  onPage: (page: number) => void;
};

function pageList(page: number, totalPages: number) {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, start + 4);
  for (let current = Math.max(1, end - 4); current <= end; current += 1) {
    pages.push(current);
  }
  return pages;
}

export function Pagination({ page, limit, total, totalPages, hasNext, onPage }: PaginationProps) {
  const knownPages = totalPages ?? (hasNext ? page + 1 : page);
  if ((totalPages !== undefined && totalPages <= 1) || (totalPages === undefined && page === 1 && !hasNext)) {
    return null;
  }

  const start = total === undefined ? null : (page - 1) * limit + 1;
  const end = total === undefined || start === null ? null : Math.min(page * limit, total);
  const nextDisabled = totalPages !== undefined ? page >= totalPages : !hasNext;

  return (
    <div className="mt-8 flex flex-col gap-4 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        {start !== null && end !== null && total !== undefined
          ? `Showing ${start}–${end} of ${total}`
          : `Page ${page}`}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="border border-line-strong px-3 py-2 text-sm disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
        >
          Previous
        </button>
        <div className="hidden items-center gap-2 md:flex">
          {pageList(page, knownPages).map((number) => (
            <button
              key={number}
              type="button"
              aria-current={number === page ? "page" : undefined}
              className={
                number === page
                  ? "border border-accent bg-accent px-3 py-2 text-sm text-white"
                  : "border border-line-strong px-3 py-2 text-sm"
              }
              onClick={() => onPage(number)}
            >
              {number}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="border border-line-strong px-3 py-2 text-sm disabled:opacity-40"
          disabled={nextDisabled}
          onClick={() => onPage(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

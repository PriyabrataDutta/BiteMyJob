import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  itemLabel?: string;
}

const PAGE_SIZE_OPTIONS = [6, 9, 12, 24];

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemLabel = 'applications',
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startIndex = (currentPage - 1) * pageSize + 1;
  const endIndex = Math.min(currentPage * pageSize, totalItems);

  const pageNumbers: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i += 1) {
      pageNumbers.push(i);
    }
  } else {
    pageNumbers.push(1);
    if (currentPage > 3) pageNumbers.push('ellipsis');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i += 1) {
      pageNumbers.push(i);
    }
    if (currentPage < totalPages - 2) pageNumbers.push('ellipsis');
    pageNumbers.push(totalPages);
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-col gap-4 rounded-lg bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex flex-wrap items-center gap-4 text-xs text-[#4D5566]">
        <p className="tabular-nums">
          Showing <span className="font-semibold text-[#141923]">{startIndex}–{endIndex}</span> of{' '}
          <span className="font-semibold text-[#141923]">{totalItems}</span> {itemLabel}
        </p>

        <label className="inline-flex items-center gap-2">
          <span className="font-label">Per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="Items per page"
            className="rounded-sm bg-[#F3F5F9] px-2 py-1 text-xs font-medium text-[#141923] ghost-border ghost-border-focus cursor-pointer tabular-nums"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="inline-flex items-center gap-1 rounded-sm bg-[#ECEFF5] px-3 py-1.5 text-xs font-medium text-[#141923] transition-colors hover:bg-[#E3E7F0] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Previous</span>
        </button>

        {pageNumbers.map((entry, idx) =>
          entry === 'ellipsis' ? (
            <span
              key={`ellipsis-${idx}`}
              className="px-2 text-xs text-[#4D5566]"
              aria-hidden="true"
            >
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              onClick={() => onPageChange(entry)}
              aria-current={entry === currentPage ? 'page' : undefined}
              className={`min-w-[32px] rounded-sm px-2.5 py-1.5 font-label text-xs font-semibold transition-colors tabular-nums cursor-pointer ${
                entry === currentPage
                  ? 'bg-[#094CB2] text-white'
                  : 'bg-[#F3F5F9] text-[#4D5566] hover:bg-[#E3E7F0] hover:text-[#141923]'
              }`}
            >
              {entry}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="inline-flex items-center gap-1 rounded-sm bg-[#ECEFF5] px-3 py-1.5 text-xs font-medium text-[#141923] transition-colors hover:bg-[#E3E7F0] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}

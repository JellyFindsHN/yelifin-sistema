"use client";

import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  total: number;
  label?: string;
  onPageChange: (page: number) => void;
}

export function PaginationControls({
  page, totalPages, total, label = "registros", onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || (p >= page - 1 && p <= page + 1))
    .reduce<(number | "…")[]>((acc, p, i, arr) => {
      if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
      acc.push(p);
      return acc;
    }, []);

  return (
    <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between mt-2">
      <p className="text-sm text-muted-foreground order-2 sm:order-1">
        {total} {label} · página {page} de {totalPages}
      </p>
      <Pagination className="order-1 sm:order-2 w-auto mx-0 justify-end">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => onPageChange(Math.max(1, page - 1))}
              aria-disabled={page === 1}
              className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
          {pages.map((p, i) =>
            p === "…" ? (
              <PaginationItem key={`ellipsis-${i}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  isActive={p === page}
                  onClick={() => onPageChange(p as number)}
                  className="cursor-pointer"
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            )
          )}
          <PaginationItem>
            <PaginationNext
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              aria-disabled={page === totalPages}
              className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}

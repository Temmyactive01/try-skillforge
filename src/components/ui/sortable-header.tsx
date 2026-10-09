import type { ReactNode } from "react";
import { ChevronDown, ChevronsUpDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { nextSort, type Sort } from "@/lib/sorting";
import { TableHead } from "@/components/ui/table";

/**
 * A column header that sorts its table. `aria-sort` on the cell tells a screen
 * reader how the table is ordered; the arrow says the same thing visually, and
 * a dimmed double arrow marks the columns that *can* be sorted but aren't.
 */
export function SortableHeader<Column extends string>({
  column,
  sort,
  onSort,
  className,
  children,
}: {
  column: Column;
  sort: Sort<Column>;
  onSort: (sort: Sort<Column>) => void;
  className?: string;
  children: ReactNode;
}) {
  const active = sort.column === column;
  return (
    <TableHead
      aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}
      className={className}
      scope="col"
    >
      <button
        type="button"
        onClick={() => onSort(nextSort(sort, column))}
        className={cn("inline-flex items-center gap-1 rounded-sm hover:text-ink")}
      >
        {children}
        {!active ? (
          <ChevronsUpDown aria-hidden className="size-4 text-steel-strong" />
        ) : sort.direction === "asc" ? (
          <ChevronUp aria-hidden className="size-4" />
        ) : (
          <ChevronDown aria-hidden className="size-4" />
        )}
      </button>
    </TableHead>
  );
}

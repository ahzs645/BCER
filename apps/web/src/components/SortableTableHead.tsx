import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import type React from "react";
import { cn } from "@/lib/utils";
import type { SortState } from "@/lib/table-sort";
import { TableHead } from "@/components/ui/table";

interface SortableTableHeadProps<TKey extends string> {
  sort: SortState<TKey>;
  sortKey: TKey;
  children: React.ReactNode;
  className?: string;
  onSort: (key: TKey) => void;
}

export function SortableTableHead<TKey extends string>({
  sort,
  sortKey,
  children,
  className,
  onSort,
}: SortableTableHeadProps<TKey>) {
  const active = sort.key === sortKey;
  const Icon = !active ? ChevronsUpDown : sort.direction === "asc" ? ArrowUp : ArrowDown;

  return (
    <TableHead className={className} aria-sort={active ? (sort.direction === "asc" ? "ascending" : "descending") : "none"}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex h-full min-h-8 w-full items-center gap-1.5 text-left text-xs font-semibold uppercase tracking-wider text-inherit",
          className?.includes("text-right") && "justify-end text-right",
        )}
      >
        <span>{children}</span>
        <Icon className={cn("h-3 w-3 shrink-0", active ? "text-primary" : "text-muted-foreground/70")} />
      </button>
    </TableHead>
  );
}

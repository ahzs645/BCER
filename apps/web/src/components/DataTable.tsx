import { Download } from "lucide-react";
import { formatCellValue, humanizeKey } from "@/lib/format";
import { downloadCsv, toFilenameStem } from "@/lib/export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  rows: Array<Record<string, string | number | null>>;
  emptyMessage?: string;
  /** Optional per-column header overrides; falls back to humanizeKey(column). */
  labels?: Record<string, string>;
  /**
   * When provided, renders a CSV download button and uses this label as the
   * filename stem. Exported rows carry the raw values, not the display strings.
   */
  exportName?: string;
}

export function DataTable({ rows, emptyMessage = "No rows available.", labels, exportName }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const columns = Object.keys(rows[0]);
  const headerFor = (column: string) => labels?.[column] ?? humanizeKey(column);

  return (
    <div className="space-y-2">
      {exportName && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => downloadCsv(`${toFilenameStem(exportName)}.csv`, rows, labels)}
            className="inline-flex items-center gap-1.5 rounded-md border border-input bg-muted/40 px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Download className="h-3 w-3" />
            CSV
          </button>
        </div>
      )}

      {/* Mobile: stacked label/value cards so wide tables don't force a cramped
          horizontal scroll strip inside the card. */}
      <div className="space-y-2 md:hidden">
        {rows.map((row, rowIndex) => (
          <div
            key={`m-${rowIndex}-${columns[0] ?? "row"}`}
            className="rounded-lg border border-border/40 bg-muted/10 p-3"
          >
            <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              {columns.map((column) => (
                <div key={column} className="contents">
                  <dt className="truncate text-xs text-muted-foreground">{headerFor(column)}</dt>
                  <dd className="text-right text-sm font-medium tabular-nums">
                    {formatCellValue(column, row[column])}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop / tablet: full table with horizontal scroll fallback. */}
      <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              {columns.map((column) => (
                <TableHead key={column} className="text-xs font-semibold uppercase tracking-wider">
                  {headerFor(column)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row, rowIndex) => (
              <TableRow key={`${rowIndex}-${columns[0] ?? "row"}`} className="border-border/30 hover:bg-muted/30">
                {columns.map((column) => (
                  <TableCell key={column} className="py-2 text-sm">
                    {formatCellValue(column, row[column])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

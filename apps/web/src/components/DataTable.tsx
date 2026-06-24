import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { formatCellValue, humanizeKey } from "@/lib/format";
import { downloadCsv, toFilenameStem } from "@/lib/export";
import { useSortableRows } from "@/lib/table-sort";
import { SortableTableHead } from "@/components/SortableTableHead";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

function searchUrl(key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return null;
  const params = new URLSearchParams();
  params.set(key, String(value));
  return `/search?${params.toString()}`;
}

function linkForCell(column: string, value: string | number | null, row: Record<string, string | number | null>) {
  if (value === null || value === undefined || value === "") return null;

  if (column === "wa_num") return `/wells/${value}`;
  if (column === "well_name" && row.wa_num) return `/wells/${row.wa_num}`;
  if (column === "operator_id") return `/operators?id=${value}`;
  if ((column === "operator" || column === "operator_abbr") && row.operator_id) return `/operators?id=${row.operator_id}`;
  if (column === "area_desc") {
    return row.area_code !== null && row.area_code !== undefined && row.area_code !== ""
      ? `/areas/${row.area_code}`
      : searchUrl("area", value);
  }
  if (column === "form_desc") {
    return row.form_code !== null && row.form_code !== undefined && row.form_code !== ""
      ? `/formations/${row.form_code}`
      : searchUrl("formation", value);
  }
  if (column === "uwi") return searchUrl("uwi", value);

  return null;
}

function CellValue({
  column,
  row,
}: {
  column: string;
  row: Record<string, string | number | null>;
}) {
  const value = row[column];
  const label = formatCellValue(column, value);
  const href = linkForCell(column, value, row);

  if (!href || label === "—") return <>{label}</>;

  return (
    <Link to={href} className="font-medium text-primary hover:underline">
      {label}
    </Link>
  );
}

export function DataTable({ rows, emptyMessage = "No rows available.", labels, exportName }: DataTableProps) {
  const columns = Object.keys(rows[0] ?? {});
  const getSortValue = useCallback(
    (row: Record<string, string | number | null>, column: string) => row[column],
    [],
  );
  const { sortedRows, sort, setSort, toggleSort } = useSortableRows(rows, columns, getSortValue);
  const headerFor = (column: string) => labels?.[column] ?? humanizeKey(column);

  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

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

      <div className="flex justify-end md:hidden">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Sort
          <Select
            value={`${sort.key}:${sort.direction}`}
            onValueChange={(value) => {
              const [key, direction] = value.split(":") as [string, "asc" | "desc"];
              setSort({ key, direction });
            }}
          >
            <SelectTrigger size="sm" className="h-8 w-auto text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {columns.flatMap((column) => [
                <SelectItem key={`${column}:asc`} value={`${column}:asc`}>
                  {headerFor(column)} ↑
                </SelectItem>,
                <SelectItem key={`${column}:desc`} value={`${column}:desc`}>
                  {headerFor(column)} ↓
                </SelectItem>,
              ])}
            </SelectContent>
          </Select>
        </label>
      </div>

      {/* Mobile: stacked label/value cards so wide tables don't force a cramped
          horizontal scroll strip inside the card. */}
      <div className="space-y-2 md:hidden">
        {sortedRows.map((row, rowIndex) => (
          <div
            key={`m-${rowIndex}-${columns[0] ?? "row"}`}
            className="rounded-lg border border-border/40 bg-muted/10 p-3"
          >
            <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-x-3 gap-y-1.5">
              {columns.map((column) => (
                <div key={column} className="contents">
                  <dt className="truncate text-xs text-muted-foreground">{headerFor(column)}</dt>
                  <dd className="min-w-0 break-words text-right text-sm font-medium tabular-nums [overflow-wrap:anywhere]">
                    <CellValue column={column} row={row} />
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
                <SortableTableHead key={column} sort={sort} sortKey={column} onSort={toggleSort}>
                  {headerFor(column)}
                </SortableTableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((row, rowIndex) => (
              <TableRow key={`${rowIndex}-${columns[0] ?? "row"}`} className="border-border/30 hover:bg-muted/30">
                {columns.map((column) => (
                  <TableCell key={column} className="py-2 text-sm">
                    <CellValue column={column} row={row} />
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

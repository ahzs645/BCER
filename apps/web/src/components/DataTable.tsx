import { formatCellValue, humanizeKey } from "@/lib/format";
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
}

export function DataTable({ rows, emptyMessage = "No rows available." }: DataTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const columns = Object.keys(rows[0]);

  return (
    <div className="overflow-x-auto rounded-lg border border-border/50">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column} className="text-xs font-semibold uppercase tracking-wider">
                {humanizeKey(column)}
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
  );
}

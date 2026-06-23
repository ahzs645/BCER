import { useCallback } from "react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SortableTableHead } from "@/components/SortableTableHead";
import { useSortableRows } from "@/lib/table-sort";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { WellSearchResult } from "@/types";

const wellColumns = ["waNum", "wellName", "operator", "areaDesc", "formDesc", "orientation", "gasProd3Yr", "gasProd5Yr"] as const;

function searchUrl(key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "/search";
  const params = new URLSearchParams();
  params.set(key, String(value));
  return `/search?${params.toString()}`;
}

/** Profile-aware link for an area cell: area profile by code, else a search fallback. */
function areaHref(well: WellSearchResult) {
  if (well.areaCode !== null) return `/areas/${well.areaCode}`;
  return well.areaDesc ? searchUrl("area", well.areaDesc) : null;
}

function formationHref(well: WellSearchResult) {
  if (well.formCode !== null) return `/formations/${well.formCode}`;
  return well.formDesc ? searchUrl("formation", well.formDesc) : null;
}

function OrientationBadge({ orientation }: { orientation: string | null }) {
  if (!orientation) return null;
  return (
    <Badge variant="outline" className="text-[10px]">
      {orientation === "HZ" ? "HZ" : "VT"}
    </Badge>
  );
}

interface WellListProps {
  wells: WellSearchResult[];
  emptyMessage?: string;
  /** When set, caps the list height and scrolls internally (e.g. "max-h-[600px]"). */
  maxHeightClass?: string;
}

export function WellList({ wells, emptyMessage = "No wells.", maxHeightClass }: WellListProps) {
  const getSortValue = useCallback(
    (well: WellSearchResult, key: (typeof wellColumns)[number]) => well[key],
    [],
  );
  const { sortedRows, sort, toggleSort } = useSortableRows(wells, wellColumns, getSortValue, {
    key: "gasProd3Yr",
    direction: "desc",
  });

  if (wells.length === 0) {
    return (
      <div className="rounded-lg bg-muted/20 px-4 py-3 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: stacked cards */}
      <div className={cn("space-y-3 md:hidden", maxHeightClass && `${maxHeightClass} overflow-y-auto`)}>
        {sortedRows.map((well) => {
          const area = areaHref(well);
          const formation = formationHref(well);
          return (
            <div key={well.waNum} className="rounded-lg border border-border/50 bg-muted/10 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link to={`/wells/${well.waNum}`} className="font-medium text-primary hover:underline">
                    WA {well.waNum}
                  </Link>
                  <p className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
                    {well.wellName ?? "Unnamed well"}
                  </p>
                  {well.operator && well.operatorId ? (
                    <Link to={`/operators?id=${well.operatorId}`} className="mt-1 block break-words text-xs font-medium text-primary hover:underline [overflow-wrap:anywhere]">
                      {well.operator}
                    </Link>
                  ) : (
                    <p className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">{well.operator ?? "No operator"}</p>
                  )}
                </div>
                <OrientationBadge orientation={well.orientation} />
              </div>
              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Area</dt>
                  <dd className="break-words font-medium [overflow-wrap:anywhere]">
                    {area ? <Link to={area} className="text-primary hover:underline">{well.areaDesc ?? "—"}</Link> : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Formation</dt>
                  <dd className="break-words font-medium [overflow-wrap:anywhere]">
                    {formation ? <Link to={formation} className="text-primary hover:underline">{well.formDesc ?? "—"}</Link> : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">3yr Gas (000 m3)</dt>
                  <dd className="font-mono font-medium">{formatNumber(well.gasProd3Yr, 1)}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">5yr Gas (000 m3)</dt>
                  <dd className="font-mono font-medium">{formatNumber(well.gasProd5Yr, 1)}</dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      {/* Desktop: sortable table */}
      <div className={cn("hidden overflow-x-auto rounded-lg border border-border/50 md:block", maxHeightClass && `${maxHeightClass} overflow-y-auto`)}>
        <Table>
          <TableHeader>
            <TableRow className="border-border/50 hover:bg-transparent">
              <SortableTableHead sort={sort} sortKey="waNum" onSort={toggleSort} className="h-8 text-xs sticky top-0 bg-card">WA</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="wellName" onSort={toggleSort} className="h-8 text-xs sticky top-0 bg-card">Well Name</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="operator" onSort={toggleSort} className="h-8 text-xs sticky top-0 bg-card">Operator</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="areaDesc" onSort={toggleSort} className="h-8 text-xs sticky top-0 bg-card">Area</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="formDesc" onSort={toggleSort} className="h-8 text-xs sticky top-0 bg-card">Formation</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="orientation" onSort={toggleSort} className="h-8 text-xs sticky top-0 bg-card">Orient.</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="gasProd3Yr" onSort={toggleSort} className="h-8 text-xs text-right sticky top-0 bg-card">3yr Gas (000 m3)</SortableTableHead>
              <SortableTableHead sort={sort} sortKey="gasProd5Yr" onSort={toggleSort} className="h-8 text-xs text-right sticky top-0 bg-card">5yr Gas (000 m3)</SortableTableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedRows.map((well) => {
              const area = areaHref(well);
              const formation = formationHref(well);
              return (
                <TableRow key={well.waNum} className="border-border/30 hover:bg-muted/50">
                  <TableCell className="py-1.5">
                    <Link to={`/wells/${well.waNum}`} className="font-medium text-primary hover:underline">{well.waNum}</Link>
                  </TableCell>
                  <TableCell className="py-1.5 text-sm">{well.wellName ?? "—"}</TableCell>
                  <TableCell className="py-1.5 text-sm">
                    {well.operator && well.operatorId ? (
                      <Link to={`/operators?id=${well.operatorId}`} className="text-primary hover:underline">{well.operator}</Link>
                    ) : (
                      <span className="text-muted-foreground">{well.operator ?? "—"}</span>
                    )}
                  </TableCell>
                  <TableCell className="py-1.5 text-sm text-muted-foreground">
                    {area ? <Link to={area} className="text-primary hover:underline">{well.areaDesc ?? "—"}</Link> : "—"}
                  </TableCell>
                  <TableCell className="py-1.5 text-sm text-muted-foreground">
                    {formation ? <Link to={formation} className="text-primary hover:underline">{well.formDesc ?? "—"}</Link> : "—"}
                  </TableCell>
                  <TableCell className="py-1.5"><OrientationBadge orientation={well.orientation} /></TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-sm">{formatNumber(well.gasProd3Yr, 1)}</TableCell>
                  <TableCell className="py-1.5 text-right font-mono text-sm">{formatNumber(well.gasProd5Yr, 1)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

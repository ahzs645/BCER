import { startTransition, useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Download, Filter, MapPin, X } from "lucide-react";
import { fetchFilteredWells, fetchSourceMeta, fetchWellSearch } from "@/lib/api";
import { downloadCsv } from "@/lib/export";
import { formatLatLon, formatMonthCode, formatNumber } from "@/lib/format";
import type { SearchResponse, SourceMeta, WellSearchResult } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MonthPicker } from "@/components/ui/month-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Skeleton } from "@/components/ui/skeleton";
import { SortableTableHead } from "@/components/SortableTableHead";
import { useSortableRows } from "@/lib/table-sort";

const DEFAULT_SORT = "high3YrProd";
const DEFAULT_PAGE_SIZE = "25";
const resultColumns = ["waNum", "wellName", "operator", "areaDesc", "firstProdMon", "orientation", "surfLat", "gasProd3Yr", "gasProd5Yr"] as const;

const initialState = {
  waNum: "",
  waNumFrom: "",
  waNumTo: "",
  wellName: "",
  operator: "",
  uwi: "",
  area: "",
  formation: "",
  spudFrom: "",
  spudTo: "",
  rigRelFrom: "",
  rigRelTo: "",
  firstProdFrom: "",
  firstProdTo: "",
  orientation: "all",
  latMin: "",
  latMax: "",
  lonMin: "",
  lonMax: "",
  sort: DEFAULT_SORT,
  pageSize: DEFAULT_PAGE_SIZE,
};

const filterGroups = [
  {
    label: "Identity",
    fields: [
      ["waNum", "WA Number"],
      ["waNumFrom", "WA From"],
      ["waNumTo", "WA To"],
      ["wellName", "Well Name"],
    ],
  },
  {
    label: "Operator",
    fields: [
      ["operator", "Operator Name / Number"],
      ["uwi", "UWI"],
    ],
  },
  {
    label: "Location",
    fields: [
      ["area", "Area"],
      ["formation", "Formation"],
      ["latMin", "Lat Min"],
      ["latMax", "Lat Max"],
      ["lonMin", "Lon Min"],
      ["lonMax", "Lon Max"],
    ],
  },
  {
    label: "Dates",
    fields: [
      ["spudFrom", "Spud From"],
      ["spudTo", "Spud To"],
      ["rigRelFrom", "Rig Release From"],
      ["rigRelTo", "Rig Release To"],
      ["firstProdFrom", "First Prod From"],
      ["firstProdTo", "First Prod To"],
    ],
  },
] as const;

/** Date fields are stored as YYYYMM codes and edited via the month picker. */
const DATE_FIELDS = new Set([
  "spudFrom",
  "spudTo",
  "rigRelFrom",
  "rigRelTo",
  "firstProdFrom",
  "firstProdTo",
]);

function paramsToState(searchParams: URLSearchParams) {
  return {
    ...initialState,
    ...Object.fromEntries(searchParams.entries()),
    sort: searchParams.get("sort") ?? DEFAULT_SORT,
    pageSize: searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE,
    orientation: searchParams.get("orientation") ?? "all",
  };
}

function paramsToRequest(searchParams: URLSearchParams) {
  const filters = Object.fromEntries(searchParams.entries());
  return {
    ...filters,
    sort: searchParams.get("sort") ?? DEFAULT_SORT,
    page: searchParams.get("page") ?? "1",
    pageSize: searchParams.get("pageSize") ?? DEFAULT_PAGE_SIZE,
    orientation: searchParams.get("orientation") ?? "all",
  };
}

function resultWindowLabel(results: SearchResponse | null) {
  if (!results || results.total === 0) return "No matching wells";
  const start = (results.page - 1) * results.pageSize + 1;
  const end = Math.min(results.total, results.page * results.pageSize);
  if (start === 1) return `First ${end} ${end === 1 ? "well" : "wells"}`;
  return `Wells ${start}\u2013${end}`;
}

function searchUrl(key: string, value: string | number | null | undefined) {
  if (value === null || value === undefined || value === "") return "/search";
  const params = new URLSearchParams();
  params.set(key, String(value));
  return `/search?${params.toString()}`;
}

function areaHref(item: WellSearchResult) {
  if (item.areaCode !== null) return `/areas/${item.areaCode}`;
  return item.areaDesc ? searchUrl("area", item.areaDesc) : null;
}

function formationHref(item: WellSearchResult) {
  if (item.formCode !== null) return `/formations/${item.formCode}`;
  return item.formDesc ? searchUrl("formation", item.formDesc) : null;
}

function wellToCsvRow(item: WellSearchResult) {
  return {
    wa_num: item.waNum,
    well_name: item.wellName,
    operator: item.operator,
    operator_id: item.operatorId,
    area: item.areaDesc,
    formation: item.formDesc,
    spud_mon: item.spudMon,
    rig_rel_mon: item.rigRelMon,
    first_prod_mon: item.firstProdMon,
    orientation: item.orientation,
    surf_lat: item.surfLat,
    surf_lon: item.surfLon,
    gas_prod_3yr: item.gasProd3Yr,
    gas_prod_5yr: item.gasProd5Yr,
  };
}

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => paramsToState(searchParams));
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingAll, setExportingAll] = useState(false);
  // Collapse the filter panel by default on small screens so results aren't
  // pushed below a full screen of inputs.
  const [filtersOpen, setFiltersOpen] = useState(
    () => typeof window === "undefined" || window.innerWidth >= 1024,
  );
  const searchKey = searchParams.toString();
  const getResultSortValue = useCallback((item: SearchResponse["items"][number], key: (typeof resultColumns)[number]) => item[key], []);
  const { sortedRows: sortedResults, sort: resultSort, toggleSort: toggleResultSort } = useSortableRows(
    results?.items ?? [],
    resultColumns,
    getResultSortValue,
    { key: "gasProd3Yr", direction: "desc" },
  );

  useEffect(() => {
    setFilters(paramsToState(searchParams));
  }, [searchKey, searchParams]);

  useEffect(() => {
    let cancelled = false;
    async function loadPage() {
      setLoading(true);
      setError(null);
      try {
        const [sourceMeta, searchResponse] = await Promise.all([
          fetchSourceMeta(),
          fetchWellSearch(paramsToRequest(searchParams)),
        ]);
        if (!cancelled) {
          setMeta(sourceMeta);
          setResults(searchResponse);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load BCER data.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadPage();
    return () => { cancelled = true; };
  }, [searchKey, searchParams]);

  function updateField(name: string, value: string) {
    setFilters((current) => ({ ...current, [name]: value }));
  }

  function submitFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestedWaNum = Number.parseInt(filters.waNum, 10);
    if (filters.waNum.trim() && !Number.isNaN(requestedWaNum)) {
      navigate(`/wells/${requestedWaNum}`);
      return;
    }
    const nextParams = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (!value) return;
      if (key === "orientation" && value === "all") return;
      if (key === "sort" && value === DEFAULT_SORT) return;
      if (key === "pageSize" && value === DEFAULT_PAGE_SIZE) return;
      nextParams.set(key, value);
    });
    nextParams.set("page", "1");
    startTransition(() => { setSearchParams(nextParams); });
  }

  function resetFilters() {
    setFilters(initialState);
    startTransition(() => { setSearchParams(new URLSearchParams()); });
  }

  function changePage(page: number) {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("page", String(page));
    startTransition(() => { setSearchParams(nextParams); });
  }

  function exportResults() {
    if (!results || results.items.length === 0) return;
    downloadCsv(`bcer-search-page-${results.page}.csv`, results.items.map(wellToCsvRow));
  }

  async function exportAllResults() {
    if (!results || results.total === 0 || exportingAll) return;
    setExportingAll(true);
    try {
      const all = await fetchFilteredWells(paramsToRequest(searchParams));
      downloadCsv(`bcer-search-all-${all.length}.csv`, all.map(wellToCsvRow));
    } finally {
      setExportingAll(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">Well Search</h2>
          <p className="text-sm text-muted-foreground">
            {meta?.dataCurrentTo ? `Current to ${meta.dataCurrentTo}` : "Loading..."} · {results?.total ?? "—"} indexed wells
          </p>
        </div>
        {results && results.total > 0 && (
          <Button variant="outline" size="sm" asChild className="gap-1.5 self-start sm:self-auto">
            <Link to={`/map${searchKey ? `?${searchKey}` : ""}`}>
              <MapPin className="h-3.5 w-3.5" />
              View {results.total.toLocaleString()} on map
            </Link>
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
        {/* Filters */}
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="lg:w-[380px] lg:shrink-0">
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Search Filters
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 text-xs text-muted-foreground">
                    <X className="mr-1 h-3 w-3" />
                    Reset
                  </Button>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs">
                      <Filter className="mr-1 h-3 w-3" />
                      {filtersOpen ? "Hide" : "Show"}
                    </Button>
                  </CollapsibleTrigger>
                </div>
              </div>
            </CardHeader>
            <CollapsibleContent>
              <CardContent className="pt-0">
                <form onSubmit={submitFilters} className="space-y-4">
                  {filterGroups.map((group) => (
                    <div key={group.label}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary/70">{group.label}</p>
                      <div className="grid grid-cols-2 gap-2">
                        {group.fields.map(([name, label]) => (
                          <div key={name} className="space-y-1">
                            <Label htmlFor={`search-${name}`} className="text-xs text-muted-foreground">{label}</Label>
                            {DATE_FIELDS.has(name) ? (
                              <MonthPicker
                                id={`search-${name}`}
                                value={filters[name as keyof typeof filters]}
                                onChange={(value) => updateField(name, value)}
                              />
                            ) : (
                              <Input
                                id={`search-${name}`}
                                name={name}
                                value={filters[name as keyof typeof filters]}
                                onChange={(e) => updateField(name, e.target.value)}
                                className="h-8 bg-muted/50 text-sm"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Dropdowns */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="search-orientation" className="text-xs text-muted-foreground">Orientation</Label>
                      <Select value={filters.orientation} onValueChange={(value) => updateField("orientation", value)}>
                        <SelectTrigger id="search-orientation" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          <SelectItem value="horizontal">Horizontal</SelectItem>
                          <SelectItem value="vertical">Vertical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="search-sort" className="text-xs text-muted-foreground">Sort</Label>
                      <Select value={filters.sort} onValueChange={(value) => updateField("sort", value)}>
                        <SelectTrigger id="search-sort" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high3YrProd">3yr gas (000 m3)</SelectItem>
                          <SelectItem value="high5YrProd">5yr gas (000 m3)</SelectItem>
                          <SelectItem value="highestWa">Highest WA</SelectItem>
                          <SelectItem value="lowestWa">Lowest WA</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="search-page-size" className="text-xs text-muted-foreground">Per page</Label>
                      <Select value={filters.pageSize} onValueChange={(value) => updateField("pageSize", value)}>
                        <SelectTrigger id="search-page-size" size="sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Tip: text fields match anywhere. Use <code className="font-mono">%</code> or{" "}
                    <code className="font-mono">*</code> as a wildcard (e.g.{" "}
                    <code className="font-mono">NIG%CREEK</code>).
                  </p>

                  <Button type="submit" className="w-full">
                    Search wells
                  </Button>
                </form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Results */}
        <Card className="min-w-0 flex-1 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Results
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                {results && results.items.length > 0 && (
                  <>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportResults}
                      className="h-7 gap-1.5 text-xs text-muted-foreground"
                    >
                      <Download className="h-3 w-3" />
                      Page CSV
                    </Button>
                    {results.total > results.items.length && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={exportAllResults}
                        disabled={exportingAll}
                        className="h-7 gap-1.5 text-xs text-muted-foreground"
                      >
                        <Download className="h-3 w-3" />
                        {exportingAll ? "Preparing…" : `All ${results.total.toLocaleString()} CSV`}
                      </Button>
                    )}
                  </>
                )}
                <Badge variant="secondary" className="text-xs">
                  {resultWindowLabel(results)}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full rounded-md" />
                ))}
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-destructive/10 p-4 text-center text-sm text-destructive">
                {error}
              </div>
            )}

            {!loading && !error && results && results.items.length === 0 && (
              <div className="rounded-lg bg-muted/30 p-8 text-center text-sm text-muted-foreground">
                No wells matched the current filter set.
              </div>
            )}

            {!loading && !error && results && results.items.length > 0 && (
              <>
                <div className="space-y-3 md:hidden">
                  {sortedResults.map((item) => (
                    <div key={item.waNum} className="rounded-lg border border-border/50 bg-muted/10 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <Link to={`/wells/${item.waNum}`} className="font-semibold text-primary hover:underline">
                            WA {item.waNum}
                          </Link>
                          <p className="mt-1 break-words text-sm font-medium [overflow-wrap:anywhere]">
                            {item.wellName ?? "Unnamed well"}
                          </p>
                          {item.operator && item.operatorId ? (
                            <Link to={`/operators?id=${item.operatorId}`} className="mt-1 block break-words text-xs font-medium text-primary hover:underline [overflow-wrap:anywhere]">
                              {item.operator}{item.operatorAbbr ? ` · ${item.operatorAbbr.trim()}` : ""}
                            </Link>
                          ) : (
                            <p className="mt-1 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                              {item.operator ?? "No operator"}{item.operatorAbbr ? ` · ${item.operatorAbbr.trim()}` : ""}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="shrink-0 text-[10px]">
                          {item.orientation ?? "VERT"}
                        </Badge>
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Area / Formation</dt>
                          <dd className="break-words font-medium [overflow-wrap:anywhere]">
                            {item.areaDesc ? <Link to={areaHref(item) ?? "/search"} className="text-primary hover:underline">{item.areaDesc}</Link> : "—"} /{" "}
                            {item.formDesc ? <Link to={formationHref(item) ?? "/search"} className="text-primary hover:underline">{item.formDesc}</Link> : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">First Prod</dt>
                          <dd className="font-medium">{formatMonthCode(item.firstProdMon)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">3yr Gas (000 m3)</dt>
                          <dd className="font-mono font-medium">{formatNumber(item.gasProd3Yr, 1)}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">5yr Gas (000 m3)</dt>
                          <dd className="font-mono font-medium">{formatNumber(item.gasProd5Yr, 1)}</dd>
                        </div>
                      </dl>
                    </div>
                  ))}
                </div>

                <div className="hidden overflow-x-auto rounded-lg border border-border/50 md:block">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <SortableTableHead sort={resultSort} sortKey="waNum" onSort={toggleResultSort}>WA</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="wellName" onSort={toggleResultSort}>Well Name</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="operator" onSort={toggleResultSort}>Operator</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="areaDesc" onSort={toggleResultSort}>Area / Formation</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="firstProdMon" onSort={toggleResultSort}>Dates</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="orientation" onSort={toggleResultSort}>Orient.</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="surfLat" onSort={toggleResultSort}>Coordinates</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="gasProd3Yr" onSort={toggleResultSort} className="text-xs text-right">3yr Gas (000 m3)</SortableTableHead>
                        <SortableTableHead sort={resultSort} sortKey="gasProd5Yr" onSort={toggleResultSort} className="text-xs text-right">5yr Gas (000 m3)</SortableTableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedResults.map((item) => (
                        <TableRow key={item.waNum} className="border-border/30 hover:bg-muted/30">
                          <TableCell className="py-2">
                            <Link to={`/wells/${item.waNum}`} className="font-semibold text-primary hover:underline">
                              {item.waNum}
                            </Link>
                          </TableCell>
                          <TableCell className="py-2 text-sm">{item.wellName ?? "—"}</TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm font-medium">
                              {item.operator && item.operatorId ? (
                                <Link to={`/operators?id=${item.operatorId}`} className="text-primary hover:underline">
                                  {item.operator}
                                </Link>
                              ) : (
                                item.operator ?? "—"
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.operatorId ? `ID ${item.operatorId}` : ""}
                              {item.operatorAbbr ? ` · ${item.operatorAbbr.trim()}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm font-medium">
                              {item.areaDesc ? <Link to={areaHref(item) ?? "/search"} className="text-primary hover:underline">{item.areaDesc}</Link> : "—"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.formDesc ? <Link to={formationHref(item) ?? "/search"} className="text-primary hover:underline">{item.formDesc}</Link> : "—"}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="text-xs">Spud {formatMonthCode(item.spudMon)}</div>
                            <div className="text-xs text-muted-foreground">Rig {formatMonthCode(item.rigRelMon)}</div>
                            <div className="text-xs text-muted-foreground">Prod {formatMonthCode(item.firstProdMon)}</div>
                          </TableCell>
                          <TableCell className="py-2">
                            <Badge variant="outline" className="text-[10px]">
                              {item.orientation ?? "VERT"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-2 text-xs font-mono">
                            {item.surfLat !== null && item.surfLon !== null ? (
                              <Link to={`/map?well=${item.waNum}`} className="text-primary hover:underline">
                                {formatLatLon(item.surfLat, item.surfLon)}
                              </Link>
                            ) : (
                              formatLatLon(item.surfLat, item.surfLon)
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right text-sm font-mono">{formatNumber(item.gasProd3Yr, 1)}</TableCell>
                          <TableCell className="py-2 text-right text-sm font-mono">{formatNumber(item.gasProd5Yr, 1)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="mt-3 flex items-center justify-between text-sm">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={(results.page ?? 1) <= 1}
                    onClick={() => changePage((results.page ?? 1) - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {results.page} of {results.totalPages} · {results.total} total
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={(results.page ?? 1) >= (results.totalPages ?? 1)}
                    onClick={() => changePage((results.page ?? 1) + 1)}
                  >
                    Next
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

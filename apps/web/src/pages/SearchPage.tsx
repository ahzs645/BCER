import { startTransition, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Filter, X } from "lucide-react";
import { fetchSourceMeta, fetchWellSearch } from "@/lib/api";
import { formatLatLon, formatMonthCode, formatNumber } from "@/lib/format";
import type { SearchResponse, SourceMeta } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

const DEFAULT_SORT = "high3YrProd";
const DEFAULT_PAGE_SIZE = "25";

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
      ["spudFrom", "Spud From (YYYYMM)"],
      ["spudTo", "Spud To (YYYYMM)"],
      ["rigRelFrom", "Rig Release From"],
      ["rigRelTo", "Rig Release To"],
      ["firstProdFrom", "First Prod From"],
      ["firstProdTo", "First Prod To"],
    ],
  },
] as const;

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

export function SearchPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState(() => paramsToState(searchParams));
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const searchKey = searchParams.toString();

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
                            <Label className="text-xs text-muted-foreground">{label}</Label>
                            <Input
                              name={name}
                              value={filters[name as keyof typeof filters]}
                              onChange={(e) => updateField(name, e.target.value)}
                              className="h-8 bg-muted/50 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Dropdowns */}
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Orientation</Label>
                      <select
                        value={filters.orientation}
                        onChange={(e) => updateField("orientation", e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-muted/50 px-2 text-sm"
                      >
                        <option value="all">All</option>
                        <option value="horizontal">Horizontal</option>
                        <option value="vertical">Vertical</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Sort</Label>
                      <select
                        value={filters.sort}
                        onChange={(e) => updateField("sort", e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-muted/50 px-2 text-sm"
                      >
                        <option value="high3YrProd">3yr prod</option>
                        <option value="high5YrProd">5yr prod</option>
                        <option value="highestWa">Highest WA</option>
                        <option value="lowestWa">Lowest WA</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Per page</Label>
                      <select
                        value={filters.pageSize}
                        onChange={(e) => updateField("pageSize", e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-muted/50 px-2 text-sm"
                      >
                        <option value="25">25</option>
                        <option value="50">50</option>
                        <option value="100">100</option>
                      </select>
                    </div>
                  </div>

                  <Button type="submit" className="w-full">
                    Search wells
                  </Button>
                </form>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Results */}
        <Card className="flex-1 border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Results
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {resultWindowLabel(results)}
              </Badge>
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
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50 hover:bg-transparent">
                        <TableHead className="text-xs">WA</TableHead>
                        <TableHead className="text-xs">Well Name</TableHead>
                        <TableHead className="text-xs">Operator</TableHead>
                        <TableHead className="text-xs">Area / Formation</TableHead>
                        <TableHead className="text-xs">Dates</TableHead>
                        <TableHead className="text-xs">Orient.</TableHead>
                        <TableHead className="text-xs">Coordinates</TableHead>
                        <TableHead className="text-xs text-right">3yr Gas</TableHead>
                        <TableHead className="text-xs text-right">5yr Gas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.items.map((item) => (
                        <TableRow key={item.waNum} className="border-border/30 hover:bg-muted/30">
                          <TableCell className="py-2">
                            <Link to={`/wells/${item.waNum}`} className="font-semibold text-primary hover:underline">
                              {item.waNum}
                            </Link>
                          </TableCell>
                          <TableCell className="py-2 text-sm">{item.wellName ?? "—"}</TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm font-medium">{item.operator ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.operatorId ? `ID ${item.operatorId}` : ""}
                              {item.operatorAbbr ? ` · ${item.operatorAbbr.trim()}` : ""}
                            </div>
                          </TableCell>
                          <TableCell className="py-2">
                            <div className="text-sm font-medium">{item.areaDesc ?? "—"}</div>
                            <div className="text-xs text-muted-foreground">{item.formDesc ?? "—"}</div>
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
                          <TableCell className="py-2 text-xs font-mono">{formatLatLon(item.surfLat, item.surfLon)}</TableCell>
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

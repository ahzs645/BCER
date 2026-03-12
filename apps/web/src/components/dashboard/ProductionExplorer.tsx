import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchProductionExplorer } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useChartTheme } from "@/lib/chart-theme";
import type { ProductionExplorerData, ProductionExplorerWell } from "@/types";

const GAS_M3_TO_MCF = 35.3147;
const BAR_COLOR = "#10b981";

interface FilterState {
  area: string;
  formation: string;
  operator: string;
  orientation: string;
}

const INITIAL_FILTERS: FilterState = {
  area: "",
  formation: "",
  operator: "",
  orientation: "",
};

function extractOptions(
  wells: ProductionExplorerWell[],
  key: "areaDesc" | "formDesc" | "operator",
): string[] {
  const counts = new Map<string, number>();
  for (const w of wells) {
    const val = w[key];
    if (val) counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name);
}

export function ProductionExplorer() {
  const { tooltipStyle, axisTickStyle, gridStroke } = useChartTheme();
  const [data, setData] = useState<ProductionExplorerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);

  useEffect(() => {
    fetchProductionExplorer()
      .then(setData)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  const setFilter = useCallback(
    (key: keyof FilterState, value: string) =>
      setFilters((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const resetFilters = useCallback(() => setFilters(INITIAL_FILTERS), []);

  // Extract unique filter options from the data
  const areas = useMemo(
    () => (data ? extractOptions(data.wells, "areaDesc") : []),
    [data],
  );
  const formations = useMemo(
    () => (data ? extractOptions(data.wells, "formDesc") : []),
    [data],
  );
  const operators = useMemo(
    () => (data ? extractOptions(data.wells, "operator") : []),
    [data],
  );

  // Filter wells and aggregate production
  const { chartData, wellCount } = useMemo(() => {
    if (!data) return { chartData: [], wellCount: 0 };

    let filtered = data.wells;

    if (filters.area) {
      filtered = filtered.filter((w) => w.areaDesc === filters.area);
    }
    if (filters.formation) {
      filtered = filtered.filter((w) => w.formDesc === filters.formation);
    }
    if (filters.operator) {
      filtered = filtered.filter((w) => w.operator === filters.operator);
    }
    if (filters.orientation === "horizontal") {
      filtered = filtered.filter((w) => w.orientation === "HZ");
    } else if (filters.orientation === "vertical") {
      filtered = filtered.filter(
        (w) => !w.orientation || w.orientation !== "HZ",
      );
    }

    // Sum production per fiscal year
    const sums = new Array(data.fiscalYears.length).fill(0);
    for (const w of filtered) {
      for (let i = 0; i < w.production.length; i++) {
        if (w.production[i] !== null) {
          sums[i] += w.production[i]!;
        }
      }
    }

    const chartData = data.fiscalYears.map((year, i) => ({
      label: `${year - 1}/${String(year).slice(2)}`,
      value: Number((sums[i] * GAS_M3_TO_MCF).toFixed(1)),
    }));

    return { chartData, wellCount: filtered.length };
  }, [data, filters]);

  const hasActiveFilters = Object.values(filters).some((v) => v !== "");

  if (loading) {
    return <Skeleton className="h-[460px] rounded-xl" />;
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">
          {error ?? "Unable to load production explorer data."}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Production Explorer — Fiscal Year by Filter
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">
                {wellCount.toLocaleString()}
              </span>{" "}
              wells
            </span>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className="mr-1 h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Filters row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <FilterSelect
            label="Area / Zone"
            value={filters.area}
            options={areas}
            onChange={(v) => setFilter("area", v)}
          />
          <FilterSelect
            label="Formation"
            value={filters.formation}
            options={formations}
            onChange={(v) => setFilter("formation", v)}
          />
          <FilterSelect
            label="Operator"
            value={filters.operator}
            options={operators}
            onChange={(v) => setFilter("operator", v)}
          />
          <FilterSelect
            label="Orientation"
            value={filters.orientation}
            options={["horizontal", "vertical"]}
            displayLabels={{ horizontal: "Horizontal", vertical: "Vertical" }}
            onChange={(v) => setFilter("orientation", v)}
          />
        </div>

        {/* Chart */}
        {wellCount === 0 ? (
          <div className="flex h-[300px] items-center justify-center text-sm text-muted-foreground">
            No wells match the selected filters.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ left: 5, right: 10, top: 5, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="label"
                tick={{ ...axisTickStyle, fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={50}
              />
              <YAxis
                tick={axisTickStyle}
                tickFormatter={(v) => formatNumber(v, 0)}
              />
              <RechartsTooltip
                contentStyle={tooltipStyle}
                formatter={(v) => [
                  `${formatNumber(v as number, 1)} 000 MCF`,
                  "Production",
                ]}
              />
              <Bar
                dataKey="value"
                fill={BAR_COLOR}
                name="Gas Production"
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        )}

        <p className="text-[10px] text-muted-foreground">
          Fiscal year gas production (000 MCF) aggregated across matching wells.
          Use the filters above to narrow by area, formation, operator, or well
          orientation.
        </p>
      </CardContent>
    </Card>
  );
}

function FilterSelect({
  label,
  value,
  options,
  displayLabels,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  displayLabels?: Record<string, string>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
      >
        <option value="">All</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {displayLabels?.[opt] ?? opt}
          </option>
        ))}
      </select>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Database, Activity, Layers, TrendingUp, Search, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { fetchDashboard, fetchAggregateProduction } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { useChartTheme } from "@/lib/chart-theme";
import { ProductionExplorer } from "@/components/dashboard/ProductionExplorer";
import type { AggregateProductionData, DashboardData } from "@/types";

const DONUT_COLORS = ["#10b981", "#0ea5e9"];
const BAR_COLOR = "#06b6d4";
const BAR_COLOR_ALT = "#10b981";
const LINE_COLOR_PROD = "#10b981";
const LINE_COLOR_AVG = "#f59e0b";

const GAS_M3_TO_MCF = 35.3147;

function toMcf(val: number) {
  return Number((val * GAS_M3_TO_MCF).toFixed(1));
}

function formatPeriod(period: number | null): string {
  if (!period) return "—";
  const year = Math.floor(period / 100);
  const month = period % 100;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${monthNames[month - 1] ?? "?"} ${year}`;
}

export function DashboardPage() {
  const { tooltipStyle, axisTickStyle, gridStroke } = useChartTheme();
  const [data, setData] = useState<DashboardData | null>(null);
  const [prodData, setProdData] = useState<AggregateProductionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchDashboard(),
      fetchAggregateProduction(),
    ])
      .then(([dash, prod]) => {
        setData(dash);
        setProdData(prod);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">
          {error ?? "Unable to load dashboard data."}
        </CardContent>
      </Card>
    );
  }

  const horizontalPct = data.totalWells > 0
    ? ((data.totalHorizontal / data.totalWells) * 100).toFixed(1)
    : "0";

  const topArea = data.topAreas[0];

  // Convert production data to 000 MCF for display
  const monthlyProd = prodData?.monthlyProduction.map((p, i) => ({
    label: (i + 1) % 6 === 0 || i === 0 ? `${i + 1}` : "",
    month: i + 1,
    value: toMcf(p.value),
  }));
  const monthlyAvg = prodData?.monthlyAvgDaily.map((p, i) => ({
    label: (i + 1) % 6 === 0 || i === 0 ? `${i + 1}` : "",
    month: i + 1,
    value: toMcf(p.value),
  }));
  const calYearProd = prodData?.calendarYearProduction.map((p, i) => ({
    label: `Year ${i + 1}`,
    value: toMcf(p.value),
  }));
  const fyProd = prodData?.fiscalYearProduction.map((p) => ({
    label: p.label,
    value: toMcf(p.value),
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Database className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Wells</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">{data.totalWells.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-chart-1/10 p-2.5">
              <Activity className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Data Currency</p>
              <p className="text-lg font-bold font-[family-name:var(--font-heading)]">{data.dataCurrentTo}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-chart-3/10 p-2.5">
              <Layers className="h-5 w-5 text-chart-3" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Horizontal Wells</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">
                {data.totalHorizontal.toLocaleString()}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">{horizontalPct}%</span>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-chart-2/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Area</p>
              <p className="text-lg font-bold font-[family-name:var(--font-heading)]">
                {topArea?.areaDesc ?? "—"}
                <span className="ml-1.5 text-sm font-normal text-muted-foreground">{topArea?.count ?? 0} wells</span>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Production Charts */}
      {prodData && (
        <div className="space-y-4">
          <div className="rounded-lg bg-muted/30 px-4 py-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{prodData.wellCount.toLocaleString()}</span> wells with production data,
              first production ranging from{" "}
              <span className="font-medium text-foreground">{formatPeriod(prodData.earliestFirstProd)}</span> to{" "}
              <span className="font-medium text-foreground">{formatPeriod(prodData.latestFirstProd)}</span>.
              Monthly charts show months relative to each well's first production date (Month 1 = first month of production).
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
          {/* Monthly Avg Daily Volume */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Avg Daily Volume of Gas Prodn - All Zones
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">000 MCF</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyAvg} margin={{ left: 5, right: 10, top: 5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[1, 60]}
                    ticks={[1, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]}
                    tick={{ ...axisTickStyle, fontSize: 10 }}
                    label={{ value: "Month from first production", position: "insideBottom", offset: -10, style: { ...axisTickStyle, fontSize: 9 } }}
                  />
                  <YAxis tick={axisTickStyle} tickFormatter={(v) => formatNumber(v, 0)} />
                  <RechartsTooltip contentStyle={tooltipStyle} labelFormatter={(v) => `Month ${v}`} formatter={(v) => formatNumber(v as number, 1)} />
                  <Line type="monotone" dataKey="value" stroke={LINE_COLOR_AVG} dot={false} strokeWidth={2} name="Avg Daily Volume" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Gas Production */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Monthly Gas Production - All Zones
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">000 MCF</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={monthlyProd} margin={{ left: 5, right: 10, top: 5, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis
                    dataKey="month"
                    type="number"
                    domain={[1, 60]}
                    ticks={[1, 6, 12, 18, 24, 30, 36, 42, 48, 54, 60]}
                    tick={{ ...axisTickStyle, fontSize: 10 }}
                    label={{ value: "Month from first production", position: "insideBottom", offset: -10, style: { ...axisTickStyle, fontSize: 9 } }}
                  />
                  <YAxis tick={axisTickStyle} tickFormatter={(v) => formatNumber(v, 0)} />
                  <RechartsTooltip contentStyle={tooltipStyle} labelFormatter={(v) => `Month ${v}`} formatter={(v) => formatNumber(v as number, 1)} />
                  <Line type="monotone" dataKey="value" stroke={LINE_COLOR_PROD} dot={false} strokeWidth={2} name="Monthly Production" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Annual Gas Production (Calendar Year) */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Annual Gas Production - Calendar Year
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">000 MCF</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={calYearProd} margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ ...axisTickStyle, fontSize: 10 }} />
                  <YAxis tick={axisTickStyle} tickFormatter={(v) => formatNumber(v, 0)} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 1)} />
                  <Bar dataKey="value" fill={BAR_COLOR} name="Annual Production" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Annual Gas Production (Fiscal Year) */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                  Annual Gas Production - Fiscal Year
                </CardTitle>
                <span className="text-[10px] text-muted-foreground">000 MCF</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={fyProd} margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="label" tick={{ ...axisTickStyle, fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                  <YAxis tick={axisTickStyle} tickFormatter={(v) => formatNumber(v, 0)} />
                  <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 1)} />
                  <Bar dataKey="value" fill="#0ea5e9" name="Annual Production" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          </div>
        </div>
      )}

      {/* Production Explorer with Filters */}
      <ProductionExplorer />

      {/* Area / Formation Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Top Areas by Well Count
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topAreas} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ ...axisTickStyle, fontSize: 12 }} />
                <YAxis
                  dataKey="areaDesc"
                  type="category"
                  width={120}
                  tick={axisTickStyle}
                />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Top Formations by Well Count
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.topFormations} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                <XAxis type="number" tick={{ ...axisTickStyle, fontSize: 12 }} />
                <YAxis
                  dataKey="formDesc"
                  type="category"
                  width={120}
                  tick={axisTickStyle}
                />
                <RechartsTooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill={BAR_COLOR_ALT} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Orientation + Quick Access */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Well Orientation
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data.orientationBreakdown}
                  dataKey="count"
                  nameKey="orientation"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={80}
                  strokeWidth={0}
                >
                  {data.orientationBreakdown.map((_, i) => (
                    <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
          <div className="flex justify-center gap-4 pb-4">
            {data.orientationBreakdown.map((item, i) => (
              <div key={item.orientation} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                />
                {item.orientation} ({item.count.toLocaleString()})
              </div>
            ))}
          </div>
        </Card>

        <Card className="col-span-1 border-border/50 bg-card/80 backdrop-blur-sm md:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Quick Access
              </CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/search" className="text-primary">
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                  Search wells
                  <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Recent Wells */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Recent Wells
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="h-8 text-xs">WA</TableHead>
                      <TableHead className="h-8 text-xs">Well Name</TableHead>
                      <TableHead className="h-8 text-xs text-right">3yr Gas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.recentWells.map((well) => (
                      <TableRow key={well.waNum} className="border-border/30 hover:bg-muted/50">
                        <TableCell className="py-1.5">
                          <Link to={`/wells/${well.waNum}`} className="font-medium text-primary hover:underline">
                            {well.waNum}
                          </Link>
                        </TableCell>
                        <TableCell className="py-1.5 text-sm">{well.wellName ?? "—"}</TableCell>
                        <TableCell className="py-1.5 text-right text-sm font-mono">
                          {formatNumber(well.gasProd3Yr, 1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Production Leaders */}
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Top Producers (3yr Gas)
                </h4>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="h-8 text-xs">WA</TableHead>
                      <TableHead className="h-8 text-xs">Operator</TableHead>
                      <TableHead className="h-8 text-xs text-right">3yr Gas</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.productionLeaders.map((well) => (
                      <TableRow key={well.waNum} className="border-border/30 hover:bg-muted/50">
                        <TableCell className="py-1.5">
                          <Link to={`/wells/${well.waNum}`} className="font-medium text-primary hover:underline">
                            {well.waNum}
                          </Link>
                        </TableCell>
                        <TableCell className="py-1.5 text-sm">{well.operator ?? "—"}</TableCell>
                        <TableCell className="py-1.5 text-right text-sm font-mono">
                          {formatNumber(well.gasProd3Yr, 1)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

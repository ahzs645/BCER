import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  BarChart,
  Bar,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ArrowLeft, Flame, Layers, TrendingUp } from "lucide-react";
import { fetchOperatorAnalytics, fetchOperatorDetail } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { tooltipStyle, axisTickStyle, gridStroke } from "@/lib/chart-theme";
import type { OperatorAnalyticsData, OperatorDetailData, OperatorSummary } from "@/types";

const BAR_COLOR = "#06b6d4";
const BAR_COLOR_ALT = "#10b981";
const DONUT_COLORS = ["#10b981", "#0ea5e9"];

function OperatorList({
  data,
  onSelect,
}: {
  data: OperatorAnalyticsData;
  onSelect: (op: OperatorSummary) => void;
}) {
  const [view, setView] = useState<"wells" | "production">("wells");
  const list = view === "wells" ? data.topByWellCount : data.topByProduction;

  const chartData = list.slice(0, 15).map((op) => ({
    name: op.operatorAbbr || op.operator.slice(0, 20),
    value: view === "wells" ? op.wellCount : op.totalGas3Yr,
  }));

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-primary/10 p-2.5">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Operators</p>
              <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">
                {data.totalOperators.toLocaleString()}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-chart-1/10 p-2.5">
              <TrendingUp className="h-5 w-5 text-chart-1" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Operator</p>
              <p className="text-lg font-bold font-[family-name:var(--font-heading)] truncate">
                {data.topByWellCount[0]?.operatorAbbr ?? data.topByWellCount[0]?.operator ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {data.topByWellCount[0]?.wellCount.toLocaleString()} wells
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="flex items-center gap-4 p-5">
            <div className="rounded-lg bg-chart-2/10 p-2.5">
              <Flame className="h-5 w-5 text-chart-2" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Top Producer</p>
              <p className="text-lg font-bold font-[family-name:var(--font-heading)] truncate">
                {data.topByProduction[0]?.operatorAbbr ?? data.topByProduction[0]?.operator ?? "—"}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(data.topByProduction[0]?.totalGas3Yr, 0)} 3yr gas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Top Operators
            </CardTitle>
            <div className="flex gap-1">
              <Button
                variant={view === "wells" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setView("wells")}
              >
                By Wells
              </Button>
              <Button
                variant={view === "production" ? "secondary" : "ghost"}
                size="sm"
                className="text-xs h-7"
                onClick={() => setView("production")}
              >
                By Production
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
              <XAxis type="number" tick={{ ...axisTickStyle, fontSize: 12 }} />
              <YAxis
                dataKey="name"
                type="category"
                width={130}
                tick={axisTickStyle}
              />
              <RechartsTooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="value"
                fill={view === "wells" ? BAR_COLOR : BAR_COLOR_ALT}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
            All Top Operators
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="h-8 text-xs">Operator</TableHead>
                  <TableHead className="h-8 text-xs text-right">Wells</TableHead>
                  <TableHead className="h-8 text-xs text-right">HZ</TableHead>
                  <TableHead className="h-8 text-xs text-right">3yr Gas</TableHead>
                  <TableHead className="h-8 text-xs">Top Area</TableHead>
                  <TableHead className="h-8 text-xs">Top Formation</TableHead>
                  <TableHead className="h-8 text-xs" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((op) => (
                  <TableRow key={op.operatorId} className="border-border/30 hover:bg-muted/50">
                    <TableCell className="py-2">
                      <button
                        type="button"
                        onClick={() => onSelect(op)}
                        className="text-left font-medium text-primary hover:underline"
                      >
                        {op.operatorAbbr || op.operator}
                      </button>
                      {op.operatorAbbr && (
                        <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{op.operator}</p>
                      )}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm">
                      {op.wellCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm">
                      {op.horizontalCount.toLocaleString()}
                    </TableCell>
                    <TableCell className="py-2 text-right font-mono text-sm">
                      {formatNumber(op.totalGas3Yr, 0)}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {op.topArea ?? "—"}
                    </TableCell>
                    <TableCell className="py-2 text-sm text-muted-foreground">
                      {op.topFormation ?? "—"}
                    </TableCell>
                    <TableCell className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-primary"
                        onClick={() => onSelect(op)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function OperatorDetailView({
  operatorId,
  onBack,
}: {
  operatorId: string;
  onBack: () => void;
}) {
  const [data, setData] = useState<OperatorDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchOperatorDetail(operatorId)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load operator"))
      .finally(() => setLoading(false));
  }, [operatorId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to operators
        </Button>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6 text-center text-destructive">
            {error ?? "Operator not found."}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, wells, areaBreakdown, formationBreakdown, orientationBreakdown } = data;
  const hzPct = summary.wellCount > 0
    ? ((summary.horizontalCount / summary.wellCount) * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5 text-muted-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Button>
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">
            {summary.operator}
          </h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {summary.operatorAbbr && <span>{summary.operatorAbbr}</span>}
            <Badge variant="outline" className="text-[10px]">ID {summary.operatorId}</Badge>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Wells</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {summary.wellCount.toLocaleString()}
            </p>
          </CardContent>
        </Card>
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Horizontal</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {summary.horizontalCount.toLocaleString()}
              <span className="ml-1.5 text-sm font-normal text-muted-foreground">{hzPct}%</span>
            </p>
          </CardContent>
        </Card>
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">3yr Gas Total</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {formatNumber(summary.totalGas3Yr, 0)}
            </p>
          </CardContent>
        </Card>
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">5yr Gas Total</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">
              {formatNumber(summary.totalGas5Yr, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Orientation Donut */}
        {orientationBreakdown.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Orientation
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={orientationBreakdown}
                    dataKey="count"
                    nameKey="orientation"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    strokeWidth={0}
                  >
                    {orientationBreakdown.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="flex justify-center gap-4 pb-4">
              {orientationBreakdown.map((item, i) => (
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
        )}

        {/* Area Breakdown */}
        {areaBreakdown.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Areas
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={areaBreakdown} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTickStyle} />
                  <YAxis
                    dataKey="areaDesc"
                    type="category"
                    width={100}
                    tick={{ ...axisTickStyle, fontSize: 10 }}
                  />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={BAR_COLOR} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Formation Breakdown */}
        {formationBreakdown.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Formations
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={formationBreakdown} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTickStyle} />
                  <YAxis
                    dataKey="formDesc"
                    type="category"
                    width={100}
                    tick={{ ...axisTickStyle, fontSize: 10 }}
                  />
                  <RechartsTooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill={BAR_COLOR_ALT} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wells Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Wells ({wells.length.toLocaleString()})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/50 hover:bg-transparent">
                  <TableHead className="h-8 text-xs sticky top-0 bg-card">WA</TableHead>
                  <TableHead className="h-8 text-xs sticky top-0 bg-card">Well Name</TableHead>
                  <TableHead className="h-8 text-xs sticky top-0 bg-card">Area</TableHead>
                  <TableHead className="h-8 text-xs sticky top-0 bg-card">Formation</TableHead>
                  <TableHead className="h-8 text-xs sticky top-0 bg-card">Orientation</TableHead>
                  <TableHead className="h-8 text-xs text-right sticky top-0 bg-card">3yr Gas</TableHead>
                  <TableHead className="h-8 text-xs text-right sticky top-0 bg-card">5yr Gas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wells.map((well) => (
                  <TableRow key={well.waNum} className="border-border/30 hover:bg-muted/50">
                    <TableCell className="py-1.5">
                      <Link to={`/wells/${well.waNum}`} className="font-medium text-primary hover:underline">
                        {well.waNum}
                      </Link>
                    </TableCell>
                    <TableCell className="py-1.5 text-sm truncate max-w-[200px]">
                      {well.wellName ?? "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm text-muted-foreground">
                      {well.areaDesc ?? "—"}
                    </TableCell>
                    <TableCell className="py-1.5 text-sm text-muted-foreground">
                      {well.formDesc ?? "—"}
                    </TableCell>
                    <TableCell className="py-1.5">
                      {well.orientation && (
                        <Badge variant="outline" className="text-[10px]">
                          {well.orientation === "HZ" ? "HZ" : "VT"}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-sm">
                      {formatNumber(well.gasProd3Yr, 1)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-mono text-sm">
                      {formatNumber(well.gasProd5Yr, 1)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function OperatorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [analyticsData, setAnalyticsData] = useState<OperatorAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedOperatorId = searchParams.get("id");

  useEffect(() => {
    fetchOperatorAnalytics()
      .then(setAnalyticsData)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load operators"))
      .finally(() => setLoading(false));
  }, []);

  function handleSelectOperator(op: OperatorSummary) {
    setSearchParams({ id: String(op.operatorId) });
  }

  function handleBack() {
    setSearchParams({});
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (error || !analyticsData) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">
          {error ?? "Unable to load operator data."}
        </CardContent>
      </Card>
    );
  }

  if (selectedOperatorId) {
    return <OperatorDetailView operatorId={selectedOperatorId} onBack={handleBack} />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">Operator Analysis</h2>
        <p className="text-sm text-muted-foreground">
          Compare operators by well count, production, and geographic focus
        </p>
      </div>
      <OperatorList data={analyticsData} onSelect={handleSelectOperator} />
    </div>
  );
}

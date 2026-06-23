import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
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
import { ArrowLeft, Download, MapPin, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { WellList } from "@/components/WellList";
import { fetchAreaDetail, fetchFormationDetail } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { downloadCsv, toFilenameStem } from "@/lib/export";
import { useChartTheme } from "@/lib/chart-theme";
import { useIsMobile } from "@/hooks/use-mobile";
import type { DimensionDetailData, DimensionKind } from "@/types";

const BAR_COLOR = "#06b6d4";
const BAR_COLOR_ALT = "#10b981";
const PROD_COLOR = "#0ea5e9";
const DONUT_COLORS = ["#10b981", "#0ea5e9"];
const GAS_M3_TO_MCF = 35.3147;

const KIND_LABEL: Record<DimensionKind, string> = { area: "Area", formation: "Formation" };
const CROSS_LABEL: Record<DimensionKind, string> = { area: "Formations", formation: "Areas" };
const CROSS_FILTER: Record<DimensionKind, string> = { area: "formation", formation: "area" };

function DimensionProfile({ kind }: { kind: DimensionKind }) {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const { tooltipStyle, axisTickStyle, gridStroke } = useChartTheme();
  const isMobile = useIsMobile();
  const [data, setData] = useState<DimensionDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const fetcher = kind === "area" ? fetchAreaDetail : fetchFormationDetail;
    fetcher(code)
      .then((result) => { if (!cancelled) setData(result); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load"); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, code]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="gap-1.5">
          <Link to="/"><ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard</Link>
        </Button>
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="p-6 text-center text-destructive">
            {error ?? `${KIND_LABEL[kind]} not found.`}
          </CardContent>
        </Card>
      </div>
    );
  }

  const { summary, wells, operatorBreakdown, crossBreakdown, orientationBreakdown, fiscalYearProduction } = data;
  const hzPct = summary.wellCount > 0 ? ((summary.horizontalCount / summary.wellCount) * 100).toFixed(1) : "0";
  const filterKey = kind; // "area" | "formation" — both accepted by search/map filters
  const operatorChart = operatorBreakdown.map((op) => ({
    name: op.operator.length > 24 ? `${op.operator.slice(0, 24)}…` : op.operator,
    id: op.operatorId,
    value: op.count,
  }));
  const fiscalChart = fiscalYearProduction.map((p) => ({ label: p.label, value: Number((p.value * GAS_M3_TO_MCF).toFixed(1)) }));

  function exportWells() {
    downloadCsv(
      `bcer-${kind}-${toFilenameStem(summary.desc)}-wells.csv`,
      wells.map((well) => ({
        wa_num: well.waNum,
        well_name: well.wellName,
        operator: well.operator,
        operator_id: well.operatorId,
        area: well.areaDesc,
        formation: well.formDesc,
        orientation: well.orientation,
        gas_prod_3yr: well.gasProd3Yr,
        gas_prod_5yr: well.gasProd5Yr,
      })),
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">{KIND_LABEL[kind]} profile</p>
          <h2 className="mt-1 text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight">{summary.desc}</h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="outline" className="text-[10px]">Code {summary.code}</Badge>
            {summary.topOperator && <span>Top operator: <span className="text-foreground">{summary.topOperator}</span></span>}
            {summary.topCross && <span>· Top {kind === "area" ? "formation" : "area"}: <span className="text-foreground">{summary.topCross}</span></span>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to={`/search?${filterKey}=${summary.code}`}><Search className="h-3.5 w-3.5" /> Search these wells</Link>
          </Button>
          <Button variant="outline" size="sm" asChild className="gap-1.5">
            <Link to={`/map?${filterKey}=${summary.code}`}><MapPin className="h-3.5 w-3.5" /> Show on map</Link>
          </Button>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Wells</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">{summary.wellCount.toLocaleString()}</p>
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
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Operators</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">{summary.operatorCount.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card className="glow-card border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">3yr Gas Total</p>
            <p className="text-2xl font-bold font-[family-name:var(--font-heading)]">{formatNumber(summary.totalGas3Yr, 0)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Fiscal-year production */}
      {fiscalChart.some((p) => p.value > 0) && (
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
                Gas Production by Fiscal Year
              </CardTitle>
              <span className="text-[10px] text-muted-foreground">000 MCF</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={fiscalChart} margin={{ left: 5, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                <XAxis dataKey="label" tick={{ ...axisTickStyle, fontSize: 10 }} angle={-45} textAnchor="end" height={50} />
                <YAxis tick={axisTickStyle} tickFormatter={(v) => formatNumber(v, 0)} />
                <RechartsTooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 1)} />
                <Bar dataKey="value" fill={PROD_COLOR} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Breakdown charts */}
      <div className="grid gap-4 md:grid-cols-3">
        {orientationBreakdown.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Orientation</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center pt-0">
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={orientationBreakdown} dataKey="count" nameKey="orientation" cx="50%" cy="50%" innerRadius={45} outerRadius={70} strokeWidth={0}>
                    {orientationBreakdown.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                  </Pie>
                  <RechartsTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
            <div className="flex justify-center gap-4 pb-4">
              {orientationBreakdown.map((item, i) => (
                <div key={item.orientation} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                  {item.orientation} ({item.count.toLocaleString()})
                </div>
              ))}
            </div>
          </Card>
        )}

        {operatorChart.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">Top Operators</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={operatorChart} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTickStyle} />
                  <YAxis dataKey="name" type="category" width={isMobile ? 80 : 110} tick={{ ...axisTickStyle, fontSize: 10 }} />
                  <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
                  <Bar
                    dataKey="value"
                    fill={BAR_COLOR}
                    radius={[0, 4, 4, 0]}
                    className="cursor-pointer"
                    onClick={(entry) => {
                      const id = (entry as unknown as { payload?: { id?: number } })?.payload?.id;
                      if (id) navigate(`/operators?id=${id}`);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {crossBreakdown.length > 0 && (
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{CROSS_LABEL[kind]}</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={crossBreakdown} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                  <XAxis type="number" tick={axisTickStyle} />
                  <YAxis dataKey="desc" type="category" width={isMobile ? 80 : 110} tick={{ ...axisTickStyle, fontSize: 10 }} />
                  <RechartsTooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--color-muted)", opacity: 0.4 }} />
                  <Bar
                    dataKey="count"
                    fill={BAR_COLOR_ALT}
                    radius={[0, 4, 4, 0]}
                    className="cursor-pointer"
                    onClick={(entry) => {
                      const desc = (entry as unknown as { payload?: { desc?: string } })?.payload?.desc;
                      if (desc) navigate(`/search?${CROSS_FILTER[kind]}=${encodeURIComponent(desc)}`);
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wells */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Wells ({wells.length.toLocaleString()})
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={exportWells} className="h-7 gap-1.5 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <WellList wells={wells} maxHeightClass="max-h-[600px]" emptyMessage="No wells in this group." />
        </CardContent>
      </Card>
    </div>
  );
}

export function AreaPage() {
  return <DimensionProfile kind="area" />;
}

export function FormationPage() {
  return <DimensionProfile kind="formation" />;
}

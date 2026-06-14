import { Link } from "react-router-dom";
import type React from "react";
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Beaker, CheckCircle2, Clock, Gauge, Layers, Search, TrendingDown } from "lucide-react";
import type { GasAnalysisRow, ProductionExplorerData, WellDetail, WellSearchResult } from "@/types";
import { useChartTheme } from "@/lib/chart-theme";
import { formatDateCode, formatMonthCode, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/DataTable";

type PeerMetric = {
  label: string;
  value: number | null;
  percentile: number | null;
  peerCount: number;
  context: string;
  unit?: string;
};

function pct(value: number | null) {
  return value === null ? "—" : `P${Math.round(value)}`;
}

function percentile(value: number | null, peers: Array<number | null | undefined>) {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const values = peers.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (values.length === 0) return null;
  const atOrBelow = values.filter((v) => v <= value).length;
  return (atOrBelow / values.length) * 100;
}

function sameText(a: string | null | undefined, b: string | null | undefined) {
  return Boolean(a && b && a.toLocaleLowerCase() === b.toLocaleLowerCase());
}

function searchUrl(key: string, value: string | number | null | undefined) {
  const params = new URLSearchParams();
  if (value !== null && value !== undefined && value !== "") params.set(key, String(value));
  return `/search?${params.toString()}`;
}

function cumulative(values: Array<number | null>, months: number) {
  const slice = values.slice(0, months).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  return slice.length ? slice.reduce((sum, value) => sum + value, 0) : null;
}

function productionValues(detail: WellDetail) {
  return detail.productionSeries.map((point) => point.gasVolumeKm3);
}

function declineMetrics(detail: WellDetail) {
  const values = productionValues(detail);
  const nonNull = values
    .map((value, index) => ({ value, month: index + 1 }))
    .filter((point): point is { value: number; month: number } => typeof point.value === "number" && Number.isFinite(point.value));
  const peak = nonNull.reduce<{ value: number; month: number } | null>(
    (best, point) => (!best || point.value > best.value ? point : best),
    null,
  );
  const month12 = values[11] ?? null;
  const month24 = values[23] ?? null;
  const retention12 = peak && month12 !== null && peak.value > 0 ? (month12 / peak.value) * 100 : null;
  const decline12 = retention12 === null ? null : 100 - retention12;

  return {
    peak,
    month12,
    month24,
    retention12,
    decline12,
    cum6: cumulative(values, 6),
    cum12: cumulative(values, 12),
    cum24: cumulative(values, 24),
    cum36: cumulative(values, 36),
  };
}

function scoreSimilarWell(target: WellDetail, candidate: WellSearchResult) {
  if (candidate.waNum === target.overview.waNum) return -Infinity;
  let score = 0;
  if (sameText(candidate.areaDesc, target.overview.areaDesc)) score += 35;
  if (sameText(candidate.formDesc, target.overview.formDesc)) score += 35;
  if (candidate.orientation === target.overview.orientation) score += 12;
  if (candidate.operatorId && candidate.operatorId === target.overview.operatorId) score += 10;
  if (candidate.firstProdMon && target.overview.firstProdMon) {
    const delta = Math.abs(candidate.firstProdMon - target.overview.firstProdMon);
    score += Math.max(0, 8 - delta / 12);
  }
  const targetGas = target.overview.gasProd3Yr;
  if (targetGas > 0 && candidate.gasProd3Yr > 0) {
    const ratio = Math.min(candidate.gasProd3Yr, targetGas) / Math.max(candidate.gasProd3Yr, targetGas);
    score += ratio * 12;
  }
  return score;
}

function similarWells(detail: WellDetail, allWells: WellSearchResult[]) {
  return [...allWells]
    .map((well) => ({ well, score: scoreSimilarWell(detail, well) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || b.well.gasProd3Yr - a.well.gasProd3Yr)
    .slice(0, 8);
}

function peerSet(detail: WellDetail, allWells: WellSearchResult[]) {
  const areaFormation = allWells.filter(
    (well) =>
      sameText(well.areaDesc, detail.overview.areaDesc) &&
      sameText(well.formDesc, detail.overview.formDesc) &&
      well.waNum !== detail.overview.waNum,
  );
  const formation = allWells.filter(
    (well) => sameText(well.formDesc, detail.overview.formDesc) && well.waNum !== detail.overview.waNum,
  );
  return areaFormation.length >= 8 ? { rows: areaFormation, label: `${detail.overview.areaDesc} / ${detail.overview.formDesc}` } : { rows: formation, label: detail.overview.formDesc ?? "formation peers" };
}

function monthPeerValues(detail: WellDetail, productionExplorer: ProductionExplorerData | null, monthIndex: number) {
  if (!productionExplorer) return [];
  return productionExplorer.wells
    .filter((well) => sameText(well.formDesc, detail.overview.formDesc))
    .filter((well) => !detail.overview.areaDesc || sameText(well.areaDesc, detail.overview.areaDesc))
    .map((well) => well.production[monthIndex - 1] ?? null);
}

function peerMetrics(detail: WellDetail, allWells: WellSearchResult[], productionExplorer: ProductionExplorerData | null): PeerMetric[] {
  const peers = peerSet(detail, allWells);
  const metrics = declineMetrics(detail);
  const month12Peers = monthPeerValues(detail, productionExplorer, 12);

  return [
    {
      label: "3yr gas",
      value: detail.overview.gasProd3Yr,
      percentile: percentile(detail.overview.gasProd3Yr, peers.rows.map((well) => well.gasProd3Yr)),
      peerCount: peers.rows.length,
      context: peers.label,
      unit: "000 m3",
    },
    {
      label: "5yr gas",
      value: detail.overview.gasProd5Yr,
      percentile: percentile(detail.overview.gasProd5Yr, peers.rows.map((well) => well.gasProd5Yr)),
      peerCount: peers.rows.length,
      context: peers.label,
      unit: "000 m3",
    },
    {
      label: "Month 12 gas",
      value: metrics.month12,
      percentile: percentile(metrics.month12, month12Peers),
      peerCount: month12Peers.filter((v) => v !== null).length,
      context: `${detail.overview.areaDesc ?? "area"} / ${detail.overview.formDesc ?? "formation"}`,
      unit: "000 m3",
    },
  ];
}

function operatorLeaders(wells: WellSearchResult[]) {
  const grouped = new Map<number, { operatorId: number; operator: string; count: number; gas: number }>();
  for (const well of wells) {
    if (!well.operatorId || !well.operator) continue;
    const current = grouped.get(well.operatorId) ?? { operatorId: well.operatorId, operator: well.operator, count: 0, gas: 0 };
    current.count += 1;
    current.gas += well.gasProd3Yr;
    grouped.set(well.operatorId, current);
  }
  return [...grouped.values()].sort((a, b) => b.gas - a.gas).slice(0, 6);
}

function timelineRows(detail: WellDetail) {
  const rows: Array<{ date: number | null; event: string; detail: string | null }> = [
    { date: detail.overview.spudMon, event: "Spud month", detail: detail.overview.operator },
    { date: detail.overview.rigRelMon, event: "Rig release month", detail: detail.overview.areaDesc },
    { date: detail.overview.firstProdMon, event: "First production month", detail: detail.overview.formDesc },
  ];

  for (const row of detail.fracDescriptions) {
    const date = Number(row.compltn_date);
    if (Number.isFinite(date)) rows.push({ date, event: "Completion", detail: String(row.compltn_summry ?? "") || null });
  }
  for (const row of detail.gasAnalysis) {
    rows.push({ date: row.sampleDate, event: "Gas sample", detail: row.sampleOrder ? `Sample ${row.sampleOrder}` : null });
  }
  for (const row of detail.casings) {
    const date = Number(row.casing_date);
    if (Number.isFinite(date)) rows.push({ date, event: "Casing", detail: String(row.casing_type ?? "") || null });
  }
  for (const row of detail.abandonment) {
    const date = Number(row.abandonment_date);
    if (Number.isFinite(date)) rows.push({ date, event: "Abandonment", detail: String(row.remarks ?? "") || null });
  }

  return rows
    .filter((row) => row.date !== null && Number.isFinite(Number(row.date)))
    .sort((a, b) => Number(a.date) - Number(b.date))
    .slice(0, 14)
    .map((row) => ({
      date: String(row.date).length === 6 ? formatMonthCode(row.date) : formatDateCode(row.date),
      event: row.event,
      detail: row.detail,
    }));
}

function coverage(detail: WellDetail) {
  return [
    { label: "Production", ok: detail.productionSeries.some((row) => row.gasVolumeKm3 !== null) },
    { label: "Gas analysis", ok: detail.gasAnalysis.length > 0 },
    { label: "Directional survey", ok: detail.directionalSurvey.length > 0 || detail.overview.totalMDepth !== null },
    { label: "Completions", ok: detail.fracSummary.length > 0 || detail.fracDescriptions.length > 0 },
    { label: "Casing", ok: detail.casings.length > 0 },
    { label: "Pay zones", ok: detail.payZones.length > 0 },
    { label: "Abandonment", ok: detail.abandonment.length > 0 },
    { label: "Coordinates", ok: detail.overview.surfLat !== null && detail.overview.surfLon !== null },
  ];
}

function latestGasSample(rows: GasAnalysisRow[]) {
  return [...rows]
    .filter((row) => row.sampleDate !== null)
    .sort((a, b) => Number(b.sampleDate) - Number(a.sampleDate))[0] ?? rows[0] ?? null;
}

function gasCompositionRows(sample: GasAnalysisRow | null) {
  if (!sample) return [];
  return [
    { component: "Methane C1", value: sample.c1Fractn, fill: "#10b981" },
    { component: "Ethane C2", value: sample.c2Fractn, fill: "#06b6d4" },
    { component: "Propane C3", value: sample.c3Fractn, fill: "#f59e0b" },
    { component: "Butanes C4", value: (sample.ic4Fractn ?? 0) + (sample.nc4Fractn ?? 0), fill: "#eab308" },
    { component: "Pentanes C5", value: (sample.ic5Fractn ?? 0) + (sample.nc5Fractn ?? 0), fill: "#ef4444" },
    { component: "C6-C10", value: sample.c6ToC10Fractn, fill: "#f97316" },
    { component: "CO2", value: sample.co2Fractn, fill: "#94a3b8" },
    { component: "N2", value: sample.n2Fractn, fill: "#8b5cf6" },
    { component: "H2S", value: sample.h2sFractn, fill: "#dc2626" },
    { component: "Helium", value: sample.heliumFractn, fill: "#22d3ee" },
  ].filter((row) => row.value !== null && row.value !== undefined && row.value > 0);
}

function gasFlags(sample: GasAnalysisRow | null) {
  if (!sample) return [];
  const flags: string[] = [];
  if ((sample.h2sFractn ?? 0) >= 0.0001) flags.push("H2S present");
  if ((sample.co2Fractn ?? 0) >= 0.02) flags.push("High CO2");
  if ((sample.heliumFractn ?? 0) >= 0.001) flags.push("Helium-rich signal");
  if ((sample.c1Fractn ?? 0) >= 0.85 && (sample.c6ToC10Fractn ?? 0) < 0.01) flags.push("Dry gas profile");
  if ((sample.c6ToC10Fractn ?? 0) >= 0.02 || (sample.c5MlMol ?? 0) > 20) flags.push("Liquids-rich signal");
  return flags;
}

function MiniMetric({ label, value, sublabel, icon: Icon }: { label: string; value: string; sublabel?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-lg border border-border/40 bg-muted/10 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5 text-primary" />}
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
      {sublabel && <div className="mt-0.5 text-xs text-muted-foreground">{sublabel}</div>}
    </div>
  );
}

export function WellAnalytics({
  detail,
  allWells,
  productionExplorer,
}: {
  detail: WellDetail;
  allWells: WellSearchResult[];
  productionExplorer: ProductionExplorerData | null;
}) {
  const { tooltipStyle, axisTickStyle, gridStroke } = useChartTheme();
  const decline = declineMetrics(detail);
  const similar = similarWells(detail, allWells);
  const peers = peerSet(detail, allWells);
  const peerCards = peerMetrics(detail, allWells, productionExplorer);
  const areaPeers = allWells.filter((well) => sameText(well.areaDesc, detail.overview.areaDesc));
  const formationPeers = allWells.filter((well) => sameText(well.formDesc, detail.overview.formDesc));
  const topAreaWells = [...areaPeers].sort((a, b) => b.gasProd3Yr - a.gasProd3Yr).slice(0, 6);
  const topFormationWells = [...formationPeers].sort((a, b) => b.gasProd3Yr - a.gasProd3Yr).slice(0, 6);
  const sample = latestGasSample(detail.gasAnalysis);
  const composition = gasCompositionRows(sample);
  const flags = gasFlags(sample);
  const chartCurve = detail.productionSeries
    .filter((row) => row.gasVolumeKm3 !== null || row.avgDailyKm3 !== null)
    .map((row) => ({
      month: row.periodIndex,
      gas: row.gasVolumeKm3,
      avgDaily: row.avgDailyKm3,
    }));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {peerCards.map((metric) => (
          <Card key={metric.label} className="border-border/50 bg-card/70">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <Badge variant="secondary">{pct(metric.percentile)}</Badge>
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums">
                {formatNumber(metric.value, metric.label.includes("Month") ? 1 : 0)}
                {metric.unit && <span className="ml-1 text-xs font-normal text-muted-foreground">{metric.unit}</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Compared with {metric.peerCount.toLocaleString()} {metric.context} wells
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/50 bg-card/70 lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Decline Curve Explorer</CardTitle>
              <span className="text-xs text-muted-foreground">000 m3</span>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid gap-3 md:grid-cols-4">
              <MiniMetric label="Peak month" value={decline.peak ? `M${decline.peak.month}` : "—"} sublabel={formatNumber(decline.peak?.value ?? null, 1)} icon={Activity} />
              <MiniMetric label="Month 12 retention" value={decline.retention12 === null ? "—" : `${formatNumber(decline.retention12, 0)}%`} sublabel="vs peak month" icon={Gauge} />
              <MiniMetric label="12-month decline" value={decline.decline12 === null ? "—" : `${formatNumber(decline.decline12, 0)}%`} sublabel="peak to month 12" icon={TrendingDown} />
              <MiniMetric label="36-month cum." value={formatNumber(decline.cum36, 0)} sublabel="gas volume" icon={Layers} />
            </div>
            <div className="mt-4">
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartCurve}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                  <XAxis dataKey="month" tick={axisTickStyle} />
                  <YAxis tickFormatter={(v) => formatNumber(v, 0)} tick={axisTickStyle} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 2)} labelFormatter={(v) => `Month ${v}`} />
                  <Line type="monotone" dataKey="gas" name="Monthly gas" stroke="#10b981" dot={false} strokeWidth={2.5} />
                  <Line type="monotone" dataKey="avgDaily" name="Avg daily" stroke="#f59e0b" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
              <MiniMetric label="6-month cum." value={formatNumber(decline.cum6, 0)} />
              <MiniMetric label="12-month cum." value={formatNumber(decline.cum12, 0)} />
              <MiniMetric label="24-month cum." value={formatNumber(decline.cum24, 0)} />
              <MiniMetric label="Month 24 gas" value={formatNumber(decline.month24, 1)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Beaker className="h-4 w-4 text-primary" />
              Gas Composition
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {sample ? (
              <>
                <div className="mb-2 flex flex-wrap gap-1">
                  <Badge variant="outline">{formatDateCode(sample.sampleDate)}</Badge>
                  {flags.map((flag) => <Badge key={flag} variant="secondary">{flag}</Badge>)}
                </div>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={composition} layout="vertical" margin={{ left: 8, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => `${formatNumber((v as number) * 100, 1)}%`} tick={axisTickStyle} />
                    <YAxis dataKey="component" type="category" width={82} tick={{ ...axisTickStyle, fontSize: 10 }} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v) => `${formatNumber((v as number) * 100, 3)}%`} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {composition.map((row) => <Cell key={row.component} fill={row.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                  <MiniMetric label="Gas MW" value={formatNumber(sample.molclrWtOfGas, 3)} />
                  <MiniMetric label="C5 yield" value={formatNumber(sample.c5MlMol, 3)} sublabel="mL/mol" />
                </div>
              </>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No gas samples available.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Similar Wells</CardTitle>
              <Badge variant="outline">{peers.rows.length.toLocaleString()} peers</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {similar.map(({ well, score }) => (
                <div key={well.waNum} className="flex items-center justify-between gap-3 rounded-lg border border-border/40 bg-muted/10 p-3">
                  <div className="min-w-0">
                    <Link to={`/wells/${well.waNum}`} className="font-medium text-primary hover:underline">WA {well.waNum}</Link>
                    <p className="truncate text-sm">{well.wellName ?? "Unnamed well"}</p>
                    <p className="truncate text-xs text-muted-foreground">{well.areaDesc ?? "—"} / {well.formDesc ?? "—"}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">{formatNumber(well.gasProd3Yr, 0)}</div>
                    <div className="text-xs text-muted-foreground">match {formatNumber(score, 0)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Data Coverage</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-2">
              {coverage(detail).map((item) => (
                <div key={item.label} className="flex items-center gap-2 rounded-md border border-border/40 bg-muted/10 px-3 py-2 text-sm">
                  <CheckCircle2 className={`h-4 w-4 ${item.ok ? "text-emerald-400" : "text-muted-foreground/40"}`} />
                  <span className={item.ok ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {detail.overview.areaDesc && (
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to={searchUrl("area", detail.overview.areaDesc)}><Search className="mr-1 h-3 w-3" />Area wells</Link>
                </Button>
              )}
              {detail.overview.formDesc && (
                <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                  <Link to={searchUrl("formation", detail.overview.formDesc)}><Search className="mr-1 h-3 w-3" />Formation wells</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Area / Formation Leaderboards</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            <DataTable
              rows={topAreaWells.map((well) => ({
                wa_num: well.waNum,
                well_name: well.wellName,
                operator: well.operator,
                operator_id: well.operatorId,
                gas_prod_3yr: well.gasProd3Yr,
              }))}
              emptyMessage="No area leaderboard rows."
            />
            <DataTable
              rows={operatorLeaders(areaPeers).map((op) => ({
                operator_id: op.operatorId,
                operator: op.operator,
                wells: op.count,
                gas_prod_3yr: op.gas,
              }))}
              emptyMessage="No operator leaderboard rows."
            />
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/70">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-primary" />
              Well Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <DataTable rows={timelineRows(detail)} emptyMessage="No timeline events available." />
            {topFormationWells.length > 0 && (
              <div className="mt-3 rounded-lg border border-border/40 bg-muted/10 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Top formation wells</p>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {topFormationWells.slice(0, 4).map((well) => (
                    <Link key={well.waNum} to={`/wells/${well.waNum}`} className="truncate text-sm text-primary hover:underline">
                      WA {well.waNum} · {formatNumber(well.gasProd3Yr, 0)}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

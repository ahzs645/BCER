import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { DataTable } from "@/components/DataTable";
import { ProductionCharts } from "@/components/ProductionCharts";
import { StatCard } from "@/components/StatCard";
import { fetchWellDetail, fetchSourceMeta } from "@/lib/api";
import { formatLatLon, formatMonthCode, formatNumber } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  FiscalYearPoint,
  GasAnalysisRow,
  GasUnitOption,
  KeyValueRow,
  LiquidUnitOption,
  SourceMeta,
  WellDetail,
} from "@/types";

const gasUnitLabels: Record<GasUnitOption, string> = {
  km3: "000 m3",
  mcf: "MCF",
  kmcf: "000 MCF",
};

const recordBlocks = [
  { value: "0", label: "First 5", start: 0 },
  { value: "5", label: "6-10", start: 5 },
  { value: "10", label: "11-15", start: 10 },
  { value: "15", label: "16-20", start: 15 },
] as const;

function liquidUnit(unit: GasUnitOption): LiquidUnitOption {
  return unit === "km3" ? "m3" : "bbl";
}

function numericField(row: KeyValueRow | null | undefined, key: string) {
  if (!row) return null;
  const value = row[key];
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function stringField(row: KeyValueRow | null | undefined, key: string) {
  if (!row) return null;
  const value = row[key];
  return value === null || value === undefined || value === "" ? null : String(value);
}

function maxField(rows: KeyValueRow[], key: string) {
  return rows.reduce<number | null>((currentMax, row) => {
    const value = numericField(row, key);
    if (value === null) return currentMax;
    return currentMax === null ? value : Math.max(currentMax, value);
  }, null);
}

function minField(rows: KeyValueRow[], key: string) {
  return rows.reduce<number | null>((currentMin, row) => {
    const value = numericField(row, key);
    if (value === null) return currentMin;
    return currentMin === null ? value : Math.min(currentMin, value);
  }, null);
}

function deepestPayZone(rows: KeyValueRow[]) {
  return rows.reduce<KeyValueRow | null>((current, row) => {
    const depth = numericField(row, "meas_top_pay_depth");
    if (depth === null) return current;
    if (!current) return row;
    return depth > (numericField(current, "meas_top_pay_depth") ?? -Infinity) ? row : current;
  }, null);
}

function gasValueForUnit(
  unit: GasUnitOption,
  row: Pick<FiscalYearPoint, "gasKm3" | "gasMcf" | "gasKmcf" | "avgDailyKm3" | "avgDailyMcf" | "avgDailyKmcf">,
  kind: "gas" | "avgDaily",
) {
  if (kind === "avgDaily") {
    if (unit === "mcf") return row.avgDailyMcf;
    if (unit === "kmcf") return row.avgDailyKmcf;
    return row.avgDailyKm3;
  }
  if (unit === "mcf") return row.gasMcf;
  if (unit === "kmcf") return row.gasKmcf;
  return row.gasKm3;
}

function oilValueForUnit(unit: GasUnitOption, row: Pick<FiscalYearPoint, "oilM3" | "oilBbl">) {
  return liquidUnit(unit) === "m3" ? row.oilM3 : row.oilBbl;
}

function condensateValueForUnit(unit: GasUnitOption, row: Pick<FiscalYearPoint, "condensateM3" | "condensateBbl">) {
  return liquidUnit(unit) === "m3" ? row.condensateM3 : row.condensateBbl;
}

function latestFiscalYearRow(rows: FiscalYearPoint[]) {
  return [...rows].reverse().find((row) => (
    row.gasKm3 !== null || row.oilM3 !== null || row.condensateM3 !== null || row.avgDailyKm3 !== null
  )) ?? null;
}

function averageValue(total: number | null, count: number | null) {
  if (total === null || count === null || count <= 0) return null;
  return total / count;
}

function recordBlockOptions(rowCount: number, includeLast = false) {
  const options: Array<{ value: string; label: string }> = [];
  if (includeLast && rowCount > 5) options.push({ value: "last", label: "Last 5 Segments" });
  options.push(...recordBlocks.filter(({ start }) => rowCount > start).map(({ value, label }) => ({ value, label })));
  if (rowCount > 5) options.push({ value: "all", label: "All rows" });
  return options;
}

function sliceRecordBlock<T>(rows: T[], block: string) {
  if (block === "all") return rows;
  if (block === "last") return rows.slice(Math.max(rows.length - 5, 0));
  const start = Number.parseInt(block, 10);
  if (Number.isNaN(start)) return rows.slice(0, 5);
  return rows.slice(start, start + 5);
}

function BlockSelector({ label, rowCount, value, onChange, includeLast = false }: {
  label: string; rowCount: number; value: string; onChange: (v: string) => void; includeLast?: boolean;
}) {
  const options = recordBlockOptions(rowCount, includeLast);
  if (options.length <= 1) return null;
  return (
    <div className="flex items-center gap-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 rounded-md border border-input bg-muted/50 px-2 text-xs"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function buildPayZoneSummaryRows(payZones: KeyValueRow[]) {
  const deepest = deepestPayZone(payZones);
  if (!deepest) return [];
  return [{
    deepest_top_pay_depth: numericField(deepest, "meas_top_pay_depth"),
    pay_type: stringField(deepest, "pay_type"),
    porosity_max: maxField(payZones, "porosity"),
    porosity_min: minField(payZones, "porosity"),
    saturation_max: maxField(payZones, "saturation"),
    saturation_min: minField(payZones, "saturation"),
    lithology: stringField(deepest, "lithology"),
  }];
}

function buildFracTypeSummaryRows(fracSummaryRows: KeyValueRow[]) {
  const summary = fracSummaryRows[0];
  if (!summary) return [];
  const rows = [
    { frac_type: "CO2", count: numericField(summary, "num_co2_fracs"), average_tonnes: averageValue(numericField(summary, "co2_tonnes"), numericField(summary, "num_co2_fracs")) },
    { frac_type: "SLH", count: numericField(summary, "num_slh_fracs"), average_tonnes: averageValue(numericField(summary, "slh_tonnes"), numericField(summary, "num_slh_fracs")) },
    { frac_type: "SLW", count: numericField(summary, "num_slw_fracs"), average_tonnes: averageValue(numericField(summary, "slw_tonnes"), numericField(summary, "num_slw_fracs")) },
    { frac_type: "DGL", count: numericField(summary, "num_dgl_fracs"), average_tonnes: averageValue(numericField(summary, "dgl_tonnes"), numericField(summary, "num_dgl_fracs")) },
    { frac_type: "NES", count: numericField(summary, "num_nes_fracs"), average_tonnes: averageValue(numericField(summary, "nes_tonnes"), numericField(summary, "num_nes_fracs")) },
  ];
  return rows.filter((r) => r.count !== null || r.average_tonnes !== null);
}

function buildRecentGasRows(rows: GasAnalysisRow[]) {
  return rows.map((row) => ({
    sample_date: row.sampleDate, h2_fractn: row.h2Fractn, helium_fractn: row.heliumFractn,
    co2_fractn: row.co2Fractn, h2s_fractn: row.h2sFractn, n2_fractn: row.n2Fractn,
    c1_fractn: row.c1Fractn, c2_fractn: row.c2Fractn, c3_fractn: row.c3Fractn,
    ic4_fractn: row.ic4Fractn, nc4_fractn: row.nc4Fractn, ic5_fractn: row.ic5Fractn,
    nc5_fractn: row.nc5Fractn, c6_to_c10_fractn: row.c6ToC10Fractn,
  }));
}

function buildGasExtremaRows(rows: GasAnalysisRow[]) {
  const valuesFor = (selector: (row: GasAnalysisRow) => number | null) =>
    rows.map(selector).filter((v): v is number => v !== null);
  const co2Values = valuesFor((r) => r.co2Fractn);
  const h2sValues = valuesFor((r) => r.h2sFractn);
  if (co2Values.length === 0 && h2sValues.length === 0) return [];
  return [{
    co2_max: co2Values.length ? Math.max(...co2Values) : null,
    co2_min: co2Values.length ? Math.min(...co2Values) : null,
    h2s_max: h2sValues.length ? Math.max(...h2sValues) : null,
    h2s_min: h2sValues.length ? Math.min(...h2sValues) : null,
  }];
}

export function WellDetailPage() {
  const { waNum = "" } = useParams();
  const [detail, setDetail] = useState<WellDetail | null>(null);
  const [meta, setMeta] = useState<SourceMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unit, setUnit] = useState<GasUnitOption>("km3");
  const [fracBlock, setFracBlock] = useState("0");
  const [casingBlock, setCasingBlock] = useState("last");
  const [abandonmentBlock, setAbandonmentBlock] = useState("0");

  useEffect(() => {
    let cancelled = false;
    setUnit("km3");
    setFracBlock("0");
    setCasingBlock("last");
    setAbandonmentBlock("0");

    async function loadDetail() {
      setLoading(true);
      setError(null);
      try {
        const [wellDetail, sourceMeta] = await Promise.all([fetchWellDetail(waNum), fetchSourceMeta()]);
        if (!cancelled) { setDetail(wellDetail); setMeta(sourceMeta); }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Unable to load well detail.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void loadDetail();
    return () => { cancelled = true; };
  }, [waNum]);

  const liquids = liquidUnit(unit);
  const latestFiscalYear = useMemo(
    () => (detail ? latestFiscalYearRow(detail.fiscalYearSeries) : null),
    [detail],
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">{error ?? "Well not found."}</CardContent>
      </Card>
    );
  }

  const overviewRows = [{
    wa_num: detail.overview.waNum, well_name: detail.overview.wellName,
    operator: detail.overview.operator, operator_id: detail.overview.operatorId,
    operator_abbr: detail.overview.operatorAbbr?.trim() ?? null,
    well_classification: detail.overview.wellClassification,
    uwi_list: detail.overview.uwiList.join(", ") || null,
    area_desc: detail.overview.areaDesc, form_desc: detail.overview.formDesc,
    orientation: detail.overview.orientation ?? "VERT",
    spud_mon: detail.overview.spudMon, rig_rel_mon: detail.overview.rigRelMon,
    first_prod_mon: detail.overview.firstProdMon, first_prod_period: detail.overview.firstProdPeriod,
    total_m_depth: detail.overview.totalMDepth, max_tv_depth: detail.overview.maxTvDepth,
    surf_lat: detail.overview.surfLat, surf_lon: detail.overview.surfLon,
    grid: detail.overview.grid,
  }];

  const locationRows = detail.activityLocations.map((row) => ({
    uwi_order: row.uwiOrder, uwi: row.uwi, area_code: row.areaCode,
    area_desc: row.areaDesc, form_code: row.formCode, form_desc: row.formDesc,
  }));

  const recentGasRows = buildRecentGasRows(detail.recentGasAnalysis);
  const gasExtremaRows = buildGasExtremaRows(detail.gasAnalysis);
  const payZoneSummaryRows = buildPayZoneSummaryRows(detail.payZones);
  const fracTypeSummaryRows = buildFracTypeSummaryRows(detail.fracSummary);

  const fiscalYearRows = detail.fiscalYearSeries.map((row) => ({
    fiscal_year: row.fiscalYear,
    gas: gasValueForUnit(unit, row, "gas"),
    oil: oilValueForUnit(unit, row),
    condensate: condensateValueForUnit(unit, row),
    avg_daily: gasValueForUnit(unit, row, "avgDaily"),
  }));

  const calendarYearRows = detail.calendarYearSeries.map((row) => ({
    calendar_year: row.calendarYear,
    gas: unit === "mcf" ? row.gasMcf : unit === "kmcf" ? row.gasKmcf : row.gasKm3,
    avg_daily: unit === "mcf" ? row.avgDailyMcf : unit === "kmcf" ? row.avgDailyKmcf : row.avgDailyKm3,
  }));

  const fracDescriptionRows = sliceRecordBlock(detail.fracDescriptions, fracBlock);
  const casingRows = sliceRecordBlock(detail.casings, casingBlock);
  const abandonmentRows = sliceRecordBlock(detail.abandonment, abandonmentBlock);

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Button variant="ghost" size="sm" asChild className="text-primary">
        <Link to="/search"><ArrowLeft className="mr-1.5 h-3.5 w-3.5" />Back to search</Link>
      </Button>

      {/* Hero */}
      <Card className="glow-card-strong border-border/50 bg-card/80 backdrop-blur-sm">
        <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary">WA {detail.overview.waNum}</p>
            <h2 className="mt-1 text-2xl font-bold font-[family-name:var(--font-heading)] tracking-tight sm:text-3xl">
              {detail.overview.wellName ?? "Unnamed well"}
            </h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {detail.overview.operator ?? "Unknown operator"}
              {detail.overview.operatorId ? ` · Operator ${detail.overview.operatorId}` : ""}
              {" · "}
              {detail.overview.areaDesc ?? "Unknown area"}
              {" · "}
              {detail.overview.formDesc ?? "Unknown formation"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Badge variant="outline">{meta?.dataCurrentTo ?? "—"}</Badge>
            <Badge variant="outline">{detail.overview.orientation ?? "VERT"}</Badge>
            <Badge variant="outline">{detail.overview.operatorAbbr?.trim() || "No abbr"}</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Stat Grid */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        <StatCard label="3 year gas" value={formatNumber(detail.overview.gasProd3Yr, 1)} />
        <StatCard label="5 year gas" value={formatNumber(detail.overview.gasProd5Yr, 1)} />
        <StatCard label="Spud month" value={formatMonthCode(detail.overview.spudMon)} />
        <StatCard label="Rig release" value={formatMonthCode(detail.overview.rigRelMon)} />
        <StatCard label="First production" value={formatMonthCode(detail.overview.firstProdMon)} />
        <StatCard label="Surface location" value={formatLatLon(detail.overview.surfLat, detail.overview.surfLon)} />
        <StatCard label="Measured depth" value={formatNumber(detail.overview.totalMDepth, 2)} />
        <StatCard label="TV depth" value={formatNumber(detail.overview.maxTvDepth, 2)} />
      </div>

      {/* Tabbed Detail */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-primary/70">Workbook Subsheets</p>
              <CardTitle className="mt-1 text-base">Selected well detail</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Gas units</Label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as GasUnitOption)}
                className="h-7 rounded-md border border-input bg-muted/50 px-2 text-xs"
              >
                <option value="km3">000 m3</option>
                <option value="mcf">MCF</option>
                <option value="kmcf">000 MCF</option>
              </select>
              <span className="text-xs text-muted-foreground">Liquids in {liquids}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Tabs defaultValue="overview">
            <TabsList className="mb-4 flex-wrap h-auto gap-1 bg-muted/30 p-1">
              <TabsTrigger value="overview">Summary</TabsTrigger>
              <TabsTrigger value="production">Production</TabsTrigger>
              <TabsTrigger value="fracs">Fracs</TabsTrigger>
              <TabsTrigger value="gas">Gas Analyses</TabsTrigger>
              <TabsTrigger value="drilling">Survey & Drilling</TabsTrigger>
              <TabsTrigger value="casings">Casings</TabsTrigger>
              <TabsTrigger value="payZones">Pay Zones</TabsTrigger>
              <TabsTrigger value="abandonment">Abandonment</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Well Summary</CardTitle></CardHeader>
                  <CardContent className="pt-0"><DataTable rows={overviewRows} /></CardContent>
                </Card>

                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Production Snapshot</CardTitle>
                      <span className="text-xs text-muted-foreground">{latestFiscalYear?.fiscalYear ?? "No data"}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {latestFiscalYear ? (
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label={`Gas (${gasUnitLabels[unit]})`} value={formatNumber(gasValueForUnit(unit, latestFiscalYear, "gas"), 2)} />
                        <StatCard label={`Oil (${liquids})`} value={formatNumber(oilValueForUnit(unit, latestFiscalYear), 2)} />
                        <StatCard label={`Condensate (${liquids})`} value={formatNumber(condensateValueForUnit(unit, latestFiscalYear), 2)} />
                        <StatCard label={`Avg Daily (${gasUnitLabels[unit]})`} value={formatNumber(gasValueForUnit(unit, latestFiscalYear, "avgDaily"), 2)} />
                      </div>
                    ) : (
                      <p className="py-3 text-center text-sm text-muted-foreground">No fiscal-year production rows.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Location of Activity</CardTitle></CardHeader>
                  <CardContent className="pt-0"><DataTable rows={locationRows} emptyMessage="No UWI activity rows." /></CardContent>
                </Card>

                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Pay Zone Snapshot</CardTitle></CardHeader>
                  <CardContent className="pt-0"><DataTable rows={payZoneSummaryRows} emptyMessage="No pay zone summary rows." /></CardContent>
                </Card>

                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Frac Type Summary</CardTitle></CardHeader>
                  <CardContent className="pt-0"><DataTable rows={fracTypeSummaryRows} emptyMessage="No frac summary rows." /></CardContent>
                </Card>

                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">All Samples</CardTitle>
                      <span className="text-xs text-muted-foreground">CO2 / H2S range</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0"><DataTable rows={gasExtremaRows} emptyMessage="No gas analysis extrema." /></CardContent>
                </Card>

                <Card className="border-border/30 bg-card/40 md:col-span-2">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Most Recent Gas Analyses</CardTitle>
                      <span className="text-xs text-muted-foreground">Up to 3 rows</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0"><DataTable rows={recentGasRows} emptyMessage="No gas analysis rows." /></CardContent>
                </Card>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium">Production Graphs</h3>
                <ProductionCharts detail={detail} unit={unit} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Directional Survey</CardTitle></CardHeader>
                  <CardContent className="pt-0"><DataTable rows={detail.directionalSurvey} emptyMessage="No directional survey rows." /></CardContent>
                </Card>
                <Card className="border-border/30 bg-card/40 md:col-span-2">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Drilling Events</CardTitle></CardHeader>
                  <CardContent className="pt-0"><DataTable rows={detail.drillingEvents} emptyMessage="No drilling event rows." /></CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="production" className="space-y-4">
              <ProductionCharts detail={detail} unit={unit} />
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Fiscal Year Table</CardTitle>
                      <span className="text-xs text-muted-foreground">Gas {gasUnitLabels[unit]} · Liquids {liquids}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0"><DataTable rows={fiscalYearRows} emptyMessage="No fiscal-year production rows." /></CardContent>
                </Card>
                <Card className="border-border/30 bg-card/40">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Calendar Year Table</CardTitle>
                      <span className="text-xs text-muted-foreground">{gasUnitLabels[unit]}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0"><DataTable rows={calendarYearRows} emptyMessage="No calendar-year production rows." /></CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="fracs" className="space-y-4">
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Frac Summary</CardTitle></CardHeader>
                <CardContent className="pt-0"><DataTable rows={detail.fracSummary} emptyMessage="No frac summary rows." /></CardContent>
              </Card>
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Frac Descriptions</CardTitle>
                    <BlockSelector label="Frac records" rowCount={detail.fracDescriptions.length} value={fracBlock} onChange={setFracBlock} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0"><DataTable rows={fracDescriptionRows} emptyMessage="No frac descriptions." /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="gas">
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Gas Analysis</CardTitle></CardHeader>
                <CardContent className="pt-0">
                  <DataTable rows={detail.gasAnalysis as unknown as Array<Record<string, string | number | null>>} emptyMessage="No gas analysis rows." />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="drilling" className="space-y-4">
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Directional Survey</CardTitle></CardHeader>
                <CardContent className="pt-0"><DataTable rows={detail.directionalSurvey} emptyMessage="No directional survey rows." /></CardContent>
              </Card>
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Drilling Events</CardTitle></CardHeader>
                <CardContent className="pt-0"><DataTable rows={detail.drillingEvents} emptyMessage="No drilling event rows." /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="casings">
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Casings</CardTitle>
                    <BlockSelector label="Casing records" rowCount={detail.casings.length} value={casingBlock} onChange={setCasingBlock} includeLast />
                  </div>
                </CardHeader>
                <CardContent className="pt-0"><DataTable rows={casingRows} emptyMessage="No casing rows." /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="payZones">
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Pay Zones</CardTitle></CardHeader>
                <CardContent className="pt-0"><DataTable rows={detail.payZones} emptyMessage="No pay zone rows." /></CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="abandonment">
              <Card className="border-border/30 bg-card/40">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Abandonment</CardTitle>
                    <BlockSelector label="Abandonment records" rowCount={detail.abandonment.length} value={abandonmentBlock} onChange={setAbandonmentBlock} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0"><DataTable rows={abandonmentRows} emptyMessage="No abandonment rows." /></CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

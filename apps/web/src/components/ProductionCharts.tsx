import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { GasUnitOption, LiquidUnitOption, WellDetail } from "@/types";
import { formatNumber } from "@/lib/format";
import { useChartTheme } from "@/lib/chart-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ProductionChartsProps {
  detail: WellDetail;
  unit: GasUnitOption;
}

const unitLabel: Record<GasUnitOption, string> = {
  km3: "000 m3",
  mcf: "MCF",
  kmcf: "000 MCF",
};

function valueKey(prefix: "gasVolume" | "avgDaily", unit: GasUnitOption) {
  if (unit === "mcf") return `${prefix}Mcf`;
  if (unit === "kmcf") return `${prefix}Kmcf`;
  return `${prefix}Km3`;
}

function yearlyGasKey(unit: GasUnitOption) {
  if (unit === "mcf") return "gasMcf";
  if (unit === "kmcf") return "gasKmcf";
  return "gasKm3";
}

function liquidUnit(unit: GasUnitOption): LiquidUnitOption {
  return unit === "km3" ? "m3" : "bbl";
}

export function ProductionCharts({ detail, unit }: ProductionChartsProps) {
  const { tooltipStyle, axisTickStyle, gridStroke } = useChartTheme();
  const gasKey = valueKey("gasVolume", unit);
  const avgKey = valueKey("avgDaily", unit);
  const yearlyGas = yearlyGasKey(unit);
  const liquids = liquidUnit(unit);
  const oilKey = liquids === "m3" ? "oilM3" : "oilBbl";
  const condensateKey = liquids === "m3" ? "condensateM3" : "condensateBbl";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Monthly Production</CardTitle>
            <span className="text-xs text-muted-foreground">{unitLabel[unit]}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={detail.productionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="periodLabel" minTickGap={30} tick={axisTickStyle} />
              <YAxis tickFormatter={(v) => formatNumber(v, 1)} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 2)} />
              <Line type="monotone" dataKey={gasKey} stroke="#10b981" dot={false} strokeWidth={2.5} name="Gas production" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Average Daily Gas</CardTitle>
            <span className="text-xs text-muted-foreground">{unitLabel[unit]}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={detail.productionSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="periodLabel" minTickGap={30} tick={axisTickStyle} />
              <YAxis tickFormatter={(v) => formatNumber(v, 1)} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 2)} />
              <Line type="monotone" dataKey={avgKey} stroke="#f59e0b" dot={false} strokeWidth={2.5} name="Average daily" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Calendar Year Gas</CardTitle>
            <span className="text-xs text-muted-foreground">{unitLabel[unit]}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={detail.calendarYearSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="calendarYear" minTickGap={24} tick={axisTickStyle} />
              <YAxis tickFormatter={(v) => formatNumber(v, 1)} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 2)} />
              <Bar dataKey={yearlyGas} fill="#06b6d4" name="Gas production" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/60">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Fiscal Year Gas</CardTitle>
            <span className="text-xs text-muted-foreground">{unitLabel[unit]}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={detail.fiscalYearSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="fiscalYear" minTickGap={24} tick={axisTickStyle} />
              <YAxis tickFormatter={(v) => formatNumber(v, 1)} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 2)} />
              <Bar dataKey={yearlyGas} fill="#0ea5e9" name="Gas production" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/60 md:col-span-2">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Fiscal Year Liquids</CardTitle>
            <span className="text-xs text-muted-foreground">{liquids}</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={detail.fiscalYearSeries}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="fiscalYear" minTickGap={24} tick={axisTickStyle} />
              <YAxis tickFormatter={(v) => formatNumber(v, 1)} tick={axisTickStyle} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v) => formatNumber(v as number, 2)} />
              <Bar dataKey={oilKey} fill="#eab308" name={`Oil (${liquids})`} radius={[3, 3, 0, 0]} />
              <Bar dataKey={condensateKey} fill="#ef4444" name={`Condensate (${liquids})`} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

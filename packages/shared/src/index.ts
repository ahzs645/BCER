export type SortOption = "high3YrProd" | "high5YrProd" | "highestWa" | "lowestWa";
export type OrientationOption = "all" | "horizontal" | "vertical";
export type GasUnitOption = "km3" | "mcf" | "kmcf";
export type LiquidUnitOption = "m3" | "bbl";

export interface SourceMeta {
  authorName: string;
  authorEmail: string;
  sourceAgency: string;
  sourceWebsite: string;
  dataCurrentTo: string;
  importTimestamp: string;
  aboutParagraphs: string[];
}

export interface WellSearchFilters {
  waNum?: string;
  waNumFrom?: string;
  waNumTo?: string;
  wellName?: string;
  operator?: string;
  uwi?: string;
  area?: string;
  formation?: string;
  spudFrom?: string;
  spudTo?: string;
  rigRelFrom?: string;
  rigRelTo?: string;
  firstProdFrom?: string;
  firstProdTo?: string;
  orientation?: OrientationOption;
  latMin?: string;
  latMax?: string;
  lonMin?: string;
  lonMax?: string;
  sort?: SortOption;
  page?: number;
  pageSize?: number;
}

export interface WellSearchResult {
  waNum: number;
  wellName: string | null;
  operator: string | null;
  operatorId: number | null;
  operatorAbbr: string | null;
  uwiList: string[];
  areaCode: number | null;
  areaDesc: string | null;
  formCode: number | null;
  formDesc: string | null;
  spudMon: number | null;
  rigRelMon: number | null;
  firstProdMon: number | null;
  orientation: string | null;
  surfLat: number | null;
  surfLon: number | null;
  gasProd3Yr: number;
  gasProd5Yr: number;
}

export interface SearchResponse {
  items: WellSearchResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ProductionSeriesPoint {
  periodLabel: string;
  periodIndex: number;
  gasVolumeKm3: number | null;
  gasVolumeMcf: number | null;
  gasVolumeKmcf: number | null;
  avgDailyKm3: number | null;
  avgDailyMcf: number | null;
  avgDailyKmcf: number | null;
}

export interface FiscalYearPoint {
  fiscalYear: string;
  gasKm3: number | null;
  gasMcf: number | null;
  gasKmcf: number | null;
  oilM3: number | null;
  oilBbl: number | null;
  condensateM3: number | null;
  condensateBbl: number | null;
  avgDailyKm3: number | null;
  avgDailyMcf: number | null;
  avgDailyKmcf: number | null;
}

export interface CalendarYearPoint {
  calendarYear: string;
  gasKm3: number | null;
  gasMcf: number | null;
  gasKmcf: number | null;
  avgDailyKm3: number | null;
  avgDailyMcf: number | null;
  avgDailyKmcf: number | null;
}

export interface GasAnalysisRow {
  sampleDate: number | null;
  sampleOrder: number | null;
  h2Fractn: number | null;
  heliumFractn: number | null;
  co2Fractn: number | null;
  h2sFractn: number | null;
  n2Fractn: number | null;
  c1Fractn: number | null;
  c2Fractn: number | null;
  c3Fractn: number | null;
  ic4Fractn: number | null;
  nc4Fractn: number | null;
  ic5Fractn: number | null;
  nc5Fractn: number | null;
  c6ToC10Fractn: number | null;
}

export interface ActivityLocationRow {
  uwi: string | null;
  uwiOrder: number | null;
  areaCode: number | null;
  areaDesc: string | null;
  formCode: number | null;
  formDesc: string | null;
}

export interface OverviewRecord {
  waNum: number;
  wellName: string | null;
  operator: string | null;
  operatorId: number | null;
  operatorAbbr: string | null;
  uwiList: string[];
  areaCode: number | null;
  areaDesc: string | null;
  formCode: number | null;
  formDesc: string | null;
  spudMon: number | null;
  rigRelMon: number | null;
  firstProdMon: number | null;
  orientation: string | null;
  surfLat: number | null;
  surfLon: number | null;
  grid: string | null;
  gasProd3Yr: number;
  gasProd5Yr: number;
  firstProdPeriod: number | null;
  totalMDepth: number | null;
  maxTvDepth: number | null;
  wellClassification: string | null;
}

export interface KeyValueRow {
  [key: string]: number | string | null;
}

export interface DashboardData {
  totalWells: number;
  totalHorizontal: number;
  totalVertical: number;
  dataCurrentTo: string;
  topAreas: Array<{ areaDesc: string; count: number }>;
  topFormations: Array<{ formDesc: string; count: number }>;
  orientationBreakdown: Array<{ orientation: string; count: number }>;
  recentWells: WellSearchResult[];
  productionLeaders: WellSearchResult[];
}

export interface OperatorSummary {
  operator: string;
  operatorId: number;
  operatorAbbr: string | null;
  wellCount: number;
  horizontalCount: number;
  verticalCount: number;
  totalGas3Yr: number;
  totalGas5Yr: number;
  topArea: string | null;
  topFormation: string | null;
}

export interface OperatorAnalyticsData {
  totalOperators: number;
  topByWellCount: OperatorSummary[];
  topByProduction: OperatorSummary[];
}

export interface OperatorDetailData {
  summary: OperatorSummary;
  wells: WellSearchResult[];
  areaBreakdown: Array<{ areaDesc: string; count: number }>;
  formationBreakdown: Array<{ formDesc: string; count: number }>;
  orientationBreakdown: Array<{ orientation: string; count: number }>;
}

export interface AggregateProductionPoint {
  label: string;
  value: number;
}

export interface AggregateProductionData {
  wellCount: number;
  earliestFirstProd: number | null;
  latestFirstProd: number | null;
  monthlyProduction: AggregateProductionPoint[];
  monthlyAvgDaily: AggregateProductionPoint[];
  calendarYearProduction: AggregateProductionPoint[];
  fiscalYearProduction: AggregateProductionPoint[];
}

export interface WellDetail {
  overview: OverviewRecord;
  activityLocations: ActivityLocationRow[];
  productionSeries: ProductionSeriesPoint[];
  calendarYearSeries: CalendarYearPoint[];
  fiscalYearSeries: FiscalYearPoint[];
  fracSummary: KeyValueRow[];
  fracDescriptions: KeyValueRow[];
  gasAnalysis: GasAnalysisRow[];
  recentGasAnalysis: GasAnalysisRow[];
  directionalSurvey: KeyValueRow[];
  drillingEvents: KeyValueRow[];
  casings: KeyValueRow[];
  payZones: KeyValueRow[];
  abandonment: KeyValueRow[];
}

import type {
  AggregateProductionData,
  DashboardData,
  DimensionDetailData,
  DimensionIndexData,
  OperatorAnalyticsData,
  OperatorDetailData,
  ProductionExplorerData,
  SearchResponse,
  SourceMeta,
  WellDetail,
  WellSearchResult,
} from "../types";
import {
  clientSearch,
  filterAndSortWells,
  filterWells,
  generateGeoJson,
  loadJson,
  loadSearchIndex,
  loadWellDetail,
} from "./static-data";

export function fetchSourceMeta(): Promise<SourceMeta> {
  return loadJson<SourceMeta>("meta.json");
}

export function fetchDashboard(): Promise<DashboardData> {
  return loadJson<DashboardData>("dashboard.json");
}

export function fetchAggregateProduction(): Promise<AggregateProductionData> {
  return loadJson<AggregateProductionData>("aggregate-production.json");
}

export async function fetchWellGeoJson(
  filters?: Record<string, string | number | undefined>,
): Promise<GeoJSON.FeatureCollection<GeoJSON.Point>> {
  const wells = await loadSearchIndex();
  const scoped = filters ? filterWells(wells, filters) : wells;
  return generateGeoJson(scoped);
}

export async function fetchWellSearch(
  filters: Record<string, string | number | undefined>,
): Promise<SearchResponse> {
  const wells = await loadSearchIndex();
  return clientSearch(wells, filters);
}

/** Every well matching the filters (sorted, unpaginated) — used for full CSV export. */
export async function fetchFilteredWells(
  filters: Record<string, string | number | undefined>,
): Promise<WellSearchResult[]> {
  const wells = await loadSearchIndex();
  return filterAndSortWells(wells, filters);
}

export function fetchAllWells(): Promise<WellSearchResult[]> {
  return loadSearchIndex();
}

export async function fetchWellDetail(waNum: string): Promise<WellDetail> {
  const detail = await loadWellDetail(Number(waNum));
  if (!detail) throw new Error(`Well ${waNum} not found`);
  return detail;
}

export function fetchProductionExplorer(): Promise<ProductionExplorerData> {
  return loadJson<ProductionExplorerData>("production-explorer.json");
}

export function fetchOperatorAnalytics(): Promise<OperatorAnalyticsData> {
  return loadJson<OperatorAnalyticsData>("operators/index.json");
}

export function fetchOperatorDetail(
  operatorId: string,
): Promise<OperatorDetailData> {
  return loadJson<OperatorDetailData>(`operators/${operatorId}.json`);
}

export function fetchAreaIndex(): Promise<DimensionIndexData> {
  return loadJson<DimensionIndexData>("areas/index.json");
}

export function fetchAreaDetail(areaCode: string): Promise<DimensionDetailData> {
  return loadJson<DimensionDetailData>(`areas/${areaCode}.json`);
}

export function fetchFormationIndex(): Promise<DimensionIndexData> {
  return loadJson<DimensionIndexData>("formations/index.json");
}

export function fetchFormationDetail(formCode: string): Promise<DimensionDetailData> {
  return loadJson<DimensionDetailData>(`formations/${formCode}.json`);
}

import type {
  AggregateProductionData,
  DashboardData,
  OperatorAnalyticsData,
  OperatorDetailData,
  SearchResponse,
  SourceMeta,
  WellDetail,
} from "../types";
import {
  clientSearch,
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

export async function fetchWellGeoJson(): Promise<
  GeoJSON.FeatureCollection<GeoJSON.Point>
> {
  const wells = await loadSearchIndex();
  return generateGeoJson(wells);
}

export async function fetchWellSearch(
  filters: Record<string, string | number | undefined>,
): Promise<SearchResponse> {
  const wells = await loadSearchIndex();
  return clientSearch(wells, filters);
}

export async function fetchWellDetail(waNum: string): Promise<WellDetail> {
  const detail = await loadWellDetail(Number(waNum));
  if (!detail) throw new Error(`Well ${waNum} not found`);
  return detail;
}

export function fetchOperatorAnalytics(): Promise<OperatorAnalyticsData> {
  return loadJson<OperatorAnalyticsData>("operators/index.json");
}

export function fetchOperatorDetail(
  operatorId: string,
): Promise<OperatorDetailData> {
  return loadJson<OperatorDetailData>(`operators/${operatorId}.json`);
}

import type { DashboardData, OperatorAnalyticsData, OperatorDetailData, SearchResponse, SourceMeta, WellDetail } from "../types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function requestJson<T>(path: string) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    throw new Error(`Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

export function fetchSourceMeta() {
  return requestJson<SourceMeta>("/api/meta/source");
}

export function fetchDashboard() {
  return requestJson<DashboardData>("/api/dashboard");
}

export function fetchWellGeoJson() {
  return requestJson<GeoJSON.FeatureCollection<GeoJSON.Point>>("/api/wells/geo");
}

export function fetchWellSearch(filters: Record<string, string | number | undefined>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const suffix = params.toString() ? `?${params.toString()}` : "";
  return requestJson<SearchResponse>(`/api/wells${suffix}`);
}

export function fetchWellDetail(waNum: string) {
  return requestJson<WellDetail>(`/api/wells/${waNum}`);
}

export function fetchOperatorAnalytics() {
  return requestJson<OperatorAnalyticsData>("/api/operators");
}

export function fetchOperatorDetail(operatorId: string) {
  return requestJson<OperatorDetailData>(`/api/operators/${operatorId}`);
}

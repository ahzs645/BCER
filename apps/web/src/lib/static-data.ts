import type {
  SearchResponse,
  SortOption,
  WellDetail,
  WellSearchResult,
} from "../types";

const BASE = `${import.meta.env.BASE_URL}data`;

// ---- Caches ----
let searchIndex: WellSearchResult[] | null = null;
let searchIndexPromise: Promise<WellSearchResult[]> | null = null;

interface DetailManifest {
  batches: Array<{ index: number; minWa: number; maxWa: number }>;
}
let detailManifest: DetailManifest | null = null;
const detailBatchCache = new Map<number, Record<string, WellDetail>>();

// ---- JSON loader ----
async function loadJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

export { loadJson };

// ---- Search index ----
export function getSearchIndexProgress(): {
  loaded: boolean;
  count: number;
} {
  return { loaded: searchIndex !== null, count: searchIndex?.length ?? 0 };
}

export async function loadSearchIndex(): Promise<WellSearchResult[]> {
  if (searchIndex) return searchIndex;
  if (searchIndexPromise) return searchIndexPromise;

  searchIndexPromise = loadJson<WellSearchResult[]>("wells/search.json").then(
    (data) => {
      searchIndex = data;
      return data;
    },
  );

  return searchIndexPromise;
}

// ---- Client-side search / filter / sort / paginate ----
function parseNum(v: string | number | undefined): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export function clientSearch(
  allWells: WellSearchResult[],
  filters: Record<string, string | number | undefined>,
): SearchResponse {
  let results = allWells;

  // --- WA number filters ---
  const waNum = parseNum(filters.waNum);
  if (waNum !== undefined) {
    results = results.filter((w) => w.waNum === waNum);
  }
  const waNumFrom = parseNum(filters.waNumFrom);
  if (waNumFrom !== undefined) {
    results = results.filter((w) => w.waNum >= waNumFrom);
  }
  const waNumTo = parseNum(filters.waNumTo);
  if (waNumTo !== undefined) {
    results = results.filter((w) => w.waNum <= waNumTo);
  }

  // --- Text filters ---
  if (filters.wellName && typeof filters.wellName === "string") {
    const term = filters.wellName.toLowerCase();
    results = results.filter((w) =>
      w.wellName?.toLowerCase().includes(term),
    );
  }

  if (filters.operator && typeof filters.operator === "string") {
    const term = filters.operator.toLowerCase();
    const opId = parseNum(filters.operator);
    results = results.filter(
      (w) =>
        w.operator?.toLowerCase().includes(term) ||
        w.operatorAbbr?.toLowerCase().includes(term) ||
        (opId !== undefined && w.operatorId === opId),
    );
  }

  if (filters.uwi && typeof filters.uwi === "string") {
    const term = filters.uwi.toLowerCase();
    results = results.filter((w) =>
      w.uwiList.some((u) => u.toLowerCase().includes(term)),
    );
  }

  if (filters.area && typeof filters.area === "string") {
    const term = filters.area.toLowerCase();
    const exact = filters.area;
    results = results.filter(
      (w) =>
        w.areaDesc?.toLowerCase().includes(term) ||
        String(w.areaCode) === exact,
    );
  }

  if (filters.formation && typeof filters.formation === "string") {
    const term = filters.formation.toLowerCase();
    const exact = filters.formation;
    results = results.filter(
      (w) =>
        w.formDesc?.toLowerCase().includes(term) ||
        String(w.formCode) === exact,
    );
  }

  // --- Date filters ---
  const spudFrom = parseNum(filters.spudFrom);
  if (spudFrom !== undefined) {
    results = results.filter(
      (w) => w.spudMon !== null && w.spudMon >= spudFrom,
    );
  }
  const spudTo = parseNum(filters.spudTo);
  if (spudTo !== undefined) {
    results = results.filter(
      (w) => w.spudMon !== null && w.spudMon <= spudTo,
    );
  }
  const rigRelFrom = parseNum(filters.rigRelFrom);
  if (rigRelFrom !== undefined) {
    results = results.filter(
      (w) => w.rigRelMon !== null && w.rigRelMon >= rigRelFrom,
    );
  }
  const rigRelTo = parseNum(filters.rigRelTo);
  if (rigRelTo !== undefined) {
    results = results.filter(
      (w) => w.rigRelMon !== null && w.rigRelMon <= rigRelTo,
    );
  }
  const firstProdFrom = parseNum(filters.firstProdFrom);
  if (firstProdFrom !== undefined) {
    results = results.filter(
      (w) => w.firstProdMon !== null && w.firstProdMon >= firstProdFrom,
    );
  }
  const firstProdTo = parseNum(filters.firstProdTo);
  if (firstProdTo !== undefined) {
    results = results.filter(
      (w) => w.firstProdMon !== null && w.firstProdMon <= firstProdTo,
    );
  }

  // --- Orientation ---
  if (filters.orientation === "horizontal") {
    results = results.filter((w) => w.orientation === "HZ");
  } else if (filters.orientation === "vertical") {
    results = results.filter((w) => !w.orientation || w.orientation !== "HZ");
  }

  // --- Lat/Lon ---
  const latMin = parseNum(filters.latMin);
  if (latMin !== undefined) {
    results = results.filter(
      (w) => w.surfLat !== null && w.surfLat >= latMin,
    );
  }
  const latMax = parseNum(filters.latMax);
  if (latMax !== undefined) {
    results = results.filter(
      (w) => w.surfLat !== null && w.surfLat <= latMax,
    );
  }
  const lonMin = parseNum(filters.lonMin);
  if (lonMin !== undefined) {
    results = results.filter(
      (w) => w.surfLon !== null && w.surfLon >= lonMin,
    );
  }
  const lonMax = parseNum(filters.lonMax);
  if (lonMax !== undefined) {
    results = results.filter(
      (w) => w.surfLon !== null && w.surfLon <= lonMax,
    );
  }

  // --- Sort ---
  const sort = (filters.sort as SortOption) ?? "high3YrProd";
  const sorted = [...results];
  switch (sort) {
    case "high5YrProd":
      sorted.sort((a, b) => b.gasProd5Yr - a.gasProd5Yr || b.waNum - a.waNum);
      break;
    case "highestWa":
      sorted.sort((a, b) => b.waNum - a.waNum);
      break;
    case "lowestWa":
      sorted.sort((a, b) => a.waNum - b.waNum);
      break;
    case "high3YrProd":
    default:
      sorted.sort((a, b) => b.gasProd3Yr - a.gasProd3Yr || b.waNum - a.waNum);
      break;
  }

  // --- Paginate ---
  const page = Math.max(Number(filters.page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(filters.pageSize) || 25, 1), 100);
  const total = sorted.length;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  const start = (page - 1) * pageSize;
  const items = sorted.slice(start, start + pageSize);

  return { items, total, page, pageSize, totalPages };
}

// ---- GeoJSON from search data ----
export function generateGeoJson(
  wells: WellSearchResult[],
): GeoJSON.FeatureCollection<GeoJSON.Point> {
  const features = wells
    .filter((w) => w.surfLat !== null && w.surfLon !== null)
    .map((w) => ({
      type: "Feature" as const,
      geometry: {
        type: "Point" as const,
        coordinates: [w.surfLon!, w.surfLat!],
      },
      properties: {
        waNum: w.waNum,
        wellName: w.wellName,
        operator: w.operator,
        areaDesc: w.areaDesc,
        formDesc: w.formDesc,
        orientation: w.orientation,
        gasProd3Yr: w.gasProd3Yr,
        spudMon: w.spudMon,
        firstProdMon: w.firstProdMon,
      },
    }));

  return { type: "FeatureCollection", features };
}

// ---- Well detail (from batched files) ----
async function loadManifest(): Promise<DetailManifest> {
  if (!detailManifest) {
    detailManifest = await loadJson<DetailManifest>(
      "wells/detail/manifest.json",
    );
  }
  return detailManifest;
}

export async function loadWellDetail(
  waNum: number,
): Promise<WellDetail | null> {
  const manifest = await loadManifest();

  const batch = manifest.batches.find(
    (b) => waNum >= b.minWa && waNum <= b.maxWa,
  );
  if (!batch) return null;

  if (!detailBatchCache.has(batch.index)) {
    const data = await loadJson<Record<string, WellDetail>>(
      `wells/detail/batch-${batch.index}.json`,
    );
    detailBatchCache.set(batch.index, data);
  }

  return detailBatchCache.get(batch.index)![String(waNum)] ?? null;
}

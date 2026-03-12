import type { DatabaseSync } from "node:sqlite";
import type {
  ActivityLocationRow,
  CalendarYearPoint,
  DashboardData,
  FiscalYearPoint,
  GasAnalysisRow,
  OperatorAnalyticsData,
  OperatorDetailData,
  OperatorSummary,
  OverviewRecord,
  SearchResponse,
  SourceMeta,
  SortOption,
  WellDetail,
  WellSearchFilters,
  WellSearchResult,
} from "../../../packages/shared/src/index.js";

const GAS_M3_TO_MCF = 35.3147;
const GAS_M3_TO_KMCF = 0.0353147;
const LIQUID_M3_TO_BBL = 6.28981;

type RowRecord = Record<string, string | number | null>;
type SqlValue = string | number | bigint | Uint8Array | null;
type SqlParams = Record<string, SqlValue>;

function toPlainObject(row: object | undefined | null): RowRecord | null {
  if (!row) {
    return null;
  }

  return { ...(row as RowRecord) };
}

function toPlainArray(rows: object[]): RowRecord[] {
  return rows.map((row) => ({ ...(row as RowRecord) }));
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toStringValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  return String(value);
}

function splitUwis(value: unknown): string[] {
  return toStringValue(value)
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

function toMcf(value: number | null) {
  return value === null ? null : Number((value * GAS_M3_TO_MCF).toFixed(3));
}

function toKmcf(value: number | null) {
  return value === null ? null : Number((value * GAS_M3_TO_KMCF).toFixed(3));
}

function toBbl(value: number | null) {
  return value === null ? null : Number((value * LIQUID_M3_TO_BBL).toFixed(3));
}

function monthLabel(firstProdPeriod: number | null, offset: number) {
  if (!firstProdPeriod) {
    return `Month ${offset + 1}`;
  }

  const year = Math.floor(firstProdPeriod / 100);
  const monthIndex = (firstProdPeriod % 100) - 1 + offset;
  const nextYear = year + Math.floor(monthIndex / 12);
  const nextMonth = (monthIndex % 12) + 1;
  return `${nextYear}-${String(nextMonth).padStart(2, "0")}`;
}

function fiscalYearLabel(columnName: string) {
  return columnName.replace(/^.*?(\d{4})$/, "FYE$1");
}

function calendarYearLabel(firstProdPeriod: number | null, offset: number) {
  if (!firstProdPeriod) {
    return `Year ${offset + 1}`;
  }

  const year = Math.floor(firstProdPeriod / 100);
  return String(year + offset);
}

function sumColumn(rows: RowRecord[], column: string) {
  return rows.reduce<number | null>((total, row) => {
    const value = toNumber(row[column]);
    if (value === null) {
      return total;
    }

    return (total ?? 0) + value;
  }, null);
}

function normalizeOrientation(value: unknown) {
  const normalized = toStringValue(value)?.toUpperCase() ?? null;
  if (!normalized || normalized === "-") {
    return null;
  }

  return normalized;
}

function maxColumn(rows: RowRecord[], column: string) {
  return rows.reduce<number | null>((currentMax, row) => {
    const value = toNumber(row[column]);
    if (value === null) {
      return currentMax;
    }

    if (currentMax === null) {
      return value;
    }

    return Math.max(currentMax, value);
  }, null);
}

function firstString(rows: RowRecord[], column: string) {
  for (const row of rows) {
    const value = toStringValue(row[column]);
    if (value) {
      return value;
    }
  }

  return null;
}

function buildDescriptionMap(rows: RowRecord[]) {
  const descriptions = new Map<number, string>();

  for (const row of rows) {
    const code = toNumber(row.code);
    const description = toStringValue(row.description);
    if (code !== null && description) {
      descriptions.set(code, description);
    }
  }

  return descriptions;
}

function getCalendarIndexes(prdRow: RowRecord | null, advRows: RowRecord[]) {
  const indexes = new Set<number>();

  for (const row of [prdRow, ...advRows]) {
    if (!row) {
      continue;
    }

    for (const key of Object.keys(row)) {
      const match = key.match(/^(?:yprd|yadv)_(\d{2})$/);
      if (match) {
        indexes.add(Number.parseInt(match[1], 10));
      }
    }
  }

  return Array.from(indexes).sort((left, right) => left - right);
}

function getFiscalYears(prdRow: RowRecord | null, advRows: RowRecord[]) {
  const years = new Set<number>();

  for (const row of [prdRow, ...advRows]) {
    if (!row) {
      continue;
    }

    for (const key of Object.keys(row)) {
      const match = key.match(/^(?:prd|oil|cnd|adv)_fye(\d{4})$/);
      if (match) {
        years.add(Number.parseInt(match[1], 10));
      }
    }
  }

  return Array.from(years).sort((left, right) => left - right);
}

function mapSearchResult(row: RowRecord): WellSearchResult {
  return {
    waNum: toNumber(row.wa_num) ?? 0,
    wellName: toStringValue(row.well_name),
    operator: toStringValue(row.operator),
    operatorId: toNumber(row.operator_id),
    operatorAbbr: toStringValue(row.operator_abbr),
    uwiList: splitUwis(row.uwi_list),
    areaCode: toNumber(row.area_code),
    areaDesc: toStringValue(row.area_desc),
    formCode: toNumber(row.form_code),
    formDesc: toStringValue(row.form_desc),
    spudMon: toNumber(row.spud_mon),
    rigRelMon: toNumber(row.rig_rel_mon),
    firstProdMon: toNumber(row.first_prod_mon),
    orientation: normalizeOrientation(row.orientation),
    surfLat: toNumber(row.surf_lat),
    surfLon: toNumber(row.surf_lon),
    gasProd3Yr: toNumber(row.gas_prod_3yr) ?? 0,
    gasProd5Yr: toNumber(row.gas_prod_5yr) ?? 0,
  };
}

function mapOverview(row: RowRecord): OverviewRecord {
  return {
    waNum: toNumber(row.wa_num) ?? 0,
    wellName: toStringValue(row.well_name),
    operator: toStringValue(row.operator),
    operatorId: toNumber(row.operator_id),
    operatorAbbr: toStringValue(row.operator_abbr),
    uwiList: splitUwis(row.uwi_list),
    areaCode: toNumber(row.area_code),
    areaDesc: toStringValue(row.area_desc),
    formCode: toNumber(row.form_code),
    formDesc: toStringValue(row.form_desc),
    spudMon: toNumber(row.spud_mon),
    rigRelMon: toNumber(row.rig_rel_mon),
    firstProdMon: toNumber(row.first_prod_mon),
    orientation: normalizeOrientation(row.orientation),
    surfLat: toNumber(row.surf_lat),
    surfLon: toNumber(row.surf_lon),
    grid: toStringValue(row.grid),
    gasProd3Yr: toNumber(row.gas_prod_3yr) ?? 0,
    gasProd5Yr: toNumber(row.gas_prod_5yr) ?? 0,
    firstProdPeriod: toNumber(row.first_prod_period),
    totalMDepth: toNumber(row.total_m_depth),
    maxTvDepth: toNumber(row.max_tv_depth),
    wellClassification: toStringValue(row.well_classification),
  };
}

function buildProductionSeries(prdRow: RowRecord | null, advRows: RowRecord[]) {
  const firstProdPeriod = toNumber(prdRow?.first_prod_period ?? null);

  return Array.from({ length: 60 }, (_, index) => {
    const suffix = String(index + 1).padStart(3, "0");
    const gasVolumeKm3 = toNumber(prdRow?.[`mprd_${suffix}`] ?? null);
    const avgDailyKm3 = sumColumn(advRows, `madv_${suffix}`);

    return {
      periodLabel: monthLabel(firstProdPeriod, index),
      periodIndex: index + 1,
      gasVolumeKm3,
      gasVolumeMcf: toMcf(gasVolumeKm3),
      gasVolumeKmcf: toKmcf(gasVolumeKm3),
      avgDailyKm3,
      avgDailyMcf: toMcf(avgDailyKm3),
      avgDailyKmcf: toKmcf(avgDailyKm3),
    };
  });
}

function buildFiscalYearSeries(prdRow: RowRecord | null, advRows: RowRecord[]): FiscalYearPoint[] {
  return getFiscalYears(prdRow, advRows).map((year) => {
    const gasKm3 = toNumber(prdRow?.[`prd_fye${year}`] ?? null);
    const oilM3 = toNumber(prdRow?.[`oil_fye${year}`] ?? null);
    const condensateM3 = toNumber(prdRow?.[`cnd_fye${year}`] ?? null);
    const avgDailyKm3 = sumColumn(advRows, `adv_fye${year}`);

    return {
      fiscalYear: fiscalYearLabel(`FYE${year}`),
      gasKm3,
      gasMcf: toMcf(gasKm3),
      gasKmcf: toKmcf(gasKm3),
      oilM3,
      oilBbl: toBbl(oilM3),
      condensateM3,
      condensateBbl: toBbl(condensateM3),
      avgDailyKm3,
      avgDailyMcf: toMcf(avgDailyKm3),
      avgDailyKmcf: toKmcf(avgDailyKm3),
    };
  });
}

function buildCalendarYearSeries(prdRow: RowRecord | null, advRows: RowRecord[]): CalendarYearPoint[] {
  const firstProdPeriod = toNumber(prdRow?.first_prod_period ?? null);

  return getCalendarIndexes(prdRow, advRows).map((index) => {
    const suffix = String(index).padStart(2, "0");
    const gasKm3 = toNumber(prdRow?.[`yprd_${suffix}`] ?? null);
    const avgDailyKm3 = sumColumn(advRows, `yadv_${suffix}`);

    return {
      calendarYear: calendarYearLabel(firstProdPeriod, index - 1),
      gasKm3,
      gasMcf: toMcf(gasKm3),
      gasKmcf: toKmcf(gasKm3),
      avgDailyKm3,
      avgDailyMcf: toMcf(avgDailyKm3),
      avgDailyKmcf: toKmcf(avgDailyKm3),
    };
  });
}

function buildActivityLocations(
  advRows: RowRecord[],
  overview: Pick<OverviewRecord, "areaCode" | "areaDesc" | "formCode" | "formDesc">,
  areaDescriptions: Map<number, string>,
  formationDescriptions: Map<number, string>,
): ActivityLocationRow[] {
  const seen = new Set<string>();
  const locations: ActivityLocationRow[] = [];

  for (const row of advRows) {
    const uwi = toStringValue(row.uwi);
    const uwiOrder = toNumber(row.uwi_order);
    const key = `${uwiOrder ?? ""}:${uwi ?? ""}`;
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);

    const areaCode = toNumber(row.area_code);
    const formCode = toNumber(row.formtn_code);
    locations.push({
      uwi,
      uwiOrder,
      areaCode,
      areaDesc:
        (areaCode === null ? null : areaDescriptions.get(areaCode)) ??
        (areaCode === overview.areaCode ? overview.areaDesc : null),
      formCode,
      formDesc:
        (formCode === null ? null : formationDescriptions.get(formCode)) ??
        (formCode === overview.formCode ? overview.formDesc : null),
    });
  }

  return locations;
}

function mapGasAnalysisRow(row: RowRecord): GasAnalysisRow {
  const c6ToC10 =
    (toNumber(row.c6_fractn) ?? 0) +
    (toNumber(row.c7_fractn) ?? 0) +
    (toNumber(row.c8_fractn) ?? 0) +
    (toNumber(row.c9_fractn) ?? 0) +
    (toNumber(row.c10_fractn) ?? 0);

  return {
    sampleDate: toNumber(row.sample_date),
    sampleOrder: toNumber(row.sample_order),
    h2Fractn: toNumber(row.h2_fractn),
    heliumFractn: toNumber(row.helium_fractn),
    co2Fractn: toNumber(row.co2_fractn),
    h2sFractn: toNumber(row.h2s_fractn),
    n2Fractn: toNumber(row.n2_fractn),
    c1Fractn: toNumber(row.c1_fractn),
    c2Fractn: toNumber(row.c2_fractn),
    c3Fractn: toNumber(row.c3_fractn),
    ic4Fractn: toNumber(row.ic4_fractn),
    nc4Fractn: toNumber(row.nc4_fractn),
    ic5Fractn: toNumber(row.ic5_fractn),
    nc5Fractn: toNumber(row.nc5_fractn),
    c6ToC10Fractn: Number(c6ToC10.toFixed(6)),
  };
}

function queryRows(db: DatabaseSync, sql: string, params: SqlParams) {
  return toPlainArray(db.prepare(sql).all(params) as object[]);
}

function queryRow(db: DatabaseSync, sql: string, params: SqlParams) {
  return toPlainObject(db.prepare(sql).get(params) as object | undefined);
}

function getSortClause(sort: SortOption) {
  switch (sort) {
    case "high5YrProd":
      return "gas_prod_5yr DESC, wa_num DESC";
    case "highestWa":
      return "wa_num DESC";
    case "lowestWa":
      return "wa_num ASC";
    case "high3YrProd":
    default:
      return "gas_prod_3yr DESC, wa_num DESC";
  }
}

function parseIntOrUndefined(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseFloatOrUndefined(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function normalizeSearchFilters(query: Record<string, unknown>): Required<Pick<WellSearchFilters, "page" | "pageSize" | "sort">> & WellSearchFilters {
  const sortValues: SortOption[] = ["high3YrProd", "high5YrProd", "highestWa", "lowestWa"];
  const requestedSort = typeof query.sort === "string" && sortValues.includes(query.sort as SortOption)
    ? (query.sort as SortOption)
    : "high3YrProd";

  const requestedOrientation = typeof query.orientation === "string" ? query.orientation : "all";
  const orientation = requestedOrientation === "horizontal" || requestedOrientation === "vertical"
    ? requestedOrientation
    : "all";

  return {
    waNum: typeof query.waNum === "string" ? query.waNum.trim() : undefined,
    waNumFrom: typeof query.waNumFrom === "string" ? query.waNumFrom.trim() : undefined,
    waNumTo: typeof query.waNumTo === "string" ? query.waNumTo.trim() : undefined,
    wellName: typeof query.wellName === "string" ? query.wellName.trim() : undefined,
    operator: typeof query.operator === "string" ? query.operator.trim() : undefined,
    uwi: typeof query.uwi === "string" ? query.uwi.trim() : undefined,
    area: typeof query.area === "string" ? query.area.trim() : undefined,
    formation: typeof query.formation === "string" ? query.formation.trim() : undefined,
    spudFrom: typeof query.spudFrom === "string" ? query.spudFrom.trim() : undefined,
    spudTo: typeof query.spudTo === "string" ? query.spudTo.trim() : undefined,
    rigRelFrom: typeof query.rigRelFrom === "string" ? query.rigRelFrom.trim() : undefined,
    rigRelTo: typeof query.rigRelTo === "string" ? query.rigRelTo.trim() : undefined,
    firstProdFrom: typeof query.firstProdFrom === "string" ? query.firstProdFrom.trim() : undefined,
    firstProdTo: typeof query.firstProdTo === "string" ? query.firstProdTo.trim() : undefined,
    orientation,
    latMin: typeof query.latMin === "string" ? query.latMin.trim() : undefined,
    latMax: typeof query.latMax === "string" ? query.latMax.trim() : undefined,
    lonMin: typeof query.lonMin === "string" ? query.lonMin.trim() : undefined,
    lonMax: typeof query.lonMax === "string" ? query.lonMax.trim() : undefined,
    sort: requestedSort,
    page: Math.max(parseIntOrUndefined(typeof query.page === "string" ? query.page : undefined) ?? 1, 1),
    pageSize: Math.min(Math.max(parseIntOrUndefined(typeof query.pageSize === "string" ? query.pageSize : undefined) ?? 25, 1), 100),
  };
}

export function getSourceMeta(db: DatabaseSync): SourceMeta {
  const rows = queryRows(db, "SELECT key, value FROM metadata", {});
  const metadata = new Map(rows.map((row) => [String(row.key), String(row.value)]));

  return {
    authorName: metadata.get("author_name") ?? "",
    authorEmail: metadata.get("author_email") ?? "",
    sourceAgency: metadata.get("source_agency") ?? "",
    sourceWebsite: metadata.get("source_website") ?? "",
    dataCurrentTo: metadata.get("data_current_to") ?? "",
    importTimestamp: metadata.get("import_timestamp") ?? "",
    aboutParagraphs: JSON.parse(metadata.get("about_paragraphs") ?? "[]") as string[],
  };
}

export function searchWells(db: DatabaseSync, rawQuery: Record<string, unknown>): SearchResponse {
  const filters = normalizeSearchFilters(rawQuery);
  const requestedWaNum = parseIntOrUndefined(filters.waNum);

  if (requestedWaNum !== undefined) {
    const offset = (filters.page - 1) * filters.pageSize;
    const params = {
      waNum: requestedWaNum,
      limit: filters.pageSize,
      offset,
    };
    const totalRow = queryRow(db, "SELECT COUNT(*) AS total FROM well_search WHERE wa_num = :waNum", { waNum: requestedWaNum });
    const total = toNumber(totalRow?.total) ?? 0;
    const items = queryRows(
      db,
      `
        SELECT *
        FROM well_search
        WHERE wa_num = :waNum
        ORDER BY wa_num DESC
        LIMIT :limit OFFSET :offset
      `,
      params,
    ).map(mapSearchResult);

    return {
      items,
      total,
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.max(Math.ceil(total / filters.pageSize), 1),
    };
  }

  const clauses: string[] = [];
  const params: SqlParams = {};

  if (filters.waNumFrom) {
    const waNumFrom = parseIntOrUndefined(filters.waNumFrom);
    if (waNumFrom !== undefined) {
      clauses.push("wa_num >= :waNumFrom");
      params.waNumFrom = waNumFrom;
    }
  }

  if (filters.waNumTo) {
    const waNumTo = parseIntOrUndefined(filters.waNumTo);
    if (waNumTo !== undefined) {
      clauses.push("wa_num <= :waNumTo");
      params.waNumTo = waNumTo;
    }
  }

  if (filters.wellName) {
    clauses.push("LOWER(COALESCE(well_name, '')) LIKE :wellName");
    params.wellName = `%${filters.wellName.toLowerCase()}%`;
  }

  if (filters.operator) {
    const operatorClauses = [
      "LOWER(COALESCE(operator, '')) LIKE :operatorLike",
      "LOWER(COALESCE(operator_abbr, '')) LIKE :operatorLike",
    ];
    params.operatorLike = `%${filters.operator.toLowerCase()}%`;

    const operatorId = parseIntOrUndefined(filters.operator);
    if (operatorId !== undefined) {
      operatorClauses.push("operator_id = :operatorId");
      params.operatorId = operatorId;
    }

    clauses.push(`(${operatorClauses.join(" OR ")})`);
  }

  if (filters.uwi) {
    clauses.push("LOWER(COALESCE(uwi_list, '')) LIKE :uwi");
    params.uwi = `%${filters.uwi.toLowerCase()}%`;
  }

  if (filters.area) {
    clauses.push("(LOWER(COALESCE(area_desc, '')) LIKE :areaLike OR CAST(area_code AS TEXT) = :areaExact)");
    params.areaLike = `%${filters.area.toLowerCase()}%`;
    params.areaExact = filters.area;
  }

  if (filters.formation) {
    clauses.push("(LOWER(COALESCE(form_desc, '')) LIKE :formationLike OR CAST(form_code AS TEXT) = :formationExact)");
    params.formationLike = `%${filters.formation.toLowerCase()}%`;
    params.formationExact = filters.formation;
  }

  if (filters.spudFrom) {
    const spudFrom = parseIntOrUndefined(filters.spudFrom);
    if (spudFrom !== undefined) {
      clauses.push("spud_mon >= :spudFrom");
      params.spudFrom = spudFrom;
    }
  }

  if (filters.spudTo) {
    const spudTo = parseIntOrUndefined(filters.spudTo);
    if (spudTo !== undefined) {
      clauses.push("spud_mon <= :spudTo");
      params.spudTo = spudTo;
    }
  }

  if (filters.rigRelFrom) {
    const rigRelFrom = parseIntOrUndefined(filters.rigRelFrom);
    if (rigRelFrom !== undefined) {
      clauses.push("rig_rel_mon >= :rigRelFrom");
      params.rigRelFrom = rigRelFrom;
    }
  }

  if (filters.rigRelTo) {
    const rigRelTo = parseIntOrUndefined(filters.rigRelTo);
    if (rigRelTo !== undefined) {
      clauses.push("rig_rel_mon <= :rigRelTo");
      params.rigRelTo = rigRelTo;
    }
  }

  if (filters.firstProdFrom) {
    const firstProdFrom = parseIntOrUndefined(filters.firstProdFrom);
    if (firstProdFrom !== undefined) {
      clauses.push("first_prod_mon >= :firstProdFrom");
      params.firstProdFrom = firstProdFrom;
    }
  }

  if (filters.firstProdTo) {
    const firstProdTo = parseIntOrUndefined(filters.firstProdTo);
    if (firstProdTo !== undefined) {
      clauses.push("first_prod_mon <= :firstProdTo");
      params.firstProdTo = firstProdTo;
    }
  }

  if (filters.orientation === "horizontal") {
    clauses.push("UPPER(COALESCE(orientation, '')) = 'HZ'");
  }

  if (filters.orientation === "vertical") {
    clauses.push("(orientation IS NULL OR UPPER(COALESCE(orientation, '')) <> 'HZ')");
  }

  if (filters.latMin) {
    const latMin = parseFloatOrUndefined(filters.latMin);
    if (latMin !== undefined) {
      clauses.push("surf_lat >= :latMin");
      params.latMin = latMin;
    }
  }

  if (filters.latMax) {
    const latMax = parseFloatOrUndefined(filters.latMax);
    if (latMax !== undefined) {
      clauses.push("surf_lat <= :latMax");
      params.latMax = latMax;
    }
  }

  if (filters.lonMin) {
    const lonMin = parseFloatOrUndefined(filters.lonMin);
    if (lonMin !== undefined) {
      clauses.push("surf_lon >= :lonMin");
      params.lonMin = lonMin;
    }
  }

  if (filters.lonMax) {
    const lonMax = parseFloatOrUndefined(filters.lonMax);
    if (lonMax !== undefined) {
      clauses.push("surf_lon <= :lonMax");
      params.lonMax = lonMax;
    }
  }

  const whereSql = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const sortSql = getSortClause(filters.sort);
  const offset = (filters.page - 1) * filters.pageSize;

  const totalRow = queryRow(db, `SELECT COUNT(*) AS total FROM well_search ${whereSql}`, params);
  const total = toNumber(totalRow?.total) ?? 0;

  const items = queryRows(
    db,
    `
      SELECT *
      FROM well_search
      ${whereSql}
      ORDER BY ${sortSql}
      LIMIT :limit OFFSET :offset
    `,
    {
      ...params,
      limit: filters.pageSize,
      offset,
    },
  ).map(mapSearchResult);

  return {
    items,
    total,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(Math.ceil(total / filters.pageSize), 1),
  };
}

export function getWellGeoJson(db: DatabaseSync) {
  const rows = queryRows(
    db,
    `SELECT wa_num, well_name, operator, area_desc, form_desc, orientation,
            surf_lat, surf_lon, gas_prod_3yr, spud_mon, first_prod_mon
     FROM well_search
     WHERE surf_lat IS NOT NULL AND surf_lon IS NOT NULL`,
    {},
  );

  const features = rows.map((row) => ({
    type: "Feature" as const,
    geometry: {
      type: "Point" as const,
      coordinates: [toNumber(row.surf_lon)!, toNumber(row.surf_lat)!],
    },
    properties: {
      waNum: toNumber(row.wa_num) ?? 0,
      wellName: toStringValue(row.well_name),
      operator: toStringValue(row.operator),
      areaDesc: toStringValue(row.area_desc),
      formDesc: toStringValue(row.form_desc),
      orientation: normalizeOrientation(row.orientation),
      gasProd3Yr: toNumber(row.gas_prod_3yr) ?? 0,
      spudMon: toNumber(row.spud_mon),
      firstProdMon: toNumber(row.first_prod_mon),
    },
  }));

  return {
    type: "FeatureCollection" as const,
    features,
  };
}

export function getDashboardData(db: DatabaseSync): DashboardData {
  const meta = getSourceMeta(db);

  const totalRow = queryRow(db, "SELECT COUNT(*) AS total FROM well_search", {});
  const totalWells = toNumber(totalRow?.total) ?? 0;

  const hzRow = queryRow(
    db,
    "SELECT COUNT(*) AS cnt FROM well_search WHERE UPPER(COALESCE(orientation, '')) = 'HZ'",
    {},
  );
  const totalHorizontal = toNumber(hzRow?.cnt) ?? 0;
  const totalVertical = totalWells - totalHorizontal;

  const topAreas = queryRows(
    db,
    "SELECT area_desc, COUNT(*) AS count FROM well_search WHERE area_desc IS NOT NULL GROUP BY area_desc ORDER BY count DESC LIMIT 10",
    {},
  ).map((row) => ({ areaDesc: String(row.area_desc), count: toNumber(row.count) ?? 0 }));

  const topFormations = queryRows(
    db,
    "SELECT form_desc, COUNT(*) AS count FROM well_search WHERE form_desc IS NOT NULL GROUP BY form_desc ORDER BY count DESC LIMIT 10",
    {},
  ).map((row) => ({ formDesc: String(row.form_desc), count: toNumber(row.count) ?? 0 }));

  const orientationBreakdown = queryRows(
    db,
    `SELECT
      CASE WHEN UPPER(COALESCE(orientation, '')) = 'HZ' THEN 'Horizontal' ELSE 'Vertical' END AS orientation,
      COUNT(*) AS count
    FROM well_search
    GROUP BY 1
    ORDER BY count DESC`,
    {},
  ).map((row) => ({ orientation: String(row.orientation), count: toNumber(row.count) ?? 0 }));

  const recentWells = queryRows(
    db,
    "SELECT * FROM well_search WHERE first_prod_mon IS NOT NULL ORDER BY first_prod_mon DESC LIMIT 5",
    {},
  ).map(mapSearchResult);

  const productionLeaders = queryRows(
    db,
    "SELECT * FROM well_search ORDER BY gas_prod_3yr DESC LIMIT 5",
    {},
  ).map(mapSearchResult);

  return {
    totalWells,
    totalHorizontal,
    totalVertical,
    dataCurrentTo: meta.dataCurrentTo,
    topAreas,
    topFormations,
    orientationBreakdown,
    recentWells,
    productionLeaders,
  };
}

function mapOperatorSummary(row: RowRecord): OperatorSummary {
  return {
    operator: String(row.operator ?? ""),
    operatorId: toNumber(row.operator_id) ?? 0,
    operatorAbbr: toStringValue(row.operator_abbr),
    wellCount: toNumber(row.well_count) ?? 0,
    horizontalCount: toNumber(row.horizontal_count) ?? 0,
    verticalCount: toNumber(row.vertical_count) ?? 0,
    totalGas3Yr: toNumber(row.total_gas_3yr) ?? 0,
    totalGas5Yr: toNumber(row.total_gas_5yr) ?? 0,
    topArea: toStringValue(row.top_area),
    topFormation: toStringValue(row.top_formation),
  };
}

const OPERATOR_SUMMARY_SQL = `
  SELECT
    w.operator,
    w.operator_id,
    w.operator_abbr,
    COUNT(*) AS well_count,
    SUM(CASE WHEN UPPER(COALESCE(w.orientation, '')) = 'HZ' THEN 1 ELSE 0 END) AS horizontal_count,
    SUM(CASE WHEN UPPER(COALESCE(w.orientation, '')) <> 'HZ' THEN 1 ELSE 0 END) AS vertical_count,
    COALESCE(SUM(w.gas_prod_3yr), 0) AS total_gas_3yr,
    COALESCE(SUM(w.gas_prod_5yr), 0) AS total_gas_5yr,
    (SELECT area_desc FROM well_search w2
     WHERE w2.operator_id = w.operator_id AND w2.area_desc IS NOT NULL
     GROUP BY area_desc ORDER BY COUNT(*) DESC LIMIT 1) AS top_area,
    (SELECT form_desc FROM well_search w2
     WHERE w2.operator_id = w.operator_id AND w2.form_desc IS NOT NULL
     GROUP BY form_desc ORDER BY COUNT(*) DESC LIMIT 1) AS top_formation
  FROM well_search w
  WHERE w.operator IS NOT NULL
  GROUP BY w.operator_id, w.operator, w.operator_abbr
`;

export function getOperatorAnalytics(db: DatabaseSync): OperatorAnalyticsData {
  const totalRow = queryRow(
    db,
    "SELECT COUNT(DISTINCT operator_id) AS total FROM well_search WHERE operator IS NOT NULL",
    {},
  );
  const totalOperators = toNumber(totalRow?.total) ?? 0;

  const topByWellCount = queryRows(
    db,
    `${OPERATOR_SUMMARY_SQL} ORDER BY well_count DESC LIMIT 25`,
    {},
  ).map(mapOperatorSummary);

  const topByProduction = queryRows(
    db,
    `${OPERATOR_SUMMARY_SQL} ORDER BY total_gas_3yr DESC LIMIT 25`,
    {},
  ).map(mapOperatorSummary);

  return { totalOperators, topByWellCount, topByProduction };
}

export function getOperatorDetail(db: DatabaseSync, operatorId: number): OperatorDetailData | null {
  const summaryRow = queryRow(
    db,
    `SELECT
       w.operator,
       w.operator_id,
       w.operator_abbr,
       COUNT(*) AS well_count,
       SUM(CASE WHEN UPPER(COALESCE(w.orientation, '')) = 'HZ' THEN 1 ELSE 0 END) AS horizontal_count,
       SUM(CASE WHEN UPPER(COALESCE(w.orientation, '')) <> 'HZ' THEN 1 ELSE 0 END) AS vertical_count,
       COALESCE(SUM(w.gas_prod_3yr), 0) AS total_gas_3yr,
       COALESCE(SUM(w.gas_prod_5yr), 0) AS total_gas_5yr,
       (SELECT area_desc FROM well_search
        WHERE operator_id = :operatorId AND area_desc IS NOT NULL
        GROUP BY area_desc ORDER BY COUNT(*) DESC LIMIT 1) AS top_area,
       (SELECT form_desc FROM well_search
        WHERE operator_id = :operatorId AND form_desc IS NOT NULL
        GROUP BY form_desc ORDER BY COUNT(*) DESC LIMIT 1) AS top_formation
     FROM well_search w
     WHERE w.operator_id = :operatorId
     GROUP BY w.operator_id`,
    { operatorId },
  );

  if (!summaryRow) return null;

  const summary = mapOperatorSummary(summaryRow);

  const wells = queryRows(
    db,
    "SELECT * FROM well_search WHERE operator_id = :operatorId ORDER BY gas_prod_3yr DESC",
    { operatorId },
  ).map(mapSearchResult);

  const areaBreakdown = queryRows(
    db,
    `SELECT area_desc, COUNT(*) AS count
     FROM well_search
     WHERE operator_id = :operatorId AND area_desc IS NOT NULL
     GROUP BY area_desc ORDER BY count DESC LIMIT 10`,
    { operatorId },
  ).map((r) => ({ areaDesc: String(r.area_desc), count: toNumber(r.count) ?? 0 }));

  const formationBreakdown = queryRows(
    db,
    `SELECT form_desc, COUNT(*) AS count
     FROM well_search
     WHERE operator_id = :operatorId AND form_desc IS NOT NULL
     GROUP BY form_desc ORDER BY count DESC LIMIT 10`,
    { operatorId },
  ).map((r) => ({ formDesc: String(r.form_desc), count: toNumber(r.count) ?? 0 }));

  const orientationBreakdown = queryRows(
    db,
    `SELECT
       CASE WHEN UPPER(COALESCE(orientation, '')) = 'HZ' THEN 'Horizontal' ELSE 'Vertical' END AS orientation,
       COUNT(*) AS count
     FROM well_search
     WHERE operator_id = :operatorId
     GROUP BY 1
     ORDER BY count DESC`,
    { operatorId },
  ).map((r) => ({ orientation: String(r.orientation), count: toNumber(r.count) ?? 0 }));

  return { summary, wells, areaBreakdown, formationBreakdown, orientationBreakdown };
}

export function getWellDetail(db: DatabaseSync, waNum: number): WellDetail | null {
  const overviewRow = queryRow(db, "SELECT * FROM well_search WHERE wa_num = :waNum", { waNum });
  if (!overviewRow) {
    return null;
  }

  const prdRow = queryRow(db, "SELECT * FROM prd_profile_gas WHERE wa_num = :waNum", { waNum });
  const advRows = queryRows(
    db,
    "SELECT * FROM adv_profile_gas WHERE wa_num = :waNum ORDER BY uwi_order ASC, uwi ASC",
    { waNum },
  );
  const directionalSurvey = queryRows(db, "SELECT * FROM dir_survey WHERE wa_num = :waNum", { waNum });
  const gasAnalysis = queryRows(
    db,
    "SELECT * FROM gas_analysis WHERE wa_num = :waNum ORDER BY sample_date DESC, sample_order ASC",
    { waNum },
  ).map(mapGasAnalysisRow);
  const drillingEvents = queryRows(
    db,
    "SELECT * FROM drill_events WHERE wa_num = :waNum ORDER BY spud_date DESC, rig_rel_date DESC",
    { waNum },
  );
  const areaDescriptions = buildDescriptionMap(queryRows(db, "SELECT code, description FROM area_codes", {}));
  const formationDescriptions = buildDescriptionMap(queryRows(db, "SELECT code, description FROM formation_codes", {}));
  const overview = {
    ...mapOverview(overviewRow),
    totalMDepth: maxColumn(directionalSurvey, "total_m_depth"),
    maxTvDepth: maxColumn(directionalSurvey, "max_tv_depth"),
    wellClassification: firstString(drillingEvents, "class"),
  };

  return {
    overview,
    activityLocations: buildActivityLocations(advRows, overview, areaDescriptions, formationDescriptions),
    productionSeries: buildProductionSeries(prdRow, advRows),
    calendarYearSeries: buildCalendarYearSeries(prdRow, advRows),
    fiscalYearSeries: buildFiscalYearSeries(prdRow, advRows),
    fracSummary: queryRows(db, "SELECT * FROM frac_summary WHERE wa_num = :waNum", { waNum }),
    fracDescriptions: queryRows(
      db,
      "SELECT * FROM frac_descriptions WHERE wa_num = :waNum ORDER BY compltn_order ASC, compltn_date DESC",
      { waNum },
    ),
    gasAnalysis,
    recentGasAnalysis: gasAnalysis.slice(0, 3),
    directionalSurvey,
    drillingEvents,
    casings: queryRows(
      db,
      "SELECT * FROM casing WHERE wa_num = :waNum ORDER BY position ASC, casing_date ASC",
      { waNum },
    ),
    payZones: queryRows(
      db,
      "SELECT * FROM pay_zone WHERE wa_num = :waNum ORDER BY position ASC, meas_top_pay_depth ASC",
      { waNum },
    ),
    abandonment: queryRows(
      db,
      'SELECT * FROM abandon WHERE wa_num = :waNum ORDER BY position ASC, plug_num ASC',
      { waNum },
    ),
  };
}

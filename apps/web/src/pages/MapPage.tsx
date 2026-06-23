import { useEffect, useMemo, useRef, useState } from "react";
import type { DataDrivenPropertyValueSpecification } from "maplibre-gl";
import { Link, useSearchParams } from "react-router-dom";
import { Filter, ExternalLink, Flame, Layers, MapPin, Database, Search, X } from "lucide-react";
import { Map, MapClusterLayer, MapControls, MapPopup, type MapRef } from "@/components/ui/map";
import { BC_CENTER, BC_DEFAULT_ZOOM } from "@/components/ui/map-styles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchAllWells } from "@/lib/api";
import { filterWells, generateGeoJson } from "@/lib/static-data";
import { formatNumber } from "@/lib/format";
import { useOnlineStatus } from "@/hooks/use-online-status";
import type { WellSearchResult } from "@/types";

// Query params shared with the Search page. Order here drives chip display order.
const MAP_FILTER_LABELS: Record<string, string> = {
  waNum: "WA #",
  waNumFrom: "WA ≥",
  waNumTo: "WA ≤",
  wellName: "Name",
  operator: "Operator",
  uwi: "UWI",
  area: "Area",
  formation: "Formation",
  spudFrom: "Spud ≥",
  spudTo: "Spud ≤",
  rigRelFrom: "Rig rel ≥",
  rigRelTo: "Rig rel ≤",
  firstProdFrom: "First prod ≥",
  firstProdTo: "First prod ≤",
  orientation: "Orientation",
  latMin: "Lat ≥",
  latMax: "Lat ≤",
  lonMin: "Lon ≥",
  lonMax: "Lon ≤",
};

function activeMapFilters(params: URLSearchParams): Array<{ key: string; label: string; value: string }> {
  return Object.keys(MAP_FILTER_LABELS).flatMap((key) => {
    const value = params.get(key);
    if (!value || (key === "orientation" && value === "all")) return [];
    return [{ key, label: MAP_FILTER_LABELS[key], value }];
  });
}

function buildMapFilters(params: URLSearchParams): Record<string, string> {
  const filters: Record<string, string> = {};
  for (const key of Object.keys(MAP_FILTER_LABELS)) {
    const value = params.get(key);
    if (value && !(key === "orientation" && value === "all")) filters[key] = value;
  }
  return filters;
}

interface WellProperties {
  waNum: number;
  wellName: string | null;
  operator: string | null;
  areaDesc: string | null;
  formDesc: string | null;
  orientation: string | null;
  gasProd3Yr: number;
  spudMon: number | null;
  firstProdMon: number | null;
}

interface MapFilters {
  hasWellData: boolean;
  hasProduction: boolean;
  hasAreaFormation: boolean;
  hasOperator: boolean;
}

type MapLayerMode = "production" | "operator" | "formation" | "firstProd" | "orientation";

function wellHasData(p: WellProperties): boolean {
  return (
    (p.gasProd3Yr > 0) ||
    (p.spudMon !== null) ||
    (p.firstProdMon !== null) ||
    (p.areaDesc !== null && p.formDesc !== null)
  );
}

function filterGeoData(
  data: GeoJSON.FeatureCollection<GeoJSON.Point, WellProperties>,
  filters: MapFilters,
): GeoJSON.FeatureCollection<GeoJSON.Point, WellProperties> {
  const filtered = data.features.filter((f) => {
    const p = f.properties;
    if (filters.hasWellData && !wellHasData(p)) return false;
    if (filters.hasProduction && (!p.gasProd3Yr || p.gasProd3Yr <= 0)) return false;
    if (filters.hasAreaFormation && !p.areaDesc && !p.formDesc) return false;
    if (filters.hasOperator && !p.operator) return false;
    return true;
  });
  return { type: "FeatureCollection", features: filtered };
}

function WellPopupContent({
  properties,
  onClose,
}: {
  properties: WellProperties;
  onClose: () => void;
}) {
  const p = properties;
  const hasLocation = p.areaDesc || p.formDesc;
  const hasGas = p.gasProd3Yr > 0;

  return (
    <div className="w-[min(240px,calc(100vw-3rem))]">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 pb-2">
        <div className="min-w-0">
          <Link
            to={`/wells/${p.waNum}`}
            className="text-sm font-bold text-primary hover:underline"
          >
            WA {p.waNum}
          </Link>
          {p.wellName && (
            <p className="mt-0.5 truncate text-xs font-medium text-foreground">
              {p.wellName}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mt-0.5 flex min-h-10 min-w-10 shrink-0 items-center justify-center rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground sm:min-h-6 sm:min-w-6"
          aria-label="Close"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3L3 9M3 3l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Details */}
      <div className="space-y-1.5 border-t border-border/40 pt-2">
        {p.operator && (
          <p className="truncate text-xs text-muted-foreground">{p.operator}</p>
        )}
        {hasLocation && (
          <div className="flex flex-wrap items-center gap-1">
            {p.areaDesc && (
              <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                {p.areaDesc}
              </Badge>
            )}
            {p.formDesc && (
              <Badge variant="secondary" className="text-[10px] font-normal px-1.5 py-0">
                {p.formDesc}
              </Badge>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 text-xs">
          {p.orientation && (
            <span className="text-muted-foreground">
              {p.orientation === "HORIZONTAL" ? "HZ" : p.orientation === "VERTICAL" ? "VT" : p.orientation}
            </span>
          )}
          {hasGas && (
            <>
              {p.orientation && <span className="text-border">·</span>}
              <span className="text-muted-foreground">3yr Gas</span>
              <span className="font-mono font-semibold text-foreground">
                {formatNumber(p.gasProd3Yr, 1)}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Action */}
      <div className="mt-2 border-t border-border/40 pt-2">
        <Link
          to={`/wells/${p.waNum}`}
          className="flex min-h-10 items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-2 text-xs font-medium text-primary transition-colors hover:bg-primary/20 sm:min-h-0 sm:py-1.5"
        >
          View detail
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}

function FilterPanel({
  filters,
  onChange,
  layerMode,
  onLayerModeChange,
  totalCount,
  filteredCount,
}: {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
  layerMode: MapLayerMode;
  onLayerModeChange: (mode: MapLayerMode) => void;
  totalCount: number;
  filteredCount: number;
}) {
  const [open, setOpen] = useState(false);
  const anyActive = filters.hasWellData || filters.hasProduction || filters.hasAreaFormation || filters.hasOperator;

  return (
    <div className="absolute left-3 top-3 z-10">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className={`gap-1.5 bg-background/90 backdrop-blur-sm border-border/60 shadow-md ${anyActive ? "border-primary/50 text-primary" : ""}`}
      >
        <Filter className="h-3.5 w-3.5" />
        Filters
        {anyActive && (
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            {filteredCount.toLocaleString()}
          </Badge>
        )}
      </Button>

      {open && (
        <Card className="mt-2 w-[min(280px,calc(100vw-1.5rem))] border-border/60 bg-background/95 backdrop-blur-sm shadow-lg">
          <CardContent className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Filter Wells</span>
              <span className="text-[10px] text-muted-foreground">
                {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2.5">
              <div className="space-y-1">
                <Label htmlFor="map-layer-mode" className="text-xs text-muted-foreground">Map layer</Label>
                <select
                  id="map-layer-mode"
                  value={layerMode}
                  onChange={(event) => onLayerModeChange(event.target.value as MapLayerMode)}
                  className="h-8 w-full rounded-md border border-input bg-muted/50 px-2 text-xs"
                >
                  <option value="production">3yr gas production</option>
                  <option value="operator">Operator groups</option>
                  <option value="formation">Formation groups</option>
                  <option value="firstProd">First production year</option>
                  <option value="orientation">Horizontal / vertical</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-data" className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                  <Database className="h-3.5 w-3.5 text-cyan-400" />
                  Has meaningful data
                </Label>
                <Switch
                  id="filter-data"
                  checked={filters.hasWellData}
                  onCheckedChange={(v) => onChange({ ...filters, hasWellData: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-prod" className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                  <Flame className="h-3.5 w-3.5 text-amber-400" />
                  Has production data
                </Label>
                <Switch
                  id="filter-prod"
                  checked={filters.hasProduction}
                  onCheckedChange={(v) => onChange({ ...filters, hasProduction: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-area" className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                  <Layers className="h-3.5 w-3.5 text-emerald-400" />
                  Has area or formation
                </Label>
                <Switch
                  id="filter-area"
                  checked={filters.hasAreaFormation}
                  onCheckedChange={(v) => onChange({ ...filters, hasAreaFormation: v })}
                />
              </div>

              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="filter-op" className="flex items-center gap-2 text-xs font-normal cursor-pointer">
                  <MapPin className="h-3.5 w-3.5 text-cyan-400" />
                  Has operator
                </Label>
                <Switch
                  id="filter-op"
                  checked={filters.hasOperator}
                  onCheckedChange={(v) => onChange({ ...filters, hasOperator: v })}
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground/70 leading-snug">
              "Has meaningful data" hides wells with no production, no spud date, no first production date, and incomplete area/formation info.
            </p>

            {anyActive && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground"
                onClick={() => onChange({ hasWellData: false, hasProduction: false, hasAreaFormation: false, hasOperator: false })}
              >
                Clear filters
              </Button>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function layerPaint(layerMode: MapLayerMode): {
  color: DataDrivenPropertyValueSpecification<string>;
  radius: DataDrivenPropertyValueSpecification<number>;
  legend: Array<{ label: string; color: string }>;
} {
  if (layerMode === "production") {
    return {
      color: [
        "step",
        ["coalesce", ["get", "gasProd3Yr"], 0],
        "#64748b",
        1,
        "#06b6d4",
        10000,
        "#10b981",
        100000,
        "#f59e0b",
        500000,
        "#ef4444",
      ],
      radius: [
        "interpolate",
        ["linear"],
        ["coalesce", ["get", "gasProd3Yr"], 0],
        0,
        4,
        100000,
        6,
        500000,
        9,
        1000000,
        12,
      ],
      legend: [
        { label: "No/low gas", color: "#64748b" },
        { label: "10k+", color: "#10b981" },
        { label: "100k+", color: "#f59e0b" },
        { label: "500k+", color: "#ef4444" },
      ],
    };
  }

  if (layerMode === "orientation") {
    return {
      color: ["case", ["==", ["get", "orientation"], "HZ"], "#10b981", "#06b6d4"],
      radius: 5,
      legend: [
        { label: "Horizontal", color: "#10b981" },
        { label: "Vertical/other", color: "#06b6d4" },
      ],
    };
  }

  if (layerMode === "firstProd") {
    return {
      color: [
        "step",
        ["/", ["coalesce", ["get", "firstProdMon"], 0], 100],
        "#64748b",
        2000,
        "#06b6d4",
        2010,
        "#10b981",
        2020,
        "#f59e0b",
        2025,
        "#ef4444",
      ],
      radius: 5,
      legend: [
        { label: "pre-2000/unknown", color: "#64748b" },
        { label: "2000s", color: "#06b6d4" },
        { label: "2010s", color: "#10b981" },
        { label: "2020+", color: "#f59e0b" },
      ],
    };
  }

  if (layerMode === "operator") {
    return {
      color: [
        "match",
        ["get", "operator"],
        "Canadian Natural Resources Limited",
        "#10b981",
        "Tourmaline Oil Corp.",
        "#06b6d4",
        "ARC Resources Ltd.",
        "#f59e0b",
        "Ovintiv Canada ULC",
        "#ef4444",
        "#8b5cf6",
      ],
      radius: 5,
      legend: [
        { label: "CNRL", color: "#10b981" },
        { label: "Tourmaline", color: "#06b6d4" },
        { label: "ARC", color: "#f59e0b" },
        { label: "Other", color: "#8b5cf6" },
      ],
    };
  }

  return {
    color: [
      "match",
      ["get", "formDesc"],
      "MONTNEY",
      "#10b981",
      "SLAVE POINT",
      "#06b6d4",
      "PARDONET-BALDONNEL",
      "#f59e0b",
      "BLUESKY",
      "#ef4444",
      "#8b5cf6",
    ],
    radius: 5,
    legend: [
      { label: "Montney", color: "#10b981" },
      { label: "Slave Point", color: "#06b6d4" },
      { label: "Pardonet", color: "#f59e0b" },
      { label: "Other", color: "#8b5cf6" },
    ],
  };
}

function LayerLegend({ items }: { items: Array<{ label: string; color: string }> }) {
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-md border border-border bg-background/90 p-2 shadow-sm backdrop-blur-sm">
      <div className="grid gap-1">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MapPage() {
  const mapRef = useRef<MapRef>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const [allWells, setAllWells] = useState<WellSearchResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWell, setSelectedWell] = useState<{
    coordinates: [number, number];
    properties: WellProperties;
  } | null>(null);
  const [filters, setFilters] = useState<MapFilters>({
    hasWellData: false,
    hasProduction: false,
    hasAreaFormation: false,
    hasOperator: false,
  });
  const [layerMode, setLayerMode] = useState<MapLayerMode>("production");

  const online = useOnlineStatus();
  const selectedWa = searchParams.get("well");
  const searchKey = searchParams.toString();

  // Filters inherited from the Search page (everything except the `well` selection).
  const queryFilters = useMemo(() => buildMapFilters(searchParams), [searchKey]);
  const chips = useMemo(() => activeMapFilters(searchParams), [searchKey]);

  // Grand total of mappable wells (those with coordinates), before any filtering.
  const mappableTotal = useMemo(
    () => (allWells ? allWells.reduce((n, w) => (w.surfLat !== null && w.surfLon !== null ? n + 1 : n), 0) : 0),
    [allWells],
  );

  // Wells matching the inherited search filters, as GeoJSON.
  const scopedGeo = useMemo(() => {
    if (!allWells) return null;
    return generateGeoJson(filterWells(allWells, queryFilters)) as GeoJSON.FeatureCollection<GeoJSON.Point, WellProperties>;
  }, [allWells, queryFilters]);

  // Then layer the map-only "data presence" toggles on top.
  const filteredData = useMemo(() => {
    if (!scopedGeo) return null;
    return filterGeoData(scopedGeo, filters);
  }, [scopedGeo, filters]);

  const paint = useMemo(() => layerPaint(layerMode), [layerMode]);

  useEffect(() => {
    fetchAllWells()
      .then(setAllWells)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load well data"))
      .finally(() => setLoading(false));
  }, []);

  function removeFilter(key: string) {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next, { replace: true });
  }

  function clearFilters() {
    const next = new URLSearchParams();
    const well = searchParams.get("well");
    if (well) next.set("well", well);
    setSearchParams(next, { replace: true });
  }

  // Restore a well selection from the URL (?well=WA) on load or when the param
  // changes externally, flying the map to the well and opening its popup. Looks up
  // the full well list so a deep-linked well opens even if filtered out of view.
  useEffect(() => {
    if (!allWells || !selectedWa) return;
    if (selectedWell && String(selectedWell.properties.waNum) === selectedWa) return;
    const wa = Number.parseInt(selectedWa, 10);
    const well = allWells.find((w) => w.waNum === wa);
    if (!well || well.surfLat === null || well.surfLon === null) return;
    const coordinates: [number, number] = [well.surfLon, well.surfLat];
    setSelectedWell({
      coordinates,
      properties: {
        waNum: well.waNum,
        wellName: well.wellName,
        operator: well.operator,
        areaDesc: well.areaDesc,
        formDesc: well.formDesc,
        orientation: well.orientation,
        gasProd3Yr: well.gasProd3Yr,
        spudMon: well.spudMon,
        firstProdMon: well.firstProdMon,
      },
    });
    mapRef.current?.easeTo({ center: coordinates, zoom: Math.max(mapRef.current.getZoom(), 9) });
  }, [allWells, selectedWa, selectedWell]);

  function handlePointClick(
    feature: GeoJSON.Feature<GeoJSON.Point, WellProperties>,
    coordinates: [number, number],
  ) {
    setSelectedWell({ coordinates, properties: feature.properties });
    const next = new URLSearchParams(searchParams);
    next.set("well", String(feature.properties.waNum));
    setSearchParams(next, { replace: true });
  }

  function clearSelection() {
    setSelectedWell(null);
    if (searchParams.has("well")) {
      const next = new URLSearchParams(searchParams);
      next.delete("well");
      setSearchParams(next, { replace: true });
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4 sm:min-h-[calc(100dvh-6rem)]">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="flex-1 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="p-6 text-center text-destructive">{error}</CardContent>
      </Card>
    );
  }

  return (
    <div className="flex min-h-[calc(100dvh-9rem)] flex-col gap-4 sm:min-h-[calc(100dvh-6rem)]">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">Well Map</h2>
            <p className="text-sm text-muted-foreground">
              {filteredData?.features.length.toLocaleString() ?? "—"} wells
              {filteredData && filteredData.features.length !== mappableTotal && (
                <span className="text-muted-foreground/60"> of {mappableTotal.toLocaleString()}</span>
              )}
            </p>
          </div>
        </div>
        {chips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Search className="h-3 w-3" /> From search:
            </span>
            {chips.map((chip) => (
              <Badge key={chip.key} variant="secondary" className="gap-1 pr-1 text-xs font-normal">
                <span className="text-muted-foreground">{chip.label}</span> {chip.value}
                <button
                  type="button"
                  onClick={() => removeFilter(chip.key)}
                  aria-label={`Remove ${chip.label} filter`}
                  className="ml-0.5 rounded-sm text-muted-foreground/70 transition-colors hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-muted-foreground">
              Clear
            </Button>
          </div>
        )}
        {!online && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            You're offline — well markers use cached data, but the map basemap may not load until you reconnect.
          </p>
        )}
      </div>

      <Card className="h-[calc(100dvh-13rem)] min-h-[520px] flex-1 overflow-hidden border-border/50 bg-card/80 py-0 backdrop-blur-sm">
        <div className="relative min-h-0 flex-1">
          <Map
            ref={mapRef}
            center={BC_CENTER}
            zoom={BC_DEFAULT_ZOOM}
          >
            <MapControls />

            <FilterPanel
              filters={filters}
              onChange={setFilters}
              layerMode={layerMode}
              onLayerModeChange={setLayerMode}
              totalCount={scopedGeo?.features.length ?? 0}
              filteredCount={filteredData?.features.length ?? 0}
            />
            <LayerLegend items={paint.legend} />

            {filteredData && (
              <MapClusterLayer<WellProperties>
                data={filteredData}
                clusterRadius={45}
                clusterMaxZoom={12}
                clusterColors={["#06b6d4", "#10b981", "#f59e0b"]}
                clusterThresholds={[200, 2000]}
                pointColor={paint.color}
                pointRadius={paint.radius}
                onPointClick={handlePointClick}
              />
            )}

            {selectedWell && (
              <MapPopup
                longitude={selectedWell.coordinates[0]}
                latitude={selectedWell.coordinates[1]}
                onClose={clearSelection}
              >
                <WellPopupContent
                  properties={selectedWell.properties}
                  onClose={clearSelection}
                />
              </MapPopup>
            )}
          </Map>
        </div>
      </Card>
    </div>
  );
}

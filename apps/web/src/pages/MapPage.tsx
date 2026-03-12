import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Filter, ExternalLink, Flame, Layers, MapPin, Database } from "lucide-react";
import { Map, MapClusterLayer, MapControls, MapPopup, type MapRef } from "@/components/ui/map";
import { BC_CENTER, BC_DEFAULT_ZOOM } from "@/components/ui/map-styles";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { fetchWellGeoJson } from "@/lib/api";
import { formatNumber } from "@/lib/format";

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
    <div className="w-[240px]">
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
          className="mt-0.5 shrink-0 rounded-sm p-0.5 text-muted-foreground/70 transition-colors hover:text-foreground"
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
          className="flex items-center justify-center gap-1.5 rounded-md bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
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
  totalCount,
  filteredCount,
}: {
  filters: MapFilters;
  onChange: (filters: MapFilters) => void;
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
        <Card className="mt-2 w-[280px] border-border/60 bg-background/95 backdrop-blur-sm shadow-lg">
          <CardContent className="space-y-3 p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">Filter Wells</span>
              <span className="text-[10px] text-muted-foreground">
                {filteredCount.toLocaleString()} / {totalCount.toLocaleString()}
              </span>
            </div>

            <div className="space-y-2.5">
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

export function MapPage() {
  const mapRef = useRef<MapRef>(null);
  const [geoData, setGeoData] = useState<GeoJSON.FeatureCollection<GeoJSON.Point, WellProperties> | null>(null);
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

  const filteredData = useMemo(() => {
    if (!geoData) return null;
    return filterGeoData(geoData, filters);
  }, [geoData, filters]);

  useEffect(() => {
    fetchWellGeoJson()
      .then((data) => setGeoData(data as GeoJSON.FeatureCollection<GeoJSON.Point, WellProperties>))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load well data"))
      .finally(() => setLoading(false));
  }, []);

  function handlePointClick(
    feature: GeoJSON.Feature<GeoJSON.Point, WellProperties>,
    coordinates: [number, number],
  ) {
    setSelectedWell({ coordinates, properties: feature.properties });
  }

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
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
    <div className="flex h-[calc(100vh-6rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold font-[family-name:var(--font-heading)] tracking-tight">Well Map</h2>
          <p className="text-sm text-muted-foreground">
            {filteredData?.features.length.toLocaleString() ?? "—"} wells
            {geoData && filteredData && filteredData.features.length !== geoData.features.length && (
              <span className="text-muted-foreground/60"> of {geoData.features.length.toLocaleString()}</span>
            )}
          </p>
        </div>
      </div>

      <Card className="flex-1 overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
        <div className="relative h-full">
          <Map
            ref={mapRef}
            center={BC_CENTER}
            zoom={BC_DEFAULT_ZOOM}
          >
            <MapControls />

            <FilterPanel
              filters={filters}
              onChange={setFilters}
              totalCount={geoData?.features.length ?? 0}
              filteredCount={filteredData?.features.length ?? 0}
            />

            {filteredData && (
              <MapClusterLayer<WellProperties>
                data={filteredData}
                clusterRadius={45}
                clusterMaxZoom={12}
                clusterColors={["#06b6d4", "#10b981", "#f59e0b"]}
                clusterThresholds={[200, 2000]}
                pointColor="#06b6d4"
                onPointClick={handlePointClick}
              />
            )}

            {selectedWell && (
              <MapPopup
                longitude={selectedWell.coordinates[0]}
                latitude={selectedWell.coordinates[1]}
                onClose={() => setSelectedWell(null)}
              >
                <WellPopupContent
                  properties={selectedWell.properties}
                  onClose={() => setSelectedWell(null)}
                />
              </MapPopup>
            )}
          </Map>
        </div>
      </Card>
    </div>
  );
}

export const MAP_STYLES = {
  light: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
} as const;

/** BC center coordinates (roughly center of well data) */
export const BC_CENTER: [number, number] = [-122.5, 56.5];

/** Default zoom to show BC well region */
export const BC_DEFAULT_ZOOM = 5;

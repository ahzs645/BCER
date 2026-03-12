export function formatNumber(value: number | string | null | undefined, maximumFractionDigits = 2) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(numeric)) {
    return String(value);
  }

  return new Intl.NumberFormat("en-CA", { maximumFractionDigits }).format(numeric);
}

export function formatMonthCode(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const text = String(value);
  if (!/^\d{6}$/.test(text)) {
    return text;
  }

  return `${text.slice(0, 4)}-${text.slice(4, 6)}`;
}

export function formatDateCode(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const text = String(value);
  if (!/^\d{8}$/.test(text)) {
    return text;
  }

  return `${text.slice(0, 4)}-${text.slice(4, 6)}-${text.slice(6, 8)}`;
}

export function humanizeKey(key: string) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

export function formatCellValue(key: string, value: string | number | null) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (key.includes("date")) {
    return formatDateCode(value);
  }

  if (key.endsWith("_mon") || key.includes("period")) {
    return formatMonthCode(value);
  }

  if (typeof value === "number") {
    return formatNumber(value);
  }

  const numeric = Number(value);
  if (!Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(String(value))) {
    return formatNumber(numeric);
  }

  return String(value);
}

export function formatLatLon(lat: number | null, lon: number | null) {
  if (lat === null || lon === null) {
    return "—";
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
}

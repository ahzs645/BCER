import { humanizeKey } from "./format";

type Cell = string | number | null | undefined;
type Row = Record<string, Cell>;

/** Quote a single CSV field per RFC 4180 (escape embedded quotes, wrap when needed). */
function csvField(value: Cell): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Serialize tabular data to CSV. Columns are taken from the first row; pass
 * `labels` to override header text (falls back to humanizeKey for the rest).
 */
export function toCsv(rows: Row[], labels?: Record<string, string>): string {
  if (rows.length === 0) return "";
  const columns = Object.keys(rows[0]);
  const header = columns.map((column) => csvField(labels?.[column] ?? humanizeKey(column)));
  const body = rows.map((row) => columns.map((column) => csvField(row[column])).join(","));
  return [header.join(","), ...body].join("\r\n");
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Build a CSV from rows and prompt the browser to download it. */
export function downloadCsv(filename: string, rows: Row[], labels?: Record<string, string>) {
  const csv = toCsv(rows, labels);
  if (!csv) return;
  triggerDownload(new Blob([csv], { type: "text/csv;charset=utf-8;" }), filename);
}

/** Slugify a label into a safe filename stem (no extension). */
export function toFilenameStem(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "export";
}

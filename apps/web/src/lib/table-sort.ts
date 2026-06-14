import { useEffect, useMemo, useState } from "react";

export type SortDirection = "asc" | "desc";

export interface SortState<TKey extends string> {
  key: TKey;
  direction: SortDirection;
}

function normalizeSortValue(value: unknown): number | string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return value;
  const numeric = Number(value);
  if (!Number.isNaN(numeric) && /^-?\d+(\.\d+)?$/.test(String(value))) {
    return numeric;
  }
  return String(value).toLocaleLowerCase();
}

export function compareSortValues(a: unknown, b: unknown) {
  const left = normalizeSortValue(a);
  const right = normalizeSortValue(b);

  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right), undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function nextSortState<TKey extends string>(
  current: SortState<TKey>,
  key: TKey,
): SortState<TKey> {
  if (current.key !== key) return { key, direction: "asc" };
  return { key, direction: current.direction === "asc" ? "desc" : "asc" };
}

export function useSortableRows<TRow, TKey extends string>(
  rows: TRow[],
  keys: readonly TKey[],
  getValue: (row: TRow, key: TKey) => unknown,
  defaultSort?: SortState<TKey>,
) {
  const fallbackKey = keys[0] ?? ("" as TKey);
  const [sort, setSort] = useState<SortState<TKey>>(
    defaultSort ?? { key: fallbackKey, direction: "asc" },
  );

  useEffect(() => {
    if (!sort.key && fallbackKey) {
      setSort(defaultSort ?? { key: fallbackKey, direction: "asc" });
    }
  }, [defaultSort, fallbackKey, sort.key]);

  const sortedRows = useMemo(() => {
    if (!sort.key) return rows;
    return [...rows].sort((a, b) => {
      const result = compareSortValues(getValue(a, sort.key), getValue(b, sort.key));
      return sort.direction === "asc" ? result : -result;
    });
  }, [getValue, rows, sort]);

  function toggleSort(key: TKey) {
    setSort((current) => nextSortState(current, key));
  }

  return { sortedRows, sort, setSort, toggleSort };
}

import { useEffect, useState } from "react";
import type { GasUnitOption } from "@/types";

const STORAGE_KEY = "bcer-gas-unit";
const VALID: readonly GasUnitOption[] = ["km3", "mcf", "kmcf"];

function readStored(): GasUnitOption {
  if (typeof window === "undefined") return "km3";
  const stored = window.localStorage?.getItem(STORAGE_KEY);
  return stored && (VALID as readonly string[]).includes(stored) ? (stored as GasUnitOption) : "km3";
}

/**
 * Gas-unit selection persisted across wells and reloads. The original workbook
 * kept a single presentation-units choice; this mirrors that so the user's pick
 * survives navigating between wells instead of resetting to 000 m3 each time.
 */
export function useGasUnit(): [GasUnitOption, (unit: GasUnitOption) => void] {
  const [unit, setUnitState] = useState<GasUnitOption>(readStored);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage?.setItem(STORAGE_KEY, unit);
    }
  }, [unit]);

  return [unit, setUnitState];
}

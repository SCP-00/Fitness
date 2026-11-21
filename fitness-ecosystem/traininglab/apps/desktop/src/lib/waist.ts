import { MEASUREMENT_RANGES } from "@fitness/bodylab-measurements";
import { localDayStart } from "./day";

export interface WaistMeasurement {
  id: string;
  day: string;
  cm: number;
  landmark: "navel" | "narrowest";
}

export function isWaistMeasurement(value: unknown): value is WaistMeasurement {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<WaistMeasurement>;
  const { min, max } = MEASUREMENT_RANGES.waist;
  return (
    typeof row.id === "string" &&
    row.id.length > 0 &&
    typeof row.day === "string" &&
    localDayStart(row.day) !== null &&
    typeof row.cm === "number" &&
    row.cm >= min &&
    row.cm <= max &&
    (row.landmark === "navel" || row.landmark === "narrowest")
  );
}

export function comparableWaistHistory(
  rows: readonly WaistMeasurement[],
  landmark: WaistMeasurement["landmark"],
  firstDay: string,
  lastDay: string,
): WaistMeasurement[] {
  return rows
    .filter(
      (row) =>
        row.landmark === landmark && row.day >= firstDay && row.day <= lastDay,
    )
    .sort((a, b) => a.day.localeCompare(b.day));
}

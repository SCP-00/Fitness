import { MEASUREMENT_RANGES } from "@fitness/bodylab-measurements";
import { localDayKey, localDayStart } from "./day";

export interface ArchivedWaistCandidate {
  id: string;
  day: string;
  cm: number;
  originalValue: number;
  originalUnit: "cm" | "in";
}

/** A stored record does not identify its anatomical landmark. */
export function archivedWaistCandidates(
  records: readonly Record<string, unknown>[],
): ArchivedWaistCandidate[] {
  return records.flatMap((record) => {
    if (
      record.type !== "waist" ||
      record.method !== "manual" ||
      typeof record.id !== "string" ||
      typeof record.timestamp !== "string" ||
      typeof record.value !== "number" ||
      !Number.isFinite(record.value) ||
      (record.unit !== "cm" && record.unit !== "in")
    )
      return [];
    const day = localDayKey(record.timestamp);
    const cm = record.unit === "in" ? record.value * 2.54 : record.value;
    const candidate = { id: record.id, day, cm, landmark: "navel" };
    if (!isWaistMeasurement(candidate)) return [];
    return [
      {
        id: record.id,
        day,
        cm,
        originalValue: record.value,
        originalUnit: record.unit,
      },
    ];
  });
}

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

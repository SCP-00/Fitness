import { localDayKey } from "./day";

export interface ArchivedMeasurement {
  id: string;
  profileId: string;
  type: string;
  value: number;
  unit: string;
  timestamp: string;
  day: string;
  method: string;
  confidence: string;
  notes: string;
}

export function readArchivedMeasurements(
  records: readonly Record<string, unknown>[],
): ArchivedMeasurement[] {
  return records
    .flatMap((record) => {
      const {
        id,
        profileId,
        type,
        value,
        unit,
        timestamp,
        method,
        confidence,
        notes,
      } = record;
      if (
        typeof id !== "string" ||
        !id ||
        typeof profileId !== "string" ||
        !profileId ||
        typeof type !== "string" ||
        !type ||
        typeof value !== "number" ||
        !Number.isFinite(value) ||
        typeof unit !== "string" ||
        !unit ||
        typeof timestamp !== "string" ||
        !Number.isFinite(Date.parse(timestamp)) ||
        typeof method !== "string" ||
        !method ||
        typeof confidence !== "string" ||
        !confidence
      )
        return [];
      const day = localDayKey(timestamp);
      if (!day) return [];
      return [
        {
          id,
          profileId,
          type,
          value,
          unit,
          timestamp,
          day,
          method,
          confidence,
          notes: typeof notes === "string" ? notes : "",
        },
      ];
    })
    .sort(
      (a, b) =>
        b.timestamp.localeCompare(a.timestamp) || a.id.localeCompare(b.id),
    );
}

import { getExerciseById } from "@fitness/bodylab-exercises";
import { localDayKey } from "./day";
import type { BodyLabArchive } from "./bodylab-migration";
import type { TLSet, TLSession } from "./types";

export interface BodyLabSetsPreview {
  sets: TLSet[];
  sessions: TLSession[];
  duplicates: number;
  ambiguous: number;
  invalid: number;
}

export function planBodyLabSets(
  archive: BodyLabArchive,
  existing: readonly TLSet[],
  sessions: readonly TLSession[] = [],
): BodyLabSetsPreview {
  const result: BodyLabSetsPreview = {
    sets: [],
    sessions: [],
    duplicates: 0,
    ambiguous: 0,
    invalid: 0,
  };
  const known = new Set(existing.map((set) => set.id));
  for (const raw of archive.data.exerciseSets) {
    const {
      id,
      exerciseId,
      timestamp,
      weight,
      reps,
      duration,
      rpe,
      notes,
      sets,
    } = raw;
    if (
      typeof id !== "string" ||
      typeof exerciseId !== "string" ||
      !getExerciseById(exerciseId) ||
      typeof timestamp !== "string" ||
      !Number.isFinite(Date.parse(timestamp)) ||
      (sets !== undefined && sets !== 1) ||
      (weight !== undefined &&
        (typeof weight !== "number" ||
          !Number.isFinite(weight) ||
          weight < 0)) ||
      (reps !== undefined &&
        (typeof reps !== "number" || !Number.isInteger(reps) || reps <= 0)) ||
      (duration !== undefined &&
        (typeof duration !== "number" ||
          !Number.isFinite(duration) ||
          duration <= 0)) ||
      (rpe !== undefined &&
        (typeof rpe !== "number" ||
          !Number.isFinite(rpe) ||
          rpe < 1 ||
          rpe > 10)) ||
      (notes !== undefined && typeof notes !== "string") ||
      (reps === undefined && duration === undefined)
    ) {
      result.invalid++;
      continue;
    }
    const day = localDayKey(timestamp);
    const setId = `bodylab:${id}`;
    if (
      known.has(setId) ||
      known.has(id) ||
      sessions.some((session) => session.id === `bodylab-session:${id}`)
    ) {
      result.duplicates++;
      continue;
    }
    if (
      existing.some(
        (item) =>
          item.exerciseId === exerciseId &&
          localDayKey(item.timestamp) === day &&
          item.weight === (weight ?? null) &&
          item.reps === (reps ?? null),
      )
    ) {
      result.ambiguous++;
      continue;
    }
    const row: TLSet = {
      id: setId,
      exerciseId,
      timestamp,
      dayId: `bodylab:${id}`,
      weight: (weight as number | undefined) ?? null,
      reps: (reps as number | undefined) ?? null,
      ...(duration === undefined ? {} : { durationSec: duration as number }),
      ...(rpe === undefined ? {} : { rpe: rpe as number }),
      notes: [notes, `BodyLab · ${id}`].filter(Boolean).join(" · "),
    };
    result.sets.push(row);
    result.sessions.push({
      id: `bodylab-session:${id}`,
      dayId: row.dayId,
      startedAt: timestamp,
      completedAt: timestamp,
      setIds: [row.id],
      title: "BodyLab",
      source: "bodylab",
    });
    known.add(setId);
  }
  return result;
}

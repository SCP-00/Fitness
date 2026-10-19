import { afterEach, describe, expect, it } from "vitest";
import {
  setLanguage,
  t,
  tInterp,
} from "../../traininglab/apps/desktop/src/lib/i18n";

const ZEN_KEYS = [
  "zen.guide",
  "zen.log",
  "zen.sessionRunning",
  "zen.step1",
  "zen.step1b",
  "zen.step2",
  "zen.step3",
  "zen.step3b",
  "zen.tempo",
  "zen.col.set",
  "zen.col.kg",
  "zen.col.previous",
  // The D/F mark block added to the ZEN effort panel (2026-10-09).
  "effort.mark",
  "effort.markHint",
];

/**
 * The Historial tab of `ExerciseDetailScreen`, key by key.
 *
 * Guarded here because it once shipped as raw keys on screen: the working tree
 * had dropped these from the dictionary while the screen still rendered them
 * (repaired 2026-10-09, verbatim from HEAD). A missing key is invisible to
 * TypeScript — `t()` returns the key itself — so only a test catches it.
 */
const HISTORY_KEYS = [
  "ex.history.days",
  "ex.history.sets",
  "ex.history.volume",
  "ex.history.best",
  "ex.history.e1rm",
  "ex.history.more",
  "ex.history.dayVolume",
  "ex.history.daySets",
  "ex.history.setLoad",
  "ex.history.setTime",
  "ex.history.setBodyweight",
  "ex.history.warmup",
  "ex.history.empty",
  "ex.history.emptyHint",
];

afterEach(() => setLanguage("es"));

describe("TrainingLab ZEN translations", () => {
  it("resolves every visible guide and set-table label in Spanish and English", () => {
    for (const lang of ["es", "en"] as const) {
      setLanguage(lang);
      for (const key of ZEN_KEYS) {
        expect(t(key), `${lang}:${key}`).not.toBe(key);
      }
    }
  });

  it("interpolates the movement tempo and effort instead of exposing a key", () => {
    setLanguage("es");
    const label = tInterp("zen.tempo", { tempo: "2-0-2", rir: 2 });
    expect(label).toContain("2-0-2");
    expect(label).toContain("2");
    expect(label).not.toContain("{");
  });

  it("resolves every label of the exercise history, in both languages", () => {
    for (const lang of ["es", "en"] as const) {
      setLanguage(lang);
      for (const key of HISTORY_KEYS) {
        expect(t(key), `${lang}:${key}`).not.toBe(key);
      }
      // The version with numbers filled in must not leak a placeholder either.
      const day = tInterp("ex.history.dayVolume", { n: 4, kg: "1 240 kg" });
      expect(day).toContain("4");
      expect(day).not.toContain("{");
    }
  });
});

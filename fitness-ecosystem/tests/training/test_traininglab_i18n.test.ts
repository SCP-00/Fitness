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
});

/**
 * The rejection the owner reads.
 *
 * Why this file exists (2026-10-29): the coach page is Spanish, but a refused
 * proposal printed `"ejercicio-que-no-existe" is not available with the current
 * equipment` — the validator's English rule id, straight into the UI. The
 * messages stay English in `lib/llm.ts` (a local model reads them, and the root
 * suite asserts them); the translation happens at the view boundary.
 *
 * The promises:
 *
 *   1. every rule the validator can produce has a Spanish sentence;
 *   2. the sentence keeps the **facts** — which exercise, which family, how many
 *      minutes — because a rejection that hides the number cannot be acted on;
 *   3. an unknown rule is shown, never swallowed;
 *   4. English in, English out: the two languages cannot drift.
 */

import { describe, expect, it } from "vitest";
import { translateCoachError } from "../../traininglab/apps/desktop/src/lib/coach-errors";

const es = (message: string, familyLabel?: (f: string) => string) =>
  translateCoachError(message, "es", familyLabel);

describe("coach errors: the validator speaks, the app answers", () => {
  it("translates an exercise the gear cannot perform, keeping the id", () => {
    const out = es('"barbell-squat" is not available with the current equipment');
    expect(out).toContain("barbell-squat");
    expect(out).toContain("equipamiento");
    expect(out).not.toContain("is not available");
  });

  it("translates the invalid prescription", () => {
    const out = es('"push-ups" has an invalid prescription');
    expect(out).toContain("push-ups");
    expect(out).toMatch(/prescripción/i);
  });

  it("names the family the way the UI names it", () => {
    const labels: Record<string, string> = { chest: "pecho", lats: "dorsales" };
    const out = es(
      '"incline-bench-press" repeats the chest work already programmed today',
      (f) => labels[f] ?? f,
    );
    expect(out).toContain("incline-bench-press");
    expect(out).toContain("pecho");
    expect(out).not.toContain("chest");
    expect(out).toMatch(/familia principal/);
  });

  it("translates the recovery window", () => {
    const out = es(
      '"pull-ups" loads lats, which is still inside its recovery window today',
      (f) => (f === "lats" ? "dorsales" : f),
    );
    expect(out).toContain("dorsales");
    expect(out).toMatch(/recuperación/);
  });

  it("keeps both numbers of the budget rule", () => {
    const out = es("estimated 104 min exceeds the 90 min budget");
    expect(out).toContain("104");
    expect(out).toContain("90");
    expect(out).not.toContain("estimated");
  });

  it("explains an empty proposal as an empty proposal", () => {
    expect(es("proposal contains no slots")).toMatch(/no trae ningún ejercicio/i);
  });

  it("shows an unknown rule instead of swallowing it", () => {
    const stranger = "something the rules learned later";
    expect(es(stranger)).toBe(stranger);
  });

  it("leaves English alone", () => {
    const en = '"barbell-squat" is not available with the current equipment';
    expect(translateCoachError(en, "en")).toBe(en);
  });

  /*
   * The two failure modes measured on the owner's Qwen3.5-4B (2026-10-30): it
   * answers in prose instead of proposing, or it proposes a movement the pain
   * veto forbids. Both must read as sentences, not as rule ids.
   */
  it("says the model talked but did not propose", () => {
    const out = es("the model answered without calling propose_session");
    expect(out).toContain("prosa");
    expect(out).toContain("plan determinista");
    expect(out).not.toContain("propose_session");
  });

  it("names the vetoed pattern, not the rule id", () => {
    const out = es(
      '"dumbbell-floor-press" uses the horizontal_push pattern, which is vetoed while the reported areas are sore',
    );
    expect(out).toContain("dumbbell-floor-press");
    expect(out).toContain("horizontal_push");
    expect(out).toContain("vetado");
    expect(out).not.toContain("is vetoed");
  });

  /*
   * The focus rule (2026-10-30): two of the focused family are legal, three are
   * not, and a movement pattern never repeats. Both sentences carry the fact.
   */
  it("explains the third exercise of a focused family", () => {
    const out = es(
      '"incline-bench-press" would be a third chest exercise: a focused day allows two',
      (f) => (f === "chest" ? "pecho" : f),
    );
    expect(out).toContain("incline-bench-press");
    expect(out).toContain("pecho");
    expect(out).toContain("dos");
    expect(out).not.toContain("focused day");
  });

  it("explains a repeated movement pattern", () => {
    const out = es(
      '"dumbbell-fly" repeats the horizontal_push pattern already in this session',
    );
    expect(out).toContain("dumbbell-fly");
    expect(out).toContain("horizontal_push");
    expect(out).not.toContain("already in this session");
  });

  it("is total: null, undefined and blank do not throw", () => {
    expect(() => translateCoachError("", "es")).not.toThrow();
    expect(es("   ")).toBe("");
    expect(() =>
      translateCoachError(null as unknown as string, "es"),
    ).not.toThrow();
  });
});

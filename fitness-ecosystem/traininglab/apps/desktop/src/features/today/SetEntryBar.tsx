/**
 * SetEntryBar — the one place a set is written down.
 *
 * Redesigned on 2026-10-05 after the owner came back from the gym saying the
 * old row was unusable: two small fields side by side, a placeholder that
 * looked like a range, and a "add" button that meant nothing. On a phone, held
 * with one hand, between sets, that is three chances to get it wrong.
 *
 * The rule now: **one big number, and it is the reps.** Weight is not typed
 * because it rarely changes — it sits on a chip showing what will be used, and
 * one tap swaps the big field over to the weight when it does change. The
 * primary action is «Siguiente serie», because that is the only decision a
 * lifter actually makes four times in a row: same exercise, same load, maybe a
 * rep more.
 *
 * Nothing here decides anything: `resolveReps` and `resolveWeight` in
 * `lib/set-entry.ts` hold the rules and are tested at the root suite.
 *
 * @module features/today/SetEntryBar
 */

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";

import { parseNumberInput } from "../../lib/parse-num";
import { inheritedWeight, resolveReps, resolveWeight } from "../../lib/set-entry";
import { fromKg, toKg, type WeightUnit } from "../../lib/units";
import { t, tInterp } from "../../lib/i18n";
import type { TLSet } from "../../lib/types";

type Field = "reps" | "weight";

export interface SetEntryBarProps {
  /** Cardio slots have no load; the field is then just the time/reps. */
  isCardio: boolean;
  unit: WeightUnit;
  cardioMin?: number;
  /** Bottom of the prescribed range, used only when nothing can be inherited. */
  prescribedMin: number;
  /** The planner's load suggestion in kg, used only when no set precedes it. */
  suggestionKg: number | null;
  /** The sets already logged for this exercise today, oldest first. */
  sets: readonly TLSet[];
  onSubmit: (weightKg: number | null, reps: number) => void;
}

/** kg → display unit, rounded the way a dumbbell plate actually reads. */
function display(kg: number | null, unit: WeightUnit): string {
  if (kg === null) return "";
  return String(Math.round(fromKg(kg, unit) * 10) / 10);
}

export default function SetEntryBar({
  isCardio,
  unit,
  cardioMin,
  prescribedMin,
  suggestionKg,
  sets,
  onSubmit,
}: SetEntryBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [field, setField] = useState<Field>("reps");
  const [typed, setTyped] = useState("");

  // What the next set will use if the field is left alone. Recomputed on every
  // render from the sets themselves, so logging one and reading the next is the
  // same operation — there is no second copy of the truth to fall out of date.
  const previousReps = resolveReps({ typed: null, sets, prescribedMin });
  const previousWeight = resolveWeight({ typed: null, sets, suggestionKg });

  // Pre-fill rather than use a placeholder: the value is already correct, and
  // making someone type "12" for the fourth time is the friction being removed.
  // Typing replaces it (select-on-focus), clearing it falls back to inheritance.
  const shown =
    typed !== ""
      ? typed
      : field === "reps"
        ? String(previousReps.reps)
        : display(previousWeight.weightKg, unit);

  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    el.select();
  }, [field, sets.length]);

  const submit = () => {
    const parsed = parseNumberInput(typed);
    if (field === "reps") {
      const nextReps = resolveReps({ typed: parsed, sets, prescribedMin });
      const nextWeight = resolveWeight({ typed: null, sets, suggestionKg });
      onSubmit(isCardio ? null : nextWeight.weightKg, nextReps.reps);
    } else {
      const nextWeight = resolveWeight({ typed: parsed, sets, suggestionKg });
      const nextReps = resolveReps({ typed: null, sets, prescribedMin });
      onSubmit(nextWeight.weightKg, nextReps.reps);
    }
    setTyped("");
    setField("reps");
  };

  const label = field === "reps" ? t("log.reps") : t("log.weight");
  const unitHint =
    field === "weight" ? (unit === "kg" ? t("log.kg") : t("log.lb")) : null;

  return (
    <div className="tl-entry mt-3">
      <div className="tl-entry-main">
        <div className="tl-entry-field">
          <span className="tl-entry-label">{label}</span>
          <input
            ref={inputRef}
            type="text"
            inputMode={field === "reps" ? "numeric" : "decimal"}
            value={shown}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                submit();
              }
            }}
            aria-label={label}
            className="tl-entry-input tabular-nums"
          />
          {unitHint && <span className="tl-entry-unit">{unitHint}</span>}
        </div>

        {/* The load is shown, not asked for: it is inherited, and one tap opens
            it for editing on the rare set that changes. */}
        {!isCardio && (
          <button
            type="button"
            onClick={() => setField(field === "weight" ? "reps" : "weight")}
            aria-pressed={field === "weight"}
            className={`tl-entry-weight tl-focusable${field === "weight" ? " is-active" : ""}`}
          >
            <span className="tl-entry-weight-value">
              {previousWeight.weightKg === null
                ? t("log.bodyweight")
                : `${display(previousWeight.weightKg, unit)} ${unit === "kg" ? t("log.kg") : t("log.lb")}`}
            </span>
            <span className="tl-entry-weight-hint">
              {previousWeight.source === "typed" || previousWeight.source === "suggestion"
                ? t("log.weightSuggested")
                : t("log.weightRepeat")}
            </span>
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={submit}
        className="tl-entry-go tl-btn-primary tl-focusable"
        data-testid="log-next-set"
      >
        <Check className="w-5 h-5" />
        {isCardio ? t("log.add") : t("log.nextSet")}
      </button>

      {/* Say what the untouched values will become. Silence here is what made
          the old row log 8 when he meant 12. */}
      {!isCardio && field === "reps" && typed === "" && (
        <p className="tl-entry-foot">
          {previousReps.source === "previous-set"
            ? tInterp("slot.repsRepeat", { n: previousReps.reps })
            : tInterp("slot.repsRange", {
                min: prescribedMin,
              })}
        </p>
      )}
      {isCardio && cardioMin ? (
        <p className="tl-entry-foot">{tInterp("log.cardioHint", { n: cardioMin })}</p>
      ) : null}
    </div>
  );
}

/** The unit label helper, kept next to the only place that needs it. */
export function entryUnitLabel(unit: WeightUnit): string {
  return unit === "kg" ? t("log.kg") : t("log.lb");
}

/** Exported for the weight chip's display rounding, so tests can pin it. */
export { display as displayEntryWeight };

/** Re-exported so callers do not need to reach into the lib for the rules. */
export { inheritedWeight, toKg };

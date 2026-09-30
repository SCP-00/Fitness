# core/training — Guide for agents (and humans)

TrainingLab **T1+T2**: the pure planning vocabulary and the deterministic
generator. This package is the mathematical half of the future TrainingLab
app — the UI half will be a separate app that *consumes* this package plus
BodyLab's export v2.

**Read `docs/TRAININGLAB_UI_PLAN.md` first for the product vision.** This file is
the package's working contract.

## The one rule that rules them all

> **The LLM proposes; the math disposes.**

Nothing enters a user's routine without passing `validateRoutine`. The
generator validates its own output; the future AI path (F3) must validate the
LLM's JSON with the same validator; the manual editor should too.

## Files

| File | Contains | Rules |
|---|---|---|
| `plan.ts` | `Routine`, `Day`, `ExerciseSlot`, `AiProposal`, `MuscleGroup` (34 ids), `MuscleFamily` (13), `muscleFamilyOf`, `isBigMuscleFamily`, `VOLUME_WINDOWS`, `ValidationResult`/`Violation` | Types only + pure mapping functions |
| `validator.ts` | `validateRoutine` (structure + 5 hard rules), `validateAiProposal` (rule 5), `weeklySetsByFamily`, `CatalogEntry`/`ExerciseCatalog` | Never throws; catalog **injected** |
| `generator.ts` | `generateRoutine`, `FamilyWeakness`, `FamilyPlan`, `GeneratorInput`, `GeneratorError` | Deterministic; self-validates; throws only `GeneratorError` |

## Hard rules (validator §4 of the plan)

1. **catalog** — every `exerciseId` exists in the injected catalog AND its
   required equipment is a subset of what the athlete owns (an exercise
   listing several tokens needs at least ONE owned; bodyweight = no tokens = OK).
2. **consecutive_days** — no BIG family (chest, shoulders, triceps, biceps,
   lats, quads, hams, glutes) trained on two adjacent days.
3. **weekly_volume** — weekly DIRECT sets (intensity ≥ 2) per family inside
   the level window: beginner 4-12, intermediate 6-18, advanced 8-22.
   Synergists (intensity 1) never count.
4. **focus_coverage** — every granular muscle in a day's `focus` has ≥1 slot
   in that day. Focus is EXACT muscle id, not family.
5. **weak_muscle_citation** (AI proposals) — the proposal must cite reported
   weak muscles AND back each citation with a day focused on it, using
   catalog exercise ids only.

Structural pre-checks run first (sets 1-6, reps 1 ≤ min ≤ max ≤ 50, rest
0-600 s, RIR 0-5, `days.length === daysPerWeek`); a structurally broken
routine skips the rules (it would prove nothing).

## Non-negotiable conventions

- **Zero dependencies, zero UI.** No React, no DOM, no fetch, no Node APIs.
  Same frozen rule as every `core/*` package. If you need the exercise list,
  you get it **injected** as `ExerciseCatalog` (a structural subset:
  `{ id, muscles: {muscle, intensity}[], equipment: string[] }`) — never an
  import from the web app.
- **Never throw on input.** `validateRoutine` / `validateAiProposal` /
  `weeklySetsByFamily` return violations for anything — including
  `null` days arrays or `undefined` fields from a hostile LLM response
  (regression-tested: a real crash was found and fixed adversarially).
  The ONLY thrower is `generateRoutine` (→ `GeneratorError`) when the input
  is ungeneratable or its own output fails self-validation — a bug alarm,
  not input handling.
- **Determinism.** `generateRoutine` is a pure function: same input →
  byte-identical plan. No `Date.now`, no RNG (golden tests pin this). Stamp
  real dates in the app layer (`routine.createdAt = new Date().toISOString()`).
- **IDs are stable vocabulary.** Muscle ids mirror the web `exercises.ts`
  `MuscleGroup` union. If the web catalog ever renames a muscle id, this
  package's union must change in the same commit (the export contract tests
  will catch drift from the app side).
- **Tests live in `tests/training/`** (root vitest, node env), three suites:
  `test_training_validator` (rules), `test_training_adversarial` (zero-trust),
  `test_training_generator` (golden outputs), `test_export_integration`
  (v2 payload → core, no adapter). Run `npx vitest run tests/training`.

## How the future TrainingLab app consumes this

```
BodyLab (web/desktop)                     TrainingLab app
─────────────────────                     ────────────────
buildTraininglabExport(state)  ──JSON──▶  read the file (local, offline)
  format: bodylab-traininglab-link        convert payload → generator input:
  version: 2                                • muscleScores (0-1, 1=ideal) →
  muscleScores[]  ┐                           FamilyWeakness (0-100, low=weak)
  conditioning    ├─ the weakness map       • muscleLoad → cross-check
  measurements    ┘                         • measurements → equipment reality
                                            • exerciseCatalog → ExerciseCatalog
generateRoutine(input)                      │
  ├─ self-validates (hard rules)            │
  └─ Routine ◀──────────────────────────────┘
        │
        ├─ UI editor may tweak; re-run validateRoutine after ANY edit
        └─ (F3) LLM proposes AiProposal → validateAiProposal BEFORE building
```

Practical notes:

- `familyPlans` is the app's *strategy* declaration: which exercises it
  prefers per family, how many per session, how many sessions requested.
  The generator treats sessions as a **preference** (it widens automatically
  to reach the volume floor) but every directly-touched family MUST have a
  plan entry, and every planned family needs an exercise whose PRIMARY mover
  (intensity 3) is that family — spill-only volume cannot be steered.
- Equipment tokens are the app's vocabulary (`'barbell'`, `'dumbbells'`,
  `'machine'`, `'cable'`, `'bands'`…). The catalog entry's `equipment` array
  uses the same tokens; bodyweight entries use `[]`.
- Week shapes: 1 day = fullbody, 2 days = lower+upper, 3-6 = lower/push/pull
  cycle rotated so the weakest pattern leads, 7 = rest on day 7.
- The v2 export's `conditioning` axes (Cooper/resting-HR/%BF/skinfolds) are
  a PLANNING signal (cardio + recomposition guidance), not yet a generator
  input — wiring them into day templates is future work (see ROADMAP.md).

## Definition of Done for changes here

1. `npx vitest run tests/training` green (57+ tests).
2. Golden tests still pin byte-identical output — if you change the algorithm
   INTENTIONALLY, regenerate the pinned expectations and say so in the commit.
3. Any new rule → new `HardRule` id + validator branch + unit + adversarial test.
4. `pnpm test` green root-wide; docs (`ROADMAP.md`, `CHANGELOG.md`) updated.

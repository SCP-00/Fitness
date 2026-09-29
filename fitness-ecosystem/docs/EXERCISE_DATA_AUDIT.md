# Exercise data audit — our catalog vs. the tracked third-party app

> Verdict in one line: **our 143-exercise catalog is clean** (no missing primary
> muscles, no fallbacks, no orphan media) and it already covers **182 of the 496
> exercises** listed in the reference sheet — but it has **two real holes** the
> sheet exposes: **no trapezius work at all** and **no mobility/stretching
> content whatsoever**.
>
> Audited 2026-09-29 against `docs/reference/symmetry/Symmetry Septiembre.xlsx`
> (496 distinct exercises, 17 muscle buckets, 31 rows actually logged).

## Where the raw material lives (and why it isn't in git)

The reference sheet and the twelve screenshots of the other app are **someone
else's copyrighted material**. They are kept locally for study under
`fitness-ecosystem/docs/reference/symmetry/`, which is listed in `.gitignore`;
they are never committed, never built into either app, and never redistributed.
What ships is *our* conclusions — this document, the design plan, and our own
catalog data — not their artwork.

Re-run the audit at any time (no dependencies, reads the `.xlsx` directly):

```bash
cd fitness-ecosystem
node scripts/audit-exercise-coverage.mjs                      # human report
node scripts/audit-exercise-coverage.mjs --json               # machine-readable
node scripts/audit-exercise-coverage.mjs path/to/other.xlsx    # any sheet, same layout
```

It is meant to be re-run: as the sheet gets filled in, the numbers move.

## How the sheet is laid out (so we can read it correctly)

Three columns per muscle — `exercise name | logged kg×reps | app rank tier` —
under seven headings. 501 name cells, 496 distinct. Two extra facts worth
knowing, because both struck us as product decisions rather than accidents:

- the app files every exercise under **one** muscle bucket (only 5 names appear
  under two buckets), which is *less* precise than our own model — we record
  primary/secondary/synergist intensity per muscle;
- the "rank" column (Bronze → Iron → Silver → Gold → Emerald → Ruby → Diamond →
  Champion, 3 sub-levels each) is a **per-exercise progression tier**, not a
  weight-class medal: it advances on estimated 1RM relative to bodyweight.

## Part A — our catalog, validated

| Check | Result |
|---|---|
| Exercises | **143** |
| Entries without a primary (`intensity: 3`) muscle | **0** |
| Entries without bilingual description | **0** |
| Missing Spanish name | **0** |
| Exercises falling back to generic traits | **0** |
| Muscle groups in the vocabulary with **no** primary exercise | **0 of 34** |
| Media manifest entries pointing at a missing id | **0** |

Distribution: 45 bodyweight · 35 compound · 31 isolation · 12 machine · 11 cable
· 11 cardio; difficulty 1–5 spreading 44/46/37/10/6. Media: 36 animated GIFs +
64 photo pairs = **100 covered, 43 falling back to the drawn demo** (all of them
warm-up/mobility/cardio, which is exactly the block this audit says is thin).

**So: no data defects to fix.** The last real defect (`shadow-boxing` without a
primary muscle) was fixed in the previous pass; the guard is now the audit
script, which fails loudly if a new entry reintroduces one.

## Part B — coverage of the sheet

| | Count |
|---|---|
| Distinct exercises listed in the sheet | **496** |
| We already have (≥ 0.6 token match) | **182** |
| We don't have | **314** |
| Of those, exercises **you have logged** | **20** |
| Our catalog entries that also appear in the sheet | **79 / 143** |

Per muscle, worst first — this is the interesting column:

| Muscle bucket | covered / listed | |
|---|---|---|
| Traps | 0 / 7 | **0 %** |
| Adductors | 0 / 2 | **0 %** |
| Neck | 1 / 8 | 13 % |
| Lats | 7 / 33 | 21 % |
| Lower Back | 3 / 12 | 25 % |
| Quads | 22 / 86 | 26 % |
| Abs | 25 / 78 | 32 % |
| Shoulders | 32 / 85 | 38 % |
| Chest | 25 / 62 | 40 % |
| Upper Back | 20 / 45 | 44 % |
| Glutes | 19 / 37 | 51 % |
| Abductors | 4 / 7 | 57 % |
| Calves | 12 / 19 | 63 % |
| Hamstring | 13 / 19 | 68 % |

### Careful: most "missing" rows are naming variants, not real gaps

Of the 20 logged-but-"missing" exercises, **15 are things we do have** under our
own name. Do not let the raw number drive work:

| Sheet name | What we call it |
|---|---|
| Pec Deck (Machine) | `machine-chest-fly` (Machine Chest Fly (Pec Deck)) |
| Dumbbell Flat Bench Fly | `dumbbell-fly` |
| Pull-Ups (Pronated Grip) | `pull-ups` |
| Conventional Deadlift (Straight Bar) | `deadlift` |
| One Arm Row (Dumbbell) | `dumbbell-row` (Single-Arm Dumbbell Row) |
| Pause Squat | `barbell-squat` + a tempo axis (technique, not a new entry) |
| Hip Adduction (Machine) | `standing-cable-adduction` |
| Neutral Wide Grip Lat Pulldown | `lat-pulldown` (grip is a variation, not a new entry) |
| Incline Leg Hip Raise / Parallel Bar Knee Raise / Decline Crunch | `lying-leg-raise` / `hanging-knee-raise` / `cable-crunch` cover the pattern |
| Elevación de Pierna Tumbado con Palanca | same as above, machine variant |
| Rowing Machine | cardio erg — **not in your kit**, deliberately out |
| Behind the Neck Lat Pulldown | **refused**: shoulder-impingement risk for no unique stimulus |
| Wide-Legged Forward Bend | mobility — see the real gap below |

That leaves **five genuine additions** from the logged set plus the two
structural holes.

## Part C — the real blind spots

1. **Trapezius: zero exercises.** Our vocabulary has `traps_upper/mid/lower`,
   but the only entry that makes the upper traps primary is
   `dumbbell-upright-row`. There is **no shrug** in the catalog. You log
   *Dumbbell Shrugs 25×10* and have adjustable dumbbells; this is the single
   clearest gap the audit found, and it is also the muscle the weekly planner can
   never prioritise today.
2. **Mobility/stretching: zero exercises.** The sheet lists a whole block we have
   nothing for — cat/cow, child's pose, downward dog, standing and seated forward
   bends, tree pose, hip flexor and hamstring stretches. For an app that also
   *teaches*, "how do I prepare and cool down" is missing content, and it is the
   cheapest content to add (no equipment, no media licence risk).
3. **Thin coverage (1–3 primary exercises)** — `traps_upper` 1, `traps_mid` 2,
   `traps_lower` 2, `pectoralis_minor` 1, `serratus_anterior` 1,
   `forearm_extensors` 1, `lats_lower` 1, `soleus` 2, `adductors` 3,
   `erector_spinae` 3, `posterior_deltoid` 3, `lateral_deltoid` 5,
   `gluteus_medius` 5.

## Part D — the sheet's own hygiene (things to know while filling it in)

Good news: it is a clean, complete export. The issues are small and mostly
cosmetic:

| Finding | Count | Note |
|---|---|---|
| Logged as `0x0` (list exists, never performed) | 470 / 501 (94 %) | the sheet is a *catalogue*, not a history — only 31 rows carry real work |
| Rank tiers assigned | 14 of 24 | Bronze→Champion with 3 sub-levels each |
| **Arms section entirely empty** | Biceps / Triceps / Forearms = 0 rows | this is the "unfinished muscles" you mentioned |
| Blank weight cell | 1 | `Wide-Legged Forward Bend` |
| kg written with a **comma** decimal | 14 | fine — that's our own `parseNumberInput` rule |
| Weird precision like `54,43x5`, `54,4x10` | 2 | smells like a lb→kg round trip inside the other app (54.43 kg = 120 lb); we should never store 4-decimal kilos |
| Duplicate inside a muscle | 1 | *Romanian Deadlift (Machine)* twice under Hamstring |
| Plural/case near-duplicates | 2 | *Dead Hang / Dead Hangs*, *Nordic Curl / Nordic Curls* |
| Typos in names | ~12 | *Lyinh, Cjild's Pose, Dumbblell, PUlldown, Pull-Ips, Bodywight, Wighted, Romain, Contration, Jumop, Giogh, Clappping* |
| Trailing empty columns / 1000 declared rows | — | harmless export padding |

None of this blocks us; it is context for reading the numbers. The one thing
worth acting on when you continue: **the sheet's muscle buckets are coarser than
ours** — an exercise sitting under "Quads" there may be a glute-dominant pattern
for us, so imports from it are *suggestions to triage*, never truth.

## Part E — prioritized additions (recommended, not yet implemented)

Ordered by (value to your kit) ÷ (cost to add). Tier 1 is small and unambiguous.

### Tier 1 — 8 entries, closes both structural holes

| Add | Why | Primary muscles |
|---|---|---|
| Dumbbell Shrug | the missing trap builder; you already log it | `traps_upper` 3, `traps_mid` 2 |
| Barbell/Dumbbell Shrug (barbell variant) | trap progression axis (load) | `traps_upper` 3 |
| Prone Y-Raise (incline bench) | the missing lower-trap + rear-delt entry | `traps_lower` 3, `posterior_deltoid` 2 |
| Plate/Prone Trap Raise | `traps_mid` second exercise | `traps_mid` 3 |
| Wrist Extension (dumbbell) | `forearm_extensors` has exactly one entry | `forearm_extensors` 3 |
| Dumbbell Lying Neutral-Grip Press | you log it; chest with neutral grip, elbow-friendly | `chest_lower` 3, `triceps_*` 2 |
| Incline Bench Leg Raise | you log it; adds a decline/incline abs angle | `rectus_abdominis` 3, `iliopsoas` 2 |
| Decline Crunch | you log it; loaded abs progression | `rectus_abdominis` 3 |

### Tier 2 — mobility & stretching block (≈12 entries, new `mobility` category)

Cat–Cow · Child's Pose · Downward Dog · Standing Forward Bend (Uttanasana) ·
Wide-Legged Forward Bend · Standing Hamstring Stretch · Seated Hip Adductor
Stretch · Hip Flexor Stretch (kneeling) · Doorway Chest Stretch · Sleeper
Stretch (rear delt) · Wall Slide (serratus) · Pigeon Stretch.

Why this is worth more than it looks: it makes the warm-up/cooldown advice real
instead of generic, needs no media licence, and gives the mobility block a
`holdSeconds` schedule rather than sets×reps.

### Tier 3 — depth, only where you have the kit

Seated Calf Raise (soleus, machine-free variant) · Single-Leg Standing Calf Raise
· Close-Grip Chin-Up / Neutral-Grip Pull-Up · Scapular Pull-Up (we have it — add
a *trained* volume mapping) · Side Plank & Copenhagen Plank (adductors!) ·
Adductor squeeze (ball) · Curtsy Lunge · Dumbbell Frog Pump · Wide-Grip Push-Up.

**Not adding, on purpose:** rowing erg, machines you don't own, behind-the-neck
pulldown, and anything whose only difference from an existing entry is a
brand-name variation — variation belongs in our *technique/variation* layer, not
as another catalog row.

### Media strategy for the additions

Same cascade as today, no new licences: **free-exercise-db (public domain,
Unlicense)** covers shrugs, wrist extensions, and most stretches with two photos
each; anything it lacks falls back to our drawn demo, which is fine for hold
work. Nothing from the tracked app's artwork is ever used.

## Where this feeds the product

Data alone changes nothing; the second half of this work is *how a user sees it*.
That is [TRAININGLAB_UI_PLAN.md](TRAININGLAB_UI_PLAN.md): navigation, the exercise
library and detail screens, the set logger, progress, and how plans are presented
in a fully local environment.

# TrainingLab — UI redesign plan

> Why this document exists: the app works, but the interface has never been
> *designed* — it grew as one 1 559-line page that stacks every panel into a
> single column and hides the other half behind a two-way switch. The owner's
> words: "todavía no nos entendemos en el diseño". This is the plan to fix that,
> in ordered phases, with the rules that make each screen predictable.
>
> Companion documents: [UI_DESIGN.md](UI_DESIGN.md) (the binding responsive/token
> contract — unchanged, this plan extends it) and
> [EXERCISE_DATA_AUDIT.md](EXERCISE_DATA_AUDIT.md) (what content exists to show).
> Sources studied: twelve screenshots of a commercial training app, kept locally
> in the gitignored `docs/reference/symmetry/` folder.

## 0. What we studied, and the line we do not cross

We studied **interaction patterns** — where things live, what a thumb reaches,
what a screen says first. We copy **nothing**: no artwork, no anatomical
illustrations, no icon set, no copy, no colour, no brand marks, no pixel-for-pixel
layout. Patterns are not protectable; assets are. Every visual in TrainingLab is
either our own drawing, a public-domain photo (free-exercise-db, Unlicense) or
the GIF set already licensed for BodyLab.

Nine patterns were extracted. Six are worth adopting, three are not:

| Pattern studied | Take? | How we do it our way |
|---|---|---|
| **Home opens on a hero card for today's recommended workout** — title, duration, exercise count, one big CTA | **Yes** | Our hero is "Sesión de hoy": time budget, families, exercise count, muscle thumbnail, one accent CTA. No cover photo (we have no licensed photography and don't want any). |
| **5-slot bottom tab bar with a raised centre action** | **Yes** | Hoy · Ejercicios · **Iniciar** · Progreso · Ajustes. Fixes one-hand reach on the iPhone; the centre action starts the session. |
| **Exercise picker: search + two filter buttons opening sheets with anatomical circles and checkmarks** | **Yes** | Same shape, our data: search + Músculo/Equipo/Categoría sheets, rows show our muscle names, difficulty and whether a demo exists. |
| **Exercise detail as tabs: Guide · Summary · Rank · History** | **Yes** | Guía · Resumen · Rango · Historial. Guide is our technique content (already written), Summary is our muscle model (primary/secondary), History is our logged sets. |
| **Session logger: big media, set table with a PREVIOUS column, coloured set-type badges, sticky rest bar** | **Yes** | This is ZEN v2 (§5). The PREVIOUS column and the set-type badges are the two cheapest big wins in the whole plan. |
| **Progress screen: metric + period selectors, headline with delta, chart, KPI tiles, consistency heatmap, recent PRs** | **Yes** | All computed locally from logged sets. Chart is a ~120-line SVG component, no chart dependency. |
| **Rank screen: "top 27 % strongest" + anatomy coloured by tier** | **No (as a claim)** | We have no population data, so a percentile would be invented. We ship a **Nivel estimado** with our own published thresholds and say plainly that it is an internal reference (§6.3). The anatomy figure we *can* do — BodyLab already draws one. |
| **Social feed, followers, "1 303 completed workouts"** | **No** | Contradicts the privacy model that is the product's whole point. |
| **Streak flame as a pressure device** | **Partly** | We show consistency (days trained, heatmap) with neutral wording. No loss-anxiety mechanics, no red "streak lost". |

## 1. Design principles (the tie-breakers)

1. **One screen, one job.** If a screen answers two questions, it is two screens.
2. **The thumb owns the bottom half.** Primary actions live low; destructive or
   rare actions live in the header or in Ajustes.
3. **Measure, don't decorate.** Every number on screen must be computable from
   local data and explainable in one sentence.
4. **The maths proposes, the user disposes.** The planner and the local model
   suggest; nothing is applied without a visible reason and a way to undo it.
5. **Offline is not a mode.** No loading spinners for local data, no empty state
   that blames the network.
6. **Spanish-first copy, English code** (unchanged rule).
7. **Ember orange on near-black.** Same tokens, no new palette (§7).

## 2. Information architecture

Today: two panes (`Entrenar` / `Ajustes`) behind one switch. It cannot hold a
library, a logger, progress and a planner.

Proposed five destinations, each a real screen:

| # | Destination | Answers | Absorbs today's |
|---|---|---|---|
| 1 | **Hoy** | "¿Qué toca y con cuánta energía estoy?" | readiness, stats strip, slot cards, advisories |
| 2 | **Ejercicios** | "¿Qué puedo hacer y cómo se ejecuta?" | the demo modal (now reachable directly) |
| 3 | **Iniciar** *(centre)* | "Empezar ya" | session start → ZEN, plus "sesión libre" and "generar con el coach" |
| 4 | **Progreso** | "¿Estoy mejorando y cómo voy de equilibrio?" | records, PR feedback, BodyLab weakness map |
| 5 | **Ajustes** | "Equipo, preferencias, coach, LAN" | gear, preferences, coach, BodyLab import, shared, mobile |

**Navigation is a state machine with hash sync**, not a new dependency:

```ts
type Screen =
  | { kind: "today" }
  | { kind: "exercises"; filter?: MuscleGroup; id?: string }  // id → detail
  | { kind: "progress"; tab?: "balance" | "prs" }
  | { kind: "settings" };
```

`#/hoy`, `#/ejercicios`, `#/ejercicios/arnold-press`, `#/progreso`, `#/ajustes`.
Hash sync costs ~20 lines and buys: the iPhone back-swipe works, deep links from
a slot card to its exercise detail work, and screenshots/Playwright can address a
screen directly (which is how we will test them).

**Plans taxonomy** — four nouns, used consistently everywhere:

| Noun | Meaning | Lives in |
|---|---|---|
| **Plantilla** | a saved day you can repeat | Ejercicios → "Mis plantillas" |
| **Semana** | the weekly distribution (families → days) | Hoy (collapsed card) |
| **Sesión de hoy** | today's concrete list, derived from the week + readiness + kit | Hoy (the hero and the list) |
| **Sesión libre** | exercises you pick as you go | Iniciar |

## 3. Screen: Hoy

- **Hero card** (the only card above the fold): "Sesión de hoy" · `45 min · 6 ejercicios · Pecho · Hombros` · muscle thumbnail · badge when it came from the coach or was edited by hand · primary CTA **Empezar** (full width, accent) · secondary "Ver plan".
- **Readiness strip**: three compact 1–5 inputs (energía / sueño / dolor). Changing one re-derives the plan *in place* with a one-line explanation of what moved ("bajé 2 series de empuje, subí RIR").
- **Plan list**: the existing `SlotCard`s, unchanged in substance — they already show sets, reps, load, swap and the demo button. Row rhythm tightened: media thumb 44 px, name, muscles, sets summary.
- **Semana card**: collapsed, one line per training day, today marked.
- **Advisories**: single-line, dismissible, never a modal (already the case).
- **Empty state**: "Sin datos de BodyLab" → import CTA, plus "usar catálogo interno" (also the LAN guest path).

## 4. Screen: Ejercicios (library)

Reachable from the tab bar, from a slot's "Sustituir", and from "Ver guía".

- **Search** auto-focused, filters answers as you type (accent-insensitive, ES+EN).
- **Filter chips**: Músculo · Equipo · Categoría · Dificultad. Each opens a
  **bottom sheet** with checkmarks; active filters show as removable chips.
- **Sort**: Recientes (what you actually use) · A–Z · Dificultad.
- **Rows** (44 px min): media thumb (GIF/foto/dibujo), name + muscle subtitle,
  trailing badges — equipment icon, difficulty dots, and a muted "guía" dot when
  our technique text exists.
- **"Añadir a la sesión"** appears on every row when a session is open; the row
  becomes an "Añadido" state. This is what makes ZEN's "Sustituir" feel fast.

## 5. Screen: Sesión (ZEN v2) — the logger

ZEN v1 exists (full-screen overlay). v2 adds the three things that make logging
fast, all visible in one glance:

```
┌──────────────────────────────────────────┐
│ ⌄  12:41                              ⋯ │  elapsed · collapse · overflow
│                                          │
│              [ media hero ]              │
│                                          │
│  Press de banca con barra                │
│  Pectoral mayor · Tríceps · Hombro ant.  │
│  [ Guía ]  [ Sustituir ]  [ Notas ]      │
│                                          │
│  SERIE   ANTERIOR    KG      REPS   ✓    │  ← the PREVIOUS column
│   1      60×8        [60]    [ 8]   ✗    │
│   2      60×8        [60]    [ 8]   ✗    │
│   C      —           [40]    [10]  calentamiento
│                                          │
│  Esfuerzo de la serie  RIR  [1][2][3][4][5]   ← fatiga por serie
│                                          │
│  ── Descanso 1:30  ▸ empezar   ⏭ saltar ──│  sticky bottom bar
└──────────────────────────────────────────┘
```

- **Set-type badges**: C (calentamiento, muted) · normal · D (dropset, violet) ·
  F (fallo, red). Warm-up sets are already excluded from volume in the maths;
  the badge makes that visible.
- **Esfuerzo por serie**: the RIR/RPE control is the *primary* effort input, big
  enough to tap with a thumb, with the label written out ("quedan 2 reps en
  reserva" is better than "RIR 2" — we show both).
- **Descanso** is a sticky bottom bar owned by the timer service, not a modal.
- **Next exercise peek**: bottom-right chip "Siguiente: Remo con mancuerna" that
  swipes to it.
- **Finish**: the celebration banner + sound stay as they are (already good).

## 6. Screen: Progreso

### 6.1 Selectors and headline
Metric: Volumen · Series · Reps · Tiempo. Period: Semana · Mes · 3 meses · Año.
Headline number with a delta chip versus the previous equivalent period, and the
exact date range in small type — never a bare "↑ 221 %" with no anchor.

### 6.2 Chart, KPIs, consistency
- **Chart**: one SVG component (`<TrendChart>`), 0 dependencies, tap/drag to read
  a value, respects `prefers-reduced-motion`, has an accessible table fallback.
- **KPI tiles**: Entrenamientos · PRs nuevos · Series totales · Días entrenados.
- **Consistencia**: GitHub-style heatmap, "23/30 días · 3,2×/semana", legend
  Entrenado / Descanso. Neutral vocabulary — no streak-shaming.

### 6.3 Muscle balance and estimated level (our honest version of "Ranks")
- **Equilibrio muscular**: per family, sets in the period versus a guidance band,
  with the weak families highlighted. Sourced from our conditioning/weakness data
  and the weekly planner's own family model — the same numbers the planner uses,
  so the screen cannot disagree with the plan.
- **Nivel estimado**: per-family tier computed from estimated 1RM relative to
  bodyweight, using **thresholds we document in this file** and expose in the UI
  ("¿Cómo se calcula?"), with the sentence: *this is a reference against your own
  history and published bodyweight ratios — we do not have population data and we
  will not pretend to.* Tiers: `Inicial · Constante · Fuerte · Avanzado` (our
  names, not a copy of any other app's ladder).
- **PRs recientes**: list with the value, the date, and a "NUEVO" badge only in
  the 7 days after it happened.

## 7. Visual system

Unchanged tokens (see UI_DESIGN.md). Additions needed by these screens:

| Token | Value | Use |
|---|---|---|
| `--tl-surface-3` | `#262626` | hover/selected rows, sheet backdrop rows |
| `--tl-violet` | `#8b5cf6` | dropset badge only |
| `--tl-rest` | `#0f172a` (wash) | rest bar background |

Type: add a **display step** (28–32 px, tight tracking, uppercase optional) for
hero/stat headlines; keep the system stack (no webfonts). Tabular numerals
everywhere a number is measured. Motion: 150–200 ms `ease-out`, no bounce,
`prefers-reduced-motion` = instant. Icons: the existing `lucide-react` set only.

## 8. Component inventory (build once, use everywhere)

`TabBar` · `NavRail` (desktop) · `HeroCard` · `ListRow` · `FilterChips` +
`FilterSheet` · `Tabs` (scrollable on phone) · `SetRow` + `SetTypeBadge` ·
`EffortPicker` · `RestBar` · `MetricCard` + `DeltaBadge` · `TrendChart` ·
`ConsistencyHeatmap` · `MuscleThumb` · `MuscleBalanceBar` · `BottomSheet`
(formalises what `ExerciseDemoModal` does ad hoc) · `EmptyState`.

Rules: every one of these gets its state shown (empty/loading-not-needed/error),
a `tl-focusable` ring, and a story in the phone/desktop screenshots.

## 9. Responsive rules (extends UI_DESIGN.md)

| Width | Navigation | Layout |
|---|---|---|
| `< 640 px` (iPhone 11 Pro Max = 414) | **Bottom tab bar**, safe-area bottom inset, 56 px tall, centre action raised | one column; hero first; set rows stack as `SERIE | ANTERIOR | KG | REPS`; sheets are bottom sheets |
| `640–1023 px` | Segmented nav in the sticky header | single column `max-w-5xl`, sections stack |
| `≥ 1024 px` | **Left rail** (icon + label), keyboard-first | two columns where useful (plan ‖ progress); hover states; density back to 40 px controls |

All the hard rules from UI_DESIGN.md stay binding (44 px targets on phones, 16 px
inputs, no horizontal overflow, `100dvh`, `parseNumberInput`).

## 10. How we present exercises and plans in a local environment

This was an explicit requirement, so it gets its own section.

**Media cascade** (already implemented, keep it): GIF → photo pair → our drawn
demo. A row never renders empty; when there is no media the drawn figure *is* the
content. 100 of 143 exercises have media today; the 43 without are the mobility
block the audit recommends adding first, which is exactly where a drawing is
acceptable.

**Where things come from, locally**:
- Catalog, technique, demos, warm-up ramps: **compiled into the app** — they work
  with the Wi-Fi off and are identical on the phone over LAN.
- Your data: **IndexedDB per device**; nothing leaves the machine. LAN sharing is
  an explicit, switchable opt-in that shows the local URL to open on the phone.
- BodyLab → TrainingLab: the `traininglab-export.ts` handoff file (v2), imported
  by hand from Ajustes, never by background sync.

**Plan presentation rules** (the part that was missing):
1. A plan is always shown **as a week and a day**, never as a form. The day the
   user actually faces is one tap away.
2. Every planned set carries its **evidence**: why this exercise (families it
   covers), why this many sets (budget + readiness), why this load (last
   performance). One line, hidden behind a "¿por qué?" tap.
3. **Edits are first-class**: swap, add, remove, reorder and re-time; a manual
   edit is remembered for the next session and the planner says so.
4. **Warm-ups are visible but weightless** — shown in the session, excluded from
   the volume maths, labelled.
5. **Nothing is a dead end**: every empty state offers the next action (import,
   pick from the catalog, or start freestyle).

## 11. Phased delivery

| Phase | Scope | Ships | Effort |
|---|---|---|---|
| **P0 · Shell** | Split `TodayPage` into screens, add the nav shell (tab bar / rail) + hash sync, move current content in unchanged | the same features, reachable; the monolith dies | M |
| **P1 · Library & detail** | Ejercicios list, filters, sheets, detail with 4 tabs | "what can I do and how" becomes answerable in-app | L |
| **P2 · ZEN v2** | Set table with PREVIOUS, set-type badges, effort per set, sticky rest bar, next peek | the logging loop gets fast | M |
| **P3 · Progreso** | Selectors, `TrendChart`, KPI tiles, heatmap, PR list, muscle balance | "am I improving" becomes answerable | L |
| **P4 · Week & coach** | Week editing, coach proposal sheet with the reason trail, plan provenance badge | the horizontalisation becomes usable | M |

Every phase: typecheck, root + web tests, screenshots at 414×896 and 1440×900
committed, `UI_DESIGN.md` updated if a rule moved, and one push.

## 12. What we refuse

Social feed and followers · leaderboards · invented percentiles · streak
loss-anxiety · autoplay video · webfonts · light mode · telemetry · any borrowed
artwork.

## 13. Open questions for the owner

1. **Rename** — "Training App" was your preference and we deferred it. The nav
   shell is the cheapest moment to do it: one place, one version bump. Say the
   word and P0 includes it.
2. **Bottom tab bar** — it changes thumb ergonomics on the iPhone substantially;
   confirm you want navigation at the bottom (recommended) rather than the
   current top switch.
3. **Nivel estimado** — do you want per-family strength tiers at all, given we
   must label them as internal reference (no population data)? "Yes with the
   honest label" is my recommendation; "no" is a perfectly good answer.
4. **Mobility block** — do we add the 12 stretching entries (audit Tier 2) in P1
   so the library is complete, or leave it as its own phase?

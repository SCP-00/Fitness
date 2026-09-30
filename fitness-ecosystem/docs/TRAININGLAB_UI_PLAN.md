# TrainingLab — UI redesign plan (v2)

> **Status: the design contract for the redesign session.** v1 (2026-09-29) proposed
> the architecture from studying other apps. v2 (2026-09-29 c) is rewritten against the
> owner's own mockups (`docs/reference/traininglab-design/`) and five locked decisions.
> Where v1 and v2 disagree, **v2 wins**; the disagreements are listed in §0 so nothing
> silently drifts.

The mockups are the visual authority. This file is the _engineering_ authority: it says
which of the mockup's ideas map onto data we actually have, which need new data, and
which we refuse. Reference material is local and gitignored — the conclusions below are
what ships.

### 0.1 Interaction revision (2026-09-29 d)

The owner request adds a usability constraint that is now part of this contract:
TrainingLab must remain legible and operable when the user is fatigued, on a phone, or
using a desktop window narrower than the reference capture. The vertical page is a
container, not the navigation model. The following decisions are therefore normative:

- **The desktop rail is dynamic.** It opens at 245 px and can collapse to an icon rail
  of 78 px. The preference is local to the device and the labels remain available as
  native tooltips and accessible names. The main content reflows with the rail instead
  of leaving a dead gutter.
- **Context tags are destinations.** The short row below the page header links directly
  to Entrenar, Ejercicios, Progreso and Esta semana. A tag is not decorative metadata:
  it is a one-tap route or same-page focus target.
- **One exercise, one decision.** Inicio opens only the next planned exercise. Other
  exercise cards keep their prescription and log controls available, but are collapsed
  until requested. This preserves the complete plan without making the user scroll past
  repeated controls.
- **The body map uses the owner's supplied anatomical line art, not a hand-drawn SVG body.** A
  pixel-ID region mask aligns to the front/back PNG; a React canvas paints those regions
  from the selected lens. The map and detail list share the same data, provide accessible
  selection, and collapse cleanly on mobile.
- **Owner correction (2026-09-30): the primary heatmap is strength vs. a published external
  ideal/reference, not training volume.** The intended map has a direct tag/lens to switch
  between (1) strength relative to a defensible external standard and (2) training exposure
  estimated from logged sets. The latter remains useful, but is not a proxy for strength.
  The meaning of “ideal” is a level in a published external norm, not a user-entered target
  or the golden-ratio anthropometric preset. Do not silently remove the existing
  anthropometric-goal lens; keep it distinct until the owner approves where it belongs.
  See `AGENT_HANDOFF.md` for the research handoff and unresolved evidence gaps.
- **Reps per set are the user's to decide (2026-09-29 e).** Every exercise card and
  the ZEN facts row carry an editable rep range; an override persists per exercise
  (`settings.repOverrides`), flows into Inicio, ZEN and the load suggestion, and is
  cleared with one tap back to the planner's default.
- **Mobile favors horizontal compression.** KPI tiles and context tags use short,
  thumb-scrollable strips; the fixed bottom bar remains the global navigation; primary
  logging controls keep a 44 px target. Desktop retains the two-column composition.

These are implementation decisions derived from the owner's `Boseto_preview.html` (free to
reuse) and the reference captures in `docs/reference/traininglab-design/` (gitignored on
purpose: the conclusions ship, the files do not). The normative interface contract is
[UI_DESIGN.md](UI_DESIGN.md); this file is the engineering plan that follows it.

## 0. What the mockups changed

| Topic                        | v1 said                                  | v2 (owner-confirmed 2026-09-29 c)                                                                                                  |
| ---------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Palette                      | current `#0a0a0a` + `#f97316`            | **adopt the mockup's cooler dark palette** (`#080b0e` … `#1b2229`) and the punchier `#ff7300` accent                               |
| Light mode                   | refused                                  | **dark only for now**; the token layer stays themeable, the toggle is hidden until a light theme exists                            |
| Photography                  | none; rig drawings only                  | **free-license stock photos** (Pexels/Unsplash-class), with a provenance manifest and the silhouette/rig as the mandatory fallback |
| ZEN                          | "only the exercise" (extreme minimalism) | **focused, not empty**: the current exercise owns the screen, everything else is _collapsible_                                     |
| Percentiles                  | refused outright                         | **published strength standards**, cited, validated, classified by sex, age and body size — with an explicit honesty label          |
| Body composition in Progreso | not addressed                            | **muscle map painted from our own logged sets**; anthropometrics only appear when BodyLab supplies them                            |
| Exercise detail              | 4 tabs assumed                           | confirmed: `Guía · Resumen · Rango · Historial` — the first, second and fourth already have data (see §4.2)                        |

## 1. Design language

The palette, radii and surface vocabulary come from the mockups and stay **identical
across both apps' component vocabulary**, so a component can move between apps with a
token swap.

```
bg        #080b0e   surface  #10151a   surface-2 #151b21   surface-3 #1b2229
border    #29313a   text     #f3f5f7   soft      #9ba5af   muted     #68727d
accent    #ff7300   accent-l #ff9447   accent-d  #c75200   on-accent #08121a
success   #39d98a   warning  #ffc857   danger    #ff4f4f   info      #46a8ff
radius    16px card / 10px control     sidebar   245px open / 78px compact (≥ 1024px)
```

- **Surfaces are a hierarchy, not decoration**: `bg` is the page, `surface` is a card,
  `surface-2` is a control _inside_ a card, `surface-3` is a control inside that. A card
  never sits on a card of the same level.
- **Type**: one sans stack (system UI), no webfonts. Scale: 11 px uppercase labels with
  wide tracking · 13 px secondary · 15 px body · 20–24 px section titles · 32–40 px
  headline numbers, always `tabular-nums`.
- **Icons**: one stroke set, 1.75 px, 16/20/24 px. Decorative emoji from the mockups are
  replaced by drawn icons so the tone stays clinical; the _one_ exception is deliberate:
  nothing in the logging loop uses emoji.
- **Motion**: 150–220 ms, ease-out, and every transition moves something meaningful
  (entry animation of a banner, a rest ring draining). `prefers-reduced-motion` turns
  them all off.
- **Focus**: 2 px accent ring, offset 2 px, never removed.

## 2. The shell and navigation

Today: one column, two panes (`Entrenar` / `Ajustes`) behind a switch, 1 559 lines in a
single file. It cannot hold a library, a logger, progress and a planner.

**Five real destinations**, hash-routed, no new dependency:

| Route                               | Destination       | Answers                                    |
| ----------------------------------- | ----------------- | ------------------------------------------ |
| `#/hoy`                             | **Inicio**        | ¿Qué toca hoy y con cuánta energía estoy?  |
| `#/ejercicios`, `#/ejercicios/<id>` | **Ejercicios**    | ¿Qué puedo hacer y cómo se ejecuta?        |
| `#/sesion`                          | **Entrenamiento** | Empezar y registrar (ZEN vive aquí)        |
| `#/progreso`, `#/progreso/<tab>`    | **Progreso**      | ¿Estoy mejorando y cómo voy de equilibrio? |
| `#/ajustes`, `#/ajustes/<section>`  | **Ajustes**       | Equipo, preferencias, coach, datos         |

- **Desktop (≥ 1024 px)**: dynamic 245 px rail on the left, collapsible to a 78 px
  icon rail. Active item = accent-filled pill with a left indicator bar, brand at the
  top, "Modo local · todo funciona sin conexión" card at the bottom (a privacy
  statement, not a status light). The open/compact choice is persisted locally.
- **Phone (< 1024 px)**: the rail becomes a **fixed bottom tab bar**, 5 items, the centre
  one an accent FAB (`Entrenar`) that is 8 px taller than the bar. `padding-bottom` on
  the scroll container reserves `72px + env(safe-area-inset-bottom)`.
- **ZEN takes over the screen**: no rail, no tab bar. The way out is an explicit back
  control, never a gesture-only affordance.
- Hash sync is ~40 lines in `lib/router.ts`: it buys the iPhone back-swipe, deep links
  from any card to its detail, and addressable screens for Playwright and screenshots.
- **Plans taxonomy** (four nouns, used consistently): **Plantilla** (a saved day) ·
  **Semana** (the distribution) · **Sesión de hoy** (derived, concrete) · **Sesión libre**
  (picked as you go).

## 3. Screen: Inicio

Two columns above 1200 px, one below, mirroring the mockup.

- **Hero**: `Sesión de hoy` · focus line (`Fuerza · Tren superior`) · three meta chips
  (duración, lugar, equipo) · one primary CTA (`Empezar`). The hero is the only card with
  a media background, and the layout must look finished **without** it (§8).
- **KPI strip**: four tiles — constancia de la semana, recuperación (readiness), volumen
  semanal (`series hechas / planificadas`) y peso corporal (only if there is data).
  Each tile shows a value, a one-line explanation, and a trend sparkline where a series
  exists; a tile with no data says so instead of showing `—`.
- **Semana**: one row per training day, today marked, each row tappable → that day's
  list. Days already trained show a check; the rest show what the planner intends.
- **Siguiente sesión / siguiente ejercicio**: the exercise that is next _right now_,
  with sets done/total, target reps and load, and a single arrow that opens ZEN.
- **Right rail (desktop only)**: progress ring (constancia), badges, and the `Enfócate`
  card that links to ZEN.
- **Readiness is collapsed by default** (three 1–5 sliders + sore families) and carries
  its three values in the badge when collapsed. Changing a slider re-derives the plan in
  place and explains what moved.
- **No empty dead end**: no BodyLab data → "usar el catálogo interno" + import CTA.

## 4. Screen: Ejercicios

### 4.1 The list

- Search first (accent-insensitive, ES + EN), then filter chips: **Músculo · Equipo ·
  Categoría · Nivel**. Chips open a bottom sheet on the phone and a popover on desktop.
- Rows: 72 px on the phone, 56 px on desktop — media thumb, name, `músculo · patrón ·
tipo`, trailing chevron. The row is tappable end to end; every control inside it stops
  propagation.
- Sort: **Recientes** (what you actually log) · A–Z · Nivel técnico.
- When a session is open, each row gains `Añadir` and becomes `Añadido` — this is what
  makes ZEN's _Sustituir_ fast.
- Count line: `143 ejercicios · 94 con guía de técnica` (never a bare number).

### 4.2 Ficha de ejercicio — four tabs, and what feeds each

| Tab           | Content                                                                                                                   | Source                                                        | Status                     |
| ------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | -------------------------- |
| **Guía**      | setup, execution, mistakes, safety, breathing, tempo, effort target (RIR), `techniqueLevel` + why, per-exercise overrides | `exercises/technique.ts` — 28 movement patterns + 9 overrides | **exists**                 |
| **Resumen**   | primary/secondary muscles with intensity, equipment, load type, progression axes, hypertrophy note, joints under stress   | `catalog.ts` + `traits.ts`                                    | **exists**                 |
| **Historial** | every logged set, best set, estimated 1RM over time, sessions count, "la última vez"                                      | TrainingLab's own `TLSet[]`                                   | **exists** (needs a chart) |
| **Rango**     | where your estimated 1RM sits against **published standards**, by sex, age band and body size                             | a cited external source — **to be validated** (§9)            | **missing**                |

Layout: media hero, name, `músculo · patrón`, then the tab strip. Both `Guía` and
`Resumen` open with the same 3-line "quick steps" summary the mockup shows, because that
is the part people read while standing at the rack.

The tab strip shows `Rango` greyed with a reason ("se activa cuando tengamos tu peso y
sexo en Ajustes") rather than hiding it or faking it.

## 5. Screen: Entrenamiento (ZEN)

ZEN stops being a full-screen overlay with a modal vocabulary and becomes a **route**.

**ZEN is focused, not empty.** The current exercise owns the screen; everything else is
collapsible. Concretely, three collapsible regions — never invisible, never in the way:

```
┌──────────────────────────────────────────────────────────────┐
│ ←  Sesión de hoy · Fuerza · Tren superior        ☰  ⏸  12:41 │  ① header
├──────────────────────────────────────┬───────────────────────┤
│                                      │ ▸ Enfócate    (open)  │
│  [ media: foto → silueta → rig ]     │ ▸ Guía rápida (closed)│  ③ rails
│                                      │ ▸ Registro    (open)  │
│  Press de banca con barra            │ ▸ Notas       (closed)│
│  Pectoral mayor · Tríceps · Hombro   │                       │
│  [Guía] [Sustituir] [Notas]          │                       │
│                                      │                       │
│  SERIE  ANTERIOR   KG     REPS   ✓   │                       │
│   1     60×8       [ 60 ] [  8]  ✓   │  ② the set table      │
│   2     60×8       [ 60 ] [  8]  ✗   │                       │
│   C     —          [ 40 ] [ 10]   🅲  │                       │
│  Esfuerzo  RIR [1][2][3][4][5]       │                       │
│  ── Descanso 1:30 ▸ ⏭ ───────────────│  ④ sticky rest bar    │
└──────────────────────────────────────┴───────────────────────┘
```

- **① Header**: back, session context, a `☰` that collapses _both_ side regions at once
  (the "modo foco" state), pause, and the elapsed clock. Pause stops the session clock
  _and_ the rest timer, and says so in one line — it never silently eats a rest interval.
- **② The set table** is the spine: `SERIE · ANTERIOR · KG · REPS · ✓`. The `ANTERIOR`
  column is the single most valuable thing on screen and is already in the mockup and the
  plan. Set-type badges: `C` calentamiento (muted, excluded from volume) · normal ·
  `D` dropset · `F` fallo. `Esfuerzo` per set (RIR 1–5, written out: "quedan 2 en
  reserva") is the primary effort input, thumb-sized.
- **③ Rails**: on desktop, `Enfócate` / `Guía rápida` / `Registro actual` / `Notas` as
  `<details>` cards. On the phone they become one sheet behind `⏱` and `…`.
- **④ Rest bar**: sticky at the bottom, owned by the timer, with `+15 s`, `⏭ saltar` and
  a countdown that survives navigation within the session.
- **Siguiente serie / siguiente ejercicio**: one line, always visible at the bottom of
  the column, tappable.
- **Finish**: the existing celebration banner + sound stay (already good). The summary
  shows what changed vs the plan, never a score.

## 6. Screen: Progreso

- **Period and metric selectors** (`Peso · Fuerza · Volumen · Medidas`) with an explicit
  date range in small type under the headline. Never a bare percentage with no anchor.
- **KPI tiles**: sesiones, series, días entrenados, PRs.
- **Mapa muscular (2D)** — the owner's front/back line-art image with a pixel-aligned
  region mask, painted live from the selected period's own logged working sets. Set credit
  follows catalog involvement: primary = 1 equivalent set, secondary = 0.66, accessory =
  0.33; warm-ups are excluded. Colours are relative to the user's highest-covered family
  in that period, not a population norm. Raw kg are not compared across muscle groups,
  because exercise leverage and equipment make that comparison misleading. The map does
  not claim to measure muscle size, hypertrophy, pain or recovery. It needs no BodyLab
  data and uses the same exercise catalogue and family mapping as the planner.
- **Volumen por grupo muscular**: stacked bars split into series efectivas /
  complementarias / accesorias — that split maps 1:1 onto `MuscleInvolvement.intensity`
  (3/2/1) which the catalog already carries.
- **Progreso general**: one `<TrendChart>` (0 deps, SVG, drag to read a value, accessible
  table fallback) per selected metric.
- **Mejores avances**: PR list with value, date and a `NUEVO` badge only during the 7
  days after it happened.
- **Recomendaciones del asistente**: the coach's proposals as _actions_ (`Ver ejercicios
→`, `Ver plan →`), each with its reason trail. Text without an action is not a
  recommendation.

## 7. Screen: Ajustes

Sections in the mockup's order, each a `<details>` card, with sub-routes
(`#/ajustes/equipo`):

1. **Perfil** — nombre, fecha de nacimiento (**no** edad escrita), sexo, altura, peso.
   Needed by §9; explained in the field, not in a help page.
2. **Objetivo** — goal · nivel · días por semana (2–6) · presupuesto de tiempo · unidad
   (kg / lb USA con la conversión exacta `1 kg = 2.2046226218488 lb` visible).
3. **Equipo disponible** — the gear inventory with presets.
4. **Entrenamiento** — modelo de decisión, registrar con la app, notificaciones, sonido.
5. **Datos** — importar/exportar, BodyLab, LAN del hogar, borrar datos locales.
6. **Acerca de** — versión, privacidad ("sin telemetría, sin descargas en segundo plano").

## 8. Media: what the user sees when there is no photo

Four levels, resolved per exercise, in this order:

1. **GIF licenciado** — if a licensed animation exists for that exercise.
2. **Foto libre** — the new level (decision 2026-09-29 c).
3. **Silueta generada** — our own rig / generated still (§ the `tools/ai-media` pipeline).
4. **Rig animado** — `PATTERN_DEMOS`, 28 patterns, already rendered in-app; the only
   level that actually _moves_, and the one that teaches.

**Rules that make this safe:**

- Only licenses that permit commercial use **and** redistribution inside an application:
  CC0 / public domain, Pexels, Unsplash. No scraped images, no other app's artwork, ever.
- Every file carries provenance in `public/media/credits.json`: id, file, author, source
  URL, license, retrieval date. The manifest is committed; the images are fetched by a
  script (same shape as `tools/ai-media/fetch-models.mjs`, zero new dependencies).
- **A curated subset ships committed** (the exercises the planner actually prescribes
  most); the rest are fetched locally. Budget: ≤ 250 KB per image, WebP with a JPEG
  fallback, and a hard cap on the committed total so the repository stays cloneable.
- **The layout is designed for slot 3, not slot 2**: thumbnails have a fixed aspect ratio
  and the silhouette fills it. A missing photo must never look like a broken app, and the
  list must not reflow when photos arrive.
- An image never replaces the technique text, the cues or the rig animation. The photo
  says _what it looks like_; the rig shows _what moves_.

## 9. Rango: published strength standards, done honestly

The owner's requirement (2026-09-30): make the Progreso map's primary heat a **relative
strength level against a published external ideal/reference**, with an optional separate
training-exposure/volume lens. The owner wants height, body weight and sex considered;
age should also be applied where the source stratifies by it. “Ideal” means the norm's
published level, not an invented target. The exact height-aware method remains a research
gate: do not ship a score until sources and applicability are validated.

Non-negotiable constraints before the map or `Rango` can ship:

1. **Source quality and population fit:** prefer peer-reviewed normative data or a published
   standard with documented sample, population, lift protocol, year and data availability.
   Competition-only norms must be labelled as such; they must not be presented as norms for
   every gym user. Proprietary app data alone is not an acceptable ideal/reference.
2. **Inputs and unsupported variables:** stratify by sex, body mass/weight class and age
   when the source does so. The owner specifically wants height included, but height may
   affect a result only through a validated source/model that actually supports it. If the
   chosen reference does not account for height, show that limitation and ask the owner
   whether to proceed with a clearly labelled fallback; do not silently omit height or
   invent a correction. Clarify any remaining ambiguity with the owner before locking the
   formula.
3. **Strength measure:** compare an actual or validated estimated 1RM for the same lift
   and protocol against that lift's reference. Never compare absolute kilos across muscle
   groups, and never infer local muscle strength from unrelated compound lifts without a
   validated mapping. If evidence or logged data is insufficient for a region, show a
   neutral/no-data state with the reason, not a fabricated weak/strong color.
4. **Coverage:** only lifts and regions with a defensible matching standard get a
   strength-reference color. For unsupported exercises keep the exercise history/internal
   progress view, clearly labelled as personal history rather than an external standard.
5. **Independent volume lens:** logged hard-set stimulus remains a separate view, excludes
   warm-ups, credits primary/secondary/accessory involvement transparently, and is described
   as training exposure—not strength, hypertrophy, recovery or muscle size.
6. **Visible provenance:** show source, year, population/sample, lift protocol, applicable
   sex/age/body-mass bands, any height handling, uncertainty/limitations, and a reachable
   “¿Cómo se calcula?” explanation. Tiers must preserve the source's actual percentiles or
   labels; do not imply medical assessment.

Initial source audit only (not an approved implementation choice): van den Hoek et al.
(2024) report squat/bench/deadlift norms from 809,986 drug-tested, unequipped powerlifting
entries by sex, age classification and weight class, using relative load/body mass; the
sample is competitive powerlifters and the abstract does not establish height-based
stratification. Folland et al. (2008) discuss allometric strength scaling and note that
normalizing by body mass may leave height effects; their small study was knee strength in
young men, not a general lifting-standard table. These papers are research leads, not yet
validation for the requested general-user map. [van den Hoek et al.](https://doi.org/10.1016/j.jsams.2024.07.005) ·
[Folland et al.](https://pubmed.ncbi.nlm.nih.gov/18172672/).

This is a research task with a validation gate, not a copy-paste. It is scheduled in P4
and refuses to ship a number it cannot defend.

## 10. Data ownership (the standalone rule)

| Data                                                  | Owner                           | TrainingLab standalone behaviour           |
| ----------------------------------------------------- | ------------------------------- | ------------------------------------------ |
| Sets, reps, load, effort, rest                        | TrainingLab                     | works fully                                |
| Weekly plan, readiness, gear                          | TrainingLab                     | works fully                                |
| Volume per muscle family                              | TrainingLab (from its own sets) | works fully                                |
| Exercise catalog, technique, traits, rig              | shared `core/exercises`         | works fully                                |
| Estimated 1RM, records, trends                        | TrainingLab                     | works fully                                |
| **Body composition** (weight, %fat, muscle mass, BMI) | **BodyLab**                     | hidden, with a link and an import CTA      |
| Anthropometric muscle score (2D/3D)                   | BodyLab                         | optional second layer on the map, labelled |

TrainingLab never requires BodyLab to be installed, reachable, or up to date. Where it
shows BodyLab-derived data, it says so and it says when it was imported.

## 11. Component inventory (build once)

`AppShell` (rail / tab bar) · `NavItem` · `HeroCard` · `KpiTile` · `WeekStrip` ·
`ExerciseRow` · `ExerciseThumb` (the 4-level cascade) · `FilterSheet` · `TabStrip` ·
`SetTable` + `SetRow` + `EffortPicker` + `SetTypeBadge` · `RestBar` · `NextUpLine` ·
`SectionCard` (details-based, exists) · `StatCard` (exists) · `Badge` (exists) ·
`Switch` (exists) · `TrendChart` · `MuscleMap2D` · `VolumeStack` · `RecordList` ·
`CoachCard` · `EmptyState` · `Celebration` (exists).

## 12. Mobile rules (extends `UI_DESIGN.md`)

- Bottom bar reserves `72px + env(safe-area-inset-bottom)`; the FAB is not in the safe
  area. Every tappable is **≥ 44 px**; inputs stay **≥ 16 px** font (no iOS zoom).
- Any grid whose children could be a phone gets an explicit `grid-cols-1` below `sm`, so
  an `auto` column cannot overflow its parent.
- Tables scroll horizontally inside their own container (the set table is the one place
  where this is allowed); the page body never scrolls sideways.
- Every JSX asset URL goes through `import.meta.env.BASE_URL` (the LAN server mounts the
  app at `/traininglab/`).
- Verified at **390 × 844** and **1440 × 900** in the same commit, with screenshots.

## 13. What we refuse

Social feed and followers · leaderboards · **invented** percentiles · streak loss-anxiety
(we show weekly consistency, not a chain that can break) · autoplay video · webfonts ·
telemetry · any borrowed artwork · any number from a source we cannot cite.

## 14. Phases (shell first, screen by screen)

| Phase                                                      | Scope                                                                                                             | Why this order                                                                                                      |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **P0 · Shell** ✅ _(shell + state lift done 2026-09-29 d)_ | `app/router.ts`, `AppShell` (rail + tab bar), five destinations reachable, today's content moved in **unchanged** | the navigation is the thing every later screen hangs off; content behaviour is untouched so a regression is obvious |
| **P1 · Design language** ✅                                | palette + surfaces + type scale + focus rings; component extraction (`HeroCard`, `KpiTile`, `ExerciseThumb`)      | cheap, visible, and de-risks every screenshot after it                                                              |
| **P2 · Inicio** ✅                                         | hero, KPI strip, week strip, next-up, right rail, readiness collapsed                                             | the screen you see 20× a day                                                                                        |
| **P3 · ZEN** ✅                                            | set table with `ANTERIOR`, set types, effort per set, sticky rest bar, collapsible rails, next-up                 | the screen you use with one hand, mid-set                                                                           |
| **P4 · Ejercicios + ficha** ✅ _(`Rango` gated on §9)_     | list, filters, four tabs; `Rango` gated on §9                                                                     | the library makes ZEN's _Sustituir_ fast                                                                            |
| **P5 · Progreso** ✅ _base_; ⏳ _strength-reference lens_  | selectors, `TrendChart`, KPIs, current volume/goal lenses, volume stack, records, coach cards; published-standard strength lens is a new research-gated addition | needs P1's components and real logged data to look right |
| **P6 · Media** ⏳                                          | credits manifest, fetch script, curated committed subset, cascade rules                                           | last, and independent: the layout must already look finished without it                                             |

Every phase: `tsc -b`, root + web tests, lint, a build, screenshots at both widths, this
file updated if a rule moved, one commit.

## 15. State of the build (2026-09-29 e)

**Done and verified:** the modular shell (`app/App.tsx`, `app/router.ts`,
`app/nav.ts`) with `app/store.tsx` owning the state the monolith used to hold;
the design system (`ui/primitives.tsx`, `ui/icons.tsx`); the v2 palette with
measured contrast; **Inicio** (hero, KPI strip, week strip, session with the next
exercise open, rail with ring/numbers/ZEN); **ZEN v2** as the `#/sesion` route
(header, set table with `Anterior`, effort, sticky rest bar, collapsible rails);
**Progreso** (period selector, metric tiles, the anatomical body map painted from
the log with its **two existing lenses** — training stimulus and anthropometric goal
proximity —, family split, records, assistant); and the **Ejercicios library** with its
detail tabs — `Rango` disabled with its reason, `Historial` filling as sets get
logged. The interaction revision is in: dynamic rail, context tags, collapsible
exercise cards, mobile KPI strips. 15 root tests pin the library logic and
`tests/training/test_body_map.test.ts` pins both map lenses plus the rep
overrides.

**New owner direction (2026-09-30):** the current volume/goal map is not yet the
requested strength-standard heatmap. The primary strength-vs-published-reference
lens and alternate volume lens need source validation and implementation. The existing
anthropometric goal lens must not be silently relabelled or removed; its placement is an
owner decision. Until research is approved, existing app behavior remains unchanged.

**Pending:** (1) strength-reference research and lens; (2) the media manifest and the curated photo subset (§8);
(3) `Rango` (§9), which waits for a cited source; (4) `Historial` becomes a chart
when there is history to chart; (5) `src/features/today/ui.tsx`, the deprecated
re-export shim, disappears with its last import.

The TrainingLab desktop shell is now **0.2.0** (`src-tauri/tauri.conf.json`,
`Cargo.toml`, `package.json` and the `APP_VERSION` shown in Ajustes) — the web
build changes reach Tauri through `frontendDist: ../dist`, and the CSP was
already roomy enough for everything the redesign added (inline SVG, data-URI
images, WebAudio, loopback for the optional LLM).

## 16. Open questions

1. **App name** — "Training App" was mentioned once; the nav shell is the cheapest moment
   to rename, and it also touches the installer and the Pages site.
2. **Committed photo budget** — how many MB may the repository carry for the curated
   subset before it is fetched at build time instead?
3. **Streaks** — confirm the reframing from "racha" (a chain) to "constancia semanal".
4. **Mobility block** — do the 12 stretching entries enter the library in P4?

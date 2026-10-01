# TrainingLab UI — design rules & responsive contract

> Source of truth for interface decisions. The palette changes only with the
> owner's say-so — and it did on **2026-09-29 (c)**: the mockups replaced the
> first dark palette with a cooler set of surfaces and a punchier ember orange
> (`#ff7300`). Every number below was measured on a real viewport or computed
> from the actual hex values; the contrast ratios are the output of the checker,
> not an impression.
>
> This file is the **contract**; the redesign that exercises it is
> [TRAININGLAB_UI_PLAN.md](TRAININGLAB_UI_PLAN.md) (navigation, library, ZEN v2,
> progress), and the content it presents is audited in
> [EXERCISE_DATA_AUDIT.md](EXERCISE_DATA_AUDIT.md). When a rule here changes,
> both files move in the same commit.
>
> **2026-10-01 — current interaction contract.** The rail collapses (245 px open
> / 78 px compact) and remembers the choice; Inicio is action-first; Semana is a
> separate destination; ZEN keeps its primary log action reachable as the
> keyboard opens; and Progreso uses the owner's raster body map plus a pixel-ID
> mask. Current map lenses remain exposure and anthropometric goals.

## Tokens (do not invent new ones without adding them here)

| Token                                | Value                                         | Use                                                |
| ------------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| `--tl-bg`                            | `#080b0e`                                     | page background                                    |
| `--tl-surface`                       | `#10151a`                                     | cards (`tl-card`), the rail, the tab bar           |
| `--tl-surface-2`                     | `#151b21`                                     | inputs, chips, a control **on** a card             |
| `--tl-surface-3`                     | `#1b2229`                                     | a control inside a control (media slot, inner row) |
| `--tl-border` / `--tl-border-strong` | `#29313a` / `#39434e`                         | hairlines, hover                                   |
| `--tl-text` / `secondary` / `muted`  | `#f3f5f7` / `#9ba5af` / `#8b96a1`             | copy hierarchy                                     |
| `--tl-accent`                        | `#ff7300`                                     | primary actions, today, watched joints             |
| `--tl-accent-strong` / `soft`        | `#ff9447` / `#c75200`                         | hover on a fill / pressed, rings                   |
| `--tl-accent-wash`                   | `rgba(255,115,0,.12)`                         | focus ring, today wash, media slot gradient        |
| `--tl-on-accent`                     | `#0a0a0a`                                     | text/icons **on** an accent fill                   |
| success / warning / danger / info    | `#39d98a` / `#ffc857` / `#ff4f4f` / `#46a8ff` | state only, never decoration                       |

Radii: cards `1rem`, inputs/buttons `0.75rem`, chips/badges `0.375rem`.
Text: 15px body, 11px meta/chips, 20–24px section titles, 32–40px headlines —
`tabular-nums` on anything measured.

**Measured contrast** (worst surface each colour is used on): text 16.8 · secondary
7.3 · muted 5.6 · accent 5.9 · on-accent 7.3 · success 10.0 · warning 11.9 ·
danger 5.7 · info 7.3. The mockup's muted `#68727d` measured 3.55:1 on
`surface-2` and failed AA for 11px labels, which is why the token is one step
lighter.

## Module layout (where an interface change goes)

```
traininglab/apps/desktop/src/
  app/       App.tsx (shell) · router.ts (hash routing) · nav.ts (destinations)
  ui/        primitives.tsx · icons.tsx      ← the design system, screen-agnostic
  screens/   one file per destination
  features/  <domain>/ — pure logic + the components that belong to that domain
  lib/       engine glue: adapter, plan, records, units, format, i18n, llm, db…
```

Rule: `ui/` never imports a screen or a feature; `features/*/library.ts`-style
pure modules never import React.

## Navigation

Six destinations, one definition (`app/nav.ts`), two shells:

| Viewport          | Shell                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `≥ 1024px` (`lg`) | fixed **rail**, **245 px open / 78 px compact**, active item = accent fill; rail and content both read `--tl-rail-current`, so the page reflows instead of leaving a dead gutter |
| `< 1024px`        | fixed **bottom tab bar**, 72 px + `env(safe-area-inset-bottom)`; six destinations, with Entrenar visually emphasized                                                                  |

The rail's toggle (`tl-rail-toggle`) sits in the rail head and the choice is
persisted under `localStorage['traininglab.rail']`, so a WebView, a phone and a
desktop each keep their own answer. In the compact state labels are visually
hidden but never lost: every item keeps its accessible name and `title`, and the
toggle announces the action it will perform ("Contraer / Expandir panel
lateral").

Routes are hash-only (`#/hoy`, `#/semana`, `#/ejercicios/<id>`, `#/progreso`) — no router
dependency, no server rewrite rules, and the phone back-swipe works. ZEN takes
over the screen: no rail, no tab bar, and an explicit way out.

| Range            | Layout                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `< 640px` (`sm`) | **Phone, one column.** Horizontal strips scroll sideways; `tl-set-row` wraps; frequent actions ≥ 44 px. |
| `640–1023px`     | Single column, centred, `max-w-3xl`–`5xl`, bottom navigation retained.                                 |
| `≥ 1024px`       | Rail + content; keyboard-first density, with content reflow when the rail collapses.                  |

## Hard rules (enforced by audit, see `tests/` + the manual 390×844 run)

1. **Tap targets ≥ 44 px** on phones (`min-height: 2.75rem` below `sm`). The
   "Añadir serie" button and the tab-bar items are the most-tapped controls.
2. **Inputs ≥ 16px font** or Safari iOS auto-zooms on focus. Global rule:
   `input, select, textarea { font-size: max(16px, 1em); }`.
3. **No horizontal scroll** at any width ≥ 320px. Grid children get explicit
   `grid-cols-1` below `sm`; a wide table scrolls inside its own container.
4. **Safe areas**: `viewport-fit=cover` + `env(safe-area-inset-*)` on `body`,
   `100dvh` not `100vh`, and the tab bar reserves `72px + inset` so a list never
   ends under the home indicator.
5. **Modals are bottom sheets** on phones (`items-end rounded-t-3xl`), centered
   cards from `sm` up; max-height `92dvh` with internal scroll.
6. **Never parse user numbers with bare `parseFloat`/`parseInt`** —
   `parseNumberInput` (Spanish decimal comma). It is a UI rule because it lives
   in the inputs.
7. **English code, Spanish-first copy** via `i18n.ts`; every new string goes
   through the dictionary (both languages) — no inline literals in JSX.
8. **A missing image is a designed state.** Media slots have a fixed size and a
   monogram fallback, so the day photos arrive the list does not reflow and
   today nothing looks broken (`TRAININGLAB_UI_PLAN.md` §8).

## Per-device notes

### iPhone 11 Pro Max · Safari (the owner's phone; 414×896, notch + home bar)

- Landscape is unsupported-by-design: the app is a vertical logging flow.
- The notch is covered by `env(safe-area-inset-top)`; the home bar by the tab
  bar's bottom inset. The celebration banner clears both.
- One-hand reach: primary actions live in the bottom half of each card, and the
  navigation is at the bottom of the screen, under the thumb.
- Latest automated browser audit (2026-10-01): no horizontal overflow at 320, 360,
  390, 414, 768, 1024, 1280 or 1440 px; at 390×844, tab bar items measured 65×71 px,
  five visible inputs were ≥16 px, and nine ZEN tap targets were ≥44 px. This is Chromium
  responsive evidence, **not** a physical iPhone/Safari keyboard test. The owner's LAN
  check with the iOS keyboard open remains outstanding.

### Desktop / PC (keyboard first)

- Weight → Enter → reps → Enter logs a set; focus returns to weight.
- Hover states matter (`tl-card-hover`, `tl-btn-ghost` hover); focus rings are
  `tl-focusable` everywhere for Tab navigation.
- The rail is reachable, the library filters are chips, and density returns
  below 44 px (`min-height` only applies < 640px).

### LAN / Pages (tablet, second phone, hub)

- Same as phone rules — the LAN build is the phone build with a `BASE_URL`
  subpath; all asset URLs must go through `import.meta.env.BASE_URL`.

## Component recipes (copy these, don't reinvent)

- **Surface** = `Card` (`padded={false}` when the content is a list).
- **Collapsible card** = `SectionCard` (`<details>`-based; works without JS and
  a screenshot script can force it open with `open`).
- **Row that navigates** = `NavRow` (a real `<button>`: keyboard, screen reader
  and the 44 px target come for free).
- **Toggle** = `Switch` (real checkbox + `role="switch"`).
- **Status label** = `Badge` with `tone`; **filter/choice** = `Chip`; never raw
  colored spans.
- **Media** = `ExerciseThumb` (fixed square, four-level cascade, monogram
  fallback).
- **Context tags** = `tl-context-tag` on a real `<a href="#/…">`. A tag is a
  promise of a destination (Entrenar, Ejercicios, Progreso, Esta semana), never
  a decorative label; the primary one carries `is-primary`.
- **Collapsible exercise card** = `SlotCard`; the toggle is `tl-slot-toggle`
  with `aria-expanded`, and only the exercise that is next is open by default
  (`autoOpen`). Collapsing hides the prescription, the reasons and the logging
  row — never the `hechas / planificadas` counter, which is what a scan needs.
- **ZEN effort** = optional `<details>` control, collapsed by default. The primary
  `Registrar serie` path never requires effort; choosing one of the five effort
  values is an explicit alternate action that logs the current set immediately.
  Keep the summary ≥44 px on phones and never let the sticky action visually hide it.
- **Metric tile** = `MetricTile` (a value, a one-line why, and a `Sparkline` /
  `MiniBars` when a series exists). No tile shows a bare `—`.
- **Period switch** = `Segmented` (Semana · Mes · Trimestre) — the chosen value
  is visible without opening anything.
- **Current body-map controls** = two `Chip`s (`Entrenamiento` · `Objetivos`)
  on the analysis card; in the goal lens a second chip row picks the source.
  This is the shipped volume/anthropometric-goal behavior, not a strength-vs-norm
  map. The separate whole-body `Condición física` card does not measure strength
  per muscle. A per-family external-strength lens is pending evidence and owner
  approval; do not silently relabel either existing mode. Revisit the number and
  placement of controls only with documented semantics and owner direction.
  Editing reps per set = the inline editor on the SlotCard prescription and the
  ZEN facts label (`slot.reps*` keys); `yours` marks an override, `Restablecer`
  clears it.
- **Tabs** = `TabStrip`; a tab that cannot work yet is **disabled with its
  reason written on it**, never hidden and never faked.

## The body map and the separate condition card

The anatomy is the **owner's line art** (`public/traininglab-body-map.png`); a
companion pixel-ID mask (`-regions.png`, one grey value per family) lets a
React canvas recolour the real drawing without redrawing it. It is a
**diagram**, and the screen says so. Preserve the exact semantics of the
currently shipped two lenses while the new per-family strength requirement is
researched:

- **Current `Entrenamiento`** (default). Colour = estimated hard-set stimulus for the
  period (primary 1 · secondary 0.66 · accessory 0.33; warm-ups never count),
  **relative to your own best-covered family** (`familyBalance`). Comparing a
  person against other people needs cited normative data; inventing a
  percentile is the one thing this app refuses.
- **Current `Objetivos`** (2026-09-29 e). Colour = how close the family is to a target
  circumference: 100 = at target, red = far from it. Three declared sources,
  in the user's order: BodyLab's exported measures, per-family targets set in
  Ajustes → Objetivos corporales, or the golden-ratio preset anchored on the
  waist (no waist → the preset refuses and says why). A family with no usable
  target renders grey — an absent number, never a fabricated one.
- **Separate `Condición física` card** (reported 2026-09-30): whole-body axes
  with published references (Cooper, %BF, WHtR, FFMI). It is not painted onto
  the muscle regions and does not turn a whole-body norm into local muscle force.
- **Future external-strength lens:** pending validation of a published source,
  exercise/protocol mapping and owner approval. A compound lift score must not
  be presented as measured strength of every participating muscle. Unsupported
  regions remain neutral and explain why. See `TRAININGLAB_UI_PLAN.md` §9,
  `RESEARCH_IDEALS_BY_SPORT.md` and `BUFFY_IMPLEMENTATION_BRIEF.md`.
- Every family stays reachable without colour: a `<select>` picker, a tap on
  the mask, and the selection read out in an `aria-live` line.
- **No data is a colour too** (`#d6dce1`), and it is not a band: grey means
  "nothing here" (or "no target yet"), red means "at the bottom of the band".
- The legend names the bands and reflects the active lens' actual meaning — do
  not reuse a color direction or label if that would conflate different scales. The family
  list beside the map carries the numbers as text; the map is an accelerator,
  never the only way to read them.
- The goal lens estimates a **shape against a goal**. It does not measure
  hypertrophy, recovery, pain or growth, and the caption below the map keeps
  saying exactly that.

## What we deliberately don't do

- **No light theme yet** (owner's decision, 2026-09-29 c): dark-only, and the
  toggle from the mockups stays hidden until there is a light palette to switch
  to. The token layer is already the only place a theme would live.
- No hamburger navigation: all six destinations are always visible (rail or tab
  bar).
- No infinite scroll: everything is cards; the phone shows ≤ 2 screens of a
  session before a natural break.
- No custom fonts: system stack only (zero webfont cost, native feel).
- No invented percentiles, no streak that can break, no borrowed artwork.

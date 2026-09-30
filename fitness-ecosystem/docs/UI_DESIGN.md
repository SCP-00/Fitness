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
> **2026-09-29 (d) — the interaction revision.** The rail collapses (245 px open
> / 78 px compact) and remembers the choice; Inicio opens with context tags and
> only the next exercise expanded; the body map is a selectable SVG. The rules
> for all three are in this file, in Navigation, Component recipes and
> "The schematic body map".

## Tokens (do not invent new ones without adding them here)

| Token                                | Value                                         | Use                                                |
| ------------------------------------ | --------------------------------------------- | -------------------------------------------------- |
| `--tl-bg`                            | `#080b0e`                                     | page background                                    |
| `--tl-surface`                       | `#10151a`                                     | cards (`tl-card`), the rail, the tab bar           |
| `--tl-surface-2`                     | `#151b21`                                     | inputs, chips, a control **on** a card             |
| `--tl-surface-3`                     | `#1b2229`                                     | a control inside a control (media slot, inner row) |
| `--tl-border` / `--tl-border-strong` | `#29313a` / `#39434e`                         | hairlines, hover                                   |
| `--tl-text` / `secondary` / `muted`  | `#f3f5f7` / `#9ba5af` / `#7f8a95`             | copy hierarchy                                     |
| `--tl-accent`                        | `#ff7300`                                     | primary actions, today, watched joints             |
| `--tl-accent-strong` / `soft`        | `#ff9447` / `#c75200`                         | hover on a fill / pressed, rings                   |
| `--tl-accent-wash`                   | `rgba(255,115,0,.12)`                         | focus ring, today wash, media slot gradient        |
| `--tl-on-accent`                     | `#0a0a0a`                                     | text/icons **on** an accent fill                   |
| success / warning / danger / info    | `#39d98a` / `#ffc857` / `#ff4f4f` / `#46a8ff` | state only, never decoration                       |

Radii: cards `1rem`, inputs/buttons `0.75rem`, chips/badges `0.375rem`.
Text: 15px body, 11px meta/chips, 20–24px section titles, 32–40px headlines —
`tabular-nums` on anything measured.

**Measured contrast** (worst surface each colour is used on): text 16.8 · secondary
7.3 · muted 4.6 · accent 5.9 · on-accent 7.3 · success 10.0 · warning 11.9 ·
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

Five destinations, one definition (`app/nav.ts`), two shells:

| Viewport          | Shell                                                                                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `≥ 1024px` (`lg`) | fixed **rail**, **245 px open / 78 px compact**, active item = accent fill; rail and content both read `--tl-rail-current`, so the page reflows instead of leaving a dead gutter |
| `< 1024px`        | fixed **bottom tab bar**, 72 px + `env(safe-area-inset-bottom)`; five items, the centre one a raised accent FAB                                                                  |

The rail's toggle (`tl-rail-toggle`) sits in the rail head and the choice is
persisted under `localStorage['traininglab.rail']`, so a WebView, a phone and a
desktop each keep their own answer. In the compact state labels are visually
hidden but never lost: every item keeps its accessible name and `title`, and the
toggle announces the action it will perform ("Contraer / Expandir panel
lateral").

Routes are hash-only (`#/hoy`, `#/ejercicios/<id>`, `#/progreso`) — no router
dependency, no server rewrite rules, and the phone back-swipe works. ZEN takes
over the screen: no rail, no tab bar, and an explicit way out.

| Range            | Layout                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `< 640px` (`sm`) | **Phone, one column.** Horizontal strips scroll sideways; `tl-set-row` wraps; every control ≥ 44 px. |
| `640–1023px`     | Single column, centred, `max-w-3xl`–`5xl`.                                                           |
| `≥ 1024px`       | Rail + content; keyboard-first density (40 px controls are fine again).                              |

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
- Last audit 2026-09-29 at 414×896: 0 buttons < 44 px, 0 inputs < 16 px,
  `scrollWidth == 397 ≤ 414`. Re-audit pending on the new shell (390×844).

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
- **Metric tile** = `MetricTile` (a value, a one-line why, and a `Sparkline` /
  `MiniBars` when a series exists). No tile shows a bare `—`.
- **Period switch** = `Segmented` (Semana · Mes · Trimestre) — the chosen value
  is visible without opening anything.
- **Body-map lens** = two `Chip`s (Entrenamiento · Objetivos) on the analysis
  card head; in the goal lens a second chip row picks the source. Editing reps
  per set = the inline editor on the SlotCard prescription and the ZEN facts
  label (`slot.reps*` keys); `yours` marks an override, `Restablecer` clears it.
- **Tabs** = `TabStrip`; a tab that cannot work yet is **disabled with its
  reason written on it**, never hidden and never faked.

## The body map, with two lenses (`features/stats/BodyMap.tsx`)

The anatomy is the **owner's line art** (`public/traininglab-body-map.png`); a
companion pixel-ID mask (`-regions.png`, one grey value per family) lets a
React canvas recolour the real drawing without redrawing it. It is a
**diagram**, and the screen says so. Two lenses, one figure:

- **Entrenamiento** (default). Colour = estimated hard-set stimulus for the
  period (primary 1 · secondary 0.66 · accessory 0.33; warm-ups never count),
  **relative to your own best-covered family** (`familyBalance`). Comparing a
  person against other people needs cited normative data; inventing a
  percentile is the one thing this app refuses.
- **Objetivos** (2026-09-29 e). Colour = how close the family is to a target
  circumference: 100 = at target, red = far from it. Three declared sources,
  in the user's order: BodyLab's exported measures, per-family targets set in
  Ajustes → Objetivos corporales, or the golden-ratio preset anchored on the
  waist (no waist → the preset refuses and says why). A family with no usable
  target renders grey — an absent number, never a fabricated one.
- Every family stays reachable without colour: a `<select>` picker, a tap on
  the mask, and the selection read out in an `aria-live` line.
- **No data is a colour too** (`#d6dce1`), and it is not a band: grey means
  "nothing here" (or "no target yet"), red means "at the bottom of the band".
- The legend names the five bands and flips with the lens — same gradient,
  opposite direction, so the mode switch is readable at a glance. The family
  list beside the map carries the numbers as text; the map is an accelerator,
  never the only way to read them.
- The goal lens estimates a **shape against a goal**. It does not measure
  hypertrophy, recovery, pain or growth, and the caption below the map keeps
  saying exactly that.

## What we deliberately don't do

- **No light theme yet** (owner's decision, 2026-09-29 c): dark-only, and the
  toggle from the mockups stays hidden until there is a light palette to switch
  to. The token layer is already the only place a theme would live.
- No hamburger navigation: the five destinations are always visible (rail or tab
  bar).
- No infinite scroll: everything is cards; the phone shows ≤ 2 screens of a
  session before a natural break.
- No custom fonts: system stack only (zero webfont cost, native feel).
- No invented percentiles, no streak that can break, no borrowed artwork.

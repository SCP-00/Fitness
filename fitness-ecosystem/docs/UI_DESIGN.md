# TrainingLab UI — design rules & responsive contract

> Source of truth for interface decisions. The palette never changes without
> the owner's say-so (ember orange `#f97316` on near-black; it mirrors the
> brand mark). Everything below was verified on real devices / viewports —
> the numbers are promises, not vibes. Last audit: 2026-09-29.
>
> This file is the **contract**; the redesign that will exercise it is
> [TRAININGLAB_UI_PLAN.md](TRAININGLAB_UI_PLAN.md) (navigation, library, ZEN v2,
> progress), and the content it presents is audited in
> [EXERCISE_DATA_AUDIT.md](EXERCISE_DATA_AUDIT.md). Section 9 of the plan
> extends the breakpoint table below — when a rule here changes, both files move
> in the same commit.

## Tokens (do not invent new ones without adding them here)

| Token | Value | Use |
|---|---|---|
| `--tl-bg` | `#0a0a0a` | page background |
| `--tl-surface` | `#141414` | cards (`tl-card`) |
| `--tl-surface-2` | `#1e1e1e` | inputs, chips, inner rows |
| `--tl-border` / `--tl-border-strong` | `#2a2a2a` / `#3f3f3f` | hairlines, hover |
| `--tl-text` / `secondary` / `muted` | `#fafafa` / `#a3a3a3` / `#737373` | copy hierarchy |
| `--tl-accent` | `#f97316` | primary actions, "today", watched joints |
| `--tl-accent-wash` | `rgba(249,115,22,.12)` | focus ring, today row wash |
| success / warning / danger | `#10b981` / `#f59e0b` / `#ef4444` | only for state |

Radii: cards `1rem`, inputs/buttons `0.75rem`, chips/badges `0.375rem`.
Text: 14px body, 11px meta/chips, 24px stat numbers (tabular-nums always for
anything measured).

## Breakpoints

| Range | Layout |
|---|---|
| `< 640px` (`sm`) | **Phone, one column.** Pane switch (Entrenar/Ajustes) in the header; one pane visible at a time; horizontal stat strip; `tl-set-row` wraps, swap goes full-width. |
| `640–1023px` | Single column, centered, `max-w-5xl`; panes stack in order (readiness → stats → session → week → setup). |
| `≥ 1024px` | Same column but every pane renders at once; keyboard-first density (40 px controls are fine again). |

## Hard rules (enforced by audit, see `tests/` + manual 414×896 run)

1. **Tap targets ≥ 44 px** on phones (`min-height: 2.75rem` below `sm`). The
   "Añadir serie" button is the most-tapped control: thumb-sized always.
2. **Inputs ≥ 16px font** or Safari iOS auto-zooms on focus. Global rule:
   `input, select, textarea { font-size: max(16px, 1em); }`.
3. **No horizontal scroll** at any width ≥ 320px. Grid children get explicit
   `grid-cols-1` below `sm` (an `auto` column can overflow its parent).
4. **Safe areas**: `viewport-fit=cover` + `env(safe-area-inset-*)` padding on
   `body`; `100dvh` not `100vh` (Safari URL bar). Standalone PWA meta set
   (`apple-mobile-web-app-capable`, black-translucent status bar).
5. **Modals are bottom sheets** on phones (`items-end rounded-t-3xl`), centered
   cards from `sm` up; max-height `92dvh` with internal scroll.
6. **Never parse user numbers with bare `parseFloat`** — `parseNumberInput`
   (Spanish decimal comma). This is a UI rule because it lives in the inputs.
7. **English code, Spanish-first copy** via `i18n.ts`; every new string goes
   through the dictionary (both languages) — no inline literals in JSX.

## Per-device notes

### iPhone 11 Pro Max · Safari (the owner's phone; 414×896, notch + home bar)
- Landscape is unsupported-by-design: the app is a vertical logging flow.
- The notch is covered by `env(safe-area-inset-top)`; the home bar by the
  bottom inset — the sticky header and the celebration banner already clear both.
- One-hand reach: primary actions live in the bottom half of each card; the
  pane switch is sticky at the top so switching never needs a scroll.
- Audited 2026-09-29 at 414×896: 0 buttons < 44 px, 0 inputs < 16 px,
  `scrollWidth == 397 ≤ 414` (no horizontal overflow).

### Desktop / PC (keyboard first)
- Weight → Enter → reps → Enter logs a set; focus returns to weight.
- Hover states matter (`tl-card-hover`, `tl-btn-ghost` hover); focus rings are
  `tl-focusable` everywhere for Tab navigation.
- Density returns below 44 px (`min-height` only applies < 640px).

### LAN / Pages (tablet, second phone, hub)
- Same as phone rules — the LAN build is the phone build with `BASE_URL`
  subpath; all asset URLs must go through `import.meta.env.BASE_URL`.

## Component recipes (copy these, don't reinvent)

- **Collapsible card** = `SectionCard` (`<details>`-based; header actions slot
  survives `stopPropagation` for interactive badges like the LAN switch).
- **Toggle** = `Switch` (real checkbox + `role="switch"`; label text optional).
- **Status chip** = `Badge` with `tone`; never raw colored spans.
- **Exercise demo** = `ExerciseDemoModal`: bottom sheet, media cascade
  (GIF → still pair → drawn), technique badges, ≤ 4 execution cues + mistakes
  + safety + breathing.
- **Week rows** = `WeekCard`: 44 px rows, today = accent border + wash,
  families as `tl-chip`s, rest days explicit.

## What we deliberately don't do

- No dark/light toggle (the app is dark-only by identity).
- No hamburger navigation: two panes, one switch.
- No infinite scroll: everything is cards; the phone shows ≤ 2 screens of
  session before a natural break (stats strip → session → week).
- No custom fonts: system stack only (zero webfont cost, native feel).

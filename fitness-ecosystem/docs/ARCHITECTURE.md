# BodyLab — Architecture Reference

> Single source of truth for how the code is organized and how data flows.
> Verified against the repository on 2026-09-11. If a README or guide contradicts this file, this file wins — and the other file should be fixed.

## 1. Monorepo Layout

`fitness-ecosystem/` is a pnpm workspace (`pnpm-workspace.yaml`). Node >= 20, pnpm >= 9.

```text
fitness-ecosystem/
├── bodylab/                     # App 1 (BUILT): anthropometry, body modeling, exercise
│   ├── core/                    # Pure engine — NO React, Three.js, Tauri, DOM
│   │   ├── anthropometry/       #   formulas: McCallum, Venus, Adonis, WHtR, Frame, Score
│   │   ├── measurements/        #   data model
│   │   ├── composition/         #   body composition (US Navy, BMI)
│   │   ├── references/          #   reference profiles
│   │   ├── progress/            #   temporal evolution, snapshots
│   │   ├── validation/          #   input/data validation
│   │   ├── export/              #   CSV, JSON, .bodylab bundle
│   │   ├── analytics/           #   Body Age, Health Risk, Prediction, Correlation
│   │   └── database/            #   schema + repository pattern
│   ├── integrations/            # External adapters (each owns its bridge code)
│   │   ├── oxihuman/            #   3D parametric body (WASM)
│   │   ├── musclemapjs/         #   2D muscle map
│   │   ├── clad-body/           #   ISO 8559-1 validation
│   │   └── z-anatomy/           #   empty placeholder (no code yet)
│   ├── packages/
│   │   └── contracts/           # JSON Schemas (shared data contracts)
│   └── apps/
│       ├── web/                 # React 19 + Vite 8 + Tailwind 4 (the product today)
│       └── desktop/             # Tauri 2 shell (canonical home of src-tauri; beta NSIS installer verified 2026-09-05)
├── traininglab/                 # App 2 (FUTURE): only empty skeletons
├── tests/                       # Extra core test suites (anthropometry, database, data)
├── docs/                        # Specifications + quality docs (this file, PERFORMANCE, TESTING)
└── resources/                   # External dependency downloads (cache is gitignored)
```

## 2. Dependency Rules

### Core Independence (hard rule)

> `bodylab/core/*` MUST NOT import React, Three.js, Tauri, DOM APIs, or UI components.

```text
UI → Application layer → Core → Repository/Integration
```

Consequences:

- Core is pure TypeScript, deterministic, and runs anywhere (browser, tests, CLI, future TrainingLab).
- Math/formulas live in core only. `apps/web/src/lib/constants.ts` re-exports core functions (e.g. `calculateScore`, `calculateMcCallum`) rather than reimplementing them.
- Nothing in the repo enforces this mechanically today (no lint rule / boundary check). Enforce it in review: a `core/` file importing from `react`, `three`, or `apps/` is a defect.

### Package identity (gotchas)

- Workspace packages are consumed by their **pnpm name** (`@fitness/bodylab-*`), but two packaging styles coexist:
  - **dist-based** (older, e.g. `anthropometry`, version 0.1.0): `main: dist/index.js`, needs a `build` (`tsc`).
  - **src-exporting** (newer, e.g. `analytics`, version 1.0.0): `main`/`exports` point at `src/index.ts` — no build step.
  - Check each package's `package.json` before assuming a build step exists.
- The web app's package `name` is **`web`**, NOT `@fitness/bodylab-web`, and there is no aggregate `@fitness/bodylab-core`. Always filter by the real package name: root `dev`/`build`/`typecheck` now do (`web` and `"./bodylab/core/**"`). If a script ever reports "No projects matched the filters", the filter name is wrong.

### Alias resolution — keep in sync (3 places)

The web app maps `@fitness/bodylab-<pkg>` straight to each core package's `src`:

1. `bodylab/apps/web/vite.config.ts` — `resolve.alias`
2. `bodylab/apps/web/tsconfig.app.json` — `compilerOptions.paths`
3. `vitest.config.ts` (workspace root) — `resolve.alias` for core test runs

Adding/renaming a core package means updating all three. As of 2026-09-11 the root map also includes `analytics`, so the three maps match entry-for-entry (`database` has no package and is imported by relative path from `tests/`).

## 3. Web Application (`bodylab/apps/web`)

### Boot and routing

- `src/main.tsx` mounts `<App />` (`src/App.tsx`).
- `App.tsx`: `ThemeProvider` → `AppProvider` (`lib/store.tsx`, React Context + `useReducer`) → `AppContent`.
- Onboarding gate: unless `localStorage['bodylab-onboarding-done'] === 'true'`, only `<Onboarding />` renders.
- Routes (React Router), all under `<Layout />`:

| Path | Page | Purpose |
|------|------|---------|
| `/` | `pages/Overview.tsx` | Dashboard + `AnalyticsDashboard` |
| `/measure` | `pages/Measure.tsx` | Guided measurement sessions |
| `/body` | `pages/BodyView.tsx` | 2D map + lazy 3D explorer, exercise log |
| `/progress` | `pages/Progress.tsx` | Timeline + A/B snapshot comparison |
| `/references` | `pages/References.tsx` | Reference profiles |
| `/data` | `pages/ExportImport.tsx` | Data Vault (.bodylab export/import) |
| `/settings` | `pages/Settings.tsx` | App settings |
| legacy | `Navigate` → new paths | `/dashboard`, `/measurements`, `/export` |

### Data flow

```text
React components → useApp() (lib/store.tsx)
    → useReducer + action creators
    → lib/queries.ts (read helpers)
    → lib/db.ts (IndexedDB adapter)
    → IndexedDB (DB "bodylab", version 1)
```

- Stores: `meta`, `profile`, `measurements`, `snapshots`, `exerciseSets`, `maxEfforts`.
- Migration: automatic from the legacy `localStorage` payload on first load.
- Persistence is local-first and 100% offline. There is no backend.
- `pages/*` go through `store.tsx`. Exception: the Data Vault page (`pages/ExportImport.tsx`) deliberately talks to `db.ts` directly for bulk export/import of the whole database.

### Web source map (verified)

```text
src/
├── App.tsx / main.tsx / i18n.ts / index.css / test-setup.ts
├── pages/            Overview, Measure, Measurements (history, /history),
│                     BodyView, Progress, References, ExportImport, Settings
├── components/       AnalyticsDashboard, BodyMap, BodyViewer3D, ExerciseGif,
│                     Onboarding, ThemeToggle
│   └── layout/       Layout, Sidebar, BottomNav
│   (subdirs body/, charts/, forms/, ui/ exist but are EMPTY)
├── features/
│   ├── body/         BodyToolbar, ExerciseLog, MuscleDetailPanel, MuscleList, SymmetryPanel
│   └── progress/     CurrentValues, ProgressTimeline, SnapshotComparison,
│                     timeline-config.ts (METRIC_CONFIG/COMPOSITION_CONFIG)
├── lib/              store.tsx, db.ts, queries.ts, constants.ts (re-exports core),
│                     anthropometry.ts, exercises.ts, muscle-info.ts, morph-mapper.ts,
│                     oxihuman-loader.ts, oxim-parser.ts, shortcuts.ts,
│                     traininglab-export.ts, types.ts, theme-context.tsx
├── hooks/, utils/    EMPTY placeholders
└── __tests__/        contract.test.ts (6 core↔web contract tests) +
                      integration-total.test.ts (30 cross-module/asset tests)
                      (e2e-critical-flows.test.ts, 39 tautological tests, removed 2026-09-11)
```

Empty dirs (`components/body|charts|forms|ui`, `hooks/`, `utils/`) are scaffolding leftovers — prefer the populated dirs above; delete the empties or put code in them deliberately.

### Visualization

- **2D**: `components/BodyMap.tsx` + `body-muscles` (via integration adapter) — muscle heatmap from scores.
- **3D**: `pages/BodyView.tsx` **dynamically imports** `components/BodyViewer3D.tsx`, which in turn dynamically imports `three`, `OrbitControls`, and `lib/oxihuman-loader.ts` (WASM) only when the 3D tab is opened. Model data: `public/oxihuman-core-v1.ohpk`; helpers `oxim-parser.ts` / `morph-mapper.ts` map measurements to the parametric mesh.
- **Exercise GIFs**: `components/ExerciseGif.tsx` lazy-loads via `IntersectionObserver` (rootMargin 200px) and pauses by toggling `src`. Assets in `public/exercises/gifs/` (36 files, manifest in `asset-manifest.json`).

## 4. Design System

**The design system is in-app, not a package.** Primitives live in `apps/web/src/components/` and `apps/web/src/features/` (Tailwind), and the token layer — colors, spacing, radius, typography — is CSS custom properties in `apps/web/src/index.css` with `dark` variants.

> **Resolved 2026-09-11:** the former `bodylab/packages/ui` was **removed**. It had no consumers (the web app never imported it), no tests, no dark mode, an out-of-range `lucide-react` version, and duplicated the in-app token layer. Its alias was dropped from `vite.config.ts`, `tsconfig.app.json`, `apps/web/vitest.config.ts` and the root `vitest.config.ts`. If a second real consumer appears (e.g. a built TrainingLab web app), extract primitives *then* from the app rather than maintaining a speculative package.

## 5. Testing Layout

- Core package tests: `*.test.ts` next to sources (vitest 1.x per package).
- Extra core suites: `tests/` at workspace root (anthropometry, database, data).
- Web tests: `apps/web` vitest config (vitest 4.x, jsdom, `src/test-setup.ts`), matches `src/**/*.test.{ts,tsx}`.
- Workspace root `vitest.config.ts`: node env, includes `**/*.test.ts`, aliases core packages to `src`, enforces **80% coverage thresholds on `bodylab/core`**.
- Strategy, commands, and coverage map: see [TESTING.md](./TESTING.md).

## 6. Conventions Summary

- Code: **English** identifiers and comments; UI copy: Spanish (EN/ES bilingual onboarding exists via `i18n.ts`).
- TypeScript strict everywhere (`tsconfig.base.json`: strict, noUnusedLocals/Parameters). Web adds `verbatimModuleSyntax` + `erasableSyntaxOnly`.
- Core never imports UI frameworks. Measurements keep full history (never overwrite); IDs are UUIDs; timestamps ISO-8601.
- Formatting: Prettier (`pnpm format`). Linting: **oxlint** in the web app (`.oxlintrc.json`, which ignores the vendored `public/wasm/**`); root `pnpm lint` delegates to it and is currently clean (0 warnings / 0 errors). There is no ESLint config anywhere — do not add one.
- Browser E2E lives in `bodylab/apps/web/e2e/product.spec.ts` (14 product flows), `e2e/adversarial.spec.ts` (5 zero-trust flows) and `e2e/anatomy-xray.spec.ts` (2 atlas-overlay flows) — Playwright + real Chromium, run via `pnpm --filter web test:e2e`. Adversarial core/parser attacks live in `tests/adversarial/` (root vitest).
- Frozen architecture decisions (monorepo, pnpm, local-first, V1 scope = BodyLab only, Tauri after web stabilization): see `PLAN.md` §3.

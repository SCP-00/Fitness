# Project knowledge

> Detailed companion to `AGENTS.md` (repository root). Run every command from
> **`fitness-ecosystem/`** unless noted. Docs and UI copy are **Spanish**; code
> identifiers and comments are **English**. Node >= 20. Source of truth for
> architecture: `fitness-ecosystem/docs/ARCHITECTURE.md` (it wins over any README).
> Owner-facing status: root `ROADMAP.md` + `fitness-ecosystem/docs/AGENT_HANDOFF.md`.
> Last refreshed: **2026-10-14**.

## What this is

Two **local, account-free** apps sharing one data contract; everything is offline and
data lives in IndexedDB inside the browser/WebView — there is no backend.

- **BodyLab** — anthropometry, 2D/3D body modeling, exercise education, progress
  tracking (web app + Tauri desktop shell). The "science half".
- **TrainingLab** — the gym logger: today's time-budgeted session, readiness,
  gear inventory, keyboard-first set logging, rest timer, records/sounds, optional
  local LLM coach (own app + own Tauri shell). The "acting half".

The cycle: BodyLab exports a `bodylab-traininglab-link` file (contract **v2**,
`bodylab/apps/web/src/lib/traininglab-export.ts`) whose weakness map feeds
TrainingLab's planner; measuring → training → re-measuring recalculates the plan.

## Where the code lives (under `fitness-ecosystem/`)

- `bodylab/core/<pkg>` — pure TS engine; **never** imports React/Three/Tauri/DOM.
  Packages: `anthropometry` (McCallum/Venus/Adonis/WHtR/frame/score), `measurements`,
  `composition` (somatotype, Navy body fat), `references`, `progress`, `validation`,
  `export`, `analytics` (body age/risk/prediction), `database` (schema + repository),
  `conditioning` (Cooper, resting HR, body fat, J-P skinfolds), `training`
  (plan/validator/generator + `session.ts` day builder + `decision.ts` local
  decision model + `laya.ts` typed-decision contract), `exercises` (**152**
  exercises + equipment/movement traits in `catalog.ts` + `catalog-additions.ts` +
  `catalog-expansion.ts`, `traits.ts` + `traits-expansion.ts`, `equipment.ts`;
  `demo.ts` draws the movement, `technique.ts` coaches it).
- `bodylab/integrations/` — external adapters: `oxihuman` (3D WASM), `musclemapjs`
  (2D maps), `clad-body` (ISO 8559-1), `z-anatomy` (empty).
- `bodylab/packages/contracts` — JSON schemas. The design system is **in-app**
  (Tailwind tokens in `apps/web/src/index.css`); no `packages/ui` exists.
- `bodylab/apps/web` — React 19 + Vite + Tailwind v4 + three.js. Pages in
  `src/pages/`, domain logic in `src/lib/` (`store.tsx` Context+useReducer, `db.ts`
  IndexedDB, `queries.ts`, `age.ts` — birthDate stored, age derived at the UI edge).
- `bodylab/apps/desktop` — canonical BodyLab Tauri 2 shell (`src-tauri/`, NSIS).
- `traininglab/apps/desktop` — TrainingLab (React + Vite + own Tauri 2 shell).
  Modular layout: `src/app/` (shell + hash router + store), `src/ui/` (design-system
  primitives, screen-agnostic), `src/screens/` (one per destination), `src/features/`
  (pure logic + components), `src/lib/` (engine glue). Root-suite tests import
  `src/lib/*` by relative path → **never move `lib/` without updating `tests/`**.
- `tests/` — extra root suites (anthropometry, database, data/golden, conditioning,
  somatotype, training incl. MCP/CSS-audit/day-focus, exercises, lan, adversarial).
- `scripts/` — `serve-lan.mjs`, `fitness-mcp-server.mjs` (local-model tool surface),
  `audit-exercise-coverage.mjs`, `css-class-audit.mjs`, `build-ieee-docs.mjs`,
  `capture-screenshots.mjs`, `import-symmetry.mjs`, `build-owner-import.mjs`,
  `render-brand-icons.mjs`, `fitness-data-cli.mjs`, etc.
- `ml/laya/` — Python RLCD training pipeline + fixtures mirroring `core/training/laya.ts`.
- `corpus/` — deliberately **not** a pnpm workspace member (kept out of installs);
  a standalone Vite app for the parametric layered body.
- `docs/` — see below; `resources/` (brand icons, manifests, anatomy — anatomy is
  gitignored), `mockup/` (review mockups, new/untracked), `tools/ai-media`.
- Repo root (outside the monorepo): `ROADMAP.md`, `AGENTS.md`, `REPORTE.md`,
  `IMPORT_SYMMETRY/` (owner's gitignored screenshots), `.github/workflows/`.

## Commands that work in this checkout (verified 2026-10-14)

CI (`.github/workflows/ci.yml` at the repo root) pins **pnpm 11 + Node 22** and runs
`pnpm check` (typecheck → root vitest → web vitest → Playwright E2E). The working
tree, however, has an **uncommitted bun migration**: `bun.lock`, `node_modules`
installed by bun (`.bun/` store), root scripts switched to `bun run …` — and the
root scripts `lint`, `lint:fix`, `typecheck`, `check` currently call themselves
(`"check": "bun run check"`) while `build` references non-existent `build:core` /
`build:web`. pnpm and bun are **not on PATH** in this shell. Until that migration is
finished, run the tools directly:

```bash
cd fitness-ecosystem
# Install: CI does `pnpm install --frozen-lockfile` (pnpm 11, Node 22); this
# checkout was installed with bun (`bun install`, untracked bun.lock).
# Neither CLI is on PATH in this shell.
npx vitest run                              # root suite (node env, vitest 1.x)
cd bodylab/apps/web && npx vitest run       # web suite (vitest + jsdom)
cd bodylab/apps/web && npx oxlint           # lint — oxlint, no ESLint config anywhere
cd bodylab/apps/web && npx playwright test  # browser E2E (Playwright + chromium)

# Typecheck: each app must use its OWN TypeScript 6.0.x
cd bodylab/apps/web && node node_modules/typescript/bin/tsc -b
cd traininglab/apps/desktop && node node_modules/typescript/bin/tsc -b

cd bodylab/apps/web && npx vite              # dev server → http://localhost:5173
cd traininglab/apps/desktop && npx vite      # dev server → http://localhost:5174
cd bodylab/apps/web && npx vite build        # production build (CI runs this)
cd traininglab/apps/desktop && npx vite build
node scripts/serve-lan.mjs                   # both apps, one port (8090) + hub page
cd bodylab/apps/desktop && npx tauri build   # NSIS installer (needs Rust + MSVC)
```

Audits / generators (run from `fitness-ecosystem/`):

```bash
node scripts/audit-exercise-coverage.mjs [sheet.xlsx] [--json]   # catalog health
node scripts/css-class-audit.mjs        # classes used vs defined (also `pnpm audit:css`)
node scripts/build-ieee-docs.mjs [--check]      # tectonic, looks in .tools/ first
node scripts/capture-screenshots.mjs [--base URL]   # seeds fixtures via Playwright
node scripts/import-symmetry.mjs ../IMPORT_SYMMETRY --out .cache/symmetry-import.json
```

**Verified today (2026-10-14) — prefer fresh output; counts move fast:**

- `npx vitest run` (root): **1282 tests / 83 files, all passing** as of
  2026-10-14. The three red MCP tests were fixed that day:
  `scripts/fitness-mcp-server.mjs` now resolves `vite` from the app manifests
  (`createRequire` per app — neither a strict pnpm root nor this bun install puts
  `vite` at the monorepo root) and compares mirror dates with the **local day**
  (`localDay()`), not UTC — the UTC comparison broke `read_recovery` /
  `read_current_state` from 19:00 in UTC-5. `tests/training/test_mcp_server.test.ts`
  pins both fixes. The MCP reads (history, recovery, progression, plan) work from
  the terminal with no app and no Playwright; writes still need the desktop app
  open to apply the action files.
- `cd bodylab/apps/web && npx vitest run`: **167/167 (11 files)**.
- `tsc -b` exit **0** in both apps using each app's own TypeScript **6.0.3**; the
  root-installed TypeScript **5.9.3** fails both with `TS5103: Invalid value for
  '--ignoreDeprecations'` (the app configs declare `"ignoreDeprecations": "6.0"`).
- `npx oxlint` (web): **1 warning / 0 errors** (a React Compiler `getRange` warning).

## Conventions & gotchas

- **Core is pure**: no React/Three/Tauri/DOM imports. Measurements keep full history;
  IDs are UUIDs; timestamps ISO-8601; units kg / cm.
- **Never parse user numeric input with bare `parseFloat`/`parseInt`** — use
  `parseNumberInput` (`lib/parse-num.ts`): the Spanish decimal comma (`"75,5"`)
  would be silently truncated.
- **Core imports are aliased, not relative**: `@fitness/bodylab-<pkg>`. The alias map
  spans **six files**: root `vitest.config.ts`, `bodylab/apps/web/vite.config.ts`,
  `bodylab/apps/web/vitest.config.ts`, `bodylab/apps/web/tsconfig.app.json`,
  `traininglab/apps/desktop/vite.config.ts`, `traininglab/apps/desktop/tsconfig.app.json`.
  The root/web four carry all **11** aliases; the two TrainingLab files carry the
  three TrainingLab imports (`conditioning`, `exercises`, `training`). **`database`
  has no alias** anywhere — its tests use relative paths.
- **TypeScript strict everywhere**; web adds `verbatimModuleSyntax` +
  `erasableSyntaxOnly`. Formatting: Prettier (`pnpm format`). Linting: oxlint in the
  web app; no ESLint config anywhere.
- Routing is **HashRouter**; all static asset URLs must go through
  `import.meta.env.BASE_URL` for subpath hosting. The prod CSP is injected by Vite
  and **mirrored in `tauri.conf.json`** — change them together.
- **Screenshots are generated, never hand-taken** (`scripts/capture-screenshots.mjs`);
  `fitness-ecosystem/docs/reference/` (screenshots of other apps) is gitignored —
  never commit or redistribute it.
- **Install landmines**: pnpm 11 fails an install when a dependency ships an
  undeclared build script (`ERR_PNPM_IGNORED_BUILDS` — new deps with a `postinstall`
  need an entry in `allowBuilds` in `pnpm-workspace.yaml`); `.gitattributes` pins
  `eol=lf` for text (CRLF only for `.bat`/`.cmd`/`.ps1`, or `scripts/lan-store.mjs`'s
  shebang breaks vitest on a CRLF checkout). `pnpm install --frozen-lockfile` in a
  dirty working copy short-circuits on existing `node_modules` — reproduce install
  checks in a throwaway clone.
- **Tauri desktop**: `tauri.conf.json` paths resolve relative to `src-tauri/`
  (`frontendDist: ../../web/dist`); bundle category must be `Healthcare and Fitness`;
  MSI rejects pre-release semver, so **NSIS is the beta target**. BodyLab's
  `tauri build` exits **1** even on success when `createUpdaterArtifacts` has no
  `TAURI_SIGNING_PRIVATE_KEY` (release-workflow only) — the criterion is a new valid
  `.exe`, not the exit code.
- **REGLA DE CIERRE — no delivery is done with the old `.exe`**: any UI/logic change
  in `bodylab/apps/web` or `traininglab/apps/desktop` ends with `pnpm tauri build`
  from the **same commit**, and both installers copied to the real desktop
  (`%OneDrive%\Desktop`, not `%USERPROFILE%\Desktop`). Verify the **bundle content**
  (new strings in `dist/assets`), not just that the `.exe` exists; record size and time.
- **Mobile**: both apps must work on a phone (the owner tests on an iPhone over LAN).
  Never use `input[type='text']` in touch-target selectors (many inputs omit `type=`);
  grid children need explicit `grid-cols-1` below `sm`; touch targets ≥ 40 px.
- `tauri dev` and the installed build use **different IndexedDB stores** — a dev-run
  test sees an empty log, not the owner's.

## Product direction & approval gates

- **Four metric views must not be mixed** (see `docs/BUFFY_IMPLEMENTATION_BRIEF.md`):
  **Condición física** (whole-body axes: Cooper/%BF/WHtR/FFMI — reported implemented;
  it is NOT a per-muscle strength map), **strength vs an external published
  reference** (the intended primary heatmap — still **not implemented**, gate closed:
  needs a source that supports sex/age/weight/height as claimed, no invented
  adjustments), **training exposure** (logged working sets — a separate lens), and
  **anthropometric goals** (the existing `Objetivos` lens — keep distinct). Do not
  infer muscle strength from unrelated exercises; show neutral/unavailable where no
  defensible mapping exists. Details: `docs/REDESIGN_STORM.md` §4 (PÁGINA 7) and
  `docs/AGENT_HANDOFF.md`.
- **Gear shelf and favourites (2026-10-20, TrainingLab):** `settings.inventory` is still the
  live inventory; a *profile* is its name plus the other rooms parked in
  `settings.gearProfiles` (`lib/gear-profiles.ts`, 20 root tests). Switching parks the items
  and never touches `rowOrder`/`sessionAside`/`weekOverrides`/the log. Favourites are
  `settings.favorites` + `lib/favorites.ts`, surfaced as a chip and a star (44 px) in
  Ejercicios. Both are filter/labels, never a ranking or a record of training.
- **BodyLab unfrozen (2026-10-20):** every circumference/breadth/length now has a **visual**
  protocol (`lib/measurement-protocols.ts` + `components/MeasurementProtocol.tsx`) drawn as
  an SVG band or caliper segment on a schematic body — shown in the guided measuring step and
  in Medidas' overview. Prose comes from `docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md`
  (ISAK/F2/F3/F5); the test `src/__tests__/measurement-protocols.test.ts` fails if a type
  ships without a protocol or with a band outside the figure.
- **MCP tool surface** (`scripts/fitness-mcp-server.mjs`, design in
  `docs/MCP_TOOL_SURFACE.md`): **35 tools since 2026-10-20** for local
  models — HISTORY (read-only; the only destructive door is whole-session
  `delete_session` with `confirm: true` + undo), STATE reads, and validated ACTIONS
  applied by the app through its own reducers with receipts (`applied`/`rejected` +
  rule), idempotency keys and undo. The parity round added `undo_action` (own tokens
  only, never a closed session), the three routine actions, `set_language`,
  `set_sound`, `reset_decision_model` and `regenerate_week`; the gear round added
  `set_gear_profile` (§13: switching parks the live inventory, an unknown profile is a
  refusal, never an empty room); export/import stays open
  on purpose (a save dialog and a whole-DB replace are not honest actions). The maths
  disposes; the model proposes.
- **AI is three-level and local**: deterministic rules are the floor; a JEV-class
  decision model (`core/training/decision.ts`) is local and explainable; an optional
  LLM (llama.cpp/LM Studio/Ollama/Jan, OpenAI API over loopback) has real tool
  calling and its only terminal tool is validated before reaching the screen.
  **JEV is TypeSafe AI's commercial typed-decision model — never call ours JEV; it is
  a model of that class. JEV ≠ JEPA.**
- **Profile age**: `Profile.birthDate` is stored; the age is derived at the UI
  boundary (`lib/age.ts`). Core APIs take `age: number` — pure maths, never a date.
- **Feedback**: sounds are synthesised (Web Audio, no assets); records use Epley
  rounded exactly like BodyLab; notifications only ask permission on an explicit click.
- **Updater**: manual, opt-in check in Settings (Tauri updater); releases/signing are
  automated in `.github/workflows/release.yml`; installers publish under a stable
  alias (`<app>-setup.exe`). No telemetry, no background downloads.
- **Design authority**: `docs/REDESIGN_STORM.md` (the interface contract: personas,
  invariants, screens) — a proposal unless the owner approved it. BodyLab's design
  stays frozen.

## Agent session protocol

- Read `AGENTS.md`, this file, and the relevant source-of-truth doc before acting;
  read/update root `ROADMAP.md` for roadmap work.
- For TrainingLab quality / PC-mobile UI / the muscle map, read
  `docs/BUFFY_IMPLEMENTATION_BRIEF.md` first (execution order + approval boundary).
- After every substantive session, **append** (never overwrite) a dated Spanish entry
  to `docs/AGENT_HANDOFF.md` using its template: objective, changes with paths, exact
  checks run and results, blockers/approval gates, safest next step. Say "not run"
  where true; never claim tests/screenshots you did not run.
- Handoff notes are project status, **not authorization**. Never cross an owner
  approval gate (especially the muscle-map integration) based on a note.

## Working-tree state (2026-10-14)

- HEAD is `1289602`; the checkout carries **~137 modified/untracked paths** — much of
  the recent work (MCP server + tests, CSS audit, `docs/REDESIGN_STORM.md`,
  `mockup/`, research docs, bun migration) is **uncommitted**. Do not revert, format
  or commit other agents' dirty work without inspecting it.
- Several docs that `AGENTS.md` describes as deleted on 2026-10-09 (`UI_DESIGN.md`,
  `TRAININGLAB_UI_PLAN.md`, `plan_evaluacion_qa_ui_ux.md`,
  `plan_optimizacion_ecosistema.md`, `PLAN_CSV_SQLITE_CLI.md`,
  `plan_ejecucion_llm_coach_qwen.md`) are **still on disk/tracked in this checkout** —
  the purge is not applied here. Treat `REDESIGN_STORM.md` as the live design doc.
- `AGENT_HANDOFF.md`'s last entry is **2026-10-06 (m)**; the 2026-10-08…10-13 sessions
  are recorded in `ROADMAP.md` §4.x and `docs/MCP_TOOL_SURFACE.md`.
- Owner's personal data (`IMPORT_SYMMETRY/`, `.cache/*.json`, `owner-training-log.csv`)
  is gitignored and must **never** be committed or printed in full — the repo is public.

## TrainingLab front migration (2026-10-15): the mockup is the production front

- **Owner decision (2026-10-14/15)**: `fitness-ecosystem/mockup/` is the production
  front. The old React screens are **deleted screen by screen** as each mockup page is
  ported — `src/app/App.tsx` maps each route to the old screen (wrapped in the
  `Legacy` bridge) or to `screens/PlaceholderScreen.tsx` in the meantime. Only the
  backend is carried over: `app/store.tsx`, `lib/*`, the core packages, IndexedDB and
  the MCP channel.
- **Ported so far: the shell + `Hoy`.**
  - `traininglab/apps/desktop/src/mockup.css` — `mockup/css/tl.css` **verbatim**,
    plus a marked section for page-local rules (`.day-mini`, from `01-hoy.html`) and
    the ≤640 px adaptation of `.exrow` (the mockup's row is desktop-only and crushed
    the exercise name at 390 px). Imported **after** `index.css` in `main.tsx`: the
    namespaces do not collide (old = `tl-*`, mockup = bare).
  - `src/ui/mockup-icons.tsx` — the mockup's **64 icons**, *generated* from
    `mockup/js/tl.js` by `.tmp-verify/gen-mockup-icons.mjs` (gitignored). Regenerate;
    never hand-edit.
  - `src/app/router.ts` — **9 routes**: the mockup's 8 destinations (`#/hoy`,
    `#/entrenamiento`, `#/historial`, `#/progreso`, `#/ejercicios`, `#/semana`,
    `#/rutinas`, `#/ajustes`) plus `#/sesion` (ZEN, opened from Hoy, never a rail
    destination). `src/app/nav.ts` holds the 8 rail items; below 900 px they split
    into 4 bottom tabs + a «Más» sheet (2026-10-19), pinned by
    `tests/training/test_mobile_nav.test.ts`.
  - **Drag** (2026-10-19): `src/ui/pointer-drag.ts` uses Pointer Events behind an
    explicit grip in Entrenamiento and Semana; the queue previews locally and writes
    once, Semana swaps effective days through `src/lib/week-swap.ts`. Arrow keys move
    a focused grip, and an `aria-live` region announces the result. HTML5 DnD was
    rejected because it does not fire on iOS.
  - `src/screens/TodayScreen.tsx` — the mockup's Hoy, 1:1, over the real store.
    **Its rows no longer log inline** (the old `features/today/SlotCard.tsx` is
    deleted): a row opens `#/sesion`. Consequently `logWarmup`, `swapRow` and
    `swapOptionsFor` have **no screen** until the Entrenamiento (02) and Sesión (03)
    ports land — the actions still exist in the store and are reachable through the
    MCP.
- **The CSS audit is this migration's instrument**: `node
  scripts/css-class-audit.mjs` reports the `tl-*` rules the ported screens orphan, and
  `.tmp-verify/strip-unused-css.mjs` (gitignored) deletes exactly those. It judges the
  `tl-*` namespace only — the mockup's unprefixed classes are **not** audited, which is
  a known gap to close when the old stylesheet dies (`tests/training/test_css_class_audit.test.ts`
  now floors `usedTl` at 80 for that reason).
- **Toolchain facts (updated 2026-10-19)**: `pnpm` and `bun` are **not on PATH**; the app's
  `node_modules/.bin` holds bun shims (`*.exe`, `*.bunx`) **without** bare shell
  scripts, so **`npx tsc` fetches a stub and prints "This is not the tsc command you
  are looking for"** — call `./node_modules/.bin/tsc.exe -b` (same for
  `vite.exe`, and at the repo root `vitest.exe` / `prettier.exe`). Rust is **working**
  again (`rustc 1.99.1`), and both installers were rebuilt on 2026-10-19; BodyLab's
  `tauri build` still exits 1 after producing the installer because the updater has a
  public key and no `TAURI_SIGNING_PRIVATE_KEY` (expected; the bundle is valid).
  The `--config '{"build":{"beforeBuildCommand":""}}'` override is still needed because
  `beforeBuildCommand` calls pnpm, which is not on PATH.
- **Working-tree state (2026-10-19)**: HEAD `1289602` on `main`, still a large dirty
  tree from the 2026-10-14→18 migration plus this round. Commit and push are the closing
  step of this session; until then, treat checkout state as shared and do not discard it.

## Fast browser QA (2026-10-19): testids + demo, the agent's own loop

Owner's order: when Buffy verifies TrainingLab in the browser preview (or Playwright),
filling names/weights/reps and moving rows must be **fast and mechanical**, not a hunt
through Spanish copy. Two instruments, both already in the app:

1. **`data-testid` hooks** (added 2026-10-19, §11 of `docs/MCP_TOOL_SURFACE.md`).
   Stable inventory — never assert on visible copy when one of these exists:
   - Navigation/sheets: `tab-<id>` (e.g. `tab-hoy`, `tab-entrenamiento`), `tab-more`,
     `sheet-<id>` (the «Más» sheet entries).
   - ZEN session (03): `set-weight`, `set-reps`, `log-set` — the weight/reps fields and
     the log button. Fill via `preview_type` / Playwright `fill`, then click `log-set`.
   - Queue drag: `drag-<exerciseId>` (the grip — start pointer events here, not on the
     row); week drag: `week-drag-<0..6>` (Monday-first day cell grip).
   - Routines: `routine-name` (the editor's name field).
   - Stats cards: `weekly-volume`, `volume-target`, `condition-<id>`.
   - History/detail: `history-set`, `exercise-history`, `mark-reps`, `mark-hold`.
   - Settings: `export-csv`, `export-backup`, `restore-backup`, `import-csv`,
     `import-symmetry`, `import-confirm`, `load-demo`, `clear-demo`, `mcp-audit-list`.
2. **The demo loader** (`Settings → load-demo`, testid `load-demo`): seeds six weeks of
   realistic history through the app's **own import path** (ids prefixed `demo-`,
   removable with `clear-demo`). Use it instead of hand-logging sets when a screen needs
   a populated log — it exercises the real migration/normalisation code too.

Fast loop in the preview panel: `load-demo` → navigate by hash (`#/entrenamiento`,
`#/sesion`, …) → act through testids → assert on text that only the action could have
written. For drags, dispatch Pointer Events on the grip (`pointerdown` → `pointermove` over the target → `pointerup`); HTML5 DnD does nothing (iOS parity is the whole point
of `ui/pointer-drag.ts`).

**MCP and the browser build**: the ACTIONS file channel is **desktop-host only**
(`isDesktopHost()` gates the poller; the browser build has no Tauri filesystem). In a
browser preview, MCP writes cannot land — drive the UI through the testids above. The
MCP **reads** (`node scripts/fitness-mcp-server.mjs --test`, or a chat client) still
work anywhere because they only read the autobackup mirror / `.cache`.

When adding a new screen control that an agent or an E2E run should reach, give it a
testid in this same pass — it is cheaper than a follow-up and it is what made this loop
fast.

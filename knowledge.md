# Project knowledge

> Detailed companion to `AGENTS.md` (repository root). **Run every command from
> `fitness-ecosystem/`** unless noted — that is the real pnpm monorepo. Docs and UI copy
> are Spanish; code identifiers/comments are English.
>
> Source of truth for architecture: `fitness-ecosystem/docs/ARCHITECTURE.md`.
> Live design authority: `fitness-ecosystem/docs/DESIGN_DECISIONS_2026-11-07.md`.
> Owner-facing status: root `ROADMAP.md` + `fitness-ecosystem/docs/AGENT_HANDOFF.md`.
>
> Facts below verified **2026-11-06** on this checkout (HEAD `227b460`, dirty tree).
> Prefer fresh command output over any number written here.

## What this is

Two **local, account-free, offline** apps over one shared data contract. There is no
backend: data lives in IndexedDB inside the browser/WebView.

- **BodyLab** — anthropometry, 2D body map, exercise education, progress. The "science half".
- **TrainingLab** — gym logger: time-budgeted session, readiness, gear inventory,
  keyboard-first set logging, rest timer, records/sounds, optional local LLM coach.
  The "acting half".
- **The loop**: BodyLab exports a `bodylab-traininglab-link` file (contract **v2**,
  `bodylab/apps/web/src/lib/traininglab-export.ts`) whose weakness map feeds
  TrainingLab's planner. Measure → train → re-measure.

## Where the code lives (under `fitness-ecosystem/`)

- `bodylab/core/<pkg>` — pure TS engine, **never** imports React/Tauri/DOM. Packages:
  `anthropometry`, `measurements`, `composition`, `references`, `progress`, `validation`,
  `export`, `analytics`, `database`, `conditioning`, **`training`** (weekly plan/validator/
  generator + day-level `session.ts` + local bandit `decision.ts`), **`exercises`**
  (catalog ~152 entries, `traits.ts`, `equipment.ts`, `technique.ts`, drawn `demo.ts`).
- `bodylab/integrations/` — `musclemapjs` (2D maps), `clad-body` (ISO 8559-1).
  The 3D model was **removed** on 2026-10-23; see `docs/REMOVED_3D_MODEL.md`. Do not resurrect it.
- `bodylab/packages/contracts` — JSON schemas. Design system is **in-app** (Tailwind
  tokens in `apps/web/src/index.css`); there is no `packages/ui`.
- `bodylab/apps/web` — React 19 + Vite 8 + Tailwind v4. Pages `src/pages/`, domain logic
  `src/lib/` (`db.ts` IndexedDB, `store.tsx` Context+useReducer, `queries.ts`,
  `age.ts` — birthDate stored, age derived at the UI edge).
- `bodylab/apps/desktop` — canonical BodyLab Tauri 2 shell (`src-tauri/`, NSIS).
- `traininglab/apps/desktop` — TrainingLab (own React + Vite app + own Tauri 2 shell).
  Modular: `src/app/` (shell, `router.ts` hash routes, `nav.ts`, `store.tsx`),
  `src/ui/` (primitives + icons), `src/screens/` (one per destination, incl. `SessionScreen`
  ZEN and `CoachScreen`), `src/features/<domain>/`, `src/lib/` (engine glue).
  Root-suite tests import `src/lib/*` by relative path → **never move `lib/` without
  updating `tests/`**.
- `tests/` — root suites (anthropometry, database, data/golden, conditioning, training
  incl. MCP/drag/CSS-audit, exercises, lan, adversarial). 98 files today.
- `scripts/` — `serve-lan.mjs`, `fitness-mcp-server.mjs`, `css-class-audit.mjs`,
  `audit-exercise-coverage.mjs`, `build-ieee-docs.mjs`, `capture-screenshots.mjs`,
  `build-body-map-regions.mjs`, `render-brand-icons.mjs`, `import-symmetry.mjs`, …
- `ml/laya/` — Python training pipeline mirroring `core/training/laya.ts`.
- `docs/` — architecture, research, protocol, handoff, screenshots. `resources/` holds
  brand masters and manifests (anatomy assets are gitignored). `corpus/` is **not** a
  workspace member on purpose.
- Repo root (outside the monorepo): `ROADMAP.md`, `AGENTS.md`, `knowledge.md`,
  `.github/workflows/` (GitHub only reads the root `.github/`).

## Commands (verified 2026-11-06)

Local toolchain: Node **v26.8.1**, pnpm **10.34.7** on PATH (bun is not). CI pins
**Node 22 + pnpm 11** — match CI for release/install-sensitive work.

```bash
cd fitness-ecosystem
pnpm install                      # pnpm-lock.yaml is the lockfile
pnpm dev                          # BodyLab web → http://localhost:5173
pnpm test                         # root suite: 98 files / 1422 tests, ~10 s
cd bodylab/apps/web && pnpm test   # web suite: 11 files / 129 tests
pnpm typecheck                    # web + all core packages → exit 0
pnpm lint                         # oxlint: 0 warnings / 0 errors
pnpm check                        # typecheck + root + web + Playwright E2E
cd traininglab/apps/desktop && pnpm dev   # TrainingLab → http://localhost:5174
pnpm lan                          # both apps, one port (8090) + hub page
node scripts/serve-lan.mjs         # flags: --port, --build, --no-build, --open [app]
node scripts/css-class-audit.mjs   # classes used vs defined, 4 directions; exit 1 on findings
node scripts/audit-exercise-coverage.mjs [sheet.xlsx] [--json]
node scripts/build-ieee-docs.mjs [--check]   # tectonic, portable in .tools/
```

Desktop installers (needs Rust + MSVC Build Tools):

```bash
cd bodylab/apps/desktop      && pnpm tauri build    # NSIS
cd ../../../traininglab/apps/desktop && pnpm tauri build
```

## Conventions & gotchas

- **Core is pure**: no React/Tauri/DOM imports in `bodylab/core/*`. Measurements keep full
  history; IDs are UUIDs; timestamps ISO-8601; units kg / cm.
- **Never parse user numeric input with bare `parseFloat`/`parseInt`** — use
  `parseNumberInput` (`lib/parse-num.ts`); the Spanish decimal comma (`"75,5"`) would be
  silently truncated.
- **Core imports are aliased, not relative**: `@fitness/bodylab-<pkg>`. A new alias must be
  added in **six** files: root `vitest.config.ts`, web `vite.config.ts`, web
  `vitest.config.ts`, web `tsconfig.app.json`, TrainingLab `vite.config.ts`, TrainingLab
  `tsconfig.app.json`. **`database` has no alias** — its tests use relative paths.
- **The web package is named `web`**, not `@fitness/bodylab-web`. Wrong filter names fail
  with "No projects matched the filters".
- TypeScript strict everywhere; web adds `verbatimModuleSyntax` + `erasableSyntaxOnly`.
  Formatting: Prettier. Linting: oxlint only (no ESLint config anywhere).
- Routing is **HashRouter**; every static asset URL must go through
  `import.meta.env.BASE_URL` for subpath hosting. The prod CSP is mirrored in
  `tauri.conf.json` — change both together.
- **REGLA DE CIERRE — no delivery is done with the old `.exe`.** Any UI/logic change in
  `bodylab/apps/web` or `traininglab/apps/desktop` ends with `pnpm tauri build` from the
  **same commit**, and both installers copied to the real desktop (`%OneDrive%\Desktop`,
  not `%USERPROFILE%\Desktop`). Verify new strings are inside `dist/assets`, not just that
  an `.exe` exists; record size/time. BodyLab's `tauri build` exits **1** even when the
  installer is valid (updater artifacts need a signing key only the release workflow has).
- **Install landmines**: pnpm 11 fails a whole install when a dependency ships an
  undeclared build script (`ERR_PNPM_IGNORED_BUILDS`) — declare it in `allowBuilds` in
  `pnpm-workspace.yaml` (e.g. `tesseract.js: false`). `.gitattributes` pins `eol=lf` for
  text (CRLF only for `.bat`/`.cmd`/`.ps1`); a CRLF checkout breaks `scripts/lan-store.mjs`'s
  shebang and the two root suites that import it. `pnpm install --frozen-lockfile` in a
  dirty copy short-circuits on existing `node_modules` — reproduce install checks in a
  throwaway clone.
- `tauri dev` and the installed build use **different IndexedDB stores** — a dev run sees
  an empty log, not the owner's.
- **Mobile**: both apps must work on a phone (owner tests on iPhone over LAN, no Mac).
  Never use `input[type='text']` in touch-target selectors (many inputs omit `type=`); grid
  children need explicit `grid-cols-1` below `sm`; touch targets ≥ 40 px. Drag uses Pointer
  Events (`ui/pointer-drag.ts`), never HTML5 DnD (does not fire on iOS).

## Product direction & approval gates

- **Four metric views must not be mixed** (`docs/BUFFY_IMPLEMENTATION_BRIEF.md`):
  **Condición física** (whole-body axes; NOT a per-muscle strength map), **strength vs an
  external published reference** (intended primary heatmap — still **not implemented**;
  gate closed until a source supporting sex/age/weight/height is verified), **training
  exposure** (logged sets, a separate lens), and **anthropometric goals** (existing
  `Objetivos` lens). Do not infer muscle strength from unrelated exercises; show
  neutral/unavailable where no defensible mapping exists.
- **AI is three-level and local**: deterministic rules are the floor; a JEV-_class_ decision
  model (`core/training/decision.ts`) is local and explainable; an optional local LLM
  (llama.cpp / LM Studio / Ollama / Jan over loopback) has real tool calling, and its only
  terminal tool `propose_session` is validated (gear, families, time budget, recovery)
  before reaching the screen. **JEV is TypeSafe AI's commercial model — ours is only of that
  class; JEV ≠ JEPA.**
- **Coach runs two phases** (`lib/coach-run.ts`): bounded exploration with read-only tools,
  then a fresh narrow commit request whose only tool is `propose_session`; rejections name
  colliding ids and retry (3 rounds).
- **MCP surface** (`scripts/fitness-mcp-server.mjs`, design `docs/MCP_TOOL_SURFACE.md`):
  reads (history/state/progression/plan) plus validated actions applied through the app's own
  reducers with receipts, idempotency and undo. Export/import stays out on purpose (not
  honestly expressible as an action).
- **Profile age**: `Profile.birthDate` is stored, age derived at the UI boundary
  (`lib/age.ts`). Core APIs take `age: number` — pure maths never sees a date.
- **Feedback**: sounds synthesised with Web Audio (no assets); records use Epley rounded like
  BodyLab; notifications only ask permission from an explicit click.
- **Updater**: manual, opt-in check in Settings; no telemetry, no background downloads.

## Working with the owner / handoff protocol

- Read `AGENTS.md`, this file, and the relevant source-of-truth doc before acting. For
  roadmap work, read and update root `ROADMAP.md`.
- For TrainingLab quality / PC-mobile UI / the muscle map, read
  `docs/BUFFY_IMPLEMENTATION_BRIEF.md` first (execution order + approval boundary).
- End every substantive session by **appending** (never overwriting) a dated Spanish entry
  to `docs/AGENT_HANDOFF.md`: objective, changes with paths, exact checks and results,
  blockers/approval gates, safest next step. Say "not run" where true.
- Handoff notes are status, **not authorization**. Never cross an owner approval gate
  (especially muscle-map integration) based on an agent's note.
- Owner personal data (`IMPORT_SYMMETRY/`, `.cache/*.json`, `owner-training-log.csv`) is
  gitignored and must never be committed or printed in full — the repo is public.
- `docs/reference/` (screenshots of other apps) is gitignored on purpose: study it, never
  commit or redistribute it.

## Fast browser QA

Two instruments already in the app, so verification is mechanical rather than a hunt through
Spanish copy:

1. **`data-testid` hooks** (inventory in `docs/MCP_TOOL_SURFACE.md` §11): `tab-<id>`,
   `sheet-<id>`, `set-weight` / `set-reps` / `log-set`, `drag-<exerciseId>`,
   `week-drag-<0..6>`, `routine-name`, `weekly-volume`, `history-set`, `exercise-history`,
   settings `export-csv` / `export-backup` / `restore-backup` / `load-demo` / `clear-demo`.
   When adding a control an agent or E2E should reach, add its testid in the same pass.
2. **Demo loader** (`Ajustes → load-demo`, testid `load-demo`): seeds six weeks of realistic
   history through the app's own import path (`demo-` ids, removable with `clear-demo`). Use
   it instead of hand-logging sets; it also exercises migration/normalisation.
3. **Generated screenshots, never hand-taken**: `node scripts/capture-screenshots.mjs`.

MCP **writes** are desktop-host only (Tauri filesystem); in a browser preview drive the UI
through the testids. MCP **reads** work anywhere (they read the autobackup mirror / `.cache`).

## Working-tree state (2026-11-06)

- HEAD `227b460`; ~52 modified/untracked paths. Recent work is partly uncommitted — do not
  revert, reformat or commit other agents' dirty files without inspecting them first.
- README badges and older docs carry stale test counts (e.g. "775 root"); trust a fresh run.
- `docs/ARCHITECTURE.md` §1 still calls TrainingLab a future skeleton — outdated; the app
  lives in `traininglab/apps/desktop` and is built/installed today.

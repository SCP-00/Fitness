# Changelog

All notable changes to BodyLab will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.3.1-training] - 2026-09-29 (TrainingLab desktop, shared LAN history, public release)

### Fixed
- **The measurement history rendered as a blank page in production builds.**
  `pages/Measurements.tsx` read `symGroup` one line *above* the `useState` that declares
  it, so the component threw a temporal-dead-zone `ReferenceError` on mount — invisible in
  review, and once minified it only read `Cannot access 'H' before initialization`. Every
  test passed because the web suite covers pure logic and the Playwright suite never
  visited `/history`. A new `src/__tests__/page-smoke.test.tsx` mounts every routed page
  (all but the WebGL one) so this class of failure is now a red test.
- **A fresh clone could not install.** The lockfile recorded an importer for `corpus/`, a
  directory the repository deliberately excludes, so `pnpm install --frozen-lockfile` — CI,
  the release workflow, any contributor — stopped at `ERR_PNPM_OUTDATED_LOCKFILE` before
  running a single test. The playground is no longer a workspace member; it installs on
  its own where it lives.
- **The CI/release/Pages workflows never ran**: they sat in `fitness-ecosystem/.github/`,
  and GitHub only reads `.github/workflows/` from the repository root. They moved, and the
  jobs now start inside the monorepo.

### Added
- **TrainingLab is a desktop application** (`traininglab/apps/desktop/src-tauri`): its own
  Tauri 2 shell with NSIS bundling, a capability set limited to `core:default`, `opener`
  and `notification`, and a CSP that allows only loopback for the optional local LLM.
- **Shared household history over the LAN** (`scripts/lan-store.mjs`, `scripts/lan-api.mjs`,
  `pnpm lan --shared`): one SQLite file (node:sqlite, no dependencies) holding members,
  sessions, sets and health records, served behind a small JSON API. Claiming a first name
  is the whole of the login, and the apps themselves need none. The store is explicit about
  being unencrypted within your own network.
- **TrainingLab's client for that history** (`lib/shared.ts`, `SharedPanel.tsx`): connect,
  see the family's last seven days, sync sets/sessions/health, with merge helpers that keep
  local data when the server is unreachable.
- **Generated documentation**: `scripts/capture-screenshots.mjs` and five screenshots in
  `docs/screenshots/`, a root `README.md` with permanent installer links, and a GitHub
  Pages hub (`docs/site/index.html`) that serves both apps live.
- **Permanent download links**: the release workflow publishes each installer under its
  versioned name *and* a stable alias (`BodyLab-setup.exe`), so
  `releases/latest/download/BodyLab-setup.exe` keeps working across versions.

## [0.3.0-training] - 2026-09-28 (launcher icon, born date, sound cues, rest notifications)

### Fixed
- **The desktop launcher finally shows the app's own icon.** Two independent causes,
  both fixed: `BodyLab.lnk` pointed at a September-5 build with `icon=,0` ("use the
  binary's embedded resource" — which predated the brand artwork), and the original
  `install-shortcut.ps1` created its shortcut with `IconLocation = shell32.dll,175`,
  i.e. a stock Windows glyph. Every shortcut now sets an explicit `IconLocation` at
  `resources/brand/<app>-icon.ico`, and the installer writes to the **real** desktop
  (`%OneDrive%\Desktop` when it is redirected).
- **`install-shortcut.ps1` is now idempotent and covers both apps** — `BodyLab`,
  `BodyLab Dev`, `TrainingLab`, `LAN Server (Fitness)` — with a preflight that renders
  the icons when they are missing.

### Added
- **`.ico` generation in the brand pipeline** — `scripts/render-brand-icons.mjs` now
  emits a multi-size `<app>-icon.ico` (16/24/32/48/64/128/256) for both apps. Windows
  Vista+ accepts PNG-compressed entries inside the ICO container, so this is ~40 lines
  of Node with no ImageMagick/sharp dependency — and it works for TrainingLab, which
  has no Tauri shell for `npx tauri icon` to run against.
- **Born Date replaces the typed Age** (`lib/age.ts` in BodyLab). `Profile.birthDate`
  is the stored fact; the age is derived everywhere it is needed (body-fat regression,
  body-age score, health-risk thresholds, Cooper tables, the 3D morph mapper, the
  TrainingLab export). Legacy profiles carrying only `age` are migrated once on load by
  `db.loadProfile()` and written back. Settings shows the derived age next to the date
  picker plus a birthday countdown; onboarding asks for the date with an "age is derived
  automatically" hint. **20 new tests** pin the calendar arithmetic (day before a
  birthday, 29 February, impossible dates, clamping) and the migration's idempotence.
- **Three sound cues** (`traininglab/.../lib/sounds.ts`) — a struck bell when the session
  is finished, a rising arpeggio when an exercise completes its prescribed sets, and a
  four-note fanfare with a shimmer on a personal record. Synthesised from oscillators at
  call time: no binary assets, nothing to license, offline-safe. The cues are shaped to be
  told apart by *envelope*, not just pitch. Unlocking follows the iOS rule (a real user
  gesture resumes the `AudioContext`), and a blocked/unsupported audio stack is silent
  instead of disruptive. Settings has an on/off switch, a volume slider and a per-cue
  preview that asks for the gesture itself.
- **Personal-record and completion logic as a pure module** (`lib/records.ts`) — Epley
  e1RM rounded exactly like BodyLab's so the two apps can never disagree about a best,
  independent weight/e1RM marks, a merge with the imported BodyLab PRs, and a
  `detectRecord` that refuses to call a tie a record. Wired into `addSet`: a record
  outranks the achievement (both can land on the same set, and one unmistakable fanfare
  beats two overlapping cues), and the achievement fires on exactly the completing set —
  never again on extra volume.
- **Celebration banner** — every cue also gets a visible banner, so a muted device still
  gets the confirmation (`prefers-reduced-motion` respected).
- **Local notifications** (`lib/notifications.ts`) — a single toast when the rest countdown
  reaches zero, which is what makes the timer useful with the tab in the background.
  Uses the Web Notification API (the one mechanism that covers browser and desktop shell
  with no service worker, no push server, no network); permission is requested only from
  an explicit click, never on load. Settings shows the permission state and can request it.
  *Not yet native:* a desktop shell that wants the OS toast channel needs the Tauri
  notification plugin on the Rust side.
- **`TrainingLab.bat` + `serve-lan.mjs --open [app]`** — a launcher that starts the local
  server and jumps straight into one app (`--open traininglab`), so TrainingLab has a
  double-clickable entry point like BodyLab.
- **24 new tests** in `tests/training/test_records_and_sounds.test.ts`.

### Changed
- TrainingLab settings gained `sound` and `notifications` blocks with explicit nested
  merging in `db.loadSettings`, so a settings document written by an older build can never
  surface `undefined`.
- `getConditioningProfile` now takes a `Profile` and derives the age itself; `morph-mapper`
  and `AnalyticsDashboard` use `profileAge(profile)`; the TrainingLab export sends the
  derived `age` **and** the raw `birthDate` (additive, contract v2).

### Verified
- `pnpm test` **752 root tests (43 files)** · web vitest **102/102** · TrainingLab `tsc -b`
  clean and `vite build` OK · desktop shortcuts rewritten and read back to confirm the
  `IconLocation`.

## [0.2.0-training] - 2026-09-27 (TrainingLab T2: deterministic generator + export-v2 integration)

### Added
- **`generateRoutine` (`core/training/generator.ts`)** — the deterministic routine builder (T2): same input → byte-identical plan, no RNG, no clock. Weakness-ranked family programming (weak family → weekly-volume ceiling, strong → maintenance floor), pattern-split weeks (1 day = fullbody; 2 = lower+upper; 3-6 = lower/push/pull cycle rotated so the weakest pattern leads; 7 = rest), spill-aware dosing via a fix-point against the REAL `weeklySetsByFamily` totals (excess spill trims the strongest spiller first), automatic slot widening to reach window floors (sessions are a preference, the floor is physics), granular-muscle `focus` emission, and **self-validation**: the generator never returns a plan that fails the hard rules — it throws `GeneratorError` with actionable messages instead (e.g. a family whose candidates never list it as PRIMARY mover, i.e. spill-only volume that cannot be steered).
- **Export-v2 integration tests** — a payload shaped exactly like `buildTraininglabExport` v2 (muscleScores + conditioning axes + muscleLoad) converts to `FamilyWeakness` and drives the generator + validator with **zero adapter code**: the two ecosystem halves connect through the documented contract alone.
- **Package guide `bodylab/core/training/AGENTS.md`** — the working contract: hard rules, injected-catalog convention, consumption flow for the future TrainingLab app, definition of done.
- **17 new tests** (13 golden + 4 integration; 57 total in `tests/training/`). During the T2 pass the adversarial/golden feedback loop caught and fixed two design flaws before shipping: naive day placement that violated rule 2 through spill, and spill-only families whose volume cannot be steered.
- **Desktop beta.4** (`BodyLab_1.0.0-beta.4_x64-setup.exe`, NSIS): rebuild with the current frontend (conditioning, somatotype, Navy form, illustrated guides, `/history`, export v2). Binary smoke PASS (launch, 14 s stability, IndexedDB origin, graceful close). Updater signing deferred to CI (`TAURI_SIGNING_PRIVATE_KEY`), as designed.
- **`ROADMAP.md` (repo root)** — the living inter-session TODO plan (read at session start, update at session end; done items keep their history).

### Verified
- `pnpm test` **634 root tests (37 files)** · web vitest 70/70 · `tsc -b` clean · lint 0/0 · E2E 21/21.

## [0.1.0-training] - 2026-09-27 (TrainingLab T1: `core/training` plan types + hard-rule validator)

### Added
- **New core package `@fitness/bodylab-training`** (`bodylab/core/training`) — TrainingLab plan **T1** (`docs/TRAININGLAB_PLAN.md`): the pure planning vocabulary and the hard rules every routine (human or LLM-authored) must obey. Zero dependencies, catalog **injected** (core never imports the web exercise list):
  - `plan.ts` — `Routine` / `Day` / `ExerciseSlot` / `AiProposal` types; the 34 granular `MuscleGroup` ids with `muscleFamilyOf` mapping to 13 rule-level `MuscleFamily` families; `isBigMuscleFamily` for rule 2; `VOLUME_WINDOWS` per level (beginner 4-12, intermediate 6-18, advanced 8-22 — inside the plan's [4, 22] band); `ValidationResult`/`Violation` vocabulary with rule ids.
  - `validator.ts` — structural checks (sets 1-6, reps 1 ≤ min ≤ max ≤ 50, rest 0-600 s, RIR 0-5, `days.length === daysPerWeek`) followed by the **five hard rules**: ① every `exerciseId` exists AND its required equipment is owned; ② no big muscle family two consecutive days; ③ weekly direct sets (intensity ≥ 2) per family inside the level window; ④ every focused muscle of a day has ≥1 slot; ⑤ `validateAiProposal` — an LLM must cite reported weak muscles AND back each citation with a day focused on it using catalog exercises. The module never throws: hostile shapes return violations.
- **36 tests** (21 unit + 15 adversarial): hand-built mini-catalog with hand-computed volume expectations (a counting-bug in the tests themselves was caught and fixed during the pass — the validator math was right); boundary tests at exact window bounds; the 7-day full-body marathon rejected; empty-catalog and hallucinated-exercise attacks; **one real bug found by the adversarial suite and fixed**: `validateAiProposal` crashed on a non-array `targetedWeakMuscles` from a hostile LLM response (now guarded, never throws).
- Alias `@fitness/bodylab-training` registered in all three maps (root vitest, web vite, web tsconfig).

### Verified
- `pnpm test` **613 root tests (34 files)** · web vitest 70/70 · `tsc -b` clean · lint 0/0 · E2E 21/21 (untouched — the package has no UI yet).

## [1.4.0-dev] - 2026-09-27 (Conditioning metrics package: Cooper 12-min, resting HR, measured body fat, abdominal skinfold)

### Added
- **Core package `@fitness/bodylab-conditioning`** (`bodylab/core/conditioning`) — pure-TS normative classification for the four conditioning axes requested in the product vision, per sex, with age-aware interpretation. Every classifier returns `null` (not an error, not 0) for anything outside physiological domain, and every table carries its primary-source provenance string:
  - **Cooper 12-min run/walk (m)** — full 1968 age×sex table (male 13-14…50+, female 13-14…50+, incl. the 17-19/17-20 asymmetry of the source), plus the classic VO2max estimate `(d − 504.9)/44.73`. Distances above **5000 m** are rejected as entry errors, not classified "excellent".
  - **Resting heart rate (bpm)** — AHA-style adult bands, domain 30–220 bpm.
  - **Measured body-fat % (caliper/DEXA/BIA)** — ACE athletic/fitness/acceptable/obese bands per sex; below-essential-fat values (male <2 %, female <8 %) are rejected as measurement error.
  - **Abdominal skinfold (mm)** — Jackson-Pollock 3-site abdominal-site bands per sex (domain 3–80 mm), plus the full J-P 3-site body-density equation (male/female variants) with Siri %BF, floored at essential fat so negative %BF can never be emitted; each individual site is validated, so a negative site cannot hide inside an acceptable sum.
  - Aggregate: `buildConditioningProfile` (mean 0-100 score over classified axes only, per-axis results, J-P %BF, VO2max).
- **Tests: 35 new** (`tests/conditioning/test_conditioning.test.ts` — canonical published cut-offs pinned per table; `test_conditioning_adversarial.test.ts` — monotonicity of every table, hostile inputs, no NaN/Infinity/negative-physiology leakage into the aggregate).
- **Web layer**: `ConditioningType` measurement types (units, domains, EN/ES labels, category "conditioning"), alias `@fitness/bodylab-conditioning` registered in all three maps (vite/tsconfig/vitest), bridge `lib/conditioning.ts` (classification → EN/ES label + color) for UI consumption.

- **Somatotype classifier (`classifySomatotype()` in core/composition)** — Heath-Carter *proxy variant* feeding the planned 30-model 2D selector and TrainingLab's planner: endomorphy from measured %BF (piecewise-linear, ACE-anchored — same cut-offs as conditioning, so the packages can never disagree), ectomorphy via the real Heath-Carter HWR equation (0.4643·HWR−17.63, floor 0.1 / cap 12), mesomorphy as a frame proxy (height/wrist → 2/4/6 + lean bonus; medium-frame default flagged with `frameMeasured:false` when no wrist). Returns the full triple, a 13-name Carter-style `category` (adjective = 2nd component, noun = dominant) and per-component provenance. 36 new tests (26 unit + 10 adversarial: dense-grid scale/monotonicity invariants, hostile-input zero-throw guarantees, cross-package ACE coherence).
- **Tape-only body fat (`estimateBodyFatNavy` in core/composition)** — the Hodgdon & Beckett (1984) U.S. Navy circumference method, metric form: %BF with a measuring tape only (neck/waist/height + hip for women). Null-on-invalid guards (waist ≤ neck breaks the log argument; density outside the physical window rejected — no negative/absurd %BF), published SEE ±3.5% surfaced in the result. 8 tests with hand-recomputed published-equation anchors (male 180/38/85 → 16.1%, female 165/32/72/98 → 27.4%).
- **Measurement-guides registry (`lib/measurement-guides.ts`, web)** — the bilingual educational layer for the owner's pedagogical requirement: per-method tutorials (steps/tips/fallbacks), required-equipment tiers (none / tape-only / tape-or-GPS / caliper), honest certainty levels, and **no-equipment fallbacks** (string+ruler, printable tape, soccer-field pacing). Encodes the fat-distribution science: skinfold sites **differ by sex** (J-P female = triceps/suprailiac/thigh — a single abdominal fold is a male-biased proxy), Navy reads overall fatness independent of storage pattern. 6 registry tests pin the pedagogy. Wired into the UI: **new Conditioning tab in Measurements** with the four conditioning metrics, quick-add, and the full tutorials with certainty badges and equipment tiers.
- **Docs fix:** `calculateFrameSize` docstring now states its real units contract (height in **meters**, guard ≤ 2.5) — the cm-sounding parameter names had misled every new caller; behaviour unchanged and still pinned by its tests.
- **J-P 3-site FEMALE protocol (core conditioning)** — the female branch now uses the **published Jackson, Pollock & Ward (1980) equation** (`D = 1.0994921 − 0.0009929·Σ + 0.0000023·Σ²`, sites triceps/suprailiac/thigh, no age term); the previous non-published form was mathematically dead code (its density exceeded 1.12 for every plausible Σ → always `null`). New exports: `jacksonPollockBodyFatPct` (sites → density → Siri pipeline), `JP3_SITES` (per-sex protocol sites), and an independent `jacksonPollockFemaleBodyFatPct` axis in `buildConditioningProfile` (+ `tricepsSkinfoldMm` / `suprailiacSkinfoldMm` inputs). 11 new tests pin exact hand-computed anchors (Σ=48 → 18.2 %; Σ=24 → ~9.6 %; essential-fat boundary Σ=20 → 8.1 %) + adversarial domain guards per sex.
- **Navy tape form (Conditioning tab)** — estimates %BF from tape circumferences via `estimateBodyFatNavy` (neck/waist always; hip shown only for female profiles; height read from the user's profile), live preview with the ±3.5 % SEE badge, and saves the result as a real `body_fat_measured` measurement flagged `confidence:'low'` with the method + circumferences in notes. All numeric inputs go through `parseNumberInput` (ES decimal comma safe).
- **Illustrated female skinfold sites** — the JP3 tutorial renders schematic (explicitly non-anatomical) ♀/♂ SVG figures with numbered caliper sites driven by new `siteIllustrations` in the guide registry, plus a per-sex **fat-distribution warning** (women: hips/glutes/thighs — an abdominal fold systematically misreads them). Test pins the drawn female protocol (triceps/suprailiac/thigh) and bilingual labels.
- **The Measurements page is reachable again** — it was historically orphaned (no route mounted it; `/measurements` redirected to the guided-session wizard). Now mounted at `/history` (sidebar 'History', `H` keyboard shortcut; the legacy `/measurements` redirect updated), which is where the Conditioning tab, the Navy form and the illustrated tutorials live.

### Verified
- `tsc -b` clean · **577 root tests (31 files) · 70 web tests** · lint 0/0 · E2E 21/21. Navy form verified end-to-end in a real browser (male 178/38/85 → 16.4 %; female 165/32/72/98 → 27.4 %, the published test anchor; persisted to IndexedDB as `body_fat_measured`).
- **Conditioning surfaced in Progress**: new `ConditioningPanel` card (0-100 aggregate score + tone, the classified axes with their normative bands, Cooper VO2max estimate, J-P 3-site %BF chips per protocol) and an empty-state CTA into `/history`. `body_fat_measured` added to the timeline chips with an `≈` marker + dotted-line dots for **Navy estimates** (`confidence:'low'`); Current Values distinguishes "≈ estimate (Navy ±3.5 %)" from caliper/DEXA measurements.
- **TrainingLab link v2**: the export now carries the `conditioning` weakness map (`conditioningScore`, full per-axis `axes`, `classifiedCount`) so the planner receives the cardiorespiratory + body-composition weaknesses alongside the anthropometric ones. `TRAININGLAB_EXPORT_VERSION` bumped 1 → 2; contract tests pin the new envelope key order, the populated map (4 axes) and both null cases. v1 consumers must ignore unknown fields per the contract's forward-compatibility rule. Fixed a latent config gap: the web `vitest.config.ts` was missing the `@fitness/bodylab-conditioning` alias.

## [1.3.0-dev] - 2026-09-27 (Data-integrity pass, TrainingLab contract pinning, desktop auto-update)

### Added
- **Data-integrity suite (25 tests, `apps/web/src/__tests__/data-integrity.test.ts`)**, green under both vitest generations (root 1.x via node + fake-indexeddb, web 4.x via jsdom): `.bodylab` export→clear→import→export exact round-trip, re-import idempotency (UUID upsert, no duplicates), union import into a populated DB, legacy localStorage→IndexedDB migration (+ corrupt-JSON rejection), ES decimal-comma parsing, and TrainingLab link contract v1 pinning.
- **`lib/parse-num.ts` (`parseNumberInput` / `normalizeDecimalInput`)** — locale-tolerant numeric input. Fixes the silent-corruption bug where the Spanish decimal comma (`"75,5"`) was stored as **75** by bare `parseFloat`; wired into Measurements, Measure, Onboarding, Settings, MuscleDetailPanel and ExerciseLog. New convention: no bare `parseFloat`/`parseInt` on user input.
- **Desktop auto-update (Tauri 2 updater plugin)**: Rust plugin + `updater:default` capability + `createUpdaterArtifacts: true` + embedded minisign pubkey in `tauri.conf.json`; JS wrapper `lib/updater.ts` (safe no-op in the browser build); opt-in **manual** check in Settings (`Buscar actualizaciones`) with download progress and relaunch — never automatic, the webview CSP stays network-free. Updater keypair generated locally (`src-tauri/.updater-key` + password file, gitignored; pubkey embedded).
- **`.github/workflows/release.yml`**: tag-triggered (`v*`) Windows release pipeline — signed NSIS build, `latest.json` static feed generation, GitHub release publish (beta/rc tags marked prerelease). Requires repo secrets `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`; **OWNER/REPO must be replaced** in `tauri.conf.json` before the first release.

### Verified
- `tsc -b` clean · **478 root tests (25 files) · 61 web tests** · lint 0/0. E2E unchanged (21). *(Counts valid for 1.3.0; the conditioning pass of 1.4.0 raises them to 513 / 27 files.)*

## [1.2.0-dev] - 2026-09-13 (Anatomy x-ray mode, production hardening, desktop beta.3)

### Added
- **Anatomy x-ray mode** in the 3D viewer (`BodyViewer3D.tsx` + `lib/anatomy-loader.ts`): the static anatomy atlas (788 muscles / 1,243 bone pieces, meshopt-compressed GLBs) loads lazily on first toggle, is scaled/grounded to the live fitted body's bounding box, and renders as a translucent overlay inside the user's own body — muscles and skeleton with independent opacity sliders. The parametric fitted body stays the primary object (turned glassy at 14% opacity while the mode is active); the atlas is a reference layer, never a replacement. Shipped with 2 dedicated Playwright flows in `e2e/anatomy-xray.spec.ts` (EN + ES).
- **GitHub Pages deploy workflow** (`.github/workflows/deploy-pages.yml`): repo-aware Vite `base`, SPA fallback `404.html`, artifact deploy.
- **Desktop binary smoke job in CI** (`e2e-desktop-smoke`): release-builds the Tauri shell on `windows-latest` and runs `scripts/smoke-desktop.ps1` against the real binary. A `desktop` compile job guards the shell on every PR. Lint (`oxlint`) added to the main CI job.
- **Desktop launchers**: `BodyLab.bat` (production launcher for the built binary) and `BodyLab Dev.bat` rewritten as a developer menu (web dev / desktop dev / release build + smoke / full check). Removed the leftover `.tmp-install-*.cmd` debris.

### Changed
- **`BrowserRouter` → `HashRouter`**: routing now survives a hard reload on any static host (GitHub Pages project sites have no rewrite rules) and inside the Tauri WebView. All E2E navigation goes through a hash-aware `gotoRoute` helper.
- **Asset URLs are `BASE_URL`-aware** (`.ohpk` pack, vendor WASM glue, anatomy GLBs) so the app works under a subpath.
- **Content Security Policy**: production builds inject a meta CSP via a build-time Vite plugin (`default-src 'self'`, `wasm-unsafe-eval`, no remote origins); the Tauri shell mirrors the same policy in `tauri.conf.json` (was `null`).
- **Desktop rebuilt as 1.0.0-beta.3** (version bumped in `tauri.conf.json` + `Cargo.toml`): the shipped binary now embeds the current frontend (verified by content hash) — the beta.2 installers froze the pre-adversarial-QA code with the float 1RM and the corrupt-import crash. Smoke test: PASS.

### Verified
- `pnpm check` green: **453 root suite · 36 web · 21 browser E2E · lint 0/0**; desktop beta.3 binary smoke PASS.

## [1.1.0-dev] - 2026-09-11 (Adversarial QA pass: prune tautological tests, build zero-trust suites)

### Removed — tautological tests (no real signal)
- **Deleted `apps/web/src/__tests__/e2e-critical-flows.test.ts` (39 tests).** It reimplemented the Epley 1RM, BMI, US-Navy and body-age formulas *inside the test file* and then asserted them against themselves — it could never fail for a real product reason. The behaviours it claimed to cover are now exercised against the actual packages.

### Added — zero-trust / pessimistic suites
- **`tests/adversarial/test_analytics_adversarial.test.ts`** and **`test_parser_adversarial.test.ts`** (39 tests): NaN/±Infinity, empty and single-point series, zero variance, huge/negative values, truncated and 4-byte-unaligned buffers, fuzz-like byte soup. Two known lower-severity defects are pinned with `it.fails` as tripwires (zero-height health risk → `NaN`; `NaN` chronological age → `bodyAge`).
- **`apps/web/src/__tests__/contract.test.ts`** (6 tests): core↔web data-contract invariants (measurement ids/units, derived values, no silent engine↔UI drift).
- **`apps/web/e2e/adversarial.spec.ts`** (5 browser tests): corrupt/malformed `.bodylab` import, stored-XSS payload stays inert, hostile text input, navigation integrity.

### Fixed — real defects exposed by adversarial testing
- **`analytics` mixed cm and m** in WHtR-based categorisation, producing wrong bands for some inputs (`bodylab/core/analytics/src/index.ts`).
- **OXIM parser threw a raw `RangeError`** when constructing `Float32Array`/`Uint32Array` at a `byteOffset` not aligned to 4 bytes, instead of the controlled parse error (`apps/web/src/lib/oxim-parser.ts`).
- **A structurally valid but corrupt `.bodylab` crashed the app on import** (uncaught `items is not iterable` + IndexedDB errors). Added defensive payload validation at the trust boundary (`apps/web/src/pages/ExportImport.tsx`).

### Docs
- `docs/TESTING.md` gains §5.0 documenting the pass and its findings; all test counts synced to the verified state (**453 root suite / 24 files · 36 web · 19 E2E**).

## [1.1.0-dev] - 2026-09-11 (Green pipeline: typecheck, root scripts, lint & E2E)

### Fixed — the quality pipeline was not green
- **Typecheck (P0 blocker):** `BodyViewer3D.tsx` used the lazy `THREE` module (`| null`) inside `makeStageTexture()` without a null guard → `TS18047`. Added the guard. `pnpm check` was failing at its first step, so no gate downstream could run.
- **Root scripts pointed at packages that do not exist:** `pnpm dev` filtered `@fitness/bodylab-web` (the package is `web`), `pnpm build` filtered `@fitness/bodylab-core` (no such aggregate), and `pnpm lint` invoked ESLint with no config anywhere. Now `dev`/`build`/`typecheck` filter the real names and root `lint` delegates to oxlint in the web app.
- **Alias maps out of sync:** root `vitest.config.ts` was missing `@fitness/bodylab-analytics` and `@fitness/bodylab-ui` (present in `vite.config.ts`/`tsconfig.app.json`); added, so the three maps now match.
- **Max-effort 1RM rendered full float precision** (`116.66666666666666 kg`) in the exercise log while the live preview rounded; the store reducer now rounds the persisted Epley estimate to 0.1 kg.

### Changed — lint is clean (20 warnings → 0)
- Excluded the vendored WASM glue (`public/wasm/**`) from oxlint; removed a genuinely unused loop variable in `integration-total.test.ts`.
- Split `METRIC_CONFIG`/`COMPOSITION_CONFIG` into `features/progress/timeline-config.ts` (Fast Refresh) and fixed hook dependencies (`Overview` key-type constant hoisted; `BodyView`/`BodyMap`/`BodyViewer3D` deps; refs captured as locals in cleanup; `Measure` handler ordering). `ThemeProvider` now lazy-inits state instead of calling `setState` inside an effect.

### Removed — orphan design-system package
- **Deleted `bodylab/packages/ui`** (11 components + 4 token modules). It had zero consumers (the web app never imported it), no tests, no dark-mode variants, an out-of-range `lucide-react` version, and duplicated the web app's real token layer (`apps/web/src/index.css`). Its `@fitness/bodylab-ui` alias was removed from `vite.config.ts`, `tsconfig.app.json`, `apps/web/vitest.config.ts` and the root `vitest.config.ts`. The design system is now unambiguously the in-app Tailwind token layer + component conventions.

### Added — E2E coverage
- **Exercise-log persistence E2E** (`e2e/product.spec.ts`): logs 2 sets, checks the Epley 1RM, reloads, and asserts the data returns from IndexedDB. Browser E2E suite is now **14/14**.

### Docs
- Synced all documentation to the verified 2026-09-11 state: 447 core / 69 web / 14 E2E, clean lint, working root scripts, corrected exercise catalog (64), and current performance baselines.

## [1.1.0-dev] - 2026-09-05 (Desktop beta + Engine, Data, CI & Content hardening)

### Added — TrainingLab data bridge + desktop beta.2
- **TrainingLab Link export** (`lib/traininglab-export.ts`, button in Data Vault): one JSON with everything the future gym-planning app (local LLM, e.g. Qwen) needs — latest measurements + full history, anthropometric muscle scores (weakness map), WHtR/Adonis indicators, per-muscle training load (total/7d/last-trained/intensity + measurement proxy), PRs (Epley e1RM), full set log, and the 64-exercise catalog with muscle involvements. Contract `bodylab-traininglab-link` v1; flat, LLM-friendly, forward-compatible (consumers ignore unknown fields). Same privacy model: local file, no cloud.
- **Desktop beta.2** (`BodyLab_1.0.0-beta.2_x64-setup.exe`): rebuilds the shell with the full UI update — design-token overhaul (light/dark), self-hosted fonts, the `@layer base` reset fix (chips/pills contain their text app-wide), route-split performance, PC measure flow, shortcuts, and the TrainingLab Link export. Exe smoke-tested (launch + clean kill).

### Fixed — global CSS reset was crushing every Tailwind padding/margin utility (P1, visual)
- **Root cause of the "texto que se sale del marco" defect class:** `src/index.css` had a bare, unlayered `* { margin:0; padding:0; box-sizing:border-box }` reset. Tailwind v4 emits utilities inside the real cascade `@layer utilities`, and **unlayered CSS beats every layer** — so the reset silently overrode ALL `p-*`/`px-*`/`py-*`/`m-*` utilities app-wide. Chips/buttons computed `padding: 0px` (measured: Timeline "Chest" chip was 33.6×12 px with 15 px-tall text escaping it), while non-spacing utilities on the same elements worked, hiding the bug.
- Fix: reset moved into `@layer base` (documented in-place). Utilities now win when present. Verified by geometry: the same chip is now 57.6×24 px with `padding: 6px 12px`, no escape; full-app Playwright sweep over all 7 routes × dark theme reports zero nowrap-text escapes and zero horizontal scroll at 1366 px.
- **New permanent regression test** (`e2e/product.spec.ts` → "Chip containment (design-system guard)"): asserts no button/span text node exceeds its element's box on `/progress`. Browser E2E suite is now **13/13** (the GIF test additionally scrolls the expanded exercise into view — with correct padding the detail is taller and the IntersectionObserver lazy-loader needs the scroll a real user would do).

### Added — Windows desktop beta (M12)
- **Tauri v2 shell consolidated into its canonical home `bodylab/apps/desktop/src-tauri/`** (moved from the `apps/web/src-tauri` prototype and replaced the older, unbuildable scaffold that lacked a `capabilities/` dir, used `npm run` in a pnpm workspace, and pointed at stale schema/config): capabilities restored (`core:default` + `opener` only), Tauri v2 config schema, opener plugin wired.
- **First working Windows installer: `BodyLab_1.0.0-beta.1_x64-setup.exe`** (NSIS, WebView2 bootstrapper embedded). Built with `cd bodylab/apps/desktop && pnpm build`; release exe smoke-tested (launches, runs, clean kill). MSI deferred to stable (WiX rejects semver pre-release tags); flip `bundle.targets` to `["nsis", "msi"]` on a numeric-only version.
- Config fixes that made the build work: `beforeDevCommand`/`beforeBuildCommand` use explicit `cd ../web && …` (a bare `pnpm build` recursed into `tauri build` itself); `frontendDist` corrected to `../../web/dist` (Tauri resolves it relative to `src-tauri/`, not the app dir); bundle `category` is `Healthcare and Fitness` (the `HealthAndFitness` enum id is invalid).
- Dev environment: Visual Studio 2022 Build Tools (VC++ 14.44 + Windows SDK 10.0.26100) installed — the machine previously could not link MSVC binaries (see old `V1_STATUS.md` note).
- Docs synced: `docs/V1_RELEASE_GATE.md` (Gate G/B), `docs/ACCEPTANCE_CRITERIA.md` (AC-BUILD-002), `docs/REQUIREMENTS.md` (BL-BUILD-002), `PLAN.md` (M12 → BETA), `docs/ARCHITECTURE.md`, both READMEs, `docs/TRAININGLAB_PLAN.md`, `docs/PERFORMANCE.md` (new baselines: route-split shipped, main entry 275→91 KB gz), `AGENTS.md` + `knowledge.md` filled.

### Changed — Web performance (verified 2026-09-05)
- **Route-level code splitting is live** (`React.lazy` + `Suspense` for all 7 pages in `App.tsx`): main entry 291 KB raw / **91 KB gz** (was 949 KB / 275 KB), Recharts isolated in the lazy Progress chunk (112 KB gz), JSZip in ExportImport. `docs/PERFORMANCE.md` baselines + budgets updated.

### Added — PC UX alignment with the design spec (§97–106), verified in real Chromium
- **Button system (§98):** Overview gets the missing `Measure now` primary top-right (no more duplicated banner CTA, §99.1/§99.2); Settings `Save` → `Save profile` (verb+object) and downgraded to secondary (config page has no dominant action); Progress split into `Compare snapshots` primary (disabled + explanatory title until ≥2 snapshots) + `Save snapshot` secondary; inline snapshot form button labeled verb+object; Measure `Back` → `Back to overview`; icon-only info button on Reference gains `aria-label`; destructive `Reset onboarding` on Data now confirms in two steps before executing.
- **Keyboard registry (§104):** new `lib/shortcuts.ts` — global `M`/`O`/`B`/`P`/`R` navigation with a typing guard (never fires in inputs); Body page `F`/`B` (front/back), `1`/`2` (2D/3D), `Esc` closes the muscle panel; `Ctrl+Enter` saves the measure session from anywhere in it; hover tooltips on nav items and body-view controls disclose every shortcut.
- **Measure flow (§101):** two-pane session layout on ≥960 px (left checklist rail with pending/entered/skipped/active status + right guided field, sticky rail, click-to-jump); `Skip` per measurement; draft autosave to localStorage on every committed value with a `Continue measuring` resume chip on the setup view (closing the tab never loses a session).
- **Overview dashboard (§100):** KPI band of ≤4 cards (Weight+delta, BMI* ref-only, Coverage %, Last session) with a "what changed" context line; recent measurements already rows → added hover `▸` drill affordance.
- **A11y fixes:** single `h1` per page (sidebar brand demoted from `h1`); every icon-only button has title+aria; no horizontal scroll at 1280 px (re-verified); `settings.units`/`settings.metric`/`settings.imperial` and `measurements.saved` i18n keys added (were leaking raw keys into the UI).

### Added — Exercise content expansion (64 exercises)
- **+20 exercises** targeting the previously poor muscle groups and adding equipment variants (band/machine versions of existing movements), directly feeding the future local-AI routine builder:
  - Glúteo medio: `banded-hip-abduction`, `clamshells`, `fire-hydrants`; adductores: `sumo-squat`, `standing-cable-adduction`; tibial anterior: `tibialis-raise`; sóleo: `seated-calf-raise`; iliopsoas: `lying-leg-raise`, `hanging-leg-raise`; serrato: `push-up-plus`; romboides: `face-pulls`, `band-pull-apart`, `t-bar-row`; pectoral menor: `incline-dumbbell-press`, `machine-chest-fly`, `dumbbell-pullover`; variantes: `band-lateral-raise`, `machine-shoulder-press`, `machine-bench-press`, `goblet-squat`, `hack-squat`, `seated-leg-curl`, `farmers-walk`.
- **5 new muscles in the anatomy registry** (`muscle-info.ts` + `MUSCLE_GROUPS` proxy entries + `MuscleGroup` union): `pectoralis_minor`, `serratus_anterior`, `rhomboids`, `soleus`, `iliopsoas` — registry now 34 training muscles, every one with ≥1 exercise (regression-guarded).
- **21 public-domain stills** (free-exercise-db, Unlicense) for exercises without licensed animations, wired through `asset-manifest.json` + `ExerciseGif` image fallback; 7 exercises remain media-less with the explicit bilingual placeholder (push-up-plus, lying-hip-abduction, tibialis-raise, sumo-squat, banded-hip-abduction, clamshells, fire-hydrants) — the dataset has no clean match for them.

### Added — Visual/legibility overhaul (design tokens, dark theme, typography)
- **Offline-first fonts:** self-hosted variable Inter + JetBrains Mono (8 woff2 files in `public/fonts/`) — Google Fonts CDN removed from `index.html`; the app now renders identically offline.
- **Coherent design-token layer** in `index.css`: both themes rewritten on shared semantic tokens (`--color-surface*`, `--color-text*`, `--color-border*`, `--color-input*`, `--color-chip*`, `--color-primary*`, compact `--radius-*` scale) — one indigo brand in both themes, cool spec-aligned neutrals in light, no more near-black/pure-black mixing.
- **Theme-safe form fields:** every text input/select across pages (Settings, Measure, Measurements, SnapshotComparison, onboarding) now uses `--color-input-*` tokens — the old `border-slate-200` fields rendered as pale boxes on the dark surface (real legibility bug); focus ring unified on the primary token.
- **Sidebar redesigned** (soft active pill with accent indicator instead of the near-black block, tokens throughout) and **segmented controls fixed** (`BodyToolbar` mode/view toggles, Progress metric chips): the white thumb-on-slate100 track pattern that glowed in dark mode is gone.
- **Dark-aware chips/status everywhere:** ExerciseLog category chips, MuscleDetailPanel badges, SymmetryPanel status pills, BodyViewer3D error/loading overlays and camera toolbar, Measurements hover rows, proxy `P` badge — pastel `*-100` chips now have proper `dark:` counterparts (translucent ramps instead of bright paper squares).
- **Type floor raised:** micro-text under 12 px bumped to 11–13 px across AnalyticsDashboard, BodyMap overlays, ExerciseGif badges, MuscleList, Sidebar/BottomNav labels; page `h1`s unified at 28 px; muted text on dark corrected to the WCAG-AA `--color-text-muted` token.
- Verified with a real-Chromium computed-style audit (CSS Typed OM, exact sRGB conversion) of all 7 routes × both themes: **zero** sub-AA text, light-only chips, light-only borders, or sub-12 px text remaining; `tsc` clean, web vitest 69/69, Playwright E2E 12/12, core tests intact.

### Added — 3D viewer personalization + framing + chip hardening + desktop prototype
- **3D body is now personal by default:** after the WASM engine loads, the app auto-runs the fit solver against the profile's real measurements (height/chest/waist/hips) — the model is no longer a generic reference body until the user finds the hidden "Fit body" button. The fit report chips (`Body fitted · N iters` + per-segment deltas) now render automatically and are dark-mode safe.
- **Camera/framing fixed:** field of view widened 30°→40°, zoom range extended (min 1.2 / max 20 — previously capped at 8, which is why the model could never be framed comfortably), and the camera now auto-frames the body to its bounding sphere on load, on every Front/Back/Side preset, and after every fit — the full body is always in view.
- **Theme-aware 3D studio:** the WebGL scene background + ground now follow the active light/dark theme live (MutationObserver on the `dark` class) instead of a fixed light `#f8fafc` square inside the dark UI; softer key + cool fill + rim lighting and 2048 px shadows give the body volume definition. Shadow map uses non-deprecated `PCFShadowMap`.
- **Chip/label hardening ("texto que sobresale del borde"):** every chip row across the app is now single-line-safe — ProgressTimeline metric pills, MuscleDetailPanel quick-add chips, ExerciseLog muscle-involvement pills, and the 3D fit-report chips all use `whitespace-nowrap` so a pill can never wrap text outside its own border (rows still wrap as whole units). Verified with a real text-node-range overflow audit: **0 escaping text nodes** across `/progress`, `/body`, `/measure`, `/references`, `/` × dark/light × widths 1024–1536 px with real seeded data.
- **First Tauri v2 desktop prototype** (`apps/web/src-tauri/`): `tauri.conf.json` (1440×900 window, min 980×700, points at the Vite dev server in dev and `../dist` in prod), Cargo manifest + `main.rs`/`lib.rs`, `capabilities/default.json` with only `core:default` + `opener` (no host permission until a feature needs it), generated placeholder icons, and a `README.md` with run/build commands. Rust toolchain detected (1.98).
- **TrainingLab plan** (`docs/TRAININGLAB_PLAN.md`): full roadmap for the training module (F1 session logger → F2 library/manual routines → F3 optional local AI via Ollama with schema-validated JSON + deterministic fallback → F4 closed performance↔measurements loop → F5 native bridges), grounded in the real assets that already exist (64-exercise catalog with equipment variants, `exerciseSets`/`maxEfforts` stores, muscular score engine, 3D personal model, spec §97–106). `PLAN.md` roadmap updated to point at both.

### Fixed — P0: 3D model generation in a real browser
- Root cause was a pack/engine **format** mismatch: the OHPK v1 core pack requires the 0.2.1 engine (`OxiHumanEngine.from_core_pack_bytes`), but the app shipped npm `@cooljapan/oxihuman@0.2.0` (ZIP-pack `load_zip_pack_bytes`) → `RuntimeError: unreachable` trap. 0.2.1 was never published to npm and has no CI artifacts.
- Vendored the matching **0.2.1 engine** (glue `oxihuman_wasm.js`, `oxihuman_wasm_bg.wasm`, `oxihuman_wasm.d.ts`) byte-for-byte from the vendor's release demo (cooljapan.tech/bodylab, the build verified in headless Chrome by the release) into `public/wasm/`; removed the obsolete 0.2.0 files and the dead `@cooljapan/oxihuman` + `vite-plugin-wasm` dependencies.
- Verified pack provenance: `public/oxihuman-core-v1.ohpk` SHA-256 `09c4bb1f849f…` == upstream `assets/packs/oxihuman-core-v1.ohpk@v0.2.1` (2,093,260 B).
- `oxihuman-loader.ts` rewritten: no more hand-rolled wasm-bindgen ABI — it fetches the vendor glue as text, imports it as a data-URL module (keeps WASM out of the Vite/Rolldown module graph entirely), and calls `init(wasmUrl)` explicitly.
- `BodyViewer3D` now builds the engine via `OxiHumanEngine.from_core_pack_bytes(packBytes)`.
- **Playwright 3D test un-`fixme`d and passing** — the E2E suite is now 9/9 green, rendering the parametric body on a real WebGL canvas.

### Added
- Morph mapping now drives the engine's `gender` param from `profile.biologicalSex` (0.2.1 leaves gender unset/neutral until first written — previously every model rendered gender-neutral regardless of profile).
- `ExerciseGif` renders an explicit bilingual "animation coming soon" placeholder for exercises without licensed media, driven by the shipped `asset-manifest.json` (no wasted 404 request).
- Root `pnpm check`: one CI-ready command = web typecheck (`tsc -b`) + `pnpm test` (444) + web vitest (66) + Playwright E2E (9).
- `typecheck` + `test` scripts added to `apps/web`; `vite.config.ts` cleaned (no WASM plugin needed).
- `BodyLab_Web_UI_Design_Specification.md`: new §97–106 "PC / desktop integration addendum — buttons, actions, dashboards" (three-tier button system, one dominant action per page, PC dashboard anatomy with KPI caps, keyboard-first measure flow, pointer conventions, shortcut registry, hater-grade PC acceptance checklist), grounded in research on Hevy/Strong/Fitbod/MacroFactor and dashboard-design best practices; cross-references added to §4/§9/§10/§11/§69/§50.

### Changed
- `public/wasm/` ships the 0.2.1 vendor set (`oxihuman_wasm.js` + `oxihuman_wasm_bg.wasm` + `oxihuman_wasm.d.ts`); engine raw size 724 KB (was 422 KB) — see `docs/PERFORMANCE.md`.
- Docs reconciled: `docs/TESTING.md` (P0 resolved, 12/12 E2E, `pnpm check`, tooling-debt note), `docs/PERFORMANCE.md` (new baselines), `RESOURCE_MATRIX.md` (OxiHuman provenance + counts), PLAN.md gates, READMEs (64 exercises, 447 tests, 12 E2E).

## [1.1.0-dev] - 2026-08-31

### Added

#### Exercise System (Wave 4)
- 42 exercises in 8 categories (Chest, Shoulders, Biceps, Triceps, Back, Legs, Forearms, Core)
- 24 specific muscle groups (chest_upper/lower, anterior/lateral/posterior deltoid, etc.)
- Technical difficulty ratings (1-5) per exercise
- Hypertrophy effectiveness ratings (1-5) per exercise
- Muscle-contextual hypertrophy bars (adjusts based on selected muscle)
- Exercise tracking with sets, reps, weight, RPE
- 1RM estimation (Epley formula)
- Max effort tracking per exercise
- 36 animated GIFs (180×180) from exercises-dataset (MIT license)
- Exercise GIF lazy-loading component
- Exercise database persistence (IndexedDB)

#### Analytics Engine (Wave 5)
- Body Composition calculator (US Navy + BMI methods)
- Health Risk Indicators (WHtR + BMI + risk factors)
- Body Age Score (composite: WHtR 30% + BMI 20% + Proportions 25% + Consistency 15% + Trend 10%)
- Progress Prediction Engine (linear regression + R² confidence)
- Correlation Engine (Pearson coefficient)
- Analytics Dashboard component in Overview

#### UI/UX Improvements
- Dark mode with low contrast (CSS variables + ThemeContext)
- Flash prevention script in index.html
- ThemeToggle component (sun/moon icon)
- Design System components: Button, Card, Input, NumberInput, Badge, Tabs, Drawer, Dialog, Toast, EmptyState, Skeleton, MetricCard, SectionHeader, MeasurementRow
- Sidebar icons enlarged (w-6 h-6, stroke-[1.75])
- Measure button enlarged (w-14 h-14)
- Logo enlarged (w-10 h-10)

#### Testing
- E2E critical flows test suite (39 tests)
- Body composition formula tests
- Health risk assessment tests
- Progress prediction tests
- Correlation engine tests
- Body age calculation tests

#### Developer Experience
- Desktop launcher (BodyLab Dev.bat) with server-ready polling
- PowerShell shortcut installer (install-shortcut.ps1)
- Vite alias for @fitness/bodylab-analytics

#### Documentation & Quality (2026-09-04)
- docs/ARCHITECTURE.md — verified single source of truth (layers, aliases, routing, data flow)
- docs/TESTING.md — test strategy, per-level commands, coverage map and known gaps
- docs/PERFORMANCE.md — measured bundle baseline, gzip budgets, perf merge checklist
- CONTRIBUTING.md — corrected commands (per-package tests, oxlint, coverage), quality checklist
- V1_RELEASE_GATE.md — Gate I updated + Appendix A with measured performance baseline
- READMEs (root, bodylab, web) — fixed stale architecture trees and version claims
- PLAN.md — doc index updated

#### Total-Integration Test Suite (2026-09-04)
- New `integration-total.test.ts` (27 tests): exercise DB ↔ GIF files ↔ asset manifest, anatomy registry ↔ measurement types, 3D pipeline (profile → core params → preset → morph adjustments → engine → OXIM parse/validate) and bundled .ohpk/wasm assets
- Found + guarded data gaps: `gluteus_medius` with zero exercises; 7 exercises without GIF assets

#### Browser E2E (Playwright, 2026-09-04)
- `playwright.config.ts` + `e2e/product.spec.ts` (uses the installed Chrome-family Chromium, `pnpm test:e2e`)
- 8 tests passing: route integrity on all 7 screens, real exercise GIF decode (naturalWidth > 0)
- **P0 blocker found**: 3D viewer cannot generate the model in a real browser — the bundled `oxihuman-core-v1.ohpk` pack traps the WASM engine (`RuntimeError: unreachable` in `load_zip_pack_bytes`). Root cause: engine (npm @cooljapan/oxihuman ^0.2.0) vs asset pack (v0.2.1 per RESOURCE_MATRIX, commit `TODO_PIN_BEFORE_INTEGRATION` never pinned). 3D test is `fixme` until a matching pack ships

### Fixed
- Web vitest config (`apps/web/vitest.config.ts`) was missing the `@fitness/*` aliases, so web tests importing core could not run from `apps/web` — aliases now mirror `vite.config.ts`
- BodyViewer3D: the mount container was only rendered in the success state, so the init effect early-returned and the viewer stayed on "Preparing 3D model…" forever (no error either — timeout was registered after the early return). Container is now always mounted; loading/error are overlays. Caught by browser E2E
- i18n: added missing `body.front` / `body.back` / `body.allMuscles` keys — raw keys were rendered as visible UI text on the Body screen
- Weight unit bug: weight was showing `cm` instead of `kg` in Measure flow
- MEASUREMENT_TYPES missing `weight` type
- `find()` bug: UI was showing oldest measurement instead of latest
- `focus:ring-blue-500` inconsistency → unified to `focus:ring-indigo-500`
- Female sex button using `pink-500` → unified to `indigo-500`
- Camera icon confusing for "snapshots" → changed to `Clock`
- Circumference tab showing same view as Overview → dedicated view
- BodyMap MUSCLE_ID_MAP using wrong body-muscles library IDs
- TypeScript errors in AnalyticsDashboard (unused imports, type compatibility)
- Unused variables in core/analytics (m, sex parameters)

### Changed
- BodyMap: color mapping now uses score-based green→yellow→orange→red scale
- BodyMap: hover shows name + score + status + training volume
- BodyMap: color legend always visible
- BodyMap: "Front"/"Back" label visible
- 3D Viewer: graceful failure state with retry button
- 3D Viewer: camera presets (Front/Back/Side)
- 3D Viewer: interaction hints on first use
- 3D Viewer: clean white background
- Onboarding: dark mode compatible (was hardcoded light)
- Sidebar: dark mode compatible nav items
- Layout: dark mode background
- Launcher: waits for server ready before opening browser

## [1.0.0-rc.1] - 2026-08-27

### Added

#### Core Engine
- McCallum formula for male anthropometric proportions
- Venus Index for female anthropometric proportions
- Adonis Index (shoulder-to-waist ratio) with Golden Ratio
- Waist-to-Height Ratio (WHtR) for health assessment
- Frame size classification (small/medium/large)
- Score calculation with attenuation function
- Golden dataset for regression testing

#### Data Model
- Profile management (create, read, update, delete)
- Measurement tracking with history
- Body snapshots for point-in-time records
- Reference profiles (health, anthropometric, user-defined)
- Body composition calculations

#### Persistence
- Database-agnostic repository pattern
- In-memory implementation for testing
- SQLite/IndexedDB ready architecture
- Data integrity verification

#### 2D Visualization
- MuscleMapJS integration adapter
- Interactive body map with 86 body parts
- Color-coded heatmap based on scores
- Front/back view switching
- Tooltip with muscle details

#### 3D Visualization
- OxiHuman integration adapter
- Three.js scene management
- Parametric body generation
- Camera controls (orbit, pan, zoom)
- Export to GLB/VRM/STL/OBJ

#### Progress & Comparison
- Timeline extraction from snapshots
- Multi-parameter timeline support
- Recharts-compatible data formatting
- Trend calculation (increasing/decreasing/stable)
- Progress summary generation

#### Export & Import
- JSON export with full data
- CSV export for spreadsheet analysis
- Fitness Bundle format (.bodylab)
- Roundtrip import/export verification
- Data integrity preservation

#### Web Application
- Vite + React + TypeScript
- Tailwind CSS styling
- React Router navigation
- Dashboard with charts
- Measurements form
- Body view with 2D heatmap
- Progress tracking page
- Export/Import page

#### Desktop Application
- Tauri configuration
- Windows build setup
- Rust backend ready

#### Testing
- 297 automated tests
- 99.55% code coverage
- Unit tests for all modules
- Integration tests for adapters
- Roundtrip data integrity tests

### Technical Details

#### Architecture
- Core independence (no UI framework imports)
- Adapter pattern for external libraries
- Database-agnostic repository pattern
- JSON Schema contracts

#### Dependencies
- MuscleMapJS (MIT) - 2D muscle visualization
- OxiHuman (Apache-2.0) - 3D parametric body
- Three.js (MIT) - 3D rendering
- Recharts (MIT) - Charts and graphs
- Tailwind CSS (MIT) - Styling
- Tauri (MIT/Apache-2.0) - Desktop framework

#### License
- Apache-2.0
- All third-party attributions documented

---

## [0.1.0] - 2026-08-27

### Added
- Initial project structure
- Monorepo configuration
- Core anthropometric engine
- Database schema
- Integration adapters
- Test suite

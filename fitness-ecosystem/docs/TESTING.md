# BodyLab — Testing

> How BodyLab is tested, which commands to run, and where new tests belong.
> Suite inventory verified 2026-09-11 (post adversarial-QA pass).

## 1. Philosophy

- **Core is the crown jewel.** Formulas and analytics are pure functions → unit-tested exhaustively, including a golden dataset for regression safety.
- **Confianza cero (adversarial/pessimistic QA).** Tests must attack the real implementation, not restate it. A test that reimplements a formula and then asserts the formula is tautological noise — it was removed in the adversarial pass (see §5.0). Real tests feed degenerate, hostile and boundary inputs and pin known defects with `it.fails` so they turn green the day they are fixed.
- **Logic over DOM.** Web tests exercise the real data flows (constants → calculations → store rules) in jsdom without rendering, because those are the business-critical paths.
- **Every new feature ships with tests** (see Definition of Done in `CONTRIBUTING.md`).
- Coverage floor: **80% statements/branches/functions/lines on `bodylab/core`** (enforced by the root `vitest.config.ts` thresholds).

## 2. Test inventory

| Suite                              | Location                                                                                                               | Config / env                              | Covers                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core unit tests                    | `*.test.ts` next to sources in `bodylab/core/*`                                                                        | package vitest (1.x), node                | Formulas, scores, models, export                                                                                                                                                                                                                                                                                                                                                |
| Extra core suites                  | `tests/` (anthropometry, database, data incl. golden, conditioning ×2, somatotype ×2, navy, training ×2)               | root vitest, node                         | Golden dataset regression, DB schema, data integrity, conditioning normative tables, somatotype taxonomy + adversarial invariants, tape-only body fat, training hard-rule validator (T1)                                                                                                                                                                                        |
| Web integration tests (30)         | `apps/web/src/__tests__/integration-total.test.ts`                                                                     | web vitest (4.x), node-safe (fs)          | Exercise DB ↔ GIF files ↔ asset manifest, anatomy registry ↔ measurement types, 3D pipeline (profile → morph params → engine → OXIM parse/validate), bundled .ohpk/wasm                                                                                                                                                                                                         |
| Web contract tests (6)             | `apps/web/src/__tests__/contract.test.ts`                                                                              | web vitest, node                          | Core↔web data-contract invariants: measurement ids/units, derived values, no silent drift between engine and UI                                                                                                                                                                                                                                                                 |
| **Data-integrity (25)**            | `apps/web/src/__tests__/data-integrity.test.ts`                                                                        | web vitest + root vitest (fake-indexeddb) | `.bodylab` export→clear→import→export exact round-trip; re-import idempotency (UUID upsert, no duplicates); union import into populated DB (guest data survives); legacy localStorage→IndexedDB migration (+ corrupt-JSON rejection); Spanish decimal-comma input parsing (`parseNumberInput`); TrainingLab link contract v1 pinning (envelope keys, catalog↔muscle vocabulary) |
| **Adversarial core + parser (39)** | `tests/adversarial/test_analytics_adversarial.test.ts`, `tests/adversarial/test_parser_adversarial.test.ts`            | root vitest, node                         | Analytics + binary OXIM parser under hostile/degenerate input: NaN/±Infinity, empty & single-point series, zero variance, huge/negative values, truncated/unaligned buffers, fuzz-like byte soup. 2 known defects pinned via `it.fails`                                                                                                                                         |
| **Browser E2E (21)**               | `apps/web/e2e/product.spec.ts` (14) + `apps/web/e2e/adversarial.spec.ts` (5) + `apps/web/e2e/anatomy-xray.spec.ts` (2) | **Playwright + real Chromium**            | Routes, real GIF decode, WebGL/WASM 3D render + fit solver, guided measure flow, chip guard, `.bodylab` roundtrip, exercise-log persistence; **+ adversarial**: corrupt/malformed `.bodylab` import, stored-XSS payload, hostile text input, navigation integrity                                                                                                               |
| **Desktop smoke (binario)**        | `apps/desktop/scripts/smoke-desktop.ps1`                                                                               | PowerShell + WebView2 runtime             | Lanza el `.exe` real compilado: versión del binario, ventana principal viva, estabilidad 14 s, contenedor de storage WebView2 (`%LOCALAPPDATA%/com.bodylab.desktop`, origen `http_tauri.localhost`), cierre elegante. Verificado PASS sobre `bodylab.exe` 1.0.0-beta.2. No valida UI interna ni datos — esa es la frontera con los E2E web                                      |
| Export roundtrip                   | core export tests + golden data                                                                                        | vitest, node                              | `.bodylab` ZIP roundtrip `D_original ≡ D_restored`                                                                                                                                                                                                                                                                                                                              |

Test files detected in repo: 21 in `bodylab/core` + `tests/` (incl. the 2 conditioning + 2 somatotype + navy + 2 training suites), 2 extra adversarial in `tests/adversarial/`, 4 in the web app (`30 + 6 + 27 + 7 = 70` web tests). Verified total: **613 tests across 34 files pass** (`pnpm test`, 2026-09-27; includes the web contract + data-integrity tests picked up by the root config). Vitest web: **70/70 pass** (`cd bodylab/apps/web && npx vitest run`). Browser E2E: **21/21 pass** incl. adversarial + anatomy x-ray (`pnpm --filter web test:e2e`). Lint: `pnpm lint` (oxlint) is **0 warnings / 0 errors**.

> **Browser E2E** needs Playwright: `pnpm --filter web add -D @playwright/test` + `pnpm --filter web exec playwright install chromium` (already done). It boots a real Vite server (port 5199) and drives Chromium — this is the ONLY layer that proves WebGL/WASM rendering actually works. The 3D test runs for real since the P0 was resolved (see §5.0): the engine renders the parametric body from the OHPK v1 pack on a WebGL canvas.

> The web vitest config (`apps/web/vitest.config.ts`) must keep the same `@fitness/*` aliases as `vite.config.ts`/`tsconfig.app.json` — without them no web test that imports core can load when run from `apps/web`.

## 3. Commands

Run from `fitness-ecosystem/` unless noted:

```bash
# Everything (root config: node env, core aliases, coverage thresholds NOT enforced on plain `run`)
pnpm test                  # vitest run — all *.test.ts matched by root config
pnpm test:coverage         # coverage report with 80% thresholds on bodylab/core

# Core package alone (uses that package's own vitest 1.x + config)
cd bodylab && npx vitest run            # or: pnpm --filter @fitness/bodylab-anthropometry test

# A specific core test
npx vitest run anthropometry/score      # from bodylab/core/anthropometry

# Web tests (vitest 4.x, jsdom + src/test-setup.ts) — MUST run from the web app dir
cd bodylab/apps/web && npx vitest run
cd bodylab/apps/web && npx vitest run __tests__/contract
cd bodylab/apps/web && npx vitest run --coverage   # web coverage (no enforced threshold yet)

# Adversarial suites (root config)
npx vitest run tests/adversarial
npx vitest run tests/adversarial/test_parser_adversarial.test.ts

# Browser E2E (Playwright + real Chromium — boots its own Vite server on :5199)
cd bodylab/apps/web && pnpm test:e2e
cd bodylab/apps/web && pnpm exec playwright test --grep "3D"   # single area

# Watch mode
pnpm test:watch             # root
cd bodylab/apps/web && npx vitest        # web
```

> **Gotcha — two Vitest generations.** The workspace root and most core packages run Vitest 1.x; the web app runs Vitest 4.x with its own config. Always run web tests from `bodylab/apps/web` (or with `--config`) so the jsdom environment and aliases apply. Running `pnpm test` from the root only picks up `**/*.test.ts` (node env) — `.test.tsx` web tests are excluded there by design.

## 4. Where to put new tests

| You changed…                                                     | Add tests…                                                                         | Example                                        |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| A core formula/model                                             | `*.test.ts` beside the source, pure asserts                                        | `bodylab/core/anthropometry/src/score.test.ts` |
| Regression-prone math                                            | Golden dataset entry in `tests/data/golden/` + suite in `tests/`                   | profile fixtures                               |
| Web domain logic (constants, store rules, calc wiring)           | `apps/web/src/__tests__/` (or `*.test.ts(x)` under src)                            | `contract.test.ts`                             |
| A boundary the UI would never send, or a hostile/corrupt payload | `tests/adversarial/` (core/parser) or `apps/web/e2e/adversarial.spec.ts` (browser) | degenerate inputs, corrupt `.bodylab`          |
| A React component                                                | `*.test.tsx` beside it (jsdom, `@testing-library/react` already installed)         | render + user-event                            |
| Export/import or persistence                                     | Roundtrip tests (export → import → compare)                                        | existing roundtrip suites                      |

Name tests after the behaviour they pin, in the vocabulary of `docs/PRODUCT_SPEC.md`, so the evidence is readable without a separate requirements index.

## 5. Coverage today and known gaps

Strong: formulas (anthropometry 198+), WHtR/Adonis/McCallum/Score, references, golden dataset, adversarial analytics + parser (39), conditioning normative tables (46, see §5.2), somatotype taxonomy + invariants (36, see §5.3), tape-only body fat (8, see §5.4), measurement-guide pedagogy (7), web contract (6) + total-integration assets/pipeline (30) + 19 real-browser E2E flows (14 product + 5 adversarial).

### 5.0 Adversarial QA pass (2026-09-11)

A zero-trust pass **removed** and **rebuilt** the test surface:

- **Removed:** `apps/web/src/__tests__/e2e-critical-flows.test.ts` (39 tests). It reimplemented the Epley 1RM, BMI, US-Navy and body-age formulas _inside the test_ and then asserted them against themselves — tautological, zero signal. The real behaviour it claimed to cover is now sourced from the actual packages (`bodylab/core/*`) and exercised in `contract.test.ts` + `tests/adversarial/`.
- **Added:** `tests/adversarial/` (39 tests, analytics + binary parser) and `apps/web/e2e/adversarial.spec.ts` (5 browser tests).

Defects surfaced and fixed by this pass:

1. **Units bug in `analytics` (real).** `riskCategory`/derived analytics mixed cm and m, producing wrong WHtR bands for some inputs. Fixed in `bodylab/core/analytics/src/index.ts`; pinned by adversarial tests.
2. **Uncontrolled `RangeError` in the OXIM parser (real).** Constructing `Float32Array`/`Uint32Array` over the incoming `ArrayBuffer` at a `byteOffset` not aligned to 4 bytes threw a raw `RangeError` instead of the controlled parse error. Fixed in `apps/web/src/lib/oxim-parser.ts`.
3. **Import crash on a corrupt `.bodylab` (real, browser).** A manifest that was structurally valid but carried non-iterable data crashed the app with uncaught `items is not iterable` + IndexedDB errors. Fixed with a defensive payload validation at the trust boundary in `apps/web/src/pages/ExportImport.tsx`; covered by the adversarial browser test.
4. **Two lower-severity defects remain pinned** (not fixed) in `tests/adversarial/test_analytics_adversarial.test.ts` via `it.fails`: (a) zero height in `health risk` yields `NaN` instead of a guarded result; (b) `NaN` chronological age propagates into `bodyAge`. They flip to failing the moment the behaviour is fixed, which is the intended tripwire.

Gaps (quality backlog — do not block V1.0 unless a requirement demands it). Open findings:

### 5.1 Data-integrity & distribution pass (2026-09-27)

Prompted by an adversarial product review, a persistence/distribution pass added `data-integrity.test.ts` (25 tests, runs green under BOTH vitest generations via fake-indexeddb) and closed real defects:

1. **Decimal-comma silent truncation (real, fixed).** Every numeric input used bare `parseFloat`, so the Spanish UI convention `"75,5"` was silently stored as **75** — a data-corruption class that passed all `> 0` sanity checks. New `lib/parse-num.ts` (`parseNumberInput` / `normalizeDecimalInput`) handles ES/EN separators, thousands grouping and whitespace; wired into Measurements, Measure (guided session), Onboarding, Settings, MuscleDetailPanel and ExerciseLog. Convention: **no bare `parseFloat`/`parseInt` on user input — route through `parseNumberInput`**.
2. **`.bodylab` import semantics pinned (verified, not a defect).** Re-importing the same backup is idempotent (records are UUID-keyed, `put()` upserts) and importing into a populated DB **unions** measurements (guest data survives). The export→clear→import→export round-trip is byte-exact. These behaviours are now regression-pinned instead of accidental.
3. **Legacy migration now tested.** localStorage→IndexedDB migration (profile, measurements, snapshots, settings) plus corrupt-JSON rejection. IndexedDB v1→v2 schema migration remains untested (no v2 exists yet).
4. **TrainingLab link contract v1 pinned.** `lib/traininglab-export.ts` (contract version 1, consumed by TrainingLab) now has schema-pinning tests: envelope key order, version literal, catalog size vs `ALL_EXERCISES`, muscle vocabulary consistency. Any breaking change to the bridge must bump `TRAININGLAB_EXPORT_VERSION` and update this suite in the same commit.
5. **Desktop auto-update shipped.** Tauri updater plugin wired end-to-end (Rust plugin + capability + JS wrapper `lib/updater.ts` + opt-in manual check in Settings — never automatic, privacy model intact). Release signing + `latest.json` feed automated in `.github/workflows/release.yml` (see §7).

Gaps still open after this pass: React component coverage (item 3 below), page-level export/import UI, IndexedDB v1→v2 migration test (no v2 yet), a11y.

### 5.2 Conditioning package pass (2026-09-27)

New core package `@fitness/bodylab-conditioning` (Cooper 12-min, resting HR, measured body-fat %, abdominal skinfold + J-P/Siri pipeline) shipped with 35 tests: unit tests pin the **published cut-offs** of each primary table (Cooper 1968 via BrianMac; ACE; Jackson-Pollock 3-site + Siri 1961) instead of restating them, and the adversarial suite proves table monotonicity and domain guards. Findings fixed by the adversarial pass itself:

1. **No upper plausibility bound on Cooper (real, fixed).** `classifyCooperTest(1e9, 25, 'male')` classified as `excellent` — a data-entry typo (extra digit) laundered into a top score. Now: distances > **5000 m** (≈ the best human 12-min effort) return `null` as measurement error.
2. **Siri could emit physiologically impossible body fat (real, fixed).** `siriBodyFat(1.1)` returned **0 %** (below essential fat for both sexes), and Σ=3 mm skinfolds produced negative %BF. Now `siriBodyFat` takes `sex` and floors the result at essential fat (male 2 %, female 8 %); `jacksonPollockBodyDensity` validates **each site** (3–80 mm, same domain as the classifier) so a negative site can no longer hide inside an acceptable sum, and it cross-checks its own output through Siri.
3. **Test-side corrections (not code bugs):** `cooperAgeKey(50,'male')` is `50+` (test had pinned 40-49), and the VO2max constant (3000−504.9)/44.73 ≈ 55.75 rounds to 55.8. The Σ=240 mm boundary (D=0.9967 → ≈46.7 % BF, severe obesity) is plausible physiology and is now pinned as **accepted** with a sanity-bounded %BF, not rejected.

### 5.3 Somatotype pass (2026-09-27)

`classifySomatotype()` (core/composition, Heath-Carter proxy variant) shipped with 36 tests (26 unit + 10 adversarial). Design: endomorphy from measured %BF via ACE-anchored piecewise-linear map (cut-offs shared with conditioning, cross-package coherence pinned), ectomorphy via the real Heath-Carter HWR equation, mesomorphy as a frame proxy (height/wrist → 2/4/6 + lean bonus). Findings:

1. **`calculateFrameSize` unit trap (latent, documented).** The function takes height in **meters** (guard ≤ 2.5, ×100 internal) while its parameter names and docstring said cm — no production caller exists yet (only a typed field), so no live bug; the docstring now states the real contract and the somatotype tests pin it (a cm caller would throw, not corrupt).
2. **Category grammar pinned.** 13-name Carter-style taxonomy with deterministic tie-breaking (adjective = 2nd component, noun = dominant; ties resolve meso > ecto > endo); a dense-grid adversarial test (0.5 steps over the full legal triple space) proves every category's noun carries the max value.
3. **Scale ceilings verified on a dense grid:** endo ≤ 16, meso ≤ 6.5, ecto ≤ 12, display string always round-trips, no NaN/Infinity/throws escape on any hostile input.

### 5.4 Measurement-guides & tape-only body fat pass (2026-09-27)

Owner requirement: teach users to measure themselves with whatever they have, and be honest about certainty — fat storage distribution varies, so a single abdominal skinfold misreads many bodies. Shipped:

1. **`estimateBodyFatNavy` (core/composition, Hodgdon & Beckett 1984).** Tape-only %BF (neck/waist/height; hip required for females). Guards: waist ≤ neck (log argument), out-of-domain circumferences, density outside (0.9, 1.12), output outside physiological %BF — all `null`, never NaN. 8 tests with hand-recomputed published-equation anchors (male 180/38/85 → 16.1 %; female 165/32/72/98 → 27.4 %) + monotonicity + adversarial (no throw under hostile inputs; the raw equation's −175 % "fat" for 250 cm/neck 55/waist 56 is correctly rejected).
2. **`lib/measurement-guides.ts` (web registry, 6 tests).** Bilingual tutorials for Navy tape, Jackson-Pollock 3-site caliper, Cooper 12-min and manual resting HR: steps, tips, **no-equipment fallbacks** (string + ruler, printable tape, soccer-field pacing, 30 s × 2 pulse count), equipment tiers and certainty levels with `seePct` where published. The fat-distribution caveat is pinned in tests: J-P sites **differ by sex** (female = triceps/suprailiac/thigh), Navy reads overall fatness independent of storage pattern.
3. **Gap acknowledged:** guides are not yet linked from the measurement forms (UI wiring is the next step); the J-P implementation in conditioning still documents the male site set only.
4. **UI wired (same day):** Measurements page gains a **Conditioning tab** — the four conditioning types with quick-add and per-type mini-guides, plus the full bilingual tutorials from `lib/measurement-guides.ts` with equipment tiers, certainty badges (±SEE% where published) and the sex-specificity warning. Local `MEASUREMENT_GUIDES` registry extended with the 4 conditioning entries.
5. **TrainingLab T1 (2026-09-27, later):** new pure core package `@fitness/bodylab-training` — `plan.ts` (Routine/Day/ExerciseSlot/AiProposal + 34-muscle→13-family mapping + level volume windows) and `validator.ts` (structural checks + the plan's five hard rules: catalog+equipment, no big family on consecutive days, weekly direct-set volume windows, focus coverage, AI weak-muscle citation). Catalog injected, core stays UI-free; the module never throws (adversarial suite proved one real crash on a hostile LLM response and it was fixed). 36 tests. Alias in all three maps. Milestone T1 of the TrainingLab plan (now `docs/TRAININGLAB_UI_PLAN.md`) — T2 (deterministic generator with golden outputs) is next.
6. **Conditioning surfaced + TrainingLab v2:** the aggregated profile is now visible: `features/progress/ConditioningPanel.tsx` (Progress page) shows the 0-100 score, the classified axes with their normative bands, the Cooper VO2max estimate and the J-P 3-site %BF chips; `body_fat_measured` joined the timeline with an `≈` estimate marker (Navy records are saved `confidence:'low'` — the card distinguishes them from caliper/DEXA values). TrainingLab export bumped to **v2** adding the `conditioning` weakness map (`conditioningScore` + per-axis results + `classifiedCount`); contract tests pin the new envelope and the null cases (no profile / nothing classifiable). Note: the web `vitest.config.ts` was missing the `@fitness/bodylab-conditioning` alias (vite/tsconfig had it) — latent inconsistency surfaced by the first import from web code, fixed.
7. **Same-day follow-up (J-P female sites + Navy form + illustrated sites):** the conditioning female J-P branch was **replaced with the published JPW 1980 equation** (`D = 1.0994921 − 0.0009929·Σ + 0.0000023·Σ²`, sites triceps/suprailiac/thigh, no age term) — the previous non-published form was mathematically dead (density ≥ 1.12 for every plausible Σ → always null; +11 conditioning tests incl. exact anchors Σ=48 → 18.2 % and Σ=20 → 8.1 %). New `jacksonPollockBodyFatPct` (full pipeline) and `JP3_SITES` exports; `buildConditioningProfile` now exposes an independent `jacksonPollockFemaleBodyFatPct` axis (triceps/suprailiac/thigh). The Conditioning tab gained a **Navy tape form** (neck/waist/hip per sex, height from the profile, live preview with ±3.5 % badge) saving `body_fat_measured` with `confidence:'low'` + provenance notes, and the JP3 guide renders **schematic ♀/♂ SVG figures** with numbered sites and per-sex fat-distribution warnings (+1 guide test pinning the drawn female protocol). **Routing fix:** `pages/Measurements.tsx` was orphaned (no route mounted it); it now lives at `/history` (sidebar 'History' + `H` shortcut, legacy `/measurements` redirect), verified end-to-end in a real browser: male 178/38/85 → 16.4 %, female 165/32/72/98 → 27.4 % (= the published test anchor), persisted to IndexedDB.

Open-findings list (numbered; referenced as "item N below" from the passes above):

0. **✅ P0 RESOLVED — 3D model generation works in a real browser.** Root cause was a pack/engine **format** mismatch, not just a version gap: the OHPK v1 pack requires the 0.2.1 engine (`OxiHumanEngine.from_core_pack_bytes`), but the app shipped the npm 0.2.0 wasm whose `load_zip_pack_bytes` only reads ZIP packs (`RuntimeError: unreachable`). Fix: vendored the matching 0.2.1 engine build (glue + wasm + d.ts, byte-for-byte from the vendor's release demo, the build verified in headless Chrome by the release) under `public/wasm/`, and verified the pack SHA-256 against upstream `assets/packs/oxihuman-core-v1.ohpk@v0.2.1`. Loader rewritten to import the vendor glue at runtime; `BodyViewer3D` now calls `from_core_pack_bytes`. Playwright 3D test un-`fixme`d and green. Was a genuine P0 that no headless test could catch.
1. **✅ FIXED — `gluteus_medius` had zero exercises.** Added `lying-hip-abduction` (side-lying hip abduction) as its primary target; regression test now asserts every declared muscle id is covered (64 exercises).
2. **7 exercises ship without any media** (push-up-plus, lying-hip-abduction, tibialis-raise, sumo-squat, banded-hip-abduction, clamshells, fire-hydrants) — no clean licensed GIF _or_ still exists in the public-domain dataset (free-exercise-db, Unlicense). `ExerciseGif` renders an explicit bilingual placeholder, driven by the shipped `asset-manifest.json` (single source of truth), so no 404 fires. Content gap, guarded by tests. The other media-less-exercise stills now ship **public-domain still images** (free-exercise-db, JPEG) rendered as a graceful image fallback with a bilingual "no animation" badge — no animated GIFs for them exist under a license compatible with this Apache-2.0 project (wger is CC-BY-SA 3.0, ExerciseDB animated GIFs require a paid API key).
3. **React components: near-zero coverage.** `BodyMap`, `BodyViewer3D`, `Onboarding`, `store.tsx` reducer branches, `db.ts` migrations are untested in jsdom. Test setup (`test-setup.ts`, `@testing-library/*`) is ready.
4. **Store actions** — happy path + error paths of `store.tsx` actions (profile CRUD, session save, delete) are only exercised indirectly.
5. **Web export/import UI** — core roundtrip is covered; the page-level flow is not.
6. **Migrations** — IndexedDB schema v1 → v2 path has no test; the localStorage → IndexedDB auto-migration has one (§5.1).
7. **Accessibility** — no a11y assertions (component tests should add `jest-dom` role/name checks as components get covered).

## 6. Running the whole suite cleanly

```bash
pnpm check                                      # ONE command, CI-ready: typecheck → pnpm test (577) → web vitest (70) → Playwright E2E (21)
pnpm typecheck && pnpm test && pnpm test:coverage   # 0 TS errors + all green + ≥80% core
cd bodylab/apps/web && npx vitest run               # web logic green (61)
cd bodylab/apps/web && pnpm test:e2e                # browser E2E (21 pass incl. real 3D render, fit solver and adversarial pass)
```

`pnpm check` (root) is the single CI entry point. No CI config exists yet — wire it to `pnpm check`.

> **Tooling note (updated 2026-09-11):** all 8 `bodylab/core/*` packages now have a `tsconfig.json` and their own `typecheck`/`build` scripts run (`pnpm typecheck` filters `web` + `./bodylab/core/**`). Still missing standalone configs: `bodylab/integrations/*`, `bodylab/packages/contracts`, and the whole `traininglab/` skeleton. The web app's `tsc -b` remains the effective whole-monorepo typecheck because it compiles every core module through the `@fitness/*` aliases. There is still no CI config — `pnpm check` is the single entry point to wire up.

## 7. Desktop updater & release signing

- **Keypair**: generated once via `npx tauri signer generate` into `bodylab/apps/desktop/src-tauri/.updater-key` (+ password file `.updater-key.password`). Both are **gitignored — never commit them**. The public half is embedded in `tauri.conf.json` (`plugins.updater.pubkey`). Losing the private key OR password = updates can never be signed again; users would need a full reinstall.
- **GitHub secrets** (Settings → Secrets and variables → Actions): `TAURI_SIGNING_PRIVATE_KEY` (contents of the key file) and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`.
- **Feed**: `.github/workflows/release.yml` (trigger: push tag `v*`) builds the NSIS installer, signs it, generates `latest.json` (static update feed) and publishes the GitHub release. The desktop app polls `https://github.com/OWNER/REPO/releases/latest/download/latest.json` — **replace OWNER/REPO with the real slug** in `tauri.conf.json` before the first release.
- **Policy**: the check is manual, opt-in, and performed by the Rust process (one GET to the release feed). The webview CSP stays network-free; nothing is downloaded in the background.

> **Tooling note (updated 2026-09-11):** all 8 `bodylab/core/*` packages now have a `tsconfig.json` and their own `typecheck`/`build` scripts run (`pnpm typecheck` filters `web` + `./bodylab/core/**`). Still missing standalone configs: `bodylab/integrations/*`, `bodylab/packages/contracts`, and the whole `traininglab/` skeleton. The web app's `tsc -b` remains the effective whole-monorepo typecheck because it compiles every core module through the `@fitness/*` aliases. There is still no CI config — `pnpm check` is the single entry point to wire up.

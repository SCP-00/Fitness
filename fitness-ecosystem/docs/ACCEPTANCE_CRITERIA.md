# BodyLab — Acceptance Criteria

Each criterion is binary: PASS or FAIL. No "approximately correct."

---

## AC-CORE: Core Architecture

### AC-CORE-001: Core Independence
```
Test: Import anthropometry module from a plain TypeScript script
      (no React, no DOM, no browser APIs).
Expected: Calculations produce correct results.
Result: PASS ✅
```

### AC-CORE-002: Monorepo Build
```
Test: pnpm install → pnpm build → pnpm test
      from a clean clone with no prior state.
Expected: All packages build. All tests pass.
Result: PASS ✅
```

### AC-CORE-003: TypeScript Strict
```
Test: pnpm typecheck across all packages.
Expected: Zero type errors.
Result: PASS ✅ (0 errors)
```

---

## AC-ANTHRO: Anthropometric Calculations

### AC-ANTHRO-001: McCallum Formula
```
Input: wrist = 17 cm
Expected:
  chest = 6.5 × 17 = 110.5 cm
  waist = 0.70 × 110.5 = 77.35 cm
  hips = 0.85 × 110.5 = 93.925 cm
  biceps = 0.36 × 110.5 = 39.78 cm
  thigh = 0.53 × 110.5 = 58.565 cm
  neck = 0.37 × 110.5 = 40.885 cm
  calf = 0.34 × 110.5 = 37.57 cm
  forearm = 0.29 × 110.5 = 32.045 cm
Tolerance: ±0.01 cm
Result: PASS ✅
```

### AC-ANTHRO-002: Adonis Index
```
Input: shoulders = 120 cm, waist = 77 cm
Expected: ratio = 120 / 77 ≈ 1.5584
Golden ratio: 1.618
Tolerance: ±0.001
Result: PASS ✅
```

### AC-ANTHRO-003: WHtR
```
Input: waist = 80 cm, height = 175 cm
Expected: WHtR = 80 / 175 ≈ 0.4571
Status: healthy (< 0.50)
Result: PASS ✅
```

### AC-ANTHRO-004: Frame Size
```
Input: height = 165 cm, wrist = 14.5 cm
Expected: ratio = 165 / 14.5 ≈ 11.38 → small (> 10.9)
Result: PASS ✅
```

### AC-ANTHRO-005: Score Calculation
```
Input: actual = 82 cm, ideal = 80 cm
  deviation = |82 - 80| / 80 = 0.025
  score = max(0, 1 - 4.0 × 0.025) = 0.90
Result: PASS ✅
```

### AC-ANTHRO-006: Edge Cases
```
Test: Zero measurements, negative values, extreme values
Expected: Graceful handling, no crashes, clear error messages
Result: PASS ✅
```

---

## AC-MEAS: Measurements

### AC-MEAS-001: Create Measurement
```
Test: Create 10 measurements of different types.
Expected: All saved with correct values, units, timestamps.
Result: PASS ✅
```

### AC-MEAS-002: History Integrity
```
Test: Create measurement, modify, verify original is preserved.
Expected: Both old and new values exist in history.
Result: PASS ✅
```

### AC-MEAS-003: Unit Conversion
```
Input: 80 cm
Expected: 31.4961 in (tolerance ±0.01)
Result: PENDING (unit conversion not yet implemented)
```

---

## AC-REF: Reference Profiles

### AC-REF-001: Built-in Profiles Load
```
Test: Load all built-in reference profiles.
Expected: At least 2 profiles available (health, anthropometric).
Result: PASS ✅
```

### AC-REF-002: Custom Profile
```
Test: Create a custom reference profile with 5 measurements.
Expected: Profile saved, selectable, usable in calculations.
Result: PENDING (custom profile creation not yet implemented)
```

---

## AC-2D: 2D Visualization

### AC-2D-001: MuscleMap Renders
```
Test: Load 2D body view with default measurements.
Expected: Body displayed with color-coded regions.
Result: PASS ✅
```

### AC-2D-002: Color Mapping
```
Input: score = 0.95 → green, 0.75 → yellow, 0.50 → orange, 0.20 → red
Expected: Correct colors applied to regions.
Result: PASS ✅
```

### AC-2D-003: Region Interaction
```
Test: Click on a muscle region.
Expected: Tooltip/detail panel shows measurement data.
Result: PASS ✅
```

---

## AC-3D: 3D Visualization

### AC-3D-001: Model Loads
```
Test: Initialize Three.js scene with OxiHuman model.
Expected: 3D body renders without errors.
Result: PASS ✅
```

### AC-3D-002: Parameter Deformation
```
Test: Change height parameter from 0.5 to 0.8.
Expected: Mesh deforms. No vertex corruption.
Result: PASS ✅
```

### AC-3D-003: Camera Controls
```
Test: Orbit, pan, zoom the 3D model.
Expected: Smooth camera movement. No disorientation.
Result: PASS ✅
```

### AC-3D-004: GLB Export
```
Test: Export current 3D model as GLB file.
Expected: Valid GLB file that can be opened in a GLB viewer.
Result: PENDING (GLB export not yet implemented)
```

---

## AC-PROG: Progress

### AC-PROG-001: Snapshot Creation
```
Test: Create 3 snapshots over simulated time.
Expected: All 3 stored with distinct timestamps.
Result: PASS ✅
```

### AC-PROG-002: Comparison
```
Input: Snapshot A (chest=95), Snapshot B (chest=98)
Expected: delta = +3 cm, percentage = +3.16%
Tolerance: ±0.01%
Result: PASS ✅
```

### AC-PROG-003: Timeline Graph
```
Test: Display measurement timeline with 5+ data points.
Expected: Graph renders with correct data points.
Result: PASS ✅
```

---

## AC-EXP: Export & Restore

### AC-EXP-001: JSON Export
```
Test: Export profile + measurements as JSON.
Expected: Valid JSON file with all required fields.
Result: PASS ✅
```

### AC-EXP-002: CSV Export
```
Test: Export measurements as CSV.
Expected: Valid CSV with headers and data rows.
Result: PASS ✅
```

### AC-EXP-003: Bundle Roundtrip
```
Test: Export Fitness Bundle → Delete local data → Import bundle.
Expected: D_original ≡ D_restored for all fields.
Result: PASS ✅
```

### AC-EXP-004: Offline Export
```
Test: Disconnect network → export all formats.
Expected: All exports succeed without internet.
Result: PASS ✅
```

---

## AC-DATA: Persistence

### AC-DATA-001: Restart Survival
```
Test: Create data → Close app → Reopen → Verify data intact.
Expected: All data preserved.
Result: PASS ✅
```

### AC-DATA-002: Algorithm Versioning
```
Test: Create assessment → Check algorithm_version field.
Expected: Version string present and consistent.
Result: PASS ✅
```

---

## AC-BUILD: Build & Platform

### AC-BUILD-001: Web Build
```
Test: pnpm build → Open in browser → Verify functionality.
Expected: App loads, core features work.
Result: PASS ✅
```

### AC-BUILD-002: Windows Build
```
Test: tauri build → Install → Launch → Verify functionality.
Expected: App installs, launches, core features work.
Result: PASS (beta level, 2026-09-05) — BodyLab_1.0.0-beta.1_x64-setup.exe (NSIS) built; release exe launches and runs (smoke-tested). Full install+UI pass and .msi pending stable.
```

### AC-BUILD-003: Fresh Clone
```
Test: Clone repo → pnpm install → pnpm build → pnpm test
Expected: Zero errors. Reproducible.
Result: PASS ✅
```

---

## AC-PRIV: Privacy

### AC-PRIV-001: No Network Calls
```
Test: Monitor network traffic during full usage session.
Expected: Zero outbound connections.
Result: PASS ✅
```

### AC-PRIV-002: Local Data Only
```
Test: Verify all data files are local.
Expected: No cloud endpoints configured. No upload logic.
Result: PASS ✅
```

---

## AC-TEST: Test Suite

### AC-TEST-001: Critical Tests Pass
```
Test: pnpm test
Expected: 100% pass rate on critical tests.
Result: PASS ✅ (453/453 root suite, 24 files; plus 36 web tests and 21 browser E2E incl. 5 adversarial + 2 x-ray)
```

### AC-TEST-002: Golden Dataset
```
Test: Run golden dataset against anthropometric engine.
Expected: All outputs match expected values within tolerance.
Result: PASS ✅
```

### AC-TEST-003: Coverage
```
Test: vitest run --coverage
Expected: Core modules ≥ 80% coverage.
Result: PASS ✅
```

---

## AC-DOC: Documentation

### AC-DOC-001: README
```
Test: README.md exists, is accurate, includes setup instructions.
Expected: A new developer can set up the project from README alone.
Result: PASS ✅
```

### AC-DOC-002: Third-Party Notices
```
Test: Every external dependency is listed in THIRD_PARTY_NOTICES.md
Expected: 100% of dependencies documented with license and URL.
Result: PASS ✅
```

### AC-DOC-003: License Files
```
Test: LICENSE, NOTICE, THIRD_PARTY_NOTICES.md all present.
Expected: Files exist and are correct.
Result: PASS ✅
```

---

## Summary

| Category | Total | Passed | Pending |
|----------|-------|--------|---------|
| Core Architecture | 3 | 3 | 0 |
| Anthropometric Calculations | 6 | 6 | 0 |
| Measurements | 3 | 2 | 1 |
| Reference Profiles | 2 | 1 | 1 |
| 2D Visualization | 3 | 3 | 0 |
| 3D Visualization | 4 | 3 | 1 |
| Progress | 3 | 3 | 0 |
| Export & Restore | 4 | 4 | 0 |
| Persistence | 2 | 2 | 0 |
| Build & Platform | 3 | 2 | 1 |
| Privacy | 2 | 2 | 0 |
| Test Suite | 3 | 3 | 0 |
| Documentation | 3 | 3 | 0 |
| **Total** | **41** | **37** | **4** |

**Completion: 90.2%**

---

*Total acceptance criteria: 41*
*All must PASS for V1.0 release.*
*Last updated: 2026-09-11*

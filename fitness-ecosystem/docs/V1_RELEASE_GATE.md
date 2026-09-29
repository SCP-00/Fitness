# BodyLab — Release Gate

V1.0 is released ONLY when ALL gates pass. No exceptions.

---

## Formula

```
V1.0 = Requirements AND Tests AND Acceptance AND Documentation AND Build AND Audit
```

If any gate fails: NOT READY FOR V1.0.

---

## Gate Checklist

### Gate A — Functional Requirements
```
[x] 69/73 MUST requirements: 94.5% PASS
[ ] 4 remaining: multi-profile, unit conversion, custom refs, GLB export
[ ] Each requirement has evidence (test, screenshot, or log)
```

### Gate B — Acceptance Criteria
```
[x] 38/41 acceptance criteria: 92.7% PASS (Windows build passes at beta level, 2026-09-05)
[ ] 3 remaining: unit conversion, custom profile, GLB export
[ ] Binary PASS/FAIL only
```

### Gate C — Automated Tests
```
[x] 453/453 root-suite tests: 100% PASS (verified 2026-09-11, 24 files)
[x] Web tests: 36/36 PASS (6 core↔web contract + 30 total-integration)
[x] Adversarial suites: 39 core/parser PASS (2 known defects pinned with it.fails)
[x] Browser E2E: 21/21 PASS (14 product + 5 adversarial + 2 x-ray; real Chromium: routes, GIF, 3D render + fit solver, measure flow, chip guard, export/import, exercise-log persistence, corrupt-import/XSS/hostile-input, anatomy atlas overlay)
[x] Golden dataset tests: 10/10 PASS
[x] Export/restore roundtrip: PASS
[x] Core module coverage ≥ 80%
```

### Gate D — Bug Status
```
[x] P0 bugs: 0
[x] P1 bugs: 0
[x] P2 bugs: documented with workaround only
[x] P3 bugs: do not block release
```

### Gate E — Data Integrity
```
[x] Create profile → measurements → history → export → delete → restore → compare
[x] D_original ≡ D_restored
[x] No data loss on restart
[x] No data loss on unexpected shutdown
```

### Gate F — Offline Operation
```
[x] Full functionality without internet
[x] No mandatory network calls
[x] No telemetry without consent
[x] No cloud dependencies
```

### Gate G — Build
```
[x] Web build succeeds (Vite + React) — route-split, 91 KB gz entry
[x] Windows build succeeds (Tauri 2) — beta installer BodyLab_1.0.0-beta.1_x64-setup.exe (NSIS) built 2026-09-05, exe smoke-tested; MSI deferred to stable (WiX rejects semver pre-release tags)
[x] Build is reproducible from clean clone
[x] Fresh clone → install → build → test → PASS
```

### Gate H — Licensing
```
[x] LICENSE file present (Apache-2.0)
[x] NOTICE file present with all attributions
[x] THIRD_PARTY_NOTICES.md complete (14 dependencies documented)
[x] Every dependency identified
[x] Every asset identified (36 GIFs, exercise metadata)
[x] No incompatible license accidentally bundled
```

### Gate I — Documentation
```
[x] README.md complete and accurate
[x] CONTRIBUTING.md present (accurate commands + quality checklist)
[x] ARCHITECTURE.md present (verified single source of truth)
[x] TESTING.md present (strategy + commands + coverage map)
[x] PERFORMANCE.md present (measured baseline + budgets)
[ ] API docs for core modules — NOT YET COMPLETE
[x] Setup instructions work
[x] A new developer can build from documentation alone
```

### Gate J — Scope Compliance
```
[x] No V1.1+ features implemented during freeze
[x] No new external dependencies added during freeze
[x] No architectural changes during freeze
[x] All deferred features documented in PLAN.md
```

### Gate K — Release Audit
```
[ ] Independent audit completed
[ ] All gates verified by auditor
[ ] Release report generated
[ ] Final status: V1.0 READY
```

---

## Overall Progress

| Gate | Status | Progress |
|------|--------|----------|
| A — Functional Requirements | 🟡 | 94.5% (69/73) |
| B — Acceptance Criteria | 🟡 | 90.2% (37/41) |
| C — Automated Tests | 🟢 | 100% (453 root + 36 web + 21 E2E) |
| D — Bug Status | 🟢 | P0=0, P1=0 |
| E — Data Integrity | 🟢 | PASS |
| F — Offline Operation | 🟢 | PASS |
| G — Build | 🟢 | Web OK + Windows beta installer (NSIS) |
| H — Licensing | 🟢 | COMPLETE |
| I — Documentation | 🟡 | 90% (API docs pending) |
| J — Scope Compliance | 🟢 | COMPLIANT |
| K — Release Audit | 🔴 | NOT STARTED |

**Overall: ~85% ready for V1.0**

---

## Remaining Work for V1.0

### Must Complete
1. ~~Multi-profile support~~ (BL-PROF-004) — DEFERRED to V1.1
2. Unit conversion (BL-MEAS-005) — Small effort
3. Custom reference profiles (BL-REF-003) — Medium effort
4. GLB export (BL-3D-005) — Medium effort
5. ~~Windows/Tauri build (BL-BUILD-002)~~ — DONE at beta level (2026-09-05): NSIS installer built & smoke-tested. MSI + store polish at stable.
6. API documentation (BL-DOC-006) — Medium effort
7. Release audit (Gate K) — Final step

### Can Defer to V1.1
- Multi-profile support
- Custom reference profiles (if time-constrained)
- Advanced analytics (already implemented as bonus)

---

## Severity Levels

### P0 — Blocker
The application cannot be considered usable.
Condition: **P0 = 0** ✅

### P1 — Critical
An essential function does not work correctly.
Condition: **P1 = 0** ✅

### P2 — Important
Works but has defects.
Condition: **Documented with workaround only** ✅

### P3 — Minor
Cosmetic or enhancement.
Condition: **Do not block V1.0** ✅

---

## Definition of Done (per feature)

```
[ ] Requirement implemented
[ ] Unit test written
[ ] Integration test (if applicable)
[ ] Error handling implemented
[ ] Documentation updated
[ ] UI state handled
[ ] Persistence verified (if applicable)
[ ] Export verified (if applicable)
[ ] No regression
[ ] Acceptance criterion passed
```

---

## Post-V1.0 Rules

After v1.0.0 tag:
- New features → V1.1+
- Architectural improvements → V1.1+ (unless critical defect fix)
- New external dependencies → prohibited (unless release-blocking fix)
- Performance improvements → deferred (unless fixing failed requirement)
- Cosmetic improvements → deferred

---

## Appendix A — Performance Baseline (measured 2026-09-04)

Reference: [PERFORMANCE.md](./PERFORMANCE.md). Baselines from the production build in `bodylab/apps/web/dist`. Budgets are V1.1 targets, not V1.0 blockers.

| Metric | Value | V1.1 budget |
|--------|-------|-------------|
| Main entry `index-*.js` | 291 KB raw / **91 KB gz** | ≤ 120 KB gz |
| 3D chain (three + OrbitControls + BodyViewer3D + wasm) | ~1.16 MB raw, lazy | lazy only, single three copy |
| Model `oxihuman-core-v1.ohpk` | 2.0 MB (runtime, 3D only) | keep lazy |
| Exercise GIFs (36) | 3.6 MB (lazy per GIF) | keep lazy |
| CSS | 48 KB raw / 9 KB gz | no budget |
| Total `dist/` | ~9 MB (includes all offline media) | — |

Route-level code splitting in `App.tsx` shipped 2026-09-05 (main entry 275 → 91 KB gz). Top V1.1 perf items: shrink the lazy Progress/Recharts chunk, confirm a single `three` copy, guard Context re-renders in `store.tsx` consumers, confirm 3D resources are never prefetched. See [PERFORMANCE.md](./PERFORMANCE.md).

---

*Last updated: 2026-09-11*

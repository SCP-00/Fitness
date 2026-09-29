# BodyLab — Requirements

Each requirement has a unique ID, a clear description, and must be demonstrable through tests or evidence.

---

## Profile & Data Model

| ID | Requirement | Status |
|---|---|---|
| BL-PROF-001 | User can create a profile with name, height, weight, age, biological sex, and unit preference | [x] |
| BL-PROF-002 | Profile is persisted locally in SQLite/IndexedDB | [x] |
| BL-PROF-003 | Profile can be edited after creation | [x] |
| BL-PROF-004 | Multiple profiles can coexist | [ ] |
| BL-PROF-005 | Profile includes unit system preference (metric/imperial) | [x] |

## Measurements

| ID | Requirement | Status |
|---|---|---|
| BL-MEAS-001 | User can enter measurements: wrist, neck, shoulders, chest, waist, hips, biceps, forearm, thigh, calf | [x] |
| BL-MEAS-002 | Each measurement includes value, unit, timestamp, method, confidence | [x] |
| BL-MEAS-003 | Measurements are persisted with full history (never overwritten) | [x] |
| BL-MEAS-004 | User can view measurement history for each body segment | [x] |
| BL-MEAS-005 | Unit conversion is supported (cm ↔ in, kg ↔ lbs) | [ ] |
| BL-MEAS-006 | Measurements are validated against reasonable ranges | [x] |
| BL-MEAS-007 | User can add notes to each measurement | [x] |

## Anthropometric Calculations

| ID | Requirement | Status |
|---|---|---|
| BL-ANTHRO-001 | McCallum formula is implemented correctly for males | [x] |
| BL-ANTHRO-002 | Venus formula is implemented correctly for females | [x] |
| BL-ANTHRO-003 | Adonis index (shoulder/waist ratio) is calculated | [x] |
| BL-ANTHRO-004 | WHtR (waist-to-height ratio) is calculated | [x] |
| BL-ANTHRO-005 | Frame size classification (small/medium/large) works | [x] |
| BL-ANTHRO-006 | Deviation from reference is calculated per segment | [x] |
| BL-ANTHRO-007 | Score (0–1) is calculated per segment using the attenuation function | [x] |
| BL-ANTHRO-008 | Results include algorithm version for reproducibility | [x] |
| BL-ANTHRO-009 | Results include reference profile ID used | [x] |
| BL-ANTHRO-010 | Calculation is independent of UI framework | [x] |

## Reference Profiles

| ID | Requirement | Status |
|---|---|---|
| BL-REF-001 | Built-in reference profiles are available (health, anthropometric) | [x] |
| BL-REF-002 | User can select a reference profile | [x] |
| BL-REF-003 | User can create custom reference profiles | [ ] |
| BL-REF-004 | Reference profiles include source, version, and description | [x] |
| BL-REF-005 | Changing reference profile does not affect historical data | [x] |

## Body Composition

| ID | Requirement | Status |
|---|---|---|
| BL-COMP-001 | WHtR health status is calculated (healthy/elevated/high_risk) | [x] |
| BL-COMP-002 | Frame size is classified from wrist and height | [x] |
| BL-COMP-003 | Composition data is stored per snapshot | [x] |

## 2D Visualization

| ID | Requirement | Status |
|---|---|---|
| BL-2D-001 | Front body view is displayed with interactive muscle regions | [x] |
| BL-2D-002 | Back body view is displayed with interactive muscle regions | [x] |
| BL-2D-003 | Each region changes color based on deviation score | [x] |
| BL-2D-004 | Color scale: green (optimal) → yellow (near) → orange (moderate) → red (far) | [x] |
| BL-2D-005 | Clicking a region shows measurement details and history | [x] |
| BL-2D-006 | Tooltips display current value, reference, and status | [x] |
| BL-2D-007 | View toggles between front and back | [x] |
| BL-2D-008 | Measurement overlays can be shown/hidden | [x] |

## 3D Visualization

| ID | Requirement | Status |
|---|---|---|
| BL-3D-001 | 3D body model loads and renders | [x] |
| BL-3D-002 | Camera orbit, pan, and zoom work | [x] |
| BL-3D-003 | Body parameters modify the 3D mesh in real time | [x] |
| BL-3D-004 | Body can be regenerated from saved parameters | [x] |
| BL-3D-005 | Model can be exported as GLB | [ ] |
| BL-3D-006 | 3D scene does not corrupt on parameter changes | [x] |
| BL-3D-007 | Reset camera and parameters works | [x] |

## Progress & Comparison

| ID | Requirement | Status |
|---|---|---|
| BL-PROG-001 | User can create body snapshots (point-in-time records) | [x] |
| BL-PROG-002 | Snapshots preserve all measurements and parameters | [x] |
| BL-PROG-003 | User can compare two snapshots side by side | [x] |
| BL-PROG-004 | Delta (absolute and percentage) is calculated per segment | [x] |
| BL-PROG-005 | Timeline view shows measurement evolution over time | [x] |
| BL-PROG-006 | Graphs display measurement trends (Recharts) | [x] |
| BL-PROG-007 | Historical data is never overwritten or lost | [x] |

## Export & Restore

| ID | Requirement | Status |
|---|---|---|
| BL-EXP-001 | User can export data as JSON | [x] |
| BL-EXP-002 | User can export data as CSV | [x] |
| BL-EXP-003 | User can export a complete Fitness Bundle (.bodylab) | [x] |
| BL-EXP-004 | Bundle includes manifest, profile, measurements, snapshots, goals | [x] |
| BL-EXP-005 | User can restore from a Fitness Bundle | [x] |
| BL-EXP-006 | Restored data matches original data (integrity check) | [x] |
| BL-EXP-007 | Export works offline | [x] |

## Persistence & Database

| ID | Requirement | Status |
|---|---|---|
| BL-DATA-001 | SQLite is used for desktop; IndexedDB for web | [x] |
| BL-DATA-002 | Database schema supports all entities | [x] |
| BL-DATA-003 | Data survives application restart | [x] |
| BL-DATA-004 | No data loss on unexpected shutdown | [x] |
| BL-DATA-005 | Each assessment records algorithm_version and reference_version | [x] |

## Platform & Build

| ID | Requirement | Status |
|---|---|---|
| BL-BUILD-001 | Web application builds and runs (Vite + React) | [x] |
| BL-BUILD-002 | Windows application builds (Tauri) | [x] (beta: NSIS installer, 2026-09-05) |
| BL-BUILD-003 | Build is reproducible from clean clone | [x] |
| BL-BUILD-004 | No mandatory internet connection for any feature | [x] |
| BL-BUILD-005 | No account or login required | [x] |

## Privacy & Security

| ID | Requirement | Status |
|---|---|---|
| BL-SEC-001 | No telemetry is sent without user consent | [x] |
| BL-SEC-002 | No measurements are uploaded to any server | [x] |
| BL-SEC-003 | No hidden network calls exist | [x] |
| BL-SEC-004 | All data remains on user's device | [x] |

## Testing & Quality

| ID | Requirement | Status |
|---|---|---|
| BL-TEST-001 | Unit tests exist for all core modules | [x] |
| BL-TEST-002 | Integration tests exist for data flow | [x] |
| BL-TEST-003 | Golden dataset tests verify calculation correctness | [x] |
| BL-TEST-004 | Export/restore roundtrip test passes | [x] |
| BL-TEST-005 | Offline mode test passes | [x] |
| BL-TEST-006 | P0 and P1 bug count is zero | [x] |

## Documentation & Licensing

| ID | Requirement | Status |
|---|---|---|
| BL-DOC-001 | README.md is complete and accurate | [x] |
| BL-DOC-002 | THIRD_PARTY_NOTICES.md lists all dependencies | [x] |
| BL-DOC-003 | LICENSE file is present (Apache-2.0) | [x] |
| BL-DOC-004 | NOTICE file includes all required attributions | [x] |
| BL-DOC-005 | CONTRIBUTING.md is present | [x] |
| BL-DOC-006 | API documentation exists for core modules | [ ] |

---

## Summary

| Category | Total | Completed | Remaining |
|----------|-------|-----------|-----------|
| Profile & Data Model | 5 | 4 | 1 |
| Measurements | 7 | 6 | 1 |
| Anthropometric Calculations | 10 | 10 | 0 |
| Reference Profiles | 5 | 4 | 1 |
| Body Composition | 3 | 3 | 0 |
| 2D Visualization | 8 | 8 | 0 |
| 3D Visualization | 7 | 6 | 1 |
| Progress & Comparison | 7 | 7 | 0 |
| Export & Restore | 7 | 7 | 0 |
| Persistence & Database | 5 | 5 | 0 |
| Platform & Build | 5 | 4 | 1 |
| Privacy & Security | 4 | 4 | 0 |
| Testing & Quality | 6 | 6 | 0 |
| Documentation & Licensing | 6 | 5 | 1 |
| **Total** | **73** | **69** | **4** |

**Completion: 94.5%**

---

*Total MUST requirements: 73*
*Last updated: 2026-09-11*

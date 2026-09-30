# Fitness Ecosystem — Plan Maestro

> **BodyLab** + **TrainingLab** — Ecosistema open-source para antropometría, modelado corporal y entrenamiento.
> Licencia: Apache-2.0 | Sin fines de lucro | Uso personal, educativo y recreacional.

---

## 1. Visión del Proyecto

Dos aplicaciones independientes conectadas por un contrato de datos compartido:

```text
┌──────────────────────────────┐
│          BODYLAB             │
│  Antropometría + Modelado    │
│  + Anatomía + Ejercicio      │
│  + Progreso + Analytics      │
└──────────────┬───────────────┘
               │
       Fitness Data Contract
       JSON / ZIP / API
               │
┌──────────────▼───────────────┐
│        TRAININGLAB           │
│ Rutinas + Registro + Equipo  │
│ + Progresión + LLM           │
└──────────────────────────────┘
```

**Filosofía:**
- Reutilizar > Reimplementar
- Open source > Propietario
- Local-first > Cloud
- Propiedad de datos > Cuentas
- Reproducibilidad > Caja negra
- Atribución > Oscuridad
- Información > Valoración

---

## 2. Estado Actual (Septiembre 2026)

### Completado

| Hito | Estado | Detalles |
|------|--------|----------|
| M0 — Architecture Validation | ✅ DONE | Core funciona独立 de UI |
| M1 — Anthropometric Core | ✅ DONE | McCallum, Venus, Adonis, WHtR, Frame Size |
| M2 — Persistence | ✅ DONE | IndexedDB con migrations |
| M3 — 2D Visualization | ✅ DONE | body-muscles interactive, 24 muscle groups |
| M4 — 3D Visualization | ✅ DONE | OxiHuman + Three.js, camera presets |
| M5 — Progress & Comparison | ✅ DONE | A/B comparison, timeline, "What Changed?" |
| M6 — Export / Import | ✅ DONE | JSON, CSV, .bodylab (ZIP) |
| M7 — Web Release | ✅ DONE | React + Vite + Tailwind |
| M8 — Exercise System | ✅ DONE | 64 exercises, 36 GIFs + 21 stills, muscle-contextual |
| M9 — Analytics Engine | ✅ DONE | Body Age, Health, Prediction, Correlation |
| M10 — UI Polish | ✅ DONE | Dark mode, Design System, responsive |

### En Progreso

| Hito | Estado | Detalles |
|------|--------|----------|
| M11 — Quality Gate | 🔄 WIP | Testing, accessibility, documentation |
| M12 — Windows/Tauri | 🔄 BETA | `apps/desktop/src-tauri` (Tauri v2) — instalador NSIS `BodyLab_1.0.0-beta.1_x64-setup.exe` compilado y smoke-testeado (2026-09-05); MSI + pulido en estable |

### Futuro (Post-V1.0)

| Hito | Estado | Detalles |
|------|--------|----------|
| V1.1 — Reminder System | ⏳ DEFERRED | Smart notifications |
| V1.1 — Multi-profile | ⏳ DEFERRED | Track family/clients |
| V1.1 — Body Story | ⏳ DEFERRED | Narrative timeline |
| V1.1 — Gym Companion | ⏳ DEFERRED | Ultra-simple gym mode |
| V2.0 — TrainingLab | 📋 PLANEADO | Rutinas + LLM — plan en `docs/TRAININGLAB_UI_PLAN.md` |

---

## 3. Architecture Decisions (Frozen)

| Decision | Choice | Reason |
|---|---|---|
| Code language | **English** | Universal, standard for code |
| Documentation language | **Spanish + English** | User-facing in Spanish, technical docs in English |
| Package manager | **pnpm** | Best for monorepos |
| Tauri | **After Web stabilization** | Validate product first |
| DB Desktop | **SQLite** | Persistent, portable, auditable |
| DB Web | **IndexedDB** | Browser-native |
| Resources | **Manifests + scripts** | Versioned, reproducible |
| Name | **BodyLab / TrainingLab** | Conceptually defined |
| V1 scope | **BodyLab only** | TrainingLab deferred |
| LLM | **Out of V1 core** | Future extension |
| Monorepo | **Yes** | But apps are independent |

### Architecture Rule: Core Independence

> `core` CANNOT import React, Three.js, Tauri, DOM APIs, or UI components.

```text
                    ┌───────────────┐
                    │      UI       │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ Application   │
                    │    layer      │
                    └───────┬───────┘
                            │
                    ┌───────▼───────┐
                    │ BodyLab Core  │
                    └───────────────┘
```

---

## 4. Repository Structure

```text
fitness-ecosystem/
│
├── PLAN.md                          # This file
├── LICENSE                          # Apache-2.0
├── NOTICE                           # Apache-2.0 attributions
├── THIRD_PARTY_NOTICES.md           # Complete credits
├── RESOURCE_MATRIX.md               # External dependency tracking
├── package.json                     # Monorepo root
├── pnpm-workspace.yaml              # Workspaces
├── tsconfig.base.json               # Shared TS config
│
├── docs/
│   ├── PRODUCT_SPEC.md              # What we're building
│   ├── ARCHITECTURE.md              # Verified architecture (single source of truth)
│   ├── UI_DESIGN.md                 # Interface rules + responsive contract
│   ├── TRAININGLAB_UI_PLAN.md       # TrainingLab redesign contract (v2)
│   ├── TESTING.md                   # Test strategy + commands
│   └── ieee/                        # Two IEEE technical reports (.tex + .pdf)
│
├── bodylab/
│   ├── core/
│   │   ├── anthropometry/           # McCallum, Venus, Adonis, WHtR
│   │   ├── measurements/            # Data model
│   │   ├── composition/             # Body composition
│   │   ├── references/              # Reference profiles
│   │   ├── progress/                # Temporal evolution
│   │   ├── validation/              # Validation
│   │   ├── export/                  # CSV, JSON, .bodylab
│   │   ├── analytics/               # Body Age, Health, Prediction
│   │   └── database/                # Schema + repositorios (consumido por tests/)
│   ├── integrations/
│   │   ├── oxihuman/                # 3D parametric
│   │   ├── musclemapjs/             # 2D muscle map
│   │   └── clad-body/               # ISO 8559-1 validation
│   ├── packages/
│   │   └── contracts/               # JSON Schemas
│   └── apps/
│       ├── web/                     # React + Vite
│       │   └── public/exercises/    # 36 GIFs + manifest
│       └── desktop/                 # Tauri v2 shell (BETA: instalador NSIS)
│
├── traininglab/                     # FUTURE
├── tests/                           # 453 tests en la suite raíz (core + contrato + adversarial)
└── resources/                       # External dependencies
```

---

## 5. Release Gates (V1.0)

### Gate A — Functional Requirements
```
[ ] All 73 MUST requirements: 100% PASS
```

### Gate B — Acceptance Criteria
```
[ ] All 38 acceptance criteria: 100% PASS
```

### Gate C — Automated Tests
```
[x] 453/453 root-suite tests: 100% PASS (24 files)
[x] Web tests 36/36: PASS (6 contrato + 30 integración)
[x] Adversarial 39/39: PASS (analytics + parser; 2 known defects pinned)
[x] Browser E2E 21/21: PASS (14 producto + 5 adversariales + 2 x-ray; real 3D render + fit solver + atlas)
[x] Golden dataset: PASS
[x] Export/restore roundtrip: PASS
```

### Gate D — Bug Status
```
[x] P0 bugs: 0   (3D blocker resolved 2026-09-04: engine 0.2.1 vendored, pack SHA-verified)
[ ] P1 bugs: 0
```

### Gate E — Data Integrity
```
[ ] Export/Restore roundtrip verified
```

### Gate F — Offline Operation
```
[ ] Full functionality without internet
```

### Gate G — Build
```
[ ] Web build succeeds
[ ] Windows build succeeds (FUTURE)
```

### Gate H — Licensing
```
[ ] All attributions complete
[ ] THIRD_PARTY_NOTICES.md updated
```

### Gate I — Documentation
```
[ ] README complete and accurate
[ ] API docs for core modules
```

### Gate J — Scope Compliance
```
[ ] No V1.1+ features added during freeze
```

---

## 6. Test Strategy

Estrategia completa, comandos por nivel y mapa de cobertura: [docs/TESTING.md](docs/TESTING.md).

### Current Test Suite

| Module | Tests | Status |
|--------|-------|--------|
| Anthropometry | 198 | ✅ |
| Measurements | 20 | ✅ |
| Database Schema | 9 | ✅ |
| Export | 8 | ✅ |
| Web (contrato core↔web) | 6 | ✅ |
| Adversarial (analytics + parser) | 39 | ✅ |
| Score | 26 | ✅ |
| WHtR | 21 | ✅ |
| Adonis | 15 | ✅ |
| McCallum | 18 | ✅ |
| References | 10 | ✅ |
| Golden Dataset | 10 | ✅ |
| Composition | 8 | ✅ |
| Progress | 6 | ✅ |
| **Total** | **453** | ✅ |

> Filas legacy/parciales — inventario real por archivo en [docs/TESTING.md](docs/TESTING.md). Verificado 2026-09-11: `pnpm test` 453/453 PASS (24 archivos); vitest web 36/36; Playwright 21/21. Los 39 tests tautológicos de `e2e-critical-flows.test.ts` se eliminaron y sustituyeron por las suites adversariales.

### Golden Dataset

```text
tests/data/golden/
├── profile_male_average.json
├── profile_female_average.json
├── profile_edge_small.json
├── profile_edge_large.json
└── profile_edge_extreme.json
```

---

## 7. Post-V1.0 Roadmap

### V1.1 Candidates
- Smart reminder system
- Multi-profile support
- Body Story (narrative timeline)
- Gym Companion mode
- Additional reference profiles
- Performance improvements

### V2.0+ Candidates
- TrainingLab integration — **plan completo en `docs/TRAININGLAB_UI_PLAN.md`** (registro de sesión, biblioteca, rutinas deterministas + IA local opcional vía Ollama, ciclo rendimiento↔medidas)
- LLM integration
- Cloud sync
- Mobile app
- Social features
- AI body analysis
- Photo-based measurement

---

## 8. Final Rule

> **Your objective is NOT to make BodyLab as large, sophisticated, or advanced as possible. Your objective is to make the V1.0 specification completely correct, verifiable, reproducible, and maintainable.**

---

*Last updated: 2026-09-11*

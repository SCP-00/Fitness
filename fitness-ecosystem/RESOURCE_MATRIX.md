# External Resource Matrix

Track every external dependency. Status: EVALUATING → APPROVED → INTEGRATED.

---

## Active Resources

| Resource | Purpose | License | Version/Commit | Status | Notes |
|---|---|---|---|---|---|
| OxiHuman | 3D parametric body | Apache-2.0 + CC0 assets | v0.2.1 | ✅ INTEGRATED | Engine wasm 0.2.1 vendored under `apps/web/public/wasm/` (byte-for-byte from the vendor release demo cooljapan.tech/bodylab — 0.2.1 was never published to npm nor built in CI). Pack `oxihuman-core-v1.ohpk` SHA-256 `09c4bb1f…` verified against upstream `assets/packs@v0.2.1` |
| body-muscles | 2D muscle anatomy | MIT | — | ✅ INTEGRATED | 24 muscle groups, interactive |
| clad-body | ISO 8559-1 measurements | Apache-2.0 | — | EVALUATING | Validación antropométrica |
| exercises-dataset | Exercise GIF animations | MIT + Gym Visual (royalty-free) | — | ✅ INTEGRATED | 36 GIFs + 21 public-domain stills, 64 exercises (7 ship media-less with explicit placeholder) |
| Three.js | 3D rendering | MIT | — | ✅ INTEGRATED | Dependencia estándar |
| React | UI framework | MIT | 19.x | ✅ INTEGRATED | Dependencia estándar |
| Vite | Build tool | MIT | 8.x | ✅ INTEGRATED | Dependencia estándar |
| Tailwind CSS | Styling | MIT | 4.x | ✅ INTEGRATED | Design tokens + dark mode |
| Recharts | Charts | MIT | 2.x | ✅ INTEGRATED | Gráficas de progreso |
| Tauri | Desktop framework | MIT/Apache-2.0 | 2.x | ✅ INTEGRATED | Shell canónico en `apps/desktop`; instalador NSIS beta verificado |
| SQLite | Local database | Public Domain | — | APPROVED | Persistencia desktop |
| Vitest | Testing | MIT | 4.x (web) / 1.x (core) | ✅ INTEGRATED | 453 root + 36 web tests (+ 19 Playwright E2E) — run `pnpm check` |
| Lucide React | Icons | MIT | — | ✅ INTEGRATED | UI icons |
| React Router | Navigation | MIT | — | ✅ INTEGRATED | Client-side routing |

## Exercise Assets (Detailed)

| Asset | Source | License | Format | Size | Notes |
|---|---|---|---|---|---|
| Exercise GIFs (36) | hasaneyldrm/exercises-dataset | MIT (code) + Gym Visual (media) | GIF 180×180 | ~3.6MB | Lazy-loaded, offline |
| Exercise Metadata | hasaneyldrm/exercises-dataset | MIT | JSON | — | Mapped to our exercise IDs |
| Exercise Manifest | Custom | Apache-2.0 | JSON | — | Maps our IDs → dataset filenames |

### Exercise ID Mapping

Our exercise IDs → dataset GIF filenames:
```
barbell-bench-press    → Bench_Press/0.jpg, Bench_Press/1.jpg
deadlift               → Deadlift/0.jpg, Deadlift/1.jpg
barbell-squat          → Squats/0.jpg, Squats/1.jpg
barbell-curl           → Barbell_Curl/0.jpg, Barbell_Curl/1.jpg
pull-ups               → Pull_Ups/0.jpg, Pull_Ups/1.jpg
overhead-press         → Overhead_Press/0.jpg, Overhead_Press/1.jpg
... (36 total mapped)
```

## Deferred Resources (NOT for V1.0)

| Resource | Purpose | License | Status | Notes |
|---|---|---|---|---|
| Z-Anatomy | Anatomical 3D models | CC BY-SA 4.0 | DEFERRED | Fase 4+, verificar atribuciones |
| MakeHuman | Base mesh assets | CC0 (assets) | DEFERRED | Solo assets, no código AGPL |
| wger | Fitness backend | AGPL-3.0 | DEFERRED | TrainingLab futuro |
| Forme | Workout UX reference | MIT (parcial) | DEFERRED | Referencia, no dependencia |
| SAM 3D Body | Photo → 3D | MIT + model | DEFERRED | Fase 6+, requiere GPU |

---

## Evaluation Checklist

For each resource before APPROVED:

```
[ ] Repository URL verified
[ ] License verified (code + assets + models separately)
[ ] Version/commit pinned
[ ] Compatibility with our stack confirmed
[ ] No conflicting dependencies
[ ] Maintenance status acceptable
[ ] Documentation reviewed
[ ] Basic functionality tested
[ ] Attribution requirements documented
[ ] Added to THIRD_PARTY_NOTICES.md
```

---

## Status Definitions

- **EVALUATING** — Under review, not yet approved
- **APPROVED** — Verified, ready for integration
- **INTEGRATED** — Integrated into codebase
- **DEFERRED** — Not for V1.0, documented for future
- **REJECTED** — Does not meet requirements

---

*Last updated: 2026-09-11*

# Parametric Human Engine — Research & Recommendation

**Date:** 2026-09-06 · **Status:** Research complete · **Decision needed**

> **Addendum (2026-09-07, prototipo 3d-next):** la investigación cambió de
> "reemplazar el motor" a "alimentar el motor": el pack core (38 targets) no
> incluye detalle muscular, pero `load_target_from_json` + `set_target_weight`
> acepta los targets CC0 de MakeHuman **en runtime** con control lineal
> perfecto (verificado: pecs 0→0, 0.5→67.3, 1.0→134.7, reset→0). 24 targets
> vendidos en `prototypes/3d-next/public/targets/` (248 KB, CC0). Los
> alternativos se re-evaluaron: SMPL ~€150k/año comercial (inviable), Anny sin
> runtime browser, MakeHuman app AGPL de escritorio. Conclusión sin cambios:
> OxiHuman es el motor correcto — ahora con musculatura real por región.

## TL;DR

**Don't replace the engine — adopt it.** The vendored binary is OxiHuman
**0.2.1**, which is **Apache-2.0 open source** (`github.com/cool-japan/oxihuman`,
code) with **CC0-1.0 body data**. We already ship its exact asset pack
(SHA-verified). The upgrade path is therefore not a migration: it's building
from source to unlock vendor-locked capabilities — and the two things our users
notice most (fused legs, hair blob) are *pack/topology* properties we can now
actually address, plus a documented upstream roadmap item (M6: ANSUR II-native
shape space) that directly serves our measurement-fit goals.

## What any replacement must satisfy (our current contract)

| Requirement | Source |
|---|---|
| Fully offline / client-side, zero body-data upload | Offline-first product principle |
| `from_core_pack_bytes`, `set_param`, `apply_preset`, `refresh_geometry`, `build_mesh_bytes` | `morph-mapper.ts` |
| `get_measurements()` → height/chest/waist/hip/weight (cm/kg) | `BodyViewer3D.tsx` |
| `fit_to_measurements(JSON)` → per-segment Δ report, |Δ| ≤ ~0.7 cm, ~0.9 s | Fit solver E2E |
| WASM browser runtime, ~259 KB gz engine + 2.0 MB pack | Current bundle |
| Age ≥ 18 clamp; bodysuit-only output (no nude stage) | SAFETY gate we rely on |

## Candidate matrix

| Candidate | License | Offline | Measurement fit | Browser story | Verdict |
|---|---|---|---|---|---|
| **OxiHuman 0.2.1 (current, from source)** | Apache-2.0 + CC0 data | ✅ by design | ✅ built-in solver, measured ≤0.66 cm | ✅ WASM, zero-copy geometry | **Winner** — no migration, full control |
| Anny (NAVER Labs, 2025) | Apache-2.0 code, CC0 assets | ⚠️ PyTorch; ONNX-web export is a research project, not a runtime | ⚠️ phenotype axes, not tape measures | ❌ Python-first | Watch: best long-term science; wrong runtime today |
| MakeHuman / MPFB2 | AGPL app; **CC0 exports** | ⚠️ offline only via offline exports | ❌ none | ❌ desktop app | Not embeddable (AGPL); useful as **asset source** (CC0 .target/.mhclo) |
| Ready Player Me & hosted avatar APIs | Proprietary | ❌ server required | ❌ | ⚠️ | Violates offline-first + body-data privacy |
| Custom engine (in-house) | — | — | — | — | Months of anatomy work for a solved problem |

## Why "replace" was the wrong question

The research revealed the premise was wrong: we thought we had a closed vendor
binary; we actually have an open-source engine we vendored *verbatim* from its
own release. Everything the earlier analysis called "vendor-locked" (fused
legs, hair blob, 38-target envelope, no clothing) is:
1. **Pack data (CC0)** — we can extend the pack with more MakeHuman CC0
   targets using the upstream `pack-core` CLI,
2. **Upstream roadmap** (M6 shape space, WebGPU viewer), or
3. **Our own rendering** (already upgraded: IBL, physical skin, soft shadows).

## Recommended plan (upgrade, not replace)

1. **Adopt upstream from source**: pin the git repo as the canonical source;
   rebuild `oxihuman_wasm_bg.wasm` + glue in-repo (reproducible, wasm-opt, size
   gate is upstream-provided). Replace the "vendored from vendor demo" provenance
   story with "built from Apache-2.0 source" — cleaner legally and for audits.
2. **Unlock the engine capabilities we're not using** (all in the 68-method
   API): `export_glb/vrm/stl/obj` (3D-printable body scans, data-vault
   exports), zero-copy `positions_ptr()` geometry (rebuild ~2× cheaper), the
   8 `measure/` girth targets for biceps/thigh/calf/neck (current mapper only
   drives chest/waist/hip).
3. **Extend the pack within license**: pull additional CC0 MakeHuman targets
   (hands detail, posture, non-core girth) via `oxihuman-cli pack-core`;
   provenance scripts verify CC0 chain automatically.
4. **Track upstream M6** (ANSUR II shape space): it targets exactly our
   use case — tape-measure-driven fitting — and would shrink fit residuals at
   the girth envelope (worst case today ≈1.44 cm at adult-XL hip).

## Effort estimate

- Step 1: ~1 session (cargo build-wasm + wire loader to locally-built glue).
- Step 2: ~1–2 sessions (TS types exist upstream; mapper extension + tests).
- Step 3: ~1 session + asset review.
- No UI rewrite, no loader rewrite: the `OxiHumanEngine` interface we coded
  against is upstream's public API.

## Sources

- github.com/cool-japan/oxihuman (README, releases, 0.2.1 notes, license,
  SAFETY/PROVENANCE docs) — read 2026-09-06
- github.com/naver/anny (README: PyTorch runtime, Apache-2.0/CC0 licensing)
- MakeHuman community license pages (AGPL app / CC0 exports)
- Current repo: `morph-mapper.ts`, `oxihuman-loader.ts`, pack SHA vs upstream

# BodyLab — Performance

> How BodyLab performs today, the budgets we hold, and the rules that keep it fast.
> Baselines measured 2026-09-11 from the production build in `bodylab/apps/web/dist`.

## 1. Measured Baseline (current build)

Raw sizes are what ships to disk; gzip is the realistic transfer metric. The app is fully offline — there is no network service, so this is mostly startup + memory + rendering cost.

| Asset | Raw | Gzip | Notes |
|-------|-----|------|-------|
| `index-*.js` (main entry) | 291 KB | **91 KB** | Shell + shared UI only; pages are route-split ✅ |
| `Progress-*.js` (heaviest route) | 392 KB | 112 KB | Recharts lives here, lazy ✅ |
| `BodyView-*.js` / `ExportImport-*.js` | 140 / 110 KB | 38 / 32 KB | Lazy routes ✅ (ExportImport carries JSZip) |
| `three.module-*.js` | 724 KB | 185 KB | Loaded only when 3D opens (lazy ✅) |
| `OrbitControls-*.js` / `BodyViewer3D-*.js` | 20 KB / 19 KB | 4 KB / 7 KB | Lazy chunks ✅ |
| `oxihuman_wasm_bg.wasm` (public/wasm, engine 0.2.1) | 724 KB | 260 KB | Fetched only when 3D opens ✅ (vendored vendor build; not wasm-opt'd — future win) |
| `oxihuman_wasm.js` (glue, static) | 64 KB | 11 KB | Runtime import, 3D only ✅ |
| `index-*.css` | 66 KB | 11 KB | Tailwind output |
| `oxihuman-core-v1.ohpk` (model) | 2.0 MB | — | Runtime asset, 3D only |
| 36 exercise GIFs (`public/exercises/gifs`) | 3.6 MB | — | Lazy via IntersectionObserver ✅ |
| **Total `dist/`** | **~9 MB** | — | Includes all offline media |

### Interpretation

- **Route-level code splitting shipped** (2026-09-05, `React.lazy` in `App.tsx` for all 7 pages): the main entry dropped from 275 KB → **91 KB gz**. First paint now pays for shell + shared UI only; Recharts is isolated in the lazy Progress chunk and JSZip in ExportImport.
- 3D/WASM loading is exemplary: nothing loads until the user opens the 3D view (glue + wasm + `.ohpk` are fetched at that moment only). The 2026-09-04 P0 fix swapped the engine to the 0.2.1 build (+~300 KB raw wasm, +~86 KB gz) — the correct price for a 3D feature that actually works; the wasm-opt pass the vendor CI applies is a candidate later saving.
- The build emits a >500 kB chunk warning for the Progress route (Recharts). Acceptable while it is lazy; revisit only if the route budget (§2) is broken.
- CSS is small; Tailwind output is healthy.

## 2. Budgets (targets)

Budgets are V1.1 goals, tracked per release. Break a budget = release-blocking discussion.

| Metric | Baseline (now) | Target (V1.1) | How to verify |
|--------|----------------|---------------|---------------|
| Main entry, gzip | 91 KB ✅ | ≤ 120 KB | `ls -S dist/assets` + `gzip -c <file> \| wc -c` |
| Per-route lazy chunk, gzip | Progress 112 KB | ≤ 40 KB (charts route exempted pending V1.1 discussion) | same |
| First interactive on cold load (local, mid laptop) | not measured | ≤ 1.5 s | DevTools Performance / Lighthouse |
| Total JS shipped before first route paint | 91 KB gz | ≤ 150 KB gz | network panel (or empty cache) |
| Core math bundle impact | 0 (pure TS, tree-shaken) | 0 | keep core free of side effects |

## 3. Top Opportunities (ranked)

1. ~~Route-level code splitting~~ — **DONE 2026-09-05** (`React.lazy` + `Suspense` for all 7 pages in `App.tsx`).
2. **Shrink the Progress route chunk.** Recharts makes it 112 KB gz (only budget break). Consider a manualChunks split for `react`/`react-dom` if route chunks start duplicating them, and lazy-loading chart sections within the page.
3. **Verify single `three` copy.** Baseline shows one 724 KB `three.module-*` chunk; confirm no `three/examples/...` import pulls a second copy into any route chunk.
4. **Don't prefetch what's lazy.** Confirm nothing (e.g. `<link rel="preload">`, service worker, eager import in `store.tsx`) pulls `three`, the WASM, or `*.ohpk` before the user opens 3D. `vite.config.ts` already excludes `@cooljapan/oxihuman` from `optimizeDeps` — keep it that way.
5. **Guard against Context re-render storms.** `store.tsx` keeps the whole app state in one Context. Components that read a slice re-render on ANY state change. Use selector-style consumption (`useMemo`/split contexts) in `AnalyticsDashboard`, `BodyMap`, timelines.
6. **IndexedDB discipline.** Batch writes (single transaction for a measurement session), keep `queries.ts` read paths indexed by the keys they filter on, and paginate long histories instead of loading all rows into memory.
7. **3D lifecycle.** Ensure `BodyViewer3D` disposes geometry/materials/renderer + cancels animation frames on unmount (leak check on Windows/Chrome task manager while toggling 3D on/off).
8. **Media.** GIFs are 3.6 MB on disk but lazy-loaded per exercise — fine today. If an exercise list shows many at once, add `loading="lazy"` + smaller poster frames. Do not block on this pre-V1.0.

## 4. Rules (merge-time checklist)

Before merging code that touches the web app, confirm:

- [ ] No new dependency without measuring its gzip impact (state size in the PR description).
- [ ] Heavy libraries (charts, 3D, zip, WASM) are imported dynamically or behind the route that needs them.
- [ ] No fetch/preload added for resources that are lazy today (GIFs, three, WASM, `.ohpk`).
- [ ] Core remains pure: no timers, no global state, no DOM, no side effects (keeps tree-shaking + test speed).
- [ ] Data access goes through `queries.ts`/`store.tsx`, not ad-hoc IndexedDB calls in components.
- [ ] If the PR changes bundle shape, run `pnpm --filter web build` and paste the top-5 asset sizes.

## 5. How to measure

```bash
# Production build (prints asset sizes; then inspect dist)
cd bodylab/apps/web
pnpm build            # = tsc -b && vite build
ls -lS dist/assets    # raw sizes, largest first

# gzip size of a single asset (Git Bash / Unix)
gzip -c dist/assets/index-*.js | wc -c   # bytes; /1024 = KB

# Local preview of the real bundle
pnpm preview          # serves dist/ — profile with DevTools → Performance
```

Runtime profiling (no install needed):

- Chrome DevTools → **Network**: disable cache, note main-chunk transfer + lazy chunk order.
- Chrome DevTools → **Coverage**: identify unused JS/CSS on the Overview route.
- Chrome DevTools → **Performance**: record cold load; look for long main-thread tasks (>50 ms).
- Memory: DevTools → Memory → heap snapshots before/after opening and closing the 3D view (leak check).

Optional analyzer (no repo changes, runs via npx): `npx vite-bundle-visualizer` in `bodylab/apps/web`.

---

*Budgets and baselines are living numbers — update this table whenever the release build changes materially (asset list + dates).*

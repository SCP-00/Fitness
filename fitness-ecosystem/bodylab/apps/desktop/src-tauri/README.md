# BodyLab Desktop (Tauri v2) — beta

> Canonical home of the desktop shell (consolidated from the old
> `apps/web/src-tauri` prototype, 2026-09-05). Wraps the existing BodyLab **web
> app** (`apps/web`, Vite + React) in a native Windows/macOS/Linux window. All
> data stays local: the app already persists to IndexedDB inside the webview,
> and **no** host filesystem/network permission is enabled yet (see the
> philosophy in `PLAN.md`: validate the product first, then open native bridges
> one by one).
>
> Beta status: NSIS installer verified
> (`BodyLab_1.0.0-beta.1_x64-setup.exe`, exe smoke-tested). MSI is deferred to
> stable — WiX rejects semver pre-release tags like `1.0.0-beta.1`; switch
> `bundle.targets` to `["nsis", "msi"]` when the version is numeric-only.

## Prerequisites

- Rust toolchain (stable ≥ 1.77): https://rustup.rs
- Node + pnpm (monorepo already set up)
- Windows: WebView2 runtime (preinstalled on Win 10/11)

## Run (development)

```bash
# from apps/desktop — first time compiles ~450 crates (5–10 min)
pnpm dev
```

This starts the Vite dev server on :5173 (via `beforeDevCommand`) and opens a
native window pointed at it. Hot-reload of the React frontend works exactly
like the browser.

## Build a release installer

```bash
pnpm build            # = tauri build
pnpm build:windows    # explicit MSVC target
```

Output: `src-tauri/target/release/bundle/nsis/BodyLab_*_x64-setup.exe`
(NSIS on Windows; re-enable MSI/app/dmg/deb targets in `tauri.conf.json` as
needed).

## Notes

- `tauri.conf.json` points `frontendDist` at the web build output
  (`../../web/dist` — paths resolve relative to `src-tauri/`, not the app dir);
  `beforeBuildCommand` runs the web build automatically.
- The build scripts use explicit `cd ../web && …` commands: a bare `pnpm build`
  here would recurse into `tauri build` itself.
- Icons under `icons/` are **placeholder brand-color squares** — replace with
  the real BodyLab artwork (`public/favicon.svg` is the source of truth) before
  shipping.
- Capabilities (`capabilities/default.json`) intentionally expose only
  `core:default` + `opener`. Future bridges (file export to disk, reminders,
  offline AI model hosting) are added here, one explicit permission at a time.

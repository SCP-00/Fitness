/**
 * BodyLab's version, injected at build time by `define` in `vite.config.ts`
 * and mirrored in `vitest.config.ts`.
 *
 * The single source of truth is `bodylab/apps/desktop/package.json` — the
 * package that actually ships. Nothing in `src/` may spell a version by hand:
 * three hand-written ones (`v1.0.0-rc` in the onboarding, `1.0.0` in the export
 * payloads) had already drifted from the real `1.0.0-beta.8`.
 *
 * Declared here rather than as an `ImportMetaEnv` key because `types` in
 * tsconfig.app.json is pinned to `["vite/client"]`, which we do not want to
 * widen just to carry one constant.
 */
declare const __BODYLAB_VERSION__: string;

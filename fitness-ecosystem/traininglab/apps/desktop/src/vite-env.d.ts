/**
 * TrainingLab's version, injected at build time by `define` in
 * `vite.config.ts` (and by the root `vitest.config.ts` for the shared suite).
 *
 * Single source of truth: `traininglab/apps/desktop/package.json`, which Tauri
 * requires to match `src-tauri/tauri.conf.json`. Ajustes used to show a
 * hand-written `APP_VERSION` constant instead; it now reads this global so the
 * About box cannot lag behind the build.
 *
 * Declared here rather than as an `ImportMetaEnv` key because `types` in
 * tsconfig.app.json is pinned to `["vite/client"]`.
 */
declare const __TRAININGLAB_VERSION__: string;

/**
 * When this bundle was built ("YYYY-MM-DD HH:mm", local time). Two TrainingLab
 * builds called themselves `0.2.0`, and the installed one was missing a whole
 * feature while the About box looked identical to the new installer's.
 * Ajustes renders this stamp so a stale binary is visible, not guessed.
 */
declare const __BUILD_STAMP__: string;

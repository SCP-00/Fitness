/**
 * Page smoke tests — every routed page must render without throwing.
 *
 * Why this file exists: `/history` shipped crashing. Its component body read
 * `symGroup` one line *above* the `useState` that declares it, so React hit a
 * temporal-dead-zone `ReferenceError` and the whole route rendered as a blank
 * page. Nothing caught it — the web suite tests pure logic, the Playwright suite
 * never visited `/history`, and in the minified bundle the crash only read
 * `Cannot access 'H' before initialization`. A test that simply mounts each page
 * turns that class of failure into a red test instead of an empty screen.
 *
 * `BodyView` is deliberately absent: it mounts the three.js/WebGL stack, which
 * jsdom does not implement. That page stays covered by the browser E2E suite.
 *
 * @module __tests__/page-smoke
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import 'fake-indexeddb/auto';

import { AppProvider } from '../lib/store';
import { resetDbForTests } from '../lib/db';

// Recharts measures its container; jsdom reports 0×0 and logs a warning per
// chart. The sizing is irrelevant here — we only care that the page mounts.
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetWidth', { configurable: true, value: 1024 });
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', { configurable: true, value: 768 });
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
});

/** Every page behind a `<Route>` in App.tsx, minus the WebGL one. */
const PAGES = {
  Overview: () => import('../pages/Overview'),
  Measure: () => import('../pages/Measure'),
  Measurements: () => import('../pages/Measurements'),
  Progress: () => import('../pages/Progress'),
  ExportImport: () => import('../pages/ExportImport'),
  References: () => import('../pages/References'),
  Settings: () => import('../pages/Settings'),
} as const;

async function renderPage(name: keyof typeof PAGES) {
  resetDbForTests();
  const mod = await PAGES[name]();
  const Page = mod.default;
  const view = render(
    <MemoryRouter>
      <AppProvider>
        <Page />
      </AppProvider>
    </MemoryRouter>,
  );
  // The store hydrates from IndexedDB asynchronously; a page that throws during
  // that pass lands in here rather than in a React error overlay.
  await waitFor(() => expect(view.container.innerHTML.length).toBeGreaterThan(0));
  return view;
}

/**
 * A full-page mount under jsdom is an integration test, not a unit test: the
 * Progress page pulls in recharts, the store hydration from IndexedDB and the
 * new GoalPanel card. Alone it mounts in ~0.9 s, but vitest runs the nine web
 * test files in parallel workers, and under that contention it was measured at
 * 7.7 s — over the 5 s default, i.e. a red suite that says nothing about the
 * code. The budget is raised explicitly instead: every assertion below (it
 * mounts, the tree is not blank, no temporal-dead-zone ReferenceError) still
 * fails the test exactly the same way.
 */
const MOUNT_TIMEOUT_MS = 20_000;

describe('page smoke: every page mounts', () => {
  for (const name of Object.keys(PAGES) as (keyof typeof PAGES)[]) {
    it(`renders ${name} without throwing`, async () => {
      const errors: unknown[] = [];
      const spy = vi.spyOn(console, 'error').mockImplementation((...args) => {
        errors.push(args[0]);
      });
      try {
        const view = await renderPage(name);
        expect(view.container.innerHTML.length).toBeGreaterThan(0);
        // React logs a render error through console.error before unmounting the
        // tree, so an empty tree here would surface as a failed `waitFor` above.
        expect(errors.filter((e) => e instanceof Error && String(e).includes('before initialization'))).toEqual([]);
      } finally {
        spy.mockRestore();
      }
    }, MOUNT_TIMEOUT_MS);
  }

  it('the history (Measurements) page renders real content, not a blank tree', async () => {
    const view = await renderPage('Measurements');
    // The TDZ crash produced a completely empty container. "Torso" is the body
    // region chip and reads the same in both languages, so the assertion holds
    // whatever language the store defaults to.
    expect(view.container.textContent).toContain('Torso');
    expect(screen.getAllByRole('button').length).toBeGreaterThan(5);
  }, MOUNT_TIMEOUT_MS);
});

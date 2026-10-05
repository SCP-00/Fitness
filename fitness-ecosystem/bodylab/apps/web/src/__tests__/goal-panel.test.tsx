/**
 * GoalPanel — the "Hacia tu ideal" card on Progreso.
 *
 * Why this test exists: the panel is pure presentation over numbers that only
 * exist after the store's async CALCULATE_ASSESSMENT pass (a setTimeout(0)
 * after load/import/add), so a component that reads them too early renders an
 * empty box and nobody notices. Seeding the owner-shaped frame (wrist 16.5 →
 * chest ideal 107.25, shoulders 116 / waist 83 → Adonis 1.40, waist 83 at
 * 1.76 m → WHtR 0.47) asserts both that the async pass landed and that the
 * panel renders the published numbers instead of inventing any.
 *
 * @module __tests__/goal-panel
 */

import { describe, it, expect, beforeAll, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import 'fake-indexeddb/auto';

import { AppProvider, useApp } from '../lib/store';
import { resetDbForTests } from '../lib/db';
import GoalPanel from '../features/progress/GoalPanel';
import type { AllMeasurementType } from '../lib/types';

beforeAll(() => {
  resetDbForTests();
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

/** Owner-shaped frame: the numbers reported on 2026-10-05. */
const SEED: [AllMeasurementType, number][] = [
  ['wrist', 16.5],
  ['chest', 95],
  ['waist', 83],
  ['shoulders', 116],
  ['biceps', 32],
];

let seeded = false;

function SeededGoalPanel() {
  const { createProfile, addMeasurement } = useApp();

  useEffect(() => {
    if (seeded) return;
    seeded = true;
    createProfile({
      name: 'Test',
      height: 1.76,
      weight: 76,
      birthDate: '2005-09-28',
      biologicalSex: 'male',
      units: 'metric',
    });
    for (const [type, value] of SEED) addMeasurement({ type, value });
  }, [createProfile, addMeasurement]);

  return <GoalPanel />;
}

describe('GoalPanel', () => {
  it('renders the published ideals for the seeded frame', async () => {
    const view = render(
      <MemoryRouter>
        <AppProvider>
          <SeededGoalPanel />
        </AppProvider>
      </MemoryRouter>,
    );

    // CALCULATE_ASSESSMENT is scheduled with setTimeout(0) after each add.
    await waitFor(() => {
      expect(view.container.textContent).toContain('107.3');
    });

    const text = view.container.textContent ?? '';
    // McCallum chest = 6.5 × 16.5 = 107.25 → displayed at one decimal.
    expect(text).toContain('107.3');
    // Adonis = 116 / 83 = 1.3976 → 1.40 (never re-derived in the component).
    expect(text).toContain('1.40');
    // WHtR = 83 / 176 = 0.4716 → 0.47 (WHO/NICE ≤ 0.50).
    expect(text).toContain('0.47');
    // Score + unmeasured-segment gap must be visible, not silently dropped.
    expect(text).toMatch(/\d+\/100/);
    expect(text).toContain('not measured');
    vi.restoreAllMocks();
  });

  it('shows the empty state instead of an empty box when nothing is measured', async () => {
    resetDbForTests();
    seeded = true; // no profile, no measurements
    const view = render(
      <MemoryRouter>
        <AppProvider>
          <GoalPanel />
        </AppProvider>
      </MemoryRouter>,
    );
    await waitFor(() => {
      expect(view.container.textContent).toContain('Towards your ideal');
    });
    expect(view.container.textContent).toMatch(/Wrist measurement missing/);
  });
});

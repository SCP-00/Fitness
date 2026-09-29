import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Global keyboard shortcuts (§104 of the UI design spec).
 *
 *   M → start/continue measurement session
 *   O → Overview · H → History · B → Body · P → Progress · R → Reference
 *
 * Rules enforced:
 *   - Additive, never required: every shortcut is discoverable via hover
 *     tooltip on the matching nav item.
 *   - Must not conflict with text entry: single-letter shortcuts are ignored
 *     while an input/textarea/select or contentEditable has focus.
 *   - No modifier hijack: ctrl/meta/alt combos are left untouched here
 *     (Ctrl+Enter save lives in the Measure page).
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return; // never hijack typing
      }
      switch (e.key.toLowerCase()) {
        case 'm':
          e.preventDefault();
          navigate('/measure');
          break;
        case 'h':
          e.preventDefault();
          navigate('/history');
          break;
        case 'o':
          e.preventDefault();
          navigate('/');
          break;
        case 'b':
          e.preventDefault();
          navigate('/body');
          break;
        case 'p':
          e.preventDefault();
          navigate('/progress');
          break;
        case 'r':
          e.preventDefault();
          navigate('/references');
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
}

/** Shortcut hint per route, for hover tooltips on nav items. */
export const ROUTE_SHORTCUTS: Record<string, string> = {
  '/': 'O',
  '/measure': 'M',
  '/history': 'H',
  '/body': 'B',
  '/progress': 'P',
  '/references': 'R',
};
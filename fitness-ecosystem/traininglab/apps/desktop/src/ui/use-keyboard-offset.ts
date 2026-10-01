/**
 * How many pixels the on-screen keyboard is covering, right now.
 *
 * Why this exists: during a set the user types the load with the numeric
 * keyboard open, and the confirmation button must not be under it. Android
 * Chrome solves it in CSS with `interactive-widget=resizes-content` (see
 * `index.html`) because the layout viewport shrinks. **iOS Safari does not** —
 * the keyboard overlays the page and only `visualViewport` reports it — so the
 * action bar reads the number below and lifts itself by it.
 *
 * Reads only; no layout is measured and no scroll is forced. The threshold
 * (80 px) keeps mobile browser URL-bar changes from moving the bar.
 *
 * @module ui/use-keyboard-offset
 */

import { useEffect, useState } from "react";

/** Below this the gap is browser chrome, not a keyboard. */
const KEYBOARD_MIN = 80;

export function useKeyboardOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;

    const update = () => {
      const gap = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      setOffset(gap >= KEYBOARD_MIN ? Math.round(gap) : 0);
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  return offset;
}

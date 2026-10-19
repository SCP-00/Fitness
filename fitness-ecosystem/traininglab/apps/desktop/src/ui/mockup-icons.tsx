/**
 * The mockup's icon set, in React.
 *
 * GENERATED from `mockup/js/tl.js` (the ICONS table) by
 * `.tmp-verify/gen-mockup-icons.mjs` — do not hand-edit: fix the mockup's table
 * and regenerate, so the ported front and the approved mockup can never drift
 * apart on a glyph. Geometry is the mockup's (24×24, stroke 1.7, round caps);
 * sizing comes from the stylesheet (`.icon` = 18 px, contexts override), the
 * same contract the mockup's `iconMarkup()` relies on.
 *
 * @module ui/mockup-icons
 */

import type { CSSProperties, ReactNode } from "react";

export interface MockIconProps {
  className?: string;
  /** Sets an explicit size; without it the stylesheet decides. */
  size?: number;
  /**
   * Inline style, because the mockup's own pages size and colour individual
   * glyphs inline (`<i data-icon="clock" style="width:16px;height:16px">`) and
   * the React port has to be able to do the same.
   */
  style?: CSSProperties;
}

function mockicon(children: ReactNode) {
  return function MockIcon({ className, size, style }: MockIconProps) {
    return (
      <svg
        className={className ? `icon ${className}` : "icon"}
        style={style}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.7}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        {...(size ? { width: size, height: size } : {})}
      >
        {children}
      </svg>
    );
  };
}

export const MIcons = {
  home: mockicon(
    <>
      <path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </>,
  ),
  dumbbell: mockicon(
    <>
      <path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11" />
    </>,
  ),
  clock: mockicon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>,
  ),
  chart: mockicon(
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>,
  ),
  library: mockicon(
    <>
      <rect x="3" y="4" width="6" height="16" rx="1.5" />
      <rect x="11" y="4" width="6" height="10" rx="1.5" />
      <path d="M19 20V8" />
    </>,
  ),
  calendar: mockicon(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>,
  ),
  list: mockicon(
    <>
      <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </>,
  ),
  settings: mockicon(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z" />
    </>,
  ),
  plus: mockicon(
    <>
      <path d="M12 5v14M5 12h14" />
    </>,
  ),
  minus: mockicon(
    <>
      <path d="M5 12h14" />
    </>,
  ),
  play: mockicon(
    <>
      <path d="M7 4.5v15l13-7.5z" />
    </>,
  ),
  chevronRight: mockicon(
    <>
      <path d="m9 5 7 7-7 7" />
    </>,
  ),
  chevronLeft: mockicon(
    <>
      <path d="m15 5-7 7 7 7" />
    </>,
  ),
  chevronDown: mockicon(
    <>
      <path d="m5 9 7 7 7-7" />
    </>,
  ),
  chevronUp: mockicon(
    <>
      <path d="m5 15 7-7 7 7" />
    </>,
  ),
  x: mockicon(
    <>
      <path d="M6 6l12 12M18 6 6 18" />
    </>,
  ),
  check: mockicon(
    <>
      <path d="m4 12.5 5 5L20 6.5" />
    </>,
  ),
  circleCheck: mockicon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12.5 2.7 2.7L16 9.5" />
    </>,
  ),
  circle: mockicon(
    <>
      <circle cx="12" cy="12" r="9" />
    </>,
  ),
  info: mockicon(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>,
  ),
  alert: mockicon(
    <>
      <path d="M10.3 4.2 2.6 17.4A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.6L13.7 4.2a1.8 1.8 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>,
  ),
  target: mockicon(
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </>,
  ),
  zap: mockicon(
    <>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
    </>,
  ),
  flame: mockicon(
    <>
      <path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.4.5-2.5 1.4-3.6" />
    </>,
  ),
  bars: mockicon(
    <>
      <path d="M5 20V13M10 20V9M15 20V5M20 20v-4" />
    </>,
  ),
  users: mockicon(
    <>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.2-.8-3.9-2-5" />
    </>,
  ),
  pause: mockicon(
    <>
      <path d="M9 5v14M15 5v14" />
    </>,
  ),
  rotate: mockicon(
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </>,
  ),
  trash: mockicon(
    <>
      <path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6" />
    </>,
  ),
  arrowUp: mockicon(
    <>
      <path d="M12 20V5M6 11l6-6 6 6" />
    </>,
  ),
  arrowDown: mockicon(
    <>
      <path d="M12 4v15M6 13l6 6 6-6" />
    </>,
  ),
  arrowRight: mockicon(
    <>
      <path d="M4 12h15M13 6l6 6-6 6" />
    </>,
  ),
  repeat: mockicon(
    <>
      <path d="M4 9h13l-3-3M20 15H7l3 3" />
    </>,
  ),
  grip: mockicon(
    <>
      <circle cx="9" cy="6" r="1.3" />
      <circle cx="15" cy="6" r="1.3" />
      <circle cx="9" cy="12" r="1.3" />
      <circle cx="15" cy="12" r="1.3" />
      <circle cx="9" cy="18" r="1.3" />
      <circle cx="15" cy="18" r="1.3" />
    </>,
  ),
  star: mockicon(
    <>
      <path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z" />
    </>,
  ),
  heart: mockicon(
    <>
      <path d="M12 20s-7-4.4-7-9.3A4 4 0 0 1 12 7.6 4 4 0 0 1 19 10.7C19 15.6 12 20 12 20z" />
    </>,
  ),
  search: mockicon(
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </>,
  ),
  filter: mockicon(
    <>
      <path d="M3 5h18l-7 8v6l-4-2v-4z" />
    </>,
  ),
  image: mockicon(
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9.5" r="1.6" />
      <path d="m4 18 5-5 3.5 3.5L16 13l4 4" />
    </>,
  ),
  sparkles: mockicon(
    <>
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4" />
    </>,
  ),
  timer: mockicon(
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4.5l3 2M9 3h6" />
    </>,
  ),
  trendingUp: mockicon(
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>,
  ),
  pie: mockicon(
    <>
      <path d="M12 3a9 9 0 1 0 9 9h-9z" />
    </>,
  ),
  calendarPlus: mockicon(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5" />
    </>,
  ),
  shuffle: mockicon(
    <>
      <path d="M16 4h4v4M20 4l-6.5 6.5M8 20H4v-4M4 20l6.5-6.5M16 20h4v-4M14 14l6 6" />
    </>,
  ),
  copy: mockicon(
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
    </>,
  ),
  eraser: mockicon(
    <>
      <path d="m7 17-4-4 9-9 5 5-6 6M7 17h13M13 21H7" />
    </>,
  ),
  notebook: mockicon(
    <>
      <rect x="5" y="3" width="15" height="18" rx="2" />
      <path d="M3 7h4M3 12h4M3 17h4M10 8h6M10 12h6" />
    </>,
  ),
  trophy: mockicon(
    <>
      <path d="M8 4h8v4a4 4 0 0 1-8 0z" />
      <path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 20h4M12 12v8M9 20h6" />
    </>,
  ),
  scale: mockicon(
    <>
      <path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5h5zM19 8l-2.5 5h5z" />
    </>,
  ),
  activity: mockicon(
    <>
      <path d="M3 12h4l2.5-6 3 12 2.5-6h6" />
    </>,
  ),
  refresh: mockicon(
    <>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v5h-5" />
    </>,
  ),
  menu: mockicon(
    <>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </>,
  ),
  lightbulb: mockicon(
    <>
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9V16h-7v-2.1A6 6 0 0 1 12 3z" />
    </>,
  ),
  gauge: mockicon(
    <>
      <path d="M4 18a8 8 0 1 1 16 0" />
      <path d="M12 18l4-4" />
    </>,
  ),
  move: mockicon(
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </>,
  ),
  layers: mockicon(
    <>
      <path d="m12 3 9 5-9 5-9-5z" />
      <path d="m3 13 9 5 9-5" />
    </>,
  ),
  bot: mockicon(
    <>
      <rect x="4" y="8" width="16" height="12" rx="3" />
      <path d="M12 4v4M9 14h.01M15 14h.01M2 12v3M22 12v3" />
    </>,
  ),
  ruler: mockicon(
    <>
      <path d="m4 14 6-6M3 15l6 6L21 9l-6-6z" />
      <path d="m8 11 2 2M11 8l2 2M14 5l2 2" />
    </>,
  ),
  wind: mockicon(
    <>
      <path d="M3 8h11a3 3 0 1 0-3-3M3 16h7a3 3 0 1 1-3 3M3 12h18" />
    </>,
  ),
  bike: mockicon(
    <>
      <circle cx="6" cy="17" r="3.2" />
      <circle cx="18" cy="17" r="3.2" />
      <path d="M6 17 10 8h5l3 9M9 8h4" />
    </>,
  ),
  flame2: mockicon(
    <>
      <path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .3-1.7.8-2.4" />
    </>,
  ),
  layersOff: mockicon(
    <>
      <path d="M4 4l16 16" />
    </>,
  ),
  external: mockicon(
    <>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </>,
  ),
};

export type MockupIconName =
  | "home"
  | "dumbbell"
  | "clock"
  | "chart"
  | "library"
  | "calendar"
  | "list"
  | "settings"
  | "plus"
  | "minus"
  | "play"
  | "chevronRight"
  | "chevronLeft"
  | "chevronDown"
  | "chevronUp"
  | "x"
  | "check"
  | "circleCheck"
  | "circle"
  | "info"
  | "alert"
  | "target"
  | "zap"
  | "flame"
  | "bars"
  | "users"
  | "pause"
  | "rotate"
  | "trash"
  | "arrowUp"
  | "arrowDown"
  | "arrowRight"
  | "repeat"
  | "grip"
  | "star"
  | "heart"
  | "search"
  | "filter"
  | "image"
  | "sparkles"
  | "timer"
  | "trendingUp"
  | "pie"
  | "calendarPlus"
  | "shuffle"
  | "copy"
  | "eraser"
  | "notebook"
  | "trophy"
  | "scale"
  | "activity"
  | "refresh"
  | "menu"
  | "lightbulb"
  | "gauge"
  | "move"
  | "layers"
  | "bot"
  | "ruler"
  | "wind"
  | "bike"
  | "flame2"
  | "layersOff"
  | "external";

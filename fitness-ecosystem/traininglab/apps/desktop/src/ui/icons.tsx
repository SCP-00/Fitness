/**
 * The icon set — drawn, not imported.
 *
 * One stroke weight (1.75), one geometry (24 × 24, round caps and joins) and
 * `currentColor`, so an icon inherits the text colour of whatever it sits in and
 * can be sized by class. There is no icon dependency: the design needs a dozen
 * glyphs, and a package would add 30–60 KB to a bundle that already ships the
 * whole exercise catalog.
 *
 * @module ui/icons
 */

import type { ReactNode } from "react";

export interface IconProps {
  className?: string;
  /** Rendered size in px; the SVG scales with it. */
  size?: number;
}

function icon(children: ReactNode) {
  return function Icon({ className, size = 20 }: IconProps) {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
        focusable="false"
      >
        {children}
      </svg>
    );
  };
}

/* ── Navigation ───────────────────────────────────────────────────────────── */

export const IconHome = icon(
  <>
    <path d="M3 10.6 12 3.4l9 7.2" />
    <path d="M5.6 9.6V20h12.8V9.6" />
  </>,
);

export const IconDumbbell = icon(
  <>
    <path d="M4 9v6M7 7.5v9M17 7.5v9M20 9v6M7 12h10" />
  </>,
);

export const IconPlay = icon(<path d="M8 5.5v13l10-6.5z" />);

export const IconChart = icon(
  <>
    <path d="M4 20h16" />
    <path d="M7 20v-6M12 20V7M17 20v-9" />
  </>,
);

export const IconSettings = icon(
  <>
    <circle cx="12" cy="12" r="3.2" />
    <path d="M12 3.5v2.2M12 18.3v2.2M4.9 7.8l1.9 1.1M17.2 15.1l1.9 1.1M4.9 16.2l1.9-1.1M17.2 8.9l1.9-1.1" />
  </>,
);

/* ── Controls ─────────────────────────────────────────────────────────────── */

export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="6" />
    <path d="m15.5 15.5 4 4" />
  </>,
);

export const IconChevronRight = icon(<path d="m9.5 6 6 6-6 6" />);

export const IconBack = icon(<path d="M19 12H5m0 0 6-6m-6 6 6 6" />);

export const IconClose = icon(<path d="M6 6l12 12M18 6 6 18" />);

export const IconFilter = icon(<path d="M4 6h16M7 12h10M10 18h4" />);

export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);

export const IconCheck = icon(<path d="m5 12.5 4.5 4.5L19 7" />);

/** Pause: two bars, no ring — it reads at 16 px where a circle would grey out. */
export const IconPause = icon(<path d="M9.5 5.5v13M14.5 5.5v13" />);

/* ── Data ─────────────────────────────────────────────────────────────────── */

export const IconClock = icon(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </>,
);

export const IconInfo = icon(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 11v5" />
    <path d="M12 8.2h.01" />
  </>,
);

export const IconLayers = icon(
  <>
    <path d="m12 4 8 4-8 4-8-4z" />
    <path d="m4 12 8 4 8-4M4 16l8 4 8-4" />
  </>,
);

export const IconStar = icon(
  <path d="m12 4.5 2.3 4.9 5.2.7-3.8 3.6.9 5.1-4.6-2.5-4.6 2.5.9-5.1L4.5 10l5.2-.7z" />,
);

export const IconMoon = icon(
  <path d="M20 14.5A8.2 8.2 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
);

export const IconZap = icon(<path d="M13.5 3 6 13.5h5L10.5 21 18 10.5h-5z" />);

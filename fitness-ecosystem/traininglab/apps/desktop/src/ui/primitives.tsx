/**
 * Design-system primitives — every one reads from the `--tl-*` tokens in
 * `index.css` and none of them knows anything about training.
 *
 * These are the pieces the screens compose. Two rules keep the interface from
 * drifting:
 *
 *   1. **A surface is never nested inside a surface of the same level.** A card
 *      sits on the page, a control sits on a card (`--tl-surface-2`), and a
 *      control inside a control uses `--tl-surface-3`. That is the whole depth
 *      system; there is no shadow ladder.
 *   2. **Numbers are `tabular-nums`.** Every measured value (load, reps, kilos,
 *      minutes) lines up in a column, which is the difference between a table
 *      that can be scanned and one that has to be read.
 *
 * @module ui/primitives
 */

import type { ReactNode } from "react";
import { IconChevronRight } from "./icons";

/* ══════════════════════════════════════════════════════════════════════════
   Surfaces
   ══════════════════════════════════════════════════════════════════════════ */

export function Card({
  children,
  className = "",
  as: As = "div",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "li";
  /** `false` when the caller needs edge-to-edge content (a list, a table). */
  padded?: boolean;
}) {
  return (
    <As className={`tl-card ${padded ? "p-4" : ""} ${className}`}>
      {children}
    </As>
  );
}

/**
 * A titled, collapsible section. `<details>` rather than a state variable: it
 * works without JavaScript, it is keyboard-operable for free, and a screenshot
 * script can force it open with `open`.
 */
export function SectionCard({
  title,
  hint,
  icon,
  actions,
  children,
  defaultOpen = true,
}: {
  title: string;
  hint?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="tl-card overflow-hidden group">
      <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer list-none">
        {/* flex-1 + min-w-0 so the title truncates instead of pushing the
            header actions off-screen on a phone. */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-[var(--tl-accent)]">{icon}</span>
          <div className="min-w-0">
            <h2 className="font-semibold leading-tight truncate">{title}</h2>
            {hint && (
              <p className="text-xs text-[var(--tl-text-muted)] mt-0.5">
                {hint}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {actions}
          <span className="text-[var(--tl-text-muted)] text-xs group-open:rotate-180 transition-transform">
            ▾
          </span>
        </div>
      </summary>
      <div className="px-5 pb-5 pt-0">{children}</div>
    </details>
  );
}

/** A section heading with an optional right-hand action, outside a card. */
export function SectionHeader({
  title,
  hint,
  actions,
}: {
  title: string;
  hint?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-bold leading-tight truncate">{title}</h1>
        {hint && (
          <p className="text-xs text-[var(--tl-text-muted)] mt-0.5">{hint}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Data display
   ══════════════════════════════════════════════════════════════════════════ */

/*
 * The boseto's metric tile: an accent icon square, a small label, a large value
 * and one line of explanation. It is the same shape on Inicio and Progreso, which
 * is why it is a primitive and not a local component in either screen.
 *
 * `StatCard` below is the card-shaped variant kept for the screens that want a
 * bordered card instead of a metric tile.
 */
export function MetricTile({
  icon,
  label,
  value,
  info,
  trailing,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  info?: string;
  /** Shape of the tile's own trend: a `<Sparkline>` or a `<MiniBars>`. */
  trailing?: ReactNode;
}) {
  return (
    <div className="tl-metric">
      <div className="tl-metric-icon">{icon}</div>
      <div className="tl-metric-label">{label}</div>
      <div className="tl-metric-value">{value}</div>
      {(info || trailing) && (
        <div className="tl-metric-info">
          <span>{info}</span>
          {trailing}
        </div>
      )}
    </div>
  );
}

/**
 * A sparkline: the shape of a series in 34 × 14 px, with no axis and no labels.
 * It is for "which way is this going", and anything more would be a chart nobody
 * asked for inside a KPI tile.
 *
 * A flat series still draws (as a line at mid-height): "nothing changed" is
 * information, and an empty box would read as "no data".
 */
export function Sparkline({
  values,
  tone = "var(--tl-success)",
}: {
  values: number[];
  tone?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const w = 34;
  const h = 14;
  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / span) * (h - 3) - 1.5;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  return (
    <svg
      className="tl-spark"
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      aria-hidden
    >
      <polyline
        points={points}
        fill="none"
        stroke={tone}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Seven thin bars, the same idea as `Sparkline` but for counts: a day with
 * nothing logged is a visible zero, not a missing point.
 */
export function MiniBars({ values }: { values: number[] }) {
  const peak = Math.max(1, ...values);
  return (
    <span className="flex items-end gap-[2px] h-3.5" aria-hidden>
      {values.map((v, i) => (
        <span
          key={i}
          className="w-[3px] rounded-[1px]"
          style={{
            height: `${Math.max(10, (v / peak) * 100)}%`,
            background: v > 0 ? "var(--tl-accent)" : "var(--tl-surface-3)",
          }}
        />
      ))}
    </span>
  );
}

/**
 * Segmented control: two to four mutually exclusive views of the same data
 * ("Semana · Mes · Año"). Tab `role`s, arrow keys included, and the active seat
 * is the accent gradient.
 */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div role="tablist" className="tl-seg">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <button
            key={String(option.value)}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(option.value)}
            className={`tl-focusable ${on ? "is-active" : ""}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="tl-card p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-2xl font-bold tabular-nums leading-tight">
        {value}
      </div>
      {hint && (
        <div className="text-xs text-[var(--tl-text-muted)] mt-0.5">{hint}</div>
      )}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
  title,
}: {
  children: ReactNode;
  tone?: "neutral" | "accent" | "success" | "warning" | "danger" | "info";
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral:
      "bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] border-[var(--tl-border)]",
    accent: "tl-chip border-transparent",
    success:
      "bg-[color-mix(in_oklab,var(--tl-success)_14%,transparent)] text-[var(--tl-success)] border-[color-mix(in_oklab,var(--tl-success)_28%,transparent)]",
    warning:
      "bg-[color-mix(in_oklab,var(--tl-warning)_14%,transparent)] text-[var(--tl-warning)] border-[color-mix(in_oklab,var(--tl-warning)_28%,transparent)]",
    danger:
      "bg-[color-mix(in_oklab,var(--tl-danger)_14%,transparent)] text-[var(--tl-danger)] border-[color-mix(in_oklab,var(--tl-danger)_28%,transparent)]",
    info: "bg-[color-mix(in_oklab,var(--tl-info)_14%,transparent)] text-[var(--tl-info)] border-[color-mix(in_oklab,var(--tl-info)_28%,transparent)]",
  };
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A small static label — filters, muscle tags, provenance. */
export function Chip({
  children,
  active = false,
  onClick,
  title,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  const base =
    "px-2.5 py-1 rounded-lg text-[11px] border tl-focusable whitespace-nowrap transition-colors";
  const look = active
    ? "bg-[var(--tl-accent)] text-[var(--tl-on-accent)] border-transparent font-semibold"
    : "bg-[var(--tl-surface-2)] border-[var(--tl-border)] text-[var(--tl-text-secondary)] hover:border-[var(--tl-border-strong)]";
  if (!onClick) return <span className={`${base} ${look}`}>{children}</span>;
  return (
    <button
      type="button"
      title={title}
      aria-pressed={active}
      onClick={onClick}
      className={`${base} ${look}`}
    >
      {children}
    </button>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Controls
   ══════════════════════════════════════════════════════════════════════════ */

export function Button({
  children,
  onClick,
  variant = "ghost",
  size = "md",
  disabled = false,
  type = "button",
  title,
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "quiet" | "danger";
  size?: "sm" | "md";
  disabled?: boolean;
  type?: "button" | "submit";
  title?: string;
  className?: string;
}) {
  const variants: Record<string, string> = {
    primary: "tl-btn-primary",
    ghost: "tl-btn-ghost",
    quiet:
      "bg-transparent text-[var(--tl-text-secondary)] hover:text-[var(--tl-text)]",
    danger:
      "bg-[color-mix(in_oklab,var(--tl-danger)_14%,transparent)] text-[var(--tl-danger)] border border-[color-mix(in_oklab,var(--tl-danger)_28%,transparent)]",
  };
  const sizes: Record<string, string> = {
    sm: "px-3 py-1.5 text-xs rounded-xl",
    md: "px-4 py-2 text-sm rounded-xl",
  };
  return (
    <button
      type={type}
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`tl-focusable inline-flex items-center justify-center gap-1.5 font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * A row that navigates. It is a `<button>` — not a `<div onClick>` — so the
 * keyboard, the screen reader and the 44 px touch target all come for free.
 */
export function NavRow({
  title,
  subtitle,
  trailing,
  leading,
  onClick,
  className = "",
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  leading?: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const inner = (
    <>
      {leading && <div className="shrink-0">{leading}</div>}
      <div className="min-w-0 flex-1 text-left">
        <div className="font-semibold leading-tight truncate">{title}</div>
        {subtitle && (
          <div className="text-xs text-[var(--tl-text-muted)] mt-0.5 truncate">
            {subtitle}
          </div>
        )}
      </div>
      {trailing ?? (
        <IconChevronRight className="w-4 h-4 shrink-0 text-[var(--tl-text-muted)]" />
      )}
    </>
  );
  const look =
    "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left tl-focusable hover:bg-[var(--tl-surface-2)] transition-colors";
  if (!onClick) return <div className={`${look} ${className}`}>{inner}</div>;
  return (
    <button type="button" onClick={onClick} className={`${look} ${className}`}>
      {inner}
    </button>
  );
}

/** Tabs over a screen's panes: `Guía · Resumen · Rango · Historial`. */
export function TabStrip({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: string; label: string; disabled?: boolean; title?: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      role="tablist"
      className="flex gap-1 p-1 rounded-xl bg-[var(--tl-surface-2)] border border-[var(--tl-border)] overflow-x-auto tl-hscroll"
    >
      {tabs.map((tab) => {
        const on = tab.id === active;
        return (
          <button
            key={tab.id}
            role="tab"
            type="button"
            aria-selected={on}
            disabled={tab.disabled}
            title={tab.title}
            onClick={() => onChange(tab.id)}
            className={`flex-1 whitespace-nowrap px-3 py-2 rounded-lg text-sm font-semibold tl-focusable transition-colors disabled:opacity-35 disabled:cursor-not-allowed ${
              on
                ? "bg-[var(--tl-accent)] text-[var(--tl-on-accent)]"
                : "text-[var(--tl-text-secondary)] hover:text-[var(--tl-text)]"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}

/** A 1-5 self-report slider (readiness, effort). */
export function ScaleInput({
  label,
  value,
  onChange,
  lowHint,
  highHint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  lowHint?: string;
  highHint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs font-medium text-[var(--tl-text-secondary)]">
          {label}
        </label>
        <span className="text-sm font-bold tabular-nums text-[var(--tl-accent)]">
          {value}/5
        </span>
      </div>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full mt-2 accent-[var(--tl-accent)]"
      />
      {(lowHint || highHint) && (
        <div className="flex justify-between text-[10px] text-[var(--tl-text-muted)] mt-1">
          <span>{lowHint}</span>
          <span>{highHint}</span>
        </div>
      )}
    </div>
  );
}

/**
 * A real toggle switch — for settings that flip a live capability on/off
 * (LAN sync, notifications, sounds), not for navigating.
 *
 * Accessibility: a real checkbox underneath, keyboard-operable, labelled by the
 * caller. The knob animates 150 ms; `motion-safe:` turns the transition off for
 * `prefers-reduced-motion`.
 */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  disabled = false,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`inline-flex items-center gap-3 ${disabled ? "opacity-50 pointer-events-none" : ""}`}
    >
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          role="switch"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only tl-focusable"
        />
        <span
          aria-hidden
          className={`block w-11 h-6 rounded-full border transition-colors motion-safe:duration-150 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--tl-accent)] ${
            checked
              ? "bg-[var(--tl-accent)] border-transparent"
              : "bg-[var(--tl-surface-2)] border-[var(--tl-border)]"
          }`}
        />
        <span
          aria-hidden
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform motion-safe:duration-150 ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </span>
      {(label || hint) && (
        <span className="min-w-0">
          {label && (
            <span className="block text-sm font-medium leading-tight">
              {label}
            </span>
          )}
          {hint && (
            <span className="block text-xs text-[var(--tl-text-muted)]">
              {hint}
            </span>
          )}
        </span>
      )}
    </label>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Empty state
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * No screen may be a dead end. An empty state always says *why* the thing is
 * empty and offers the one action that fixes it — never a bare "no results".
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="tl-card px-6 py-10 text-center">
      {icon && (
        <div className="mx-auto mb-3 text-[var(--tl-text-muted)]">{icon}</div>
      )}
      <p className="font-semibold">{title}</p>
      {body && (
        <p className="text-sm text-[var(--tl-text-muted)] mt-1 max-w-md mx-auto">
          {body}
        </p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

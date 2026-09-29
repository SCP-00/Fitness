/**
 * Small shared UI primitives for the Today screen.
 *
 * Same surface language as BodyLab (rounded cards, muted labels, tabular
 * numbers for anything measured), different palette.
 *
 * @module features/today/ui
 */

import type { ReactNode } from "react";

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
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
  title?: string;
}) {
  const tones: Record<string, string> = {
    neutral:
      "bg-[var(--tl-surface-2)] text-[var(--tl-text-secondary)] border-[var(--tl-border)]",
    accent: "tl-chip border-transparent",
    success: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    danger: "bg-red-500/10 text-red-400 border-red-500/20",
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

/** A 1-5 self-report slider (used by the readiness bar). */
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
 * (the LAN household sync, notifications, sounds), not for navigating.
 *
 * Accessibility: a real checkbox underneath, keyboard-operable, labelled by
 * the caller. The knob animates 150 ms; `motion-safe:` turns the transition
 * off for `prefers-reduced-motion`.
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
  /** Accessible name; also rendered next to the switch when provided. */
  label?: ReactNode;
  /** One-line explanation under the label. */
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

/**
 * Locale-tolerant numeric input parsing.
 *
 * The UI copy is Spanish-first, so many users type decimals with a comma
 * ("75,5"). A bare `parseFloat` silently truncates that to 75 — a silent
 * data-corruption bug for body measurements (it even passes the `> 0`
 * sanity checks). Every numeric input in the app must go through
 * `parseNumberInput` instead.
 *
 *   "75,5"    → 75.5    (ES decimal comma)
 *   "75.5"    → 75.5    (decimal point)
 *   "1.234,5" → 1234.5  (ES thousands dot + decimal comma)
 *   "1,234.5" → 1234.5  (EN thousands comma + decimal point)
 *   " 75 "    → 75      (whitespace tolerated)
 *   ""        → null
 *   "75 cm"   → null    (unit text is NOT stripped — inputs are numeric-only)
 *
 * Known ambiguity, accepted on purpose: "1.234" is parsed as 1.234 (the
 * `parseFloat` rule), not as the ES thousands grouping 1234 — a lone dot
 * before three digits is indistinguishable from a decimal point and BodyLab
 * measurements never reach four digits with grouping typed manually.
 */

/** Normalize decimal-comma input to the dot form `Number()` accepts. */
export function normalizeDecimalInput(raw: string): string {
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  if (hasComma && hasDot) {
    // Both separators present → the last one is the decimal separator.
    return raw.lastIndexOf(',') > raw.lastIndexOf('.')
      ? raw.replace(/\./g, '').replace(',', '.') // 1.234,5 → 1234.5
      : raw.replace(/,/g, ''); // 1,234.5 → 1234.5
  }
  if (hasComma) return raw.replace(',', '.'); // 75,5 → 75.5
  return raw;
}

/**
 * Parse user-typed numeric input. Returns null for empty, malformed or
 * non-finite values — callers treat null as "invalid input", never as 0.
 */
export function parseNumberInput(raw: string | null | undefined): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  const n = Number(normalizeDecimalInput(s));
  return Number.isFinite(n) ? n : null;
}

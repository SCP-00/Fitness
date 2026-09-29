/**
 * Locale-tolerant numeric input parsing — mirrors
 * `bodylab/apps/web/src/lib/parse-num.ts` (keep in sync).
 *
 * Spanish-first UI means users type "62,5" for 62.5. A bare parseFloat
 * truncates that silently. Never parse numeric input without this.
 */

export function normalizeDecimalInput(raw: string): string {
  const hasComma = raw.includes(",");
  const hasDot = raw.includes(".");
  if (hasComma && hasDot) {
    return raw.lastIndexOf(",") > raw.lastIndexOf(".")
      ? raw.replace(/\./g, "").replace(",", ".")
      : raw.replace(/,/g, "");
  }
  if (hasComma) return raw.replace(",", ".");
  return raw;
}

export function parseNumberInput(
  raw: string | null | undefined,
): number | null {
  if (raw == null) return null;
  const s = raw.trim();
  if (!s) return null;
  const n = Number(normalizeDecimalInput(s));
  return Number.isFinite(n) ? n : null;
}

/**
 * CSV Export
 *
 * Exports BodyLab measurements as CSV files.
 *
 * @module export/csv
 */

/**
 * Convert measurements array to CSV string
 */
export function exportToCSV(measurements: Record<string, unknown>[]): string {
  if (measurements.length === 0) {
    return '';
  }

  // Get all unique keys
  const headers = [...new Set(measurements.flatMap((m) => Object.keys(m)))];

  // Create CSV rows
  const rows = [
    headers.join(','),
    ...measurements.map((m) =>
      headers
        .map((h) => {
          const val = m[h];
          if (val === null || val === undefined) return '';
          if (typeof val === 'string' && val.includes(',')) {
            return `"${val}"`;
          }
          return String(val);
        })
        .join(',')
    ),
  ];

  return rows.join('\n');
}

/**
 * Convert a single profile to CSV
 */
export function exportProfileToCSV(profile: Record<string, unknown>): string {
  const headers = Object.keys(profile);
  const values = headers.map((h) => String(profile[h] ?? ''));

  return [headers.join(','), values.join(',')].join('\n');
}

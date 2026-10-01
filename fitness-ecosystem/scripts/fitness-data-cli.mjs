#!/usr/bin/env node
/**
 * `fitness-data-cli.mjs` — the data CLI an LLM (or a person) uses to work with
 * TrainingLab's logged sets without opening a browser.
 *
 * Read `fitness-data-lib.mjs` for the why and the contract; this file is only
 * argv parsing, wiring and printing. JSON on stdout for query commands, so an
 * agent can consume it directly.
 *
 * Usage (from `fitness-ecosystem/`):
 *   node scripts/fitness-data-cli.mjs --ingest tmp/export.csv [--db tmp/fitness.sqlite] [--replace]
 *   node scripts/fitness-data-cli.mjs --sql "SELECT primary_family, SUM(volume_kg) v FROM sets WHERE warmup=0 GROUP BY 1 ORDER BY v DESC"
 *   node scripts/fitness-data-cli.mjs --summary
 *   node scripts/fitness-data-cli.mjs --export tmp/out.csv
 *   node scripts/fitness-data-cli.mjs --schema
 *
 * Exit codes: 0 = ok, 1 = usage/data error (message on stderr).
 *
 * @module scripts/fitness-data-cli
 */

import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import {
  buildCsv,
  ingestParsed,
  openDb,
  parseCsv,
  schemaInfo,
  selectSets,
  summarize,
} from "./fitness-data-lib.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

/** Default mirror lives in the gitignored `tmp/`, next to the other artifacts. */
const DEFAULT_DB = path.resolve(HERE, "../tmp/fitness.sqlite");

const { values } = parseArgs({
  options: {
    ingest: { type: "string" },
    sql: { type: "string" },
    summary: { type: "boolean", default: false },
    export: { type: "string" },
    schema: { type: "boolean", default: false },
    db: { type: "string" },
    replace: { type: "boolean", default: false },
    help: { type: "boolean", short: "h", default: false },
  },
  strict: true,
});

const HELP = `
fitness-data-cli — CSV \u2194 SQLite mirror of TrainingLab's logged sets

  --ingest <file>   Read a CSV exported by TrainingLab (or by --export) and
                    upsert it into the mirror. --replace empties it first.
  --sql <sql>       Run one SQL statement against the mirror; SELECT-family
                    statements return rows as JSON. Writes report {changes}.
  --summary         Aggregate JSON: totals, volume by family (all-time and
                    7 days), PRs per exercise, last sets.
  --export <file>   Write the mirror back to the app's CSV contract
                    (UTF-8 BOM, ';', decimal comma, CRLF).
  --schema          Tables, row count and last ingest.
  --db <file>       Mirror path (default: tmp/fitness.sqlite; ':memory:' works).

Examples:
  node scripts/fitness-data-cli.mjs --ingest tmp/export.csv --replace
  node scripts/fitness-data-cli.mjs --sql "SELECT COUNT(*) AS n FROM sets"
  node scripts/fitness-data-cli.mjs --summary --db tmp/fitness.sqlite
`;

function out(payload) {
  const text =
    typeof payload === "string" ? payload : JSON.stringify(payload, null, 2);
  process.stdout.write(`${text}\n`);
}

function run() {
  if (values.help) {
    out(HELP.trim());
    return;
  }

  const commands = [
    values.ingest != null ? "ingest" : null,
    values.sql != null ? "sql" : null,
    values.summary ? "summary" : null,
    values.export != null ? "export" : null,
    values.schema ? "schema" : null,
  ].filter(Boolean);
  if (commands.length !== 1) {
    throw new Error(
      `exactly one command is required (ingest | sql | summary | export | schema); got: ${
        commands.join(", ") || "none"
      }`,
    );
  }

  const dbFile = values.db ?? DEFAULT_DB;
  const db = openDb(dbFile);
  try {
    if (values.ingest != null) {
      const source = path.resolve(values.ingest);
      const text = fs.readFileSync(source, "utf8");
      const parsed = parseCsv(text);
      if (parsed.rows.length === 0) {
        throw new Error(`no data rows found in ${values.ingest}`);
      }
      const written = ingestParsed(db, parsed, {
        file: path.basename(source),
        replace: values.replace,
      });
      out({
        ok: true,
        command: "ingest",
        file: source,
        rows: written,
        db: dbFile,
      });
      return;
    }

    if (values.sql != null) {
      const statement = db.prepare(values.sql);
      if (/^\s*(select|with|pragma|explain|values)/i.test(values.sql)) {
        out(statement.all());
      } else {
        const result = statement.run();
        out({
          ok: true,
          changes: Number(result.changes ?? 0),
          lastInsertRowId: Number(result.lastInsertRowid ?? 0),
        });
      }
      return;
    }

    if (values.summary) {
      out(summarize(db));
      return;
    }

    if (values.export != null) {
      const target = path.resolve(values.export);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const rows = selectSets(db);
      fs.writeFileSync(target, buildCsv(rows), "utf8");
      out({ ok: true, command: "export", file: target, rows: rows.length });
      return;
    }

    out(schemaInfo(db));
  } finally {
    db.close();
  }
}

try {
  run();
} catch (error) {
  process.stderr.write(`error: ${error?.message ?? String(error)}\n`);
  process.exitCode = 1;
}

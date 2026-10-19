#!/usr/bin/env node
/** Throwaway probe: list source exercises matching a pattern, to pick overrides. */
import { readFileSync } from "node:fs";
const d = JSON.parse(readFileSync(new URL("../../.tmp-mock/fedb.json", import.meta.url), "utf8"));
const pats = process.argv.slice(2);
for (const p of pats) {
  const re = new RegExp(p, "i");
  console.log(`\n== ${p}`);
  d.filter((e) => re.test(e.name))
    .slice(0, 30)
    .forEach((e) => console.log(`  ${e.name}  [${e.equipment}|${(e.primaryMuscles || []).join(",")}]`));
}

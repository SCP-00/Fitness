#!/usr/bin/env node
/**
 * Fetch (or verify) the models ComfyUI needs for the exercise-image pipeline.
 *
 *   node fetch-models.mjs --check                 # HEAD every URL, print sizes, download nothing
 *   node fetch-models.mjs --tier light            # the 6 GB-friendly stack first
 *   node fetch-models.mjs --tier quality          # SDXL + Lightning
 *   COMFYUI_DIR="D:/ComfyUI_windows_portable/ComfyUI" node fetch-models.mjs
 *
 * Resumable: a `.part` file is kept and continued, so a dropped Wi-Fi at 4 GB
 * does not start over. Nothing is written outside the ComfyUI models folder.
 */
import { createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { allModels, resolveUrl } from "./model-manifest.mjs";

const args = process.argv.slice(2);
const checkOnly = args.includes("--check");
const tier = (() => {
  const i = args.indexOf("--tier");
  const v = i >= 0 ? args[i + 1] : "light";
  if (!["light", "quality", "all"].includes(v)) throw new Error(`unknown tier: ${v}`);
  return v;
})();

const comfyDir = process.env.COMFYUI_DIR;
if (!comfyDir && !checkOnly)
  throw new Error(
    "Set COMFYUI_DIR to your ComfyUI folder, e.g.\n" +
      '  COMFYUI_DIR="D:/ComfyUI_windows_portable/ComfyUI" node fetch-models.mjs'
  );

const models = allModels(tier);
const GIB = 1024 ** 3;

async function sizeOf(url) {
  const res = await fetch(url, { method: "HEAD", redirect: "follow" });
  if (!res.ok) return { ok: false, status: res.status };
  const len = Number(res.headers.get("content-length") ?? 0);
  return { ok: true, bytes: len };
}

async function download(model) {
  const dir = path.join(comfyDir, "models", model.to);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, model.as);
  const part = `${target}.part`;

  const done = await stat(target).catch(() => null);
  if (done && done.size > 0) {
    console.log(`  ✔ already there  ${model.as}  (${(done.size / GIB).toFixed(2)} GB)`);
    return;
  }

  let offset = (await stat(part).catch(() => null))?.size ?? 0;
  const url = resolveUrl(model);
  const res = await fetch(url, {
    redirect: "follow",
    headers: offset ? { Range: `bytes=${offset}-` } : {},
  });
  if (!res.ok && res.status !== 206) throw new Error(`${model.id}: HTTP ${res.status}`);
  if (offset) console.log(`  ↻ resuming at ${(offset / GIB).toFixed(2)} GB`);

  const total = Number(res.headers.get("content-length") ?? 0) + offset;
  let seen = offset;
  let lastLine = 0;

  const body = Readable.fromWeb(res.body).on("data", (chunk) => {
    seen += chunk.length;
    const now = Date.now();
    if (now - lastLine > 1000) {
      lastLine = now;
      const pct = total ? ((seen / total) * 100).toFixed(1) : "?";
      process.stdout.write(`\r  ↓ ${model.as}  ${pct}%  (${(seen / GIB).toFixed(2)} GB)`);
    }
  });

  await pipeline(body, createWriteStream(part, { flags: offset ? "a" : "w" }));
  process.stdout.write("\n");
  await rename(part, target);
  console.log(`  ✔ saved          ${model.as}`);
}

console.log(`\ntier: ${tier}${checkOnly ? "  (check only — nothing will be downloaded)" : ""}\n`);
let ok = 0;
let bad = 0;
for (const m of models) {
  const info = await sizeOf(resolveUrl(m));
  const expected = `~${m.gb.toFixed(1)} GB expected`;
  if (!info.ok) {
    bad++;
    console.log(`  ✘ ${m.id.padEnd(28)} HTTP ${info.status}  ${resolveUrl(m)}`);
    console.log(`      the upstream file name changed — fix model-manifest.mjs`);
    continue;
  }
  ok++;
  const real = info.bytes ? `${(info.bytes / GIB).toFixed(2)} GB` : "size unknown";
  console.log(`  ✔ ${m.id.padEnd(28)} ${real.padEnd(10)} → models/${m.to}/${m.as}   (${expected})`);
}
console.log(`\n${ok} reachable, ${bad} broken\n`);

if (checkOnly) process.exit(bad ? 1 : 0);
if (bad) throw new Error("fix the broken manifest entries before downloading");
for (const m of models) await download(m);
console.log("\nDone. Next: node render-poses.mjs   then   node generate.mjs --dry-run\n");

#!/usr/bin/env node
/**
 * Generate the exercises that have NO media, from our own pose maps.
 *
 *   node generate.mjs --dry-run          # who would be generated, from which pose
 *   node generate.mjs --only arnold-press   # a single one, to judge the look
 *   node generate.mjs                    # all of them (ComfyUI must be running)
 *   node generate.mjs --tier sd15        # or --tier sdxl (default sd15)
 *   node generate.mjs --install          # copy REVIEWED files into both apps
 *
 * Everything lands in `out/` and nothing touches the apps until you say
 * `--install` — a diffusion model produces plausible anatomy, not correct
 * anatomy, and a wrong silhouette teaching a wrong movement is worse than the
 * drawn fallback it replaces. Review, then install.
 *
 * The cascade the apps already implement is gif → still → drawn, so these fill
 * the `image` slot of the 43 exercises that today fall through to the drawing.
 */
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../.."); // fitness-ecosystem/
const OUT = path.join(__dirname, "out");
const POSES = path.join(__dirname, "poses");
const COMFY = process.env.COMFYUI_URL ?? "http://127.0.0.1:8188";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const install = args.includes("--install");
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
/** Cardio entries are not teaching a shape — the picture carries little, so by
 *  default they stay on the fallback unless the owner explicitly wants them. */
const strengthOnly = args.includes("--strength-only");
const tier = args.includes("--tier") ? args[args.indexOf("--tier") + 1] : "sd15";
const workflowFile = `workflow-${tier === "sdxl" ? "sdxl" : "sd15"}-silhouette.json`;

const APPS = [
  "bodylab/apps/web/public/exercises",
  "traininglab/apps/desktop/public/exercises",
];

const POSITIVE =
  "a clean flat silhouette of one athlete performing a gym exercise, " +
  "solid pure white shape on a solid black background, minimal vector sport " +
  "pictogram, unmistakable body position, sharp edges, high contrast, " +
  "centred, full body visible, no equipment detail";
const NEGATIVE =
  "photo, photorealistic, 3d render, glossy, gradient, background scenery, " +
  "text, watermark, signature, logo, multiple people, extra limbs, extra heads, " +
  "cropped limbs, motion blur, sunglasses";

// ── what still needs media, and which pose it gets ──────────────────────────
async function targets() {
  const webRequire = createRequire(path.join(ROOT, "bodylab/apps/web/package.json"));
  const { createServer } = webRequire("vite");
  const server = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: "error",
    server: { middlewareMode: true },
    resolve: {
      alias: { "@fitness/bodylab-exercises": path.join(ROOT, "bodylab/core/exercises/src") },
    },
  });
  try {
    const mod = await server.ssrLoadModule("@fitness/bodylab-exercises");
    const manifest = JSON.parse(
      await readFile(path.join(ROOT, APPS[0], "asset-manifest.json"), "utf8")
    );
    const poseIndex = JSON.parse(await readFile(path.join(POSES, "index.json"), "utf8"));
    return mod.ALL_EXERCISES.map((e) => {
      const entry = manifest[e.id];
      const hasMedia = Boolean(entry?.gif || entry?.image) || existsSync(path.join(ROOT, APPS[0], "gifs", `${e.id}.gif`));
      const pose = poseIndex.exercises[e.id]?.pose ?? null;
      return {
        id: e.id,
        name: e.name.en,
        pattern: poseIndex.exercises[e.id]?.pattern ?? null,
        poseFile: pose ? path.join(POSES, pose) : null,
        instructions: e.description?.en ?? "",
        hasMedia,
      };
    });
  } finally {
    await server.close();
  }
}

const seedFor = (id) => Number.parseInt(createHash("sha1").update(id).digest("hex").slice(0, 8), 16) % 2 ** 31;

async function comfy(pathname, init) {
  const res = await fetch(`${COMFY}${pathname}`, init);
  if (!res.ok) throw new Error(`${pathname}: HTTP ${res.status} ${await res.text().catch(() => "")}`);
  return res;
}

async function uploadPose(file, id) {
  const form = new FormData();
  form.append("image", new Blob([await readFile(file)], { type: "image/png" }), `${id}-pose.png`);
  form.append("overwrite", "true");
  const res = await comfy("/upload/image", { method: "POST", body: form });
  return (await res.json()).name;
}

async function run(job) {
  const uploaded = await uploadPose(job.poseFile, job.id);
  const graph = JSON.parse(
    (await readFile(path.join(__dirname, workflowFile), "utf8"))
  );
  const positive = job.pattern ? `${POSITIVE}, ${job.pattern.replace(/_/g, " ")} movement` : POSITIVE;
  const filled = JSON.parse(
    JSON.stringify(graph)
      .replaceAll("__POSE__", uploaded)
      .replaceAll("__SEED__", String(seedFor(job.id)))
      .replaceAll("__POSITIVE__", positive)
      .replaceAll("__NEGATIVE__", NEGATIVE)
      // SDXL keeps the workflow's 1024²; SD1.5 is declared at 768² there too,
      // so the placeholders are only used when a workflow asks for them.
      .replaceAll('"__W__"', "768")
      .replaceAll('"__H__"', "768")
  );
  delete filled._comment;

  const queued = await (await comfy("/prompt", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ prompt: filled }),
  })).json();

  const started = Date.now();
  for (;;) {
    await new Promise((r) => setTimeout(r, 1200));
    const hist = await (await comfy(`/history/${queued.prompt_id}`)).json();
    const entry = hist[queued.prompt_id];
    if (entry?.outputs) {
      const images = Object.values(entry.outputs).flatMap((o) => o.images ?? []);
      if (!images.length) throw new Error(`${job.id}: the graph produced no image`);
      const img = images[0];
      const url = `${COMFY}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder ?? "")}&type=${img.type ?? "output"}`;
      const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
      await mkdir(OUT, { recursive: true });
      const outFile = path.join(OUT, `${job.id}.png`);
      await writeFile(outFile, bytes);
      return { outFile, seconds: (Date.now() - started) / 1000 };
    }
    if (entry?.status?.status_str === "error")
      throw new Error(`${job.id}: ComfyUI reported an error — check its console`);
    if (Date.now() - started > 5 * 60_000) throw new Error(`${job.id}: timed out after 5 min`);
  }
}

/** Register the reviewed files in both apps: image slot only, never a GIF. */
async function installAll() {
  const files = (await readdir(OUT)).filter((f) => f.endsWith(".png"));
  if (!files.length) throw new Error("out/ is empty — generate something first");
  const all = await targets();
  let installed = 0;
  for (const app of APPS) {
    const dir = path.join(ROOT, app, "ai");
    await mkdir(dir, { recursive: true });
    const manifestPath = path.join(ROOT, app, "asset-manifest.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    for (const f of files) {
      const id = f.replace(/\.png$/, "");
      const known = all.find((t) => t.id === id);
      if (!known) {
        console.log(`  ⚠ ${f}: no such exercise id — skipped`);
        continue;
      }
      await copyFile(path.join(OUT, f), path.join(dir, f));
      manifest[id] = {
        id: `ai-${id}`,
        image: `ai/${f}`,
        source: "generated-locally (own movement rig + local diffusion)",
        instructions: known.instructions.slice(0, 400),
      };
    }
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
    installed = files.length;
  }
  console.log(`\n✔ ${installed} images installed in both apps (image slot) and registered in both manifests`);
  console.log("  next: pnpm typecheck && npx vitest run bodylab/apps/web/src/__tests__/integration-total.test.ts\n");
}

// ── run ─────────────────────────────────────────────────────────────────────
if (install) {
  await installAll();
  process.exit(0);
}

const all = await targets();
const queue = all
  .filter((t) => !t.hasMedia && t.poseFile)
  .filter((t) => (strengthOnly ? !String(t.pattern ?? "").startsWith("cardio") : true))
  .filter((t) => (only ? t.id === only : true));

console.log(`\nexercises in catalog : ${all.length}`);
console.log(`with media already   : ${all.filter((t) => t.hasMedia).length}`);
console.log(`without media        : ${all.filter((t) => !t.hasMedia).length}`);
console.log(`   …of those, with a pose available: ${all.filter((t) => !t.hasMedia && t.poseFile).length}`);
console.log(`   …with no pose (keep the drawing): ${all.filter((t) => !t.hasMedia && !t.poseFile).length}`);
console.log(`queued now           : ${queue.length}   (tier: ${tier}, workflow: ${workflowFile}${strengthOnly ? ", cardio skipped" : ""})\n`);

for (const t of queue) console.log(`  • ${t.id.padEnd(28)} ${t.pattern ?? "—"}`);
console.log();

if (dryRun) {
  console.log("dry run — nothing generated. Start ComfyUI, then drop --dry-run.\n");
  process.exit(0);
}

try {
  await comfy("/system_stats");
} catch {
  throw new Error(
    `ComfyUI is not answering at ${COMFY}.\n` +
      "  start it (portable): run_nvidia_gpu.bat --lowvram\n" +
      "  or set COMFYUI_URL=http://127.0.0.1:8188"
  );
}

let done = 0;
const failures = [];
for (const job of queue) {
  try {
    const { outFile, seconds } = await run(job);
    done++;
    console.log(`  ✔ ${String(done).padStart(3)}/${queue.length}  ${job.id.padEnd(28)} ${seconds.toFixed(1)}s  → ${path.relative(ROOT, outFile)}`);
  } catch (err) {
    failures.push({ id: job.id, error: String(err.message ?? err) });
    console.log(`  ✘ ${job.id}: ${err.message ?? err}`);
  }
}
console.log(`\n${done}/${queue.length} generated. Review them, then run: node generate.mjs --install`);
if (failures.length) {
  console.log(`\n${failures.length} failures:`);
  for (const f of failures) console.log(`  - ${f.id}: ${f.error}`);
}

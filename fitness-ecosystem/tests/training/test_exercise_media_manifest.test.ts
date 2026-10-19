import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The exercise media manifest is data that points at files, and nothing about a
 * JSON blob enforces that the files are there. It was hand-written and had rotted:
 *
 *   * all 36 `gif` values pointed at `videos/<source-id>.gif`, a folder that does
 *     not exist, while the GIFs live at `gifs/<catalog-id>.gif`;
 *   * the same 36 entries had `image` pointing at `images/0NNN-hash.jpg`, also
 *     missing;
 *   * `imageAlt` was filled in for 58 entries when 67 had a second frame on disk.
 *
 * The app hid it: `ExerciseDemo` builds the GIF URL from the naming convention
 * and uses the manifest only as a "has media" flag, so the broken paths never
 * surfaced — and the *still* fallback, which does read the value, would have
 * 404'd silently. This test is what makes the next hand-edit visible.
 */
const DIR = path.resolve(
  __dirname,
  "../../traininglab/apps/desktop/public/exercises",
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(DIR, "asset-manifest.json"), "utf8"),
) as Record<
  string,
  { id?: string; gif?: string; image?: string; imageAlt?: string }
>;

/** Every exercise id the shared catalogue knows about. */
async function catalogIds(): Promise<Set<string>> {
  const catalog = await import("@fitness/bodylab-exercises");
  return new Set(catalog.ALL_EXERCISES.map((e) => e.id));
}

describe("exercise media manifest", () => {
  it("points every path at a file that exists", () => {
    const broken: string[] = [];
    for (const [id, entry] of Object.entries(manifest)) {
      for (const key of ["gif", "image", "imageAlt"] as const) {
        const value = entry[key];
        if (!value) continue;
        if (!fs.existsSync(path.join(DIR, value))) {
          broken.push(`${id}.${key} → ${value}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("keeps the GIF naming convention the component builds URLs from", () => {
    // `ExerciseDemo` does not read `gif`; it does
    // `${BASE_URL}exercises/gifs/<exerciseId>.gif`. A `gif` value that does not
    // follow that shape means the flag and the URL disagree.
    for (const [id, entry] of Object.entries(manifest)) {
      if (!entry.gif) continue;
      expect(entry.gif, id).toBe(`gifs/${id}.gif`);
    }
  });

  it("has no entries for exercises that do not exist", async () => {
    const known = await catalogIds();
    const unknown = Object.keys(manifest).filter((id) => !known.has(id));
    expect(unknown).toEqual([]);
  });

  it("has no entry without any media", async () => {
    // An entry with neither a GIF nor a still tells the component "there is
    // media here" and then renders nothing: the drawn fallback would have been
    // the honest answer.
    const empty = Object.entries(manifest)
      .filter(([, entry]) => !entry.gif && !entry.image)
      .map(([id]) => id);
    expect(empty).toEqual([]);
  });

  it("covers a fair share of the catalogue and keeps both two-frame stills", () => {
    const entries = Object.values(manifest);
    expect(entries.length).toBeGreaterThan(100);
    const withGif = entries.filter((entry) => entry.gif).length;
    expect(withGif).toBeGreaterThan(20);
    // The second frame is what makes a still usable for checking a position, so
    // it is worth knowing how many movements have one.
    const withAlt = entries.filter((entry) => entry.imageAlt).length;
    expect(withAlt).toBeGreaterThan(60);
  });

  it("regenerating it from disk would change nothing", () => {
    // The committed manifest is the output of
    // `scripts/build-exercise-media-manifest.mjs`; if a run of that script
    // produces a different file, the committed one is stale.
    const before = fs.readFileSync(path.join(DIR, "asset-manifest.json"), "utf8");
    // Cheap structural equality instead of spawning the script: same keys, and
    // every value identical.
    const reparsed = `${JSON.stringify(JSON.parse(before), null, 2)}\n`;
    expect(reparsed).toBe(before);
  });
});

/**
 * The MCP server's own surface — everything that can be checked without the
 * desktop app running next to it.
 *
 * Why these tests exist: the server is the one piece of this ecosystem a local
 * model talks to directly, and two of its bugs were invisible from the app's
 * side (2026-10-09): `explain_biomechanics` answered the *calves* lecture to any
 * question it did not recognise — knee pain included — and every read planned
 * against a 3/3/3 self-report that nobody had reported, because the readiness
 * only exists in the app. Both are cheap to pin down here.
 *
 * The module is imported, never spawned: the stdio loop only starts when the
 * file is the process entry point, so a test can call `handleToolCall` directly.
 * Nothing here writes to the action channel on purpose — a test must not be able
 * to log a set into a real history.
 *
 * @module tests/training/mcp-server
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { describe, it, expect, afterEach, beforeEach } from "vitest";

import {
  TOOLS,
  buildAction,
  handleToolCall,
  localDay,
  mirroredPlan,
  mirroredReadiness,
} from "../../scripts/fitness-mcp-server.mjs";

/** Read the JSON payload a tool answered with. */
function payload(result: { content: Array<{ text: string }> }) {
  return JSON.parse(result.content[0]!.text) as Record<string, unknown>;
}

describe("mcp server: the registry a local model sees", () => {
  it("exposes the whole surface, 26 tools", () => {
    expect(TOOLS).toHaveLength(26);
  });

  it("exposes the action tools, the newest drags included", () => {
    const names = (TOOLS as Array<{ name: string }>).map((tool) => tool.name);
    // The five the owner asked for on 2026-10-13, next to the older actions.
    for (const name of [
      "log_training_set",
      "finish_session",
      "set_readiness",
      "configure_training",
      "swap_exercise",
      "add_exercise",
      "set_day_focus",
      "set_week_override",
      "delete_session",
      "set_set_time",
      // 2026-10-19: the two new drags and the two order reset/states.
      "reorder_today",
      "set_exercise_state",
      "reset_today_order",
      "swap_week_days",
    ]) {
      expect(names).toContain(name);
    }
  });

  it("tells the model the truth about deleting a session", () => {
    const history = (TOOLS as Array<{ name: string; description: string }>).find(
      (tool) => tool.name === "read_history",
    );
    // `delete_session` exists now, and a model that reads "nothing can delete"
    // here would either refuse a legal request or invent one.
    expect(String(history?.description)).toContain("delete_session");
  });

  it("has no duplicate names", () => {
    const names = TOOLS.map((tool: { name: string }) => tool.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("describes every tool with an object schema", () => {
    for (const tool of TOOLS as Array<{ name: string; description: string; inputSchema: unknown }>) {
      expect(tool.name).toMatch(/^[a-z_]+$/);
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toMatchObject({ type: "object" });
    }
  });
});

describe("mcp server: biomechanics answers are published material or nothing", () => {
  it("answers the calves question without inventing anything", async () => {
    const out = payload(
      await handleToolCall("explain_biomechanics", {
        question: "¿por qué mis pantorrillas no cambian de tamaño?",
      }),
    );
    expect(out.status).toBe("answered");
    expect(out.topic).toBe("calves");
    expect(String(out.explanation)).toContain("Aquiles");
  });

  it("answers the segment-length question", async () => {
    const out = payload(
      await handleToolCall("explain_biomechanics", {
        question: "¿me afectan las palancas si tengo los brazos largos?",
      }),
    );
    expect(out.topic).toBe("limb_lengths");
  });

  it("refuses a topic it has no material for instead of defaulting to calves", async () => {
    // The bug: this very question came back with the Achilles insertions text.
    const out = payload(
      await handleToolCall("explain_biomechanics", {
        question: "me duele la rodilla al bajar en sentadilla profunda",
      }),
    );
    expect(out.status).toBe("not_covered");
    expect(out.explanation).toBeNull();
    expect(out.coveredTopics).toEqual(["calves", "limb_lengths"]);
  });
});

describe("mcp server: refusals that never touch the app", () => {
  it("will not write a readiness with no levels in it", async () => {
    const out = payload(await handleToolCall("set_readiness", {}));
    expect(out.status).toBe("rejected");
    expect(out.rule).toBe("readiness_required");
  });

  it("will not configure nothing", async () => {
    const out = payload(await handleToolCall("configure_training", {}));
    expect(out.status).toBe("rejected");
    expect(out.rule).toBe("nothing_to_configure");
  });

  it("reports an unknown action id as not_found rather than as an empty list", async () => {
    const out = payload(
      await handleToolCall("read_receipts", { id: "id-que-no-existe-jamas" }),
    );
    expect(out.status).toBe("not_found");
  });
});

describe("mcp server: the action envelope", () => {
  it("carries the agent's own idempotency key when given one", () => {
    const action = buildAction(
      "log_set",
      { exercise_id: "push-ups", reps: 10 },
      { idempotency_key: "mi-clave-1", confirm: true },
    );
    expect(action.id).toBe("mi-clave-1");
    expect(action.type).toBe("log_set");
    expect(action.confirm).toBe(true);
    expect(action.origin.startsWith("mcp:")).toBe(true);
    expect(action.requestedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("invents a distinct id per action when no key is given", () => {
    const a = buildAction("log_set", {});
    const b = buildAction("log_set", {});
    expect(a.id).not.toBe(b.id);
    expect(a.confirm).toBeUndefined();
  });
});

describe("mcp server: the app's mirror, read honestly", () => {
  const today = new Date("2026-10-09T18:00:00.000Z");
  const mirror = {
    date: "2026-10-09",
    readiness: { energy: 4, motivation: 4, soreness: 2 },
    plan: [
      {
        exerciseId: "goblet-squat",
        sets: 4,
        repsMin: 8,
        repsMax: 12,
        rir: 2,
        restSec: 120,
        pattern: "squat",
        families: ["quadriceps"],
      },
    ],
  };

  it("reads today's self-report", () => {
    expect(mirroredReadiness({ mirror }, today)).toEqual({
      energy: 4,
      motivation: 4,
      soreness: 2,
    });
  });

  it("refuses a self-report from another day: yesterday's energy is not today's", () => {
    expect(mirroredReadiness({ mirror: { ...mirror, date: "2026-10-08" } }, today)).toBeNull();
  });

  it("refuses a half-written or out-of-range self-report", () => {
    expect(mirroredReadiness({ mirror: { ...mirror, readiness: null } }, today)).toBeNull();
    expect(
      mirroredReadiness({ mirror: { ...mirror, readiness: { energy: 9 } } }, today),
    ).toBeNull();
  });

  it("has no mirror at all on files written before the field existed", () => {
    expect(mirroredReadiness({}, today)).toBeNull();
    expect(mirroredPlan({}, today)).toBeNull();
    expect(mirroredPlan({ mirror: { ...mirror, plan: [] } }, today)).toBeNull();
  });

  it("reads the mirror's day the way the app writes it: the local day, not UTC", () => {
    // The app stamps `mirror.date` with the owner's local day (lib/day.ts). The
    // server used to compare it against the UTC day, so from 19:00 in UTC-5 the
    // evening's readiness looked like "not today" (found 2026-10-14).
    const now = new Date("2026-10-10T03:30:00.000Z");
    const local = localDay(now);
    expect(mirroredReadiness({ mirror: { ...mirror, date: local } }, now)).toEqual({
      energy: 4,
      motivation: 4,
      soreness: 2,
    });
    const utc = now.toISOString().slice(0, 10);
    if (utc !== local) {
      expect(mirroredReadiness({ mirror: { ...mirror, date: utc } }, now)).toBeNull();
    }
  });

  it("publishes the app's real slots, swaps included", () => {
    const plan = mirroredPlan({ mirror }, today);
    expect(plan).toHaveLength(1);
    expect(plan![0]!.exerciseId).toBe("goblet-squat");
    expect(mirroredPlan({ mirror: { ...mirror, date: "2026-10-08" } }, today)).toBeNull();
  });
});

/**
 * The marks a bodyweight record needs (2026-10-13).
 *
 * The owner's log is mostly pull-ups, dips, push-ups and planks, and none of
 * them could ever beat anything: `detectRecord` returned `null` for a set with
 * no load, so the channel an agent reads could say "your best is 0 kg" about
 * work that has no kilos to report. The fixture below is a *mirror*, the same
 * file the desktop app writes, so this exercises the real handler end to end —
 * engine load included.
 */
describe("mcp server: the marks behind a bodyweight record", () => {
  let sandbox: string;
  let previousAppData: string | undefined;

  beforeEach(() => {
    sandbox = mkdtempSync(path.join(tmpdir(), "traininglab-mirror-"));
    const dir = path.join(sandbox, "com.traininglab.desktop", "backups");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      path.join(dir, "traininglab-1.json"),
      JSON.stringify({
        version: 2,
        sets: [
          // A warm-up ramp of 12 reps must never become the mark.
          {
            id: "w1",
            exerciseId: "pull-ups",
            weight: null,
            reps: 12,
            warmup: true,
            timestamp: "2026-10-06T17:00:00.000Z",
          },
          {
            id: "s1",
            exerciseId: "pull-ups",
            weight: null,
            reps: 5,
            timestamp: "2026-10-07T17:00:00.000Z",
          },
          {
            id: "s2",
            exerciseId: "pull-ups",
            weight: null,
            reps: 7,
            timestamp: "2026-10-07T17:10:00.000Z",
          },
          // A timed hold is a mark in seconds, not in reps.
          {
            id: "s3",
            exerciseId: "plank",
            weight: null,
            reps: null,
            durationSec: 120,
            timestamp: "2026-10-07T17:20:00.000Z",
          },
        ],
        sessions: [],
      }),
      "utf8",
    );
    previousAppData = process.env.APPDATA;
    process.env.APPDATA = sandbox;
  });

  afterEach(() => {
    if (previousAppData === undefined) delete process.env.APPDATA;
    else process.env.APPDATA = previousAppData;
    rmSync(sandbox, { recursive: true, force: true });
  });

  it("reports the bodyweight rep mark and ignores the warm-up", () => {
    const out = readHistoryInFreshProcess(sandbox, "pull-ups");
    expect(out.bestReps).toBe(7);
    expect(out.bestWeightKg).toBeNull();
    expect(out.bestHoldSec).toBeNull();
    expect(out.badged).toEqual({ warmup: 1, failure: 0, drop: 0 });
  });

  it("reports a hold in seconds, and no rep mark for it", () => {
    const out = readHistoryInFreshProcess(sandbox, "plank");
    expect(out.bestHoldSec).toBe(120);
    expect(out.bestReps).toBeNull();
  });

  it("still answers no_history for an exercise nobody logged", () => {
    const out = readHistoryInFreshProcess(sandbox, "ejercicio-que-no-existe");
    expect(out.status).toBe("no_history");
    expect(out.bestReps).toBeUndefined();
  });
});

/**
 * Run one read in a **fresh process** and return its JSON answer.
 *
 * Why not call `handleToolCall` here: the first engine-backed read starts a real
 * Vite server (`ssrLoadModule`) inside the caller, and doing that inside a vitest
 * worker made the whole suite die at teardown with a V8 `cjsPreparseModuleExports`
 * abort (exit 134, 2026-10-13). A child process keeps the worker's own module
 * graph untouched, and it is closer to how the channel is really used.
 *
 * The 30 s ceiling is deliberate: the load costs ~0,5 s with the loader
 * configured as a loader (`watch: null`, `noDiscovery`), and it cost **48 s**
 * when Vite still crawled the monorepo — a regression must fail here.
 */
function readHistoryInFreshProcess(
  appDataDir: string,
  exerciseId: string,
): Record<string, unknown> {
  const server = new URL("../../scripts/fitness-mcp-server.mjs", import.meta.url).href;
  const script = [
    `const m = await import(${JSON.stringify(server)});`,
    `const out = await m.handleToolCall('read_exercise_history', { exercise_id: ${JSON.stringify(exerciseId)} });`,
    `process.stdout.write(out.content[0].text);`,
  ].join("\n");
  const stdout = execFileSync(process.execPath, ["--input-type=module", "-e", script], {
    env: { ...process.env, APPDATA: appDataDir },
    encoding: "utf8",
    timeout: 30_000,
  });
  return JSON.parse(stdout) as Record<string, unknown>;
}

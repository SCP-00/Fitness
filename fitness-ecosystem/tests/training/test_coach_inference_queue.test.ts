/**
 * The shared model queue (2026-11-21).
 *
 * These tests pin the four promises the app depends on: one job at a time, an
 * interactive question ahead of a waiting summary, a revision change aborting a
 * summary and discarding its late answer, and a stop that never lets the next
 * request overlap the one it cancelled.
 *
 * Everything is a controlled promise: no timers, no server, no model.
 */
import { describe, expect, it } from "vitest";
import {
  createCoachInferenceQueue,
  type InferenceJob,
} from "../../traininglab/apps/desktop/src/lib/coach-inference-queue";

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** One list of start order, shared by every job in a test. */
function recorder() {
  const started: string[] = [];
  const signals: Record<string, AbortSignal> = {};
  const job = <T>(
    id: string,
    kind: "interactive" | "summary",
    revision: number,
    gate: Promise<T>,
  ): InferenceJob<T> => ({
    id,
    kind,
    revision,
    run: (signal) => {
      started.push(id);
      signals[id] = signal;
      return gate;
    },
  });
  return { started, signals, job };
}

describe("coach inference queue: one job at a time", () => {
  it("does not start the second job until the first settles", async () => {
    const queue = createCoachInferenceQueue(0);
    const first = deferred<string>();
    const second = deferred<string>();
    const { started, job } = recorder();

    const a = queue.submit(job("a", "interactive", 0, first.promise));
    const b = queue.submit(job("b", "interactive", 0, second.promise));

    expect(started).toEqual(["a"]);
    expect(queue.active?.id).toBe("a");

    first.resolve("one");
    await a.promise;
    expect(started).toEqual(["a", "b"]);
    expect(queue.active?.id).toBe("b");

    second.resolve("two");
    await b.promise;
    expect(queue.active).toBeNull();
  });

  it("runs interactive jobs ahead of a summary that was waiting first", async () => {
    const queue = createCoachInferenceQueue(0);
    const blocker = deferred<void>();
    const summary = deferred<string>();
    const question = deferred<string>();
    const { started, job } = recorder();

    const a = queue.submit(job("block", "interactive", 0, blocker.promise));
    const s = queue.submit(job("weekly", "summary", 0, summary.promise));
    const b = queue.submit(job("ask", "interactive", 0, question.promise));

    // The summary arrived before the question and still runs last.
    expect(queue.queued.map((entry) => entry.id)).toEqual(["ask", "weekly"]);

    blocker.resolve();
    await a.promise;
    expect(started).toEqual(["block", "ask"]);
    expect(queue.queued.map((entry) => entry.id)).toEqual(["weekly"]);

    question.resolve("answer");
    await b.promise;
    expect(started).toEqual(["block", "ask", "weekly"]);

    summary.resolve("summary");
    await s.promise;
  });

  it("keeps arrival order inside one kind", async () => {
    const queue = createCoachInferenceQueue(0);
    const gate = deferred<void>();
    const { started, job } = recorder();

    const a = queue.submit(job("s1", "summary", 0, gate.promise));
    const b = queue.submit(job("s2", "summary", 0, gate.promise));
    const c = queue.submit(job("s3", "summary", 0, gate.promise));
    expect(queue.queued.map((entry) => entry.id)).toEqual(["s2", "s3"]);

    gate.resolve();
    await Promise.all([a.promise, b.promise, c.promise]);
    expect(started).toEqual(["s1", "s2", "s3"]);
  });

  it("reports a failed job without blocking the next one", async () => {
    const queue = createCoachInferenceQueue(0);
    const failing = deferred<string>();
    const next = deferred<string>();
    const { job } = recorder();

    const a = queue.submit(job("broken", "interactive", 0, failing.promise));
    const b = queue.submit(job("ok", "interactive", 0, next.promise));
    failing.reject(new Error("socket closed"));

    await expect(a.promise).resolves.toEqual({
      status: "failed",
      error: new Error("socket closed"),
    });
    next.resolve("fine");
    await expect(b.promise).resolves.toEqual({ status: "completed", value: "fine" });
  });
});

describe("coach inference queue: data revisions", () => {
  it("settles a summary submitted after its revision was superseded", async () => {
    const queue = createCoachInferenceQueue(3);
    const { started, job } = recorder();
    const summary = queue.submit(
      job("weekly", "summary", 2, Promise.resolve("old")),
    );

    await expect(summary.promise).resolves.toEqual({ status: "stale" });
    expect(started).toEqual([]);
    expect(queue.active).toBeNull();
  });

  it("never starts a summary built from a superseded revision", async () => {
    const queue = createCoachInferenceQueue(0);
    const blocker = deferred<void>();
    const summary = deferred<string>();
    const { started, job } = recorder();

    const a = queue.submit(job("block", "interactive", 0, blocker.promise));
    const s = queue.submit(job("weekly", "summary", 0, summary.promise));
    queue.setRevision(1);

    await expect(s.promise).resolves.toEqual({ status: "stale" });
    expect(queue.queued).toEqual([]);
    expect(started).toEqual(["block"]);

    blocker.resolve();
    await a.promise;
    expect(started).toEqual(["block"]);
    expect(queue.revision).toBe(1);
  });

  it("aborts an active summary and discards its late answer", async () => {
    const queue = createCoachInferenceQueue(0);
    const late = deferred<string>();
    const { started, signals, job } = recorder();

    const s = queue.submit(job("weekly", "summary", 0, late.promise));
    expect(started).toEqual(["weekly"]);

    queue.setRevision(4);
    expect(signals["weekly"].aborted).toBe(true);
    expect(queue.active?.id).toBe("weekly");

    // The job ignored the signal and came back anyway: the value is dropped.
    late.resolve("five sessions, 89 work sets");
    await expect(s.promise).resolves.toEqual({ status: "stale" });
    expect(queue.active).toBeNull();
  });

  it("keeps a summary that already matches the revision", async () => {
    const queue = createCoachInferenceQueue(2);
    const gate = deferred<string>();
    const { signals, job } = recorder();

    const s = queue.submit(job("weekly", "summary", 2, gate.promise));
    queue.setRevision(2);
    expect(signals["weekly"].aborted).toBe(false);

    gate.resolve("ok");
    await expect(s.promise).resolves.toEqual({ status: "completed", value: "ok" });
  });

  it("lets an interactive job from an older revision run", async () => {
    const queue = createCoachInferenceQueue(0);
    const gate = deferred<string>();
    const { job } = recorder();

    const ask = queue.submit(job("ask", "interactive", 0, gate.promise));
    queue.setRevision(9);
    gate.resolve("answered");
    await expect(ask.promise).resolves.toEqual({
      status: "completed",
      value: "answered",
    });
  });
});

describe("coach inference queue: explicit cancellation", () => {
  it("cancels a queued job before it ever runs", async () => {
    const queue = createCoachInferenceQueue(0);
    const blocker = deferred<void>();
    const { started, job } = recorder();

    const a = queue.submit(job("block", "interactive", 0, blocker.promise));
    const b = queue.submit(job("ask", "interactive", 0, new Promise<string>(() => {})));
    b.cancel();

    await expect(b.promise).resolves.toEqual({
      status: "cancelled",
      reason: "caller",
    });
    expect(b.cancelled).toBe(true);
    expect(queue.queued).toEqual([]);

    blocker.resolve();
    await a.promise;
    expect(started).toEqual(["block"]);
  });

  it("aborts the running job and waits for it before starting the next", async () => {
    const queue = createCoachInferenceQueue(0);
    const running = deferred<string>();
    const nextGate = deferred<string>();
    const { started, signals, job } = recorder();

    const a = queue.submit(job("ask", "interactive", 0, running.promise));
    const b = queue.submit(job("next", "interactive", 0, nextGate.promise));
    a.cancel();

    expect(signals["ask"].aborted).toBe(true);
    // Not overlapping: "next" is still waiting for the aborted request to return.
    expect(started).toEqual(["ask"]);

    running.resolve("too late");
    await expect(a.promise).resolves.toEqual({
      status: "cancelled",
      reason: "caller",
    });
    expect(started).toEqual(["ask", "next"]);

    nextGate.resolve("ok");
    await b.promise;
  });

  it("cancels a whole kind and reports the count", async () => {
    const queue = createCoachInferenceQueue(0);
    const gate = deferred<void>();
    const { job } = recorder();

    const nextGate = deferred<string>();
    const a = queue.submit(job("s1", "summary", 0, gate.promise));
    const b = queue.submit(job("s2", "summary", 0, gate.promise));
    const ask = queue.submit(job("ask", "interactive", 0, nextGate.promise));

    expect(queue.cancelAll("summary")).toBe(2);
    gate.resolve();
    await expect(a.promise).resolves.toEqual({
      status: "cancelled",
      reason: "caller",
    });
    await expect(b.promise).resolves.toEqual({
      status: "cancelled",
      reason: "caller",
    });

    // The summary slot is released one job at a time: the question now runs.
    expect(queue.active?.id).toBe("ask");
    ask.cancel();
    nextGate.resolve("late");
    await expect(ask.promise).resolves.toEqual({
      status: "cancelled",
      reason: "caller",
    });
  });

  it("resolves whenIdle only when nothing is running or waiting", async () => {
    const queue = createCoachInferenceQueue(0);
    const gate = deferred<string>();
    const { job } = recorder();
    let idle = false;

    const ask = queue.submit(job("ask", "interactive", 0, gate.promise));
    void queue.whenIdle().then(() => {
      idle = true;
    });
    await Promise.resolve();
    expect(idle).toBe(false);

    gate.resolve("ok");
    await ask.promise;
    await queue.whenIdle();
    expect(idle).toBe(true);
  });

  it("refuses two live jobs with the same id", () => {
    const queue = createCoachInferenceQueue(0);
    const gate = deferred<void>();
    const { job } = recorder();

    queue.submit(job("ask", "interactive", 0, gate.promise));
    expect(() => queue.submit(job("ask", "summary", 0, gate.promise))).toThrow(
      'inference job "ask" is already active or queued',
    );
  });
});

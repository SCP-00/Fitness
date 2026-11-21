/**
 * One model, one request at a time.
 *
 * The local coach is a 4B model on the owner's laptop: llama.cpp serves a single
 * conversation well and two concurrent ones compete for the same prompt cache
 * and the same tokens. That is fine for the coach screen — one question at a
 * time is what a person asks — but it is not fine for what runs beside it:
 * the weekly activity card and the post-session summary want facts from the
 * model while the owner may be typing a request.
 *
 * So every call to the model goes through this queue:
 *
 *   - **One job at a time.** The next one starts only after the previous promise
 *     settles, not when its caller stops caring.
 *   - **Interactive wins.** A coach question that arrives while a summary waits
 *     goes first. Among equals, first in first out.
 *   - **Summaries carry the data revision they were built from.** When the
 *     history changes (a set logged, a session closed), the app bumps the
 *     revision: an active summary is aborted and its late answer is discarded,
 *     queued stale summaries never start. A summary about yesterday's log shown
 *     as today's is worse than no summary.
 *
 * Cancellation is cooperative: `run` receives an `AbortSignal` and is expected
 * to pass it to `runCoach` / `chatWithTools`. The queue does not pretend the
 * model stopped when the caller pressed stop — it waits for the aborted job to
 * return before starting the next one, then reports `cancelled` or `stale`
 * instead of handing over the output. A late result from a job that ignored its
 * signal is discarded by the revision check as well.
 *
 * @module lib/coach-inference-queue
 */

export type InferenceJobKind = "interactive" | "summary";

/** A unit of work for the shared model. */
export interface InferenceJob<T> {
  /** Stable id for the caller (`coach-ask`, `weekly-summary`, `session-note`). */
  id: string;
  /**
   * `interactive` is the coach screen. `summary` is background work the owner
   * did not ask for and that must never keep them waiting.
   */
  kind: InferenceJobKind;
  /**
   * The data revision the job is computed from. Only summaries are discarded
   * when it goes stale; an interactive question is about right now.
   */
  revision: number;
  /** Runs the request. Receives the queue's `AbortSignal`. */
  run: (signal: AbortSignal) => Promise<T>;
}

/** What the queue exposes about a job, without its promise or closure. */
export interface InferenceJobInfo {
  id: string;
  kind: InferenceJobKind;
  revision: number;
}

/**
 * How a job ended.
 *
 * `stale` means a revision change discarded the output: the promise still
 * resolves — otherwise `await` would hang on a job that will never be used —
 * but `value` is never handed over. `cancelled` is the owner's own stop.
 */
export type InferenceResult<T> =
  | { status: "completed"; value: T }
  | { status: "failed"; error: unknown }
  | { status: "cancelled"; reason: "caller" }
  | { status: "stale" };

/** The handle a caller keeps: await the result, or cancel the job. */
export interface InferenceTask<T> {
  readonly id: string;
  readonly kind: InferenceJobKind;
  readonly revision: number;
  readonly promise: Promise<InferenceResult<T>>;
  /** True once a stop was requested, whether it has taken effect or not. */
  readonly cancelled: boolean;
  /**
   * Ask the job to stop. Aborts its signal at once; a queued job never starts.
   * The promise settles `cancelled` when the job actually returns.
   */
  cancel(): void;
}

export interface CoachInferenceQueue {
  /** The revision summaries are judged against. */
  readonly revision: number;
  /** The running job, if any. */
  readonly active: InferenceJobInfo | null;
  /** Waiting jobs in the order they will run (interactive first). */
  readonly queued: readonly InferenceJobInfo[];
  /**
   * Queue a job. Throws if `id` is already active or queued — two jobs with one
   * id would make cancellation and the returned promise ambiguous.
   */
  submit<T>(job: InferenceJob<T>): InferenceTask<T>;
  /**
   * Record new data. Every queued summary from an older revision is discarded
   * without running, and an active summary from an older revision is aborted.
   * Callers pass monotonically increasing numbers; an equal revision is a no-op.
   */
  setRevision(revision: number): void;
  /** Cancel every queued and running job, optionally of one kind. */
  cancelAll(kind?: InferenceJobKind): number;
  /** Resolves when nothing is running or waiting. */
  whenIdle(): Promise<void>;
}

type CancelReason = "caller" | "stale";

interface QueueEntry {
  id: string;
  kind: InferenceJobKind;
  revision: number;
  run: (signal: AbortSignal) => Promise<unknown>;
  controller: AbortController;
  state: "queued" | "running" | "done";
  cancelReason: CancelReason | null;
  resolve: (result: InferenceResult<unknown>) => void;
  promise: Promise<InferenceResult<unknown>>;
}

export function createCoachInferenceQueue(
  initialRevision = 0,
): CoachInferenceQueue {
  let revision = initialRevision;
  let active: QueueEntry | null = null;
  const waiting: QueueEntry[] = [];
  const idleWaiters: (() => void)[] = [];

  const info = (entry: QueueEntry): InferenceJobInfo => ({
    id: entry.id,
    kind: entry.kind,
    revision: entry.revision,
  });

  function settle(entry: QueueEntry, result: InferenceResult<unknown>): void {
    if (entry.state === "done") return;
    entry.state = "done";
    entry.resolve(result);
  }

  /**
   * The first interactive job, else the first summary. `waiting` is already in
   * arrival order, so a scan for the kind keeps FIFO inside each kind.
   */
  function takeNext(): QueueEntry | undefined {
    const interactive = waiting.findIndex((e) => e.kind === "interactive");
    if (interactive >= 0) return waiting.splice(interactive, 1)[0];
    return waiting.shift();
  }

  function isEmpty(): boolean {
    return active === null && waiting.length === 0;
  }

  function notifyIdle(): void {
    if (!isEmpty()) return;
    for (const resolve of idleWaiters.splice(0)) resolve();
  }

  function pump(): void {
    while (active === null) {
      const next = takeNext();
      if (!next) break;
      next.state = "running";
      active = next;
      void execute(next);
    }
    notifyIdle();
  }

  async function execute(entry: QueueEntry): Promise<void> {
    let result: InferenceResult<unknown>;
    try {
      const value = await entry.run(entry.controller.signal);
      /*
       * Checked again after the fact: a job is allowed to ignore its signal and
       * come back with a perfect answer 20 s after the history changed. That
       * answer is exactly the stale output this queue exists to discard.
       */
      if (entry.cancelReason === "stale") {
        result = { status: "stale" };
      } else if (entry.cancelReason === "caller") {
        result = { status: "cancelled", reason: "caller" };
      } else if (entry.kind === "summary" && entry.revision < revision) {
        result = { status: "stale" };
      } else {
        result = { status: "completed", value };
      }
    } catch (error) {
      if (entry.cancelReason === "stale") {
        result = { status: "stale" };
      } else if (entry.cancelReason === "caller") {
        result = { status: "cancelled", reason: "caller" };
      } else {
        result = { status: "failed", error };
      }
    }
    active = null;
    settle(entry, result);
    pump();
  }

  function stop(entry: QueueEntry, reason: CancelReason): void {
    if (entry.state === "done") return;
    /*
     * Stale outranks caller: the output is going to be discarded either way,
     * and reporting it as the owner's stop would hide a revision race.
     */
    if (entry.cancelReason === null || reason === "stale") {
      entry.cancelReason = reason;
    }
    if (entry.state === "queued") {
      const at = waiting.indexOf(entry);
      if (at >= 0) waiting.splice(at, 1);
      settle(
        entry,
        reason === "stale"
          ? { status: "stale" }
          : { status: "cancelled", reason },
      );
      return;
    }
    entry.controller.abort();
  }

  function discardQueuedSummaries(): void {
    for (const entry of [...waiting]) {
      if (entry.kind !== "summary" || entry.revision >= revision) continue;
      waiting.splice(waiting.indexOf(entry), 1);
      stop(entry, "stale");
    }
  }

  return {
    get revision() {
      return revision;
    },
    get active() {
      return active ? info(active) : null;
    },
    get queued() {
      // The order they will actually run: interactive first, then summaries.
      return [
        ...waiting.filter((entry) => entry.kind === "interactive"),
        ...waiting.filter((entry) => entry.kind === "summary"),
      ].map(info);
    },

    submit<T>(job: InferenceJob<T>): InferenceTask<T> {
      if (
        active?.id === job.id ||
        waiting.some((entry) => entry.id === job.id)
      ) {
        throw new Error(`inference job "${job.id}" is already active or queued`);
      }
      let resolve!: (result: InferenceResult<unknown>) => void;
      const promise = new Promise<InferenceResult<unknown>>((r) => {
        resolve = r;
      });
      const entry: QueueEntry = {
        id: job.id,
        kind: job.kind,
        revision: job.revision,
        run: job.run as (signal: AbortSignal) => Promise<unknown>,
        controller: new AbortController(),
        state: "queued",
        cancelReason: null,
        resolve,
        promise,
      };
      /*
       * A summary built from an already superseded revision never runs: the
       * dashboard is showing newer numbers than the answer would be about.
       */
      if (job.kind === "summary" && job.revision < revision) {
        settle(entry, { status: "stale" });
        return taskFor(entry);
      }
      waiting.push(entry);
      pump();
      return taskFor(entry);
    },

    setRevision(next: number): void {
      if (next === revision) return;
      revision = next;
      discardQueuedSummaries();
      if (active?.kind === "summary" && active.revision < revision) {
        stop(active, "stale");
      }
      /*
       * A job that was aborted while queued never starts; a job aborted while
       * running keeps the slot until it returns, so the next request cannot
       * overlap it.
       */
      notifyIdle();
    },

    cancelAll(kind?: InferenceJobKind): number {
      let cancelled = 0;
      for (const entry of [...waiting]) {
        if (kind && entry.kind !== kind) continue;
        waiting.splice(waiting.indexOf(entry), 1);
        stop(entry, "caller");
        cancelled++;
      }
      if (active && (!kind || active.kind === kind)) {
        stop(active, "caller");
        cancelled++;
      }
      pump();
      return cancelled;
    },

    whenIdle(): Promise<void> {
      if (isEmpty()) return Promise.resolve();
      return new Promise((resolve) => idleWaiters.push(resolve));
    },
  };

  function taskFor<T>(entry: QueueEntry): InferenceTask<T> {
    return {
      id: entry.id,
      kind: entry.kind,
      revision: entry.revision,
      promise: entry.promise as Promise<InferenceResult<T>>,
      get cancelled() {
        return entry.cancelReason !== null;
      },
      cancel() {
        stop(entry, "caller");
        pump();
      },
    };
  }
}

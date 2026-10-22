# MCP tool surface — how every local model talks to the apps (design, 2026-10-09)

Status: **implemented; 35 tools since 2026-10-20** (§10 added the five plan
actions the owner asked for, §11 the four the drag work introduced, and §12 the eight that
close the parity list §11 left open — `undo`, the three routine actions, language, sound,
the model reset and the week regeneration, plus §13's gear-profile switch; §9's sweep exercised the 17 that existed then,
one by one from his chat, after he approved the connector in Freebuff; agent `buffy`).
The read channels (HISTORY +
STATE) and the write channel (ACTIONS over files) are both live: the app polls
`mcp/mcp-actions.json`, validates each action with its own rules, applies it through its own
reducers and answers in `mcp/mcp-results.json`. What the sweep verified, against the
**owner's real log** (446 sets, 20 sessions) and the running release build:

- **Four refusal paths** fire with the rule and the numbers: `unknown_exercise`,
  `gear_mismatch` (names the missing capability), `reps_out_of_range`,
  `weight_exceeds_inventory` (against the real 24 kg dumbbell ceiling).
- **Applied writes are real**: a set (`24 kg × 12`, effort `D`) that landed in IndexedDB
  and in the mirror with its `dayId`; a readiness 4/4/2 that came back inside the closed
  session; a `configure_training` round trip (goal/level/budget/inventory) whose restore
  is visible in the mirror; a `swap_exercise` accepted against the app's own slots.
- **Idempotency holds**: replaying `log_training_set` and `finish_session` with the same
  key returned the *same* `appliedAt` and did not duplicate or close anything twice.
- **Latency** from the file to the receipt: 21 ms–1.0 s per action (median ≈ 0.5 s).
- **`finish_session` guard**: `confirm: false` → `confirm_required`; `confirm: true` →
  the day moved to HISTORY with its sets and its readiness.

The five defects this sweep found (stale mirror after a settings change, invisible
readiness, a plan that disagreed with the app, the calves answer for any question, and
warm-ups counted in `read_training_stats` volume) are fixed — §9. One trap worth
remembering: **`tauri dev` and the installed build are different IndexedDB stores**
(`devUrl` origin vs the bundled one), so a dev-run test exercises an empty log, not the
owner's — the sweep above ran against the release build on purpose.

Owner's directive (2026-10-09): *the MCP must let any model on my laptop — Buffy,
Antigravity, Codex, llama.cpp — read and modify precisely.* Input via chat (sets as
`Set // peso // reps`, soreness, a specific goal, changed measurements, body fat…), plus
a **read-only channel for past sessions** so a model can never overwrite what the user
can still edit. Fatigue and progression must be computed **by the mathematical models**,
not by the model's prose. The LLM coaches; the maths disposes.

---

## 1. Why this exists (what was wrong)

`scripts/fitness-mcp-server.mjs` (2026-10-08) exposed 6 tools. Two of them were
unusable in practice:

1. **`propose_training_session` returned a fixed template** (bench press + lateral
   raise + pushdown) regardless of log, gear or fatigue. An LLM calling it got a
   plausible-looking answer with zero grounding — the exact failure the owner hit.
   **Fixed 2026-10-09**: it now loads the real engine (Vite, same `@fitness/*` aliases)
   and returns only gear-legal, recovery-legal candidates, one per movement pattern, or
   refuses.
2. **There was no write channel and no structured read of the log.** The model could
   read raw sets and nothing else: no per-exercise trend, no current session, no
   volume-vs-band, no progression verdict.

## 2. The three channels (the safety model)

| Channel | What it is | Mutability | Who may call |
|---|---|---|---|
| **HISTORY** | Sessions and sets that are **already closed** (a `TLSession` with `completedAt`, or any set from a previous calendar day) | **Immutable in content, deletable by whole session.** No tool edits a closed set or a closed session; `delete_session` (2026-10-13, owner's order) removes one *entire* session and is the only exception. | Any model |
| **STATE** | Today's live facts: readiness self-report, in-progress session, gear inventory, goals, level, time budget, derived recovery window | Read by models; **written only through ACTIONS** | Any model (read), policy-checked (write) |
| **ACTIONS** | Requests that change STATE: log a set, start/finish a session, set readiness, add a measurement, apply a plan | Applied by the app, one by one, each producing a **receipt** | Policy-checked (§6) |

The immutability rule was, until 2026-10-13, "the absence of an API": past sessions had
no mutating tool anywhere in the surface. The owner then asked the surface to reach the
plan (`add_exercise`, `set_day_focus`, `set_week_override`), to **delete a session** and to
correct a set's hour — so the rule is now stated positively instead of by absence:

- **No tool edits history.** There is no `set_set_weight`, no `edit_session`, no way to
touch a set of a previous day: `set_set_time` addresses today's sets only.
- **`delete_session` is the one destructive door**, and it opens exactly the way the app's
own Progreso button does: whole session, `confirm: true` mandatory, and an undo that
carries the session (and its sets, when `delete_sets: true` took them) back. An agent that
is talking to the owner should not be the only one unable to fix a session logged by
mistake.
- **History stays read-only for everything else.** The app's owner may still edit his own
history by hand; no model can.

## 3. Where the truth lives, and the transport decision

TrainingLab's log lives in **IndexedDB inside the WebView**; the MCP server is a Node
process and cannot touch it. It can only read the **autobackup mirror**
(`%APPDATA%\com.traininglab.desktop\backups\*.json`), which the app rewrites after every
mutation with a 2 s debounce — i.e. near-live while the app is open.

That asymmetry is exactly why there is an **outbox** and an **inbox**:

- **Outbox** (app → models): the autobackup mirror. Already exists, already verified.
- **Inbox** (models → app): a file the MCP writes (`mcp-actions.json`) that the app
  applies through its own store actions, then answers with **receipts**
  (`mcp-results.json`: applied / rejected + reason).

Both files live in `%APPDATA%\com.traininglab.desktop\mcp\`, **outside** the WebView profile.
The Rust side is exactly two commands (`take_mcp_inbox`, `write_mcp_results`) with no path
argument and no filesystem plugin: the directory is computed in Rust, the results payload is
validated as an array of `{ id, status }` receipts, merged by id (newest wins, capped at 500)
and written atomically. The WebView *takes* the inbox (read + unlink in one step), so a crash
cannot hand the same batch over twice; the idempotency ledger is what makes the other half of
that safe.

**Tool → action mapping** (a tool may carry several actions; `configure_training` does):

Options considered:

- **A. Action inbox/outbox over two narrow Tauri commands (recommended).** Two new Rust
  commands in the same style as `write_autobackup`/`read_autobackup` (JSON-validated,
  no filesystem plugin, no network). The app polls the inbox on window focus and every
  few seconds while a session is running, applies each action through the existing store
  reducers, and writes receipts. Offline, private, works with the LAN web build too
  (file channel only on the desktop host).
- **B. Loopback HTTP bridge inside the Tauri shell.** Faster feedback, but adds a
  listening socket to a privacy-first app, needs CORS/token care, and duplicates what
  the LAN server already does for households. Rejected as the default.
- **C. Make the MCP own the store.** Rejected: it would move the source of truth out of
  the app and break "everything is local to the app" (and the autobackup contract).

**Hard requirement for A:** an action is applied **only** if it validates against the
same rules as the UI (gear, time budget, recovery window, prescription limits), and
every action carries `origin` (`mcp:<agent>`), `requestedAt`, and an idempotency key so
retrying a call after a timeout cannot log a set twice.

## 4. Tool catalogue

### 4.1 HISTORY (read-only, implemented)

| Tool | Returns |
|---|---|
| `read_history` | Closed sessions, newest first: date, duration, exercises, set count, volume, markers. Paginated (`limit`, `before`). |
| `read_exercise_history` | One exercise, chronological: every set (weight, reps, duration, effort marker), best load, best e1RM (Epley), per-session summary, days since. The raw material for progression. |
| `read_body_stats` | BodyLab mirror: profile + latest stored value per measurement type (raw values, no derived body fat or somatotype — the file is the owner's own snapshot, so it can be days old). |
| `explain_biomechanics` | **Two published topics only**: `calves` and `limb_lengths`. Anything else returns `status: not_covered` with `explanation: null` instead of a plausible wrong answer. |

### 4.2 STATE (read-only, implemented)

| Tool | Returns |
|---|---|
| `read_current_state` | Today's self-report, in-progress session (sets today, families worked, volume), gear inventory, goal + level + time budget, and **the slots the app is showing** (`todayPlan.source: 'app (…)'`). When the app has not published its plan yet, it falls back to a recomputation **labelled as such** (`'recomputed (…)'`) — the recomputation cannot see the BodyLab link, the day's sore list or the day focus, so it can differ from the screen, and `swap_exercise` is validated against the screen. |
| `read_recovery` | The recovery window: `doNotTrainToday` with evidence (family, hours since, sets, window), the readiness factor applied, and the rule stated. `readinessUsed` says whether the self-report came from the app's mirror or from the neutral 3/3/3. |
| `read_weekly_volume` | Sets per family in the last 7 days vs the published band for the level + goal (below / inside / above), plus what is uncovered. |
| `read_progression` | Per exercise: the deterministic verdict — `increase_load` / `repeat` / `escalate_variant` / `hold` / `deload_ready` — with the numbers and reasons it used, and the concrete variant when a load jump is impossible with the declared gear. |

### 4.3 ACTIONS (write; implemented 2026-10-09)

| MCP tool | Action(s) | Effect | Guards |
|---|---|---|---|
| `log_training_set` | `log_set` | Append a set to today's day: exercise, weight, reps **or** duration, **effort marker** (`D`/`F`), warm-up, note | Exercise must exist and be usable with the declared gear; weight ≤ the inventory's max load for that load type; reps 1–50 / duration 1–7200 s; notes ≤ 280; action ≤ 24 h old |
| `finish_session` | `finish_session` | Close today's session into HISTORY (then immutable) | `confirm: true` mandatory; there must be sets today; an already-closed day is refused |
| `set_readiness` | `set_readiness` | Today's energy / motivation / soreness | At least one field, integers 1–5 |
| `configure_training` | `set_goal`, `set_level`, `set_time_budget`, `set_inventory` (up to four, one receipt each) | The planning envelope | Enumerated goal/level; 10–300 min; inventory rows must use real presets or real capability keys |
| `swap_exercise` | `swap_exercise` | Swap one slot of today's plan | Slot must be in today's plan; same pattern **and** same load type; not already in session; gear-legal |
| `add_exercise` | `add_exercise` | **New (2026-10-13).** Append one exercise to today's session (a row of his own, not a re-plan) | Exercise must exist, be gear-legal, not already be in today's session, and today must not be closed; `sets` 0–12 (0 = no prescription); `position` `start`/`end`; undo `remove_row` |
| `set_day_focus` | `set_day_focus` | **New.** "Hoy toca abdomen": one of the app's own presets (`auto`/`push`/`pull`/`legs`/`core`) or an explicit family list | Key must be a real preset, or every element a real `MuscleFamily`; undo restores the previous focus |
| `set_week_override` | `set_week_override` | **New.** Author one day of his week (Semana): `rest: true`, `families: [...]` or `families: []` to clear it | `weekday` is the Monday-first index 0–6; families must exist; only his layer is written, never the generated plan; undo restores the previous map |
| `delete_session` | `delete_session` | **New, destructive.** Remove a closed session from the log (`delete_sets: true` takes its sets too) | `confirm: true` mandatory; the id must be in the log; undo is a full restore (`restore_session`) |
| `set_set_time` | `set_set_time` | **New.** Correct the hour of one set logged today | The set must be today's and the instant must fall on today (`occurred_at_not_today`); undo restores the previous hour. Past sets are untouchable |
| `reorder_today` | `reorder_row` | **New (2026-10-19).** Move one row of today's queue to a 1-based position — the drag of Entrenamiento | The exercise must still be in today's session; position 1…N; undo restores the previous `rowOrder` |
| `set_exercise_state` | `set_exercise_state` | **New.** `active` / `skipped` / `postponed` on one row, the same marks as the screen's buttons | The id must be in today's session; the plan keeps the prescription (no tool deletes a planned row); undo restores `sessionAside` |
| `reset_today_order` | `reset_order` | **New.** Back to the planner's own sequence | Refused with `no_custom_order` when today has no authored order; undo restores it |
| `swap_week_days` | `swap_week_days` | **New.** Swap two effective days of Semana (0 = Monday … 6 = Sunday) — the drag of the week | Indices 0-6, different days, and the pair must not already be identical (`week_days_unchanged`); undo restores `weekOverrides` |
| `read_receipts` | — | Read the app's receipts (by id or the newest N) | Read-only |

`log_training_set` also gained the optional `occurred_at` (same today-only rule), so a
batch applied late dates the work when it happened instead of when the file was read.

There is **no `start_session`**: the app opens a day implicitly with its first set, so a
request to "start" would be a fiction with nothing behind it. `apply_plan`, `add_measurement`
(BodyLab has no channel yet) and `snapshot_condition` are still **pending** — see §8.

Every action returns a receipt:
`{ id, type, origin, status: applied|rejected, detail: { en, es }, rule?, requestedAt,
appliedAt, undoToken? }`. A refusal always names the `rule` that fired **with the numbers**
(`weight_exceeds_inventory`, `pattern_mismatch`, `confirm_required`, …), so the coach can
tell the owner why instead of inventing a reason. `undoToken` is the action id: the audit
list in Ajustes keys its "Deshacer" on it.

## 5. The models the MCP exposes (never the model's own arithmetic)

| Model | Module | What it decides |
|---|---|---|
| Recovery window | `lib/recovery.ts` | Which families are recoverable today: 48 h after a real session (≥3 direct sets), 24 h after token work, scaled ×0.5 / ×1.5 by the owner's freshness report |
| Effort / set markers | `lib/effort.ts` (§8 D2, done) | `W` warm-up (excluded from volume), `D` near failure and `F` to failure, as recorded by the source badges; used to weight a set's fatigue cost and to decide whether a rep target was truly reached |
| Volume bands | `lib/volume-target.ts`, `core/training/plan.ts` | Sets per family per week by level, from the published band (12–20, Baz-Valle 2022) |
| Session builder | `core/training/session.ts` | Time-budgeted, gear-gated, pattern-unique, recovery-aware day |
| Proposal validator | `lib/llm.ts` | Gear, one family once, one pattern once, no fatigued family, time budget |
| Progression | `lib/progression.ts` (new) | Increase load when the rep target is met with margin **and** the gear can move; otherwise escalate along the movement's own progression axes (leverage → tempo → isometrics → range → volume) |
| Records | `lib/records.ts` | Epley e1RM, PR detection, identical to BodyLab's rounding |

## 6. Rules the surface obeys

1. **History is immutable in content** (§2). No tool edits a closed session or a set of a
   previous day; the single exception is `delete_session`, whole-session, confirmed and
   reversible.
2. **No invention.** A tool either computes from the log/catalog or refuses with a
   reason. `status: cannot_plan` beats a plausible template.
3. **The maths disposes.** A model's proposal is a *request*; `validateProposal` +
   `buildSession` decide.
4. **Every write is attributable and idempotent**: `origin`, `requestedAt`,
   idempotency key, receipt. Replaying a call never duplicates a set.
5. **Derived, not stored**: the recovery window, the plan and the progression verdict
   are computed on demand. Nothing derived is persisted as if it were a measurement.
6. **Refusals are data**: when a tool refuses, it says which rule fired, with the
   numbers, so the coach can explain it to the owner instead of hallucinating around it.

## 7. Brainstorm backlog (not implemented)

- `read_session_notes` / free-text coaching notes per session, attributed to the agent
  that wrote them.
- `ask_about_exercise(id, question)` grounded in `technique.ts` + `PATTERN_TECHNIQUE`.
- Deload detection: sustained e1RM decline + maxed markers + falling volume → propose a
  deload week with the evidence.
- Sleep/HRV/nutrition ingestion (BodyLab's `HealthRecord` already exists) so readiness
  stops being a 3-number self-report.
- Symmetry-profile-aware volume: body type and anthropometry → which families get the
  scarce weekly sets first.
- Recovery-speed calibration: compare the declared freshness with the actual return of
  performance and adjust the window per family, per user.
- Idempotent multi-agent sessions: an agent claims a session (`start_session`) so two
  agents cannot log into the same slot.
- Audit view in Ajustes: what did which agent change, with undo.
- Read-only SQLite/CSV mirror for heavy analysis (pending work, `docs/REDESIGN_STORM.md` §7.5).

## 8. Decisions — settled 2026-10-09, and what each one unblocks

- **D1 — Write transport: A, action files + two narrow Tauri commands. DONE.** The MCP
  writes `mcp-actions.json`; the app applies each action through its own reducers and
  answers in `mcp-results.json`. Loopback HTTP was rejected (no listening socket in a
  privacy-first app) and writing the backup mirror directly was rejected (it would move
  the source of truth out of the app and skip validation) — the old `log_training_set`
  did exactly that and was replaced.
  Files: `src-tauri/src/lib.rs` (`take_mcp_inbox`, `write_mcp_results`, `merge_receipts`),
  `lib/mcp-actions.ts` (parse → validate → receipt → undo, pure), `lib/mcp-bridge.ts`
  (the two `invoke` calls), `app/store.tsx` (1 s poll + focus, apply, ledger),
  `lib/db.ts` (`mcp-ledger` in the meta store), `screens/SettingsScreen.tsx` (audit +
  undo). Tests: `tests/training/test_mcp_actions.test.ts` (30 at the time, 55 since
  2026-10-13) + 2 Rust unit tests.
- **D2 — `D` means near failure** (1–2 reps in reserve), not drop set. **Done:** the badge
  is now the structured `TLSet.effort` (`lib/effort.ts`), read by recovery, progression and
  the MCP, with the legacy `notes` text kept as a fallback. A set taken near/at failure
  marks its family's session as a real one for the window on its own.
- **D3 — Variant mapping: an explicit `easierVariant` / `harderVariant` trait in the
  catalog** (not derived from levers). The progression verdict already names the axis;
  the catalog would name the concrete exercise. *Status: still pending — 2026-10-09
  delivered D1, D2 and D4; annotating the catalog (only the movements that really have a
  variant) is the next slice.*
- **D4 — Every local model may write, with a receipt and undo. DONE for the app side.**
  Each action carries `origin: mcp:<agent>` (`FITNESS_MCP_AGENT` names the agent);
  destructive ones require `confirm: true`; Ajustes → *Acciones de agentes* lists every
  receipt with its bilingual detail, the rule that refused it, the agent that asked, and a
  "Deshacer" button that survives restarts (the undo operation is persisted with the
  ledger). Undoing a `finish_session` reopens the day **keeping its sets** — a closed
  session's *sets* are never edited or deleted by any tool.
  *Amended 2026-10-13:* the owner asked for `delete_session`, so "never deleted" became
  "never edited: a whole session may be deleted with `confirm: true`, and its undo carries
  the session and its sets back". The unit of deletion is the session, never a set.

Still open from the previous round (handoff entry v): the grip/skin classification, decided
in direction (a catalog trait) but not yet approved movement by movement.

## 9. Sweep of 2026-10-09 (e) — the five defects, and what each fix buys

1. **The mirror went stale after a settings change.** `logSignature` fingerprinted
   `settings` as a *presence bit* (`settings ? "s" : "-"`), so `configure_training` (and
   the user's own Ajustes) applied in the app while `read_current_state` kept answering
   with the old goal, budget and inventory until the next set was logged. A model could
   not see the effect of its own action. **Fixed**: the signature now carries the plan's
   own inputs (goal, level, budget, level, inventory rows, week/rep overrides) plus the
   mirror, so anything that changes the plan rewrites the mirror — and nothing else does.
2. **The readiness was invisible to every read.** `read_recovery`,
   `read_training_stats`, `read_current_state` and `propose_training_session` planned
   against a 3/3/3 nobody had reported (the self-report lives in IndexedDB, and the
   mirror did not carry it). **Fixed**: the app publishes `mirror.readiness` (with its
   date) and the server uses it; a mirror from another day is refused so yesterday's
   energy never scales today's window. `readinessUsed` still says which one was used.
3. **The published plan was not the app's plan.** `read_current_state` recomputed a plan
   with inputs the mirror cannot carry (BodyLab link, sore list, day focus, and today's
   sets excluded from the rolling stats), so a model could be told `not_in_plan` about a
   slot the screen was showing (observed with `v-up`). **Fixed**: the app publishes its
   real rows (`mirror.plan`, swaps and coach rows included) and the tool prefers them;
   the recomputation stays as a labelled fallback.
4. **`explain_biomechanics` answered the calves lecture to any question.** The default
   branch was calves, so «me duele la rodilla al bajar» came back with Achilles
   insertions — a small model would read that as an answer. **Fixed**: two topics,
   matched by keyword, and `status: not_covered` with `explanation: null` otherwise,
   plus a description that says what it covers.
5. **`read_training_stats.totalVolumeKg` counted warm-ups** while every other aggregate
   excludes them by contract. **Fixed** to working sets.

Also corrected in this sweep, without a code change: the descriptions of
`read_body_stats` and `log_body_measurement` promised BodyLab data that these tools
cannot reach. **BodyLab still has no action channel** — `log_body_measurement` writes the
local analysis mirror (`.cache/bodylab-owner.json`), has no receipt and no undo, and does
**not** appear in the app. The tool now says so; the real fix is opening a BodyLab
channel (§8, pending).

Tests added with the fixes: `tests/training/test_mcp_server.test.ts` (16 at the time, 21
today: registry size and shape, both biomechanics branches, the refusals that never touch
the app, the action envelope, and the mirror readers with a fake clock) and new cases in
`tests/training/test_autobackup.test.ts` (settings, inventory, readiness and plan changes
move the signature; `buildBackup` writes the mirror; `parseBackup` drops it so a restore
never imports yesterday's self-report).

### Next slice, in order

1. **`undo_action` as an MCP tool.** Every applied receipt carries an `undoToken` and the
   app already knows how to undo (`undoMcpAction`, `canUndo`); a model that swaps or logs
   by mistake currently has to ask the human to tap *Deshacer*. A new action type (`undo`,
   guarded: same agent, own token, never a closed session) closes the loop without
   loosening anything.
2. **D3 — variant traits** (`easierVariant` / `harderVariant`).
3. `apply_plan` over `validateProposal`, and the BodyLab channel behind it.

## 10. 2026-10-13 — the surface reaches the plan (owner's order)

The owner asked for five more actions, and they landed as five tools on top of the eight
that existed: **`add_exercise`, `set_day_focus`, `set_week_override`, `delete_session`,
`set_set_time`** (22 tools at the time; **26 since §11**), plus the optional `occurred_at` on
`log_training_set`. What each one is and what guards it lives in §4.3; the interesting
part is *how* they were built:

- **Every new write goes through the same three promises** (validated, idempotent,
  reversible) and through the app's **own** store callbacks — `addExerciseToToday`,
  `setDayFocus`, `setWeekOverride`, `removeSession`, `setSetTime`. There is no second
  implementation of any rule on the MCP side.
- **The two vocabularies are now single-sourced.** The focus presets moved out of
  `screens/TodayScreen.tsx` into `lib/day-focus.ts` (`DAY_FOCUS_PRESETS`,
  `MUSCLE_FAMILIES`), so the Inicio chips and `set_day_focus` cannot drift: a model that
  sent `focus: "abdomen"` is refused with the list of real keys.
- **`add_exercise` adds a row; it does not re-plan.** The row is kept in its own state
  (`addedRows`) and merged last, before the user's own sequence — a re-plan cannot drop
  it, and a row the plan already schedules is never duplicated. `sets: 0` (no
  prescription) is the default, because a prescription nobody gave must not be read as
  an achievement.
- **`set_set_time` and `occurred_at` share one rule**: an instant that is not of
  *today* is refused (`occurred_at_not_today`) instead of quietly moving a set out of
  today's session, where no aggregate would see it again.
- **Undo, always.** `remove_row`, `day_focus`, `restore_session` and `set_time` joined
  the undo operations, and the audit list in Ajustes shows them like the rest.

The UI still has one gap this round exposed: the app's "Añadir ejercicio" button sends
the user to the library, which has no "add to today" affordance (screen 02 of
`docs/REDESIGN_STORM.md` owns that). The capability now exists in the store
(`addExerciseToToday`), so wiring that button is a small, separate change.

## 11. 2026-10-19 — the surface reaches the drags

The owner's instruction for this round was blunt: **anything a user can do in the interface
should be requestable by an agent.** The new mobile navigation and the two drag surfaces
created four operations that had no channel at all, so they landed first:

| Tool | Interface action it mirrors | Why it is safe |
|---|---|---|
| `reorder_today` | dragging a queue row by its grip | 1-based position, the id must still be in today's session, undo restores `rowOrder` |
| `set_exercise_state` | the row's skip / restore / postpone controls | marks only; never edits or deletes the prescription; undo restores `sessionAside` |
| `reset_today_order` | «Volver al orden del plan» | refuses when there is no custom order, so a receipt never claims a change that did not happen |
| `swap_week_days` | dragging one day onto another in Semana | Monday-first 0-6, effective plans, no-op refused, undo restores `weekOverrides` |

All four go through the same three promises as the rest of the channel: validated by
`validateMcpAction` against the app's own context, applied by the store's own callback
(`moveRow`, `skipRow`/`postponeRow`, `resetRowOrder`, `swapWeekDays`), and reversible from
Ajustes → Acciones de agentes. The week validator consumes the **effective days the screen
is showing** (`ctx.weekDays`), not a recomputation, for the same reason `swap_exercise` does:
a model must not be refused for a day the UI is displaying.

Verified in the root suite: `tests/training/test_mcp_actions.test.ts` (60 cases, including
the four new refusals) and `tests/training/test_mcp_server.test.ts` (26 tools, names and
schemas).

What was still missing after §11, in the owner's parity language — and where it landed:

- **`undo_action`** — done, §12. Every applied receipt carries `undoToken`, and now an
  agent can use it too, with three guards (own origin, still undoable, never a closed
  session).
- **Routines** — done, §12: `save_routine`, `apply_routine`, `delete_routine`.
- **Language, sound, reset model** — done, §12, plus `regenerate_week` (a UI verb §11 had
  listed as new but never wired).
- **Export/import** — still open, and deliberately so: an export is a *file the owner
  picks a destination for* (a save dialog), and an import replaces the whole database.
  Neither is expressible as an action with a receipt the app could honestly give, and a
  blind import is the one operation with no safe undo boundary. If a channel ever opens,
  it will be an export *the app writes to a path it chose*, never an import an agent can
  fire.
- **Browser preview selectors** — `data-testid` was added to the phone tabs, the queue and
  week grips, the ZEN weight/reps fields and the routine name. They make a Playwright or
  preview run fill fields and drag without guessing at Spanish copy; they are not a new
  transport and do not expose the app to the network. The inventory and the fast loop are
  now documented for the agent itself in `knowledge.md` («Fast browser QA»).

## 12. 2026-10-19 (second round) — parity: undo, routines, and the settings

The owner's rule from §11 kept going: *anything a user can do in the interface should be
requestable by an agent.* Eight tools closed the remaining list:

| Tool | Interface action it mirrors | Why it is safe |
|---|---|---|
| `undo_action` | the *Deshacer* button of Ajustes → Acciones de agentes | only the **same origin**'s own tokens, only entries still undoable (`canUndo`), and **never** `finish_session`/`delete_session` (opening or restoring HISTORY stays human); one undo closes the loop — an undo is not undoable |
| `save_routine` | the routine editor's *Guardar* | name/notes/items bounded by `ROUTINE_LIMITS`, out-of-range numbers **refused with the numbers** (never silently clamped), one entry per exercise, unknown ids refused; undo restores the whole previous list |
| `apply_routine` | «Usar hoy» on a routine card | each item goes through the store's own `addExerciseToToday`; rows already in today are skipped; if nothing can be added it is **refused** instead of reporting a no-op; undo removes exactly the rows it added |
| `delete_routine` | the card's delete | `confirm: true` mandatory; undo restores the full previous list |
| `set_language` | the language control in Ajustes | display-only; undo restores the previous language |
| `set_sound` | the sound controls in Ajustes | `enabled` / `volume` 0-1; undo restores the previous object |
| `reset_decision_model` | *Reiniciar modelo* in Ajustes | `confirm: true` mandatory; the undo carries the model **of that instant**, so a reset by mistake is recoverable while the receipt lives |
| `regenerate_week` | «Regenerar» in Semana | the owner's authored layer (`weekOverrides`) is untouched; undo restores the seed, so the exact previous week comes back |

Same three promises as everything else: validated by `validateMcpAction` against the app's
own context, applied by the store's own callbacks (`applyRoutineToday`, `resetModel`,
`regenerateWeek`, and the shared `applyUndoOp` — the agent's undo and the human's button
run the **same code path**, or the two would drift into two apps), and reversible from
Ajustes. The context advances for the stateful ones: a consumed `undo_token` cannot be
replayed inside the same batch (`undo_token_unknown`), an `apply_routine` adds its rows to
`plannedExerciseIds` for the next action to see, `reset_model` nulls the model and
`regenerate_week` bumps the seed.

Verified in the root suite: `tests/training/test_mcp_actions.test.ts` (the parity block:
own-token guard, HISTORY guard, double-undo in one batch, routine bounds/duplicates,
apply/undo of a routine, language/sound patches, model reset, seed restore) and
`tests/training/test_mcp_server.test.ts` (35 tools, names and schemas).

## 13. 2026-10-20 — the gear shelf, for an agent (`set_gear_profile`)

The owner asked for **one inventory per room** (home / gym) and then asked an agent to
configure his week from a place with no equipment. Those two requests meet in the same
place: the gear is what the planner prescribes from, so it has to be something a model can
read and switch — or the agent would have to rewrite the inventory and lose what he owns.

| Tool | Interface action it mirrors | Why it is safe |
|---|---|---|
| `set_gear_profile` | the chips above *Mi equipamiento* in Ajustes (2026-10-20) | the target must already exist on the shelf (`unknown_profile` otherwise — **never** an empty inventory, which would silently plan bodyweight work at the gym); the switch **parks** the live inventory under its name instead of discarding it; nothing logged, sequenced or authored is touched; undo restores items **and** shelf |

The shape this rests on is worth stating because it is what makes it small:
`settings.inventory` stays *the* live inventory — every existing consumer keeps reading it —
and a profile is only **a name for it plus the other setups parked on a shelf**
(`settings.gearProfiles`, with the live one deliberately *not* stored there). The pure model
is `traininglab/apps/desktop/src/lib/gear-profiles.ts`; the same sanitising read is mirrored
in the server (`gearShelfOf`) because the `.mjs` cannot import TypeScript.

Three refusals are the honest part, and all three are pinned by tests:

- `unknown_profile` — the model guessed a room nobody has been in;
- `no_gear_profiles` — there is only one setup; the detail says it is created in Ajustes, not
  here (an agent cannot name a room);
- `already_active` — re-sending the switch it already made gets *that* answer, not «no such
  profile» about the room it is standing in (found when the second action of a file was
  rejected with the wrong rule, 2026-10-20).

`read_current_state` gained `gear: { activeProfile, savedProfiles[] }` next to the inventory,
so the agent can say out loud which room it is planning for. Verified in
`tests/training/test_mcp_actions.test.ts` (switch by name and by id, undo of the whole shelf,
`rowOrder` untouched, the three refusals, context advancing inside one batch) and
`tests/training/test_gear_profiles.test.ts` (20 cases: the shelf invariant, round trip,
no-op on the active id, nothing lost when creating or switching).

/**
 * Progreso — am I improving, and where am I unbalanced?
 *
 * The mockups' information architecture (`docs/reference/traininglab-design/
 * 02-progreso.png`), fed only with data we actually have:
 *
 *   1. period selector + a four-tile KPI strip;
 *   2. **body analysis** — the schematic front/back figure painted with the volume
 *      you logged (`features/stats/BodyMap`), its legend, and the per-family list
 *      with the trend against the previous period. This is the signature section of
 *      the sketch and the part the earlier version of this screen was missing;
 *   3. the trend of the period, day by day;
 *   4. the split per family — effective / complementary / accessory sets, straight
 *      from the catalog's `MuscleInvolvement.intensity` (3 / 2 / 1);
 *   5. the records, with BodyLab's exported PRs merged in;
 *   6. the assistant's priorities, computed from the planner's own weakness map
 *      (no LLM required — the deterministic answer is the floor, and it is free).
 *
 * What is still deliberately **not** here: a percentile ("you are in the top 20 %
 * of lifters your age"). That needs cited normative data we have not validated
 * (`EXERCISE_DATA_AUDIT.md`), so the only comparison on this screen is you against
 * you, which is the one we can defend.
 *
 * @module screens/ProgressScreen
 */

import { useMemo, useState, type ReactNode } from "react";
import { Bike, CalendarDays, Dumbbell, Flame, Trophy } from "lucide-react";
import { familyLabel } from "../lib/format";
import { t, tInterp } from "../lib/i18n";
import { Badge, Chip, EmptyState, MetricTile } from "../ui/primitives";
import { IconLayers } from "../ui/icons";
import { useStore } from "../app/store";
import { BodyMap } from "../features/stats/BodyMap";
import ConditionCard from "../features/today/ConditionCard";
import { conditionProfile, heightMOf } from "../features/stats/condition";
import {
  goalProximity,
  resolveWaistCm,
  type FamilyGoal,
} from "../features/stats/goals";
import {
  consistency,
  dayBuckets,
  familyBalance,
  isoDay,
  topMarks,
  volumeByFamily,
  workingSets,
  type FamilyBalance,
} from "../features/stats/derive";

const PERIODS = [7, 30, 90] as const;

export default function ProgressScreen() {
  const { sets, payload, settings, patch } = useStore();
  const [days, setDays] = useState<(typeof PERIODS)[number]>(30);

  // The map's lens (2026-09-29 e): training stimulus by default, goal
  // proximity on demand. Both read the same period's log where relevant.
  const mapMode = settings?.bodyMapMode ?? "training";
  const goalSource = settings?.bodyMapGoalSource ?? "measures";
  const setMapMode = (mode: "training" | "goal") =>
    patch({ bodyMapMode: mode });
  const setGoalSource = (source: "measures" | "targets" | "golden") =>
    patch({ bodyMapGoalSource: source });

  const goals: Map<string, FamilyGoal> | null = useMemo(() => {
    if (mapMode !== "goal" || !settings) return null;
    return goalProximity({
      payload,
      targets: settings.goalTargets ?? {},
      waistCm: resolveWaistCm(payload, settings.waistCm ?? null),
      source: goalSource,
    }) as Map<string, FamilyGoal>;
  }, [mapMode, goalSource, payload, settings]);

  const goalsUnavailable = useMemo(() => {
    if (mapMode !== "goal") return null;
    if (goalSource === "measures" && !payload) {
      return t("progress.goal.noMeasures");
    }
    if (
      goalSource === "golden" &&
      resolveWaistCm(payload, settings?.waistCm ?? null) === null
    ) {
      return t("progress.goal.noWaist");
    }
    if (
      goalSource === "targets" &&
      Object.keys(settings?.goalTargets ?? {}).length === 0
    ) {
      return t("progress.goal.noTargets");
    }
    return null;
  }, [mapMode, goalSource, payload, settings]);

  // The condition lens (2026-09-30 owner direction): whole-body published-norm
  // read — you vs the average and the athletic band — independent of the map's
  // per-family lenses. Null axis = no data for it; never a fabricated band.
  const condition = useMemo(
    () => conditionProfile({ payload, heightM: heightMOf(payload) }),
    [payload],
  );

  const buckets = useMemo(() => dayBuckets(sets, days), [sets, days]);
  const families = useMemo(() => volumeByFamily(sets, days), [sets, days]);
  const balance = useMemo(() => familyBalance(sets, days), [sets, days]);
  const marks = useMemo(() => topMarks(sets, payload, 6), [sets, payload]);
  const stats = useMemo(
    () => consistency(sets, settings?.daysPerWeek ?? 4),
    [sets, settings?.daysPerWeek],
  );

  const periodSets = workingSets(sets).filter(
    (s) => s.timestamp.slice(0, 10) >= (buckets[0]?.date ?? ""),
  );
  const periodVolume = periodSets.reduce(
    (acc, s) => acc + (s.weight ?? 0) * (s.reps ?? 0),
    0,
  );
  const periodDays = new Set(periodSets.map((s) => s.timestamp.slice(0, 10)))
    .size;
  const peak = Math.max(1, ...buckets.map((b) => b.sets));
  const maxFamily = Math.max(1, ...families.map((f) => f.total));

  const hasData = workingSets(sets).length > 0;

  return (
    <>
      <header className="tl-topbar">
        <div className="tl-welcome">
          <h1>{t("nav.progress")}</h1>
          <p>{tInterp("progress.periodHint", { n: days })}</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Chip key={p} active={p === days} onClick={() => setDays(p)}>
              {tInterp("progress.days", { n: p })}
            </Chip>
          ))}
        </div>
      </header>

      {!hasData ? (
        <EmptyState
          icon={<Dumbbell size={28} />}
          title={t("progress.empty")}
          body={t("progress.emptyHint")}
        />
      ) : (
        <>
          {/* ── KPIs ─────────────────────────────────────────────────────── */}
          <section className="tl-metrics">
            <MetricTile
              icon={<Dumbbell className="w-4 h-4" />}
              label={t("progress.kpi.sets")}
              value={String(periodSets.length)}
              info={tInterp("progress.kpi.setsHint", { n: days })}
            />
            <MetricTile
              icon={<Bike className="w-4 h-4" />}
              label={t("progress.kpi.volume")}
              value={`${Math.round(periodVolume).toLocaleString()} kg`}
              info={t("progress.kpi.volumeHint")}
            />
            <MetricTile
              icon={<Flame className="w-4 h-4" />}
              label={t("progress.kpi.perSet")}
              value={
                periodSets.length > 0
                  ? `${Math.round(periodVolume / periodSets.length)} kg`
                  : "—"
              }
              info={t("progress.kpi.perSetHint")}
            />
            <MetricTile
              icon={<Trophy className="w-4 h-4" />}
              label={t("progress.kpi.days")}
              value={String(periodDays)}
              info={tInterp("progress.kpi.consistencyHint", { pct: stats.pct })}
            />
          </section>

          {/* ── Physical condition: you vs the published norms ───────────── */}
          <ConditionCard axes={condition.axes} mean={condition.mean} />

          {/* ── Body analysis: the figure, the legend, the families ──────── */}
          <section className="tl-card">
            <div className="tl-card-head">
              <div className="min-w-0">
                <h2>{t("progress.body.title")}</h2>
                <span>{t("progress.body.sub")}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="tl-pill is-accent">
                  {tInterp("progress.periodHint", { n: days })}
                </span>
                <Chip
                  active={mapMode === "training"}
                  onClick={() => setMapMode("training")}
                >
                  {t("progress.lens.training")}
                </Chip>
                <Chip
                  active={mapMode === "goal"}
                  onClick={() => setMapMode("goal")}
                >
                  {t("progress.lens.goal")}
                </Chip>
              </div>
            </div>
            <div className="tl-card-body">
              {mapMode === "goal" && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
                    {t("progress.goal.source")}
                  </span>
                  <Chip
                    active={goalSource === "measures"}
                    onClick={() => setGoalSource("measures")}
                  >
                    {t("progress.goal.measures")}
                  </Chip>
                  <Chip
                    active={goalSource === "targets"}
                    onClick={() => setGoalSource("targets")}
                  >
                    {t("progress.goal.targets")}
                  </Chip>
                  <Chip
                    active={goalSource === "golden"}
                    onClick={() => setGoalSource("golden")}
                  >
                    {t("progress.goal.golden")}
                  </Chip>
                </div>
              )}
              <div className="tl-analysis">
                <BodyMap
                  balance={balance}
                  label={t("progress.body.mapLabel")}
                  mode={mapMode}
                  goals={goals}
                  goalsUnavailable={goalsUnavailable}
                />

                <div className="min-w-0">
                  <p className="text-xs text-[var(--tl-text-secondary)] mb-3">
                    {t("progress.body.summary")}
                  </p>

                  {balance.length === 0 ? (
                    <p className="text-sm text-[var(--tl-text-muted)]">
                      {t("progress.body.empty")}
                    </p>
                  ) : (
                    <div className="tl-rows">
                      {balance.map((row) => (
                        <FamilyRow key={row.family} row={row} />
                      ))}
                    </div>
                  )}

                  <p className="text-[11px] text-[var(--tl-text-muted)] mt-3 leading-relaxed">
                    {mapMode === "goal"
                      ? t("progress.body.goalHint")
                      : t("progress.body.indexHint")}
                  </p>
                  <p className="text-[11px] text-[var(--tl-text-muted)] mt-1.5 leading-relaxed">
                    {t("progress.body.schematic")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <div className="tl-dash">
            <div className="tl-col">
              {/* ── Trend ────────────────────────────────────────────────── */}
              <section className="tl-card">
                <div className="tl-card-head">
                  <h2>{t("progress.trend")}</h2>
                  <span className="tabular-nums">
                    {buckets[0]?.date} → {isoDay(new Date())}
                  </span>
                </div>
                <div className="tl-card-body">
                  {/* Bars, not a line: sets per day are counts, and a line would
                      imply a value between the days that does not exist. */}
                  <div className="tl-chart">
                    {buckets.map((b) => (
                      <span
                        key={b.date}
                        title={`${b.date}: ${b.sets}`}
                        className={b.sets > 0 ? "is-live" : "is-empty"}
                        style={{
                          height: `${Math.max(4, (b.sets / peak) * 100)}%`,
                        }}
                      />
                    ))}
                  </div>
                  <div className="tl-chart-axis">
                    <span>{buckets[0]?.date}</span>
                    <span>{tInterp("progress.peak", { n: peak })}</span>
                  </div>
                </div>
              </section>

              {/* ── Split per family ─────────────────────────────────────── */}
              <section className="tl-card">
                <div className="tl-card-head">
                  <div className="min-w-0">
                    <h2>{t("progress.detail.title")}</h2>
                    <span>{t("progress.heat.hint")}</span>
                  </div>
                  <span className="text-[11px] text-[var(--tl-text-muted)] text-right max-w-[10rem]">
                    {t("progress.heat.scale")}
                  </span>
                </div>
                <div className="tl-card-body">
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {families.map((f) => (
                      <div
                        key={f.family}
                        className="tl-fact"
                        style={{
                          background: `color-mix(in oklab, var(--tl-accent) ${
                            6 + Math.round((f.total / maxFamily) * 34)
                          }%, var(--tl-surface-2))`,
                        }}
                      >
                        <div className="text-sm font-semibold truncate">
                          {familyLabel(f.family)}
                        </div>
                        <div className="tl-fact-value">{f.total}</div>
                        <div className="flex gap-1 mt-1.5" aria-hidden>
                          <Seg n={f.effective} tone="var(--tl-accent)" />
                          <Seg n={f.complementary} tone="var(--tl-warning)" />
                          <Seg n={f.accessory} tone="var(--tl-text-muted)" />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-4 text-[11px] text-[var(--tl-text-secondary)]">
                    <Legend tone="var(--tl-accent)">
                      {t("progress.heat.effective")}
                    </Legend>
                    <Legend tone="var(--tl-warning)">
                      {t("progress.heat.complementary")}
                    </Legend>
                    <Legend tone="var(--tl-text-muted)">
                      {t("progress.heat.accessory")}
                    </Legend>
                  </div>
                </div>
              </section>

              {/* ── Records ──────────────────────────────────────────────── */}
              <section className="tl-card">
                <div className="tl-card-head">
                  <h2>{t("progress.marks.title")}</h2>
                  <Badge tone="neutral">
                    {tInterp("progress.marks.count", { n: marks.length })}
                  </Badge>
                </div>
                <div className="tl-card-body">
                  {marks.length === 0 ? (
                    <p className="text-sm text-[var(--tl-text-muted)]">
                      {t("progress.marks.empty")}
                    </p>
                  ) : (
                    <div className="tl-rows">
                      {marks.map((mark) => (
                        <div key={mark.exerciseId} className="tl-row">
                          <span className="tl-row-name">
                            {mark.name}
                            <span className="tl-row-sub">
                              {mark.date || t("progress.marks.fromBodyLab")}
                            </span>
                          </span>
                          <span className="tl-row-value">
                            {mark.bestWeightKg} kg × {mark.reps}
                            <span className="tl-row-sub">
                              ~{mark.est1Rm} kg 1RM
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* ── Assistant ──────────────────────────────────────────────── */}
            <aside className="tl-col">
              <AssistantCard />
              <BalanceCard balance={balance} />
            </aside>
          </div>
        </>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   One family, one row: index, trend against the previous period
   ══════════════════════════════════════════════════════════════════════════ */

function FamilyRow({ row }: { row: FamilyBalance }) {
  const trendClass =
    row.trend === "up"
      ? "tl-trend-up"
      : row.trend === "down"
        ? "tl-trend-down"
        : "tl-trend-flat";
  const title =
    row.trend === "up"
      ? t("progress.body.trendUp")
      : row.trend === "down"
        ? t("progress.body.trendDown")
        : t("progress.body.trendFlat");

  return (
    <div className="tl-muscle-row">
      <span className="tl-muscle-name">{familyLabel(row.family)}</span>
      <span className="tl-muscle-score tabular-nums">{row.index}%</span>
      <span
        className={`${trendClass} text-center text-sm`}
        title={`${title} (${row.previousStimulus.toFixed(1)} → ${row.stimulus.toFixed(1)} ESE)`}
      >
        {row.trend === "up" ? "↑" : row.trend === "down" ? "↓" : "—"}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Balance — the two ends of the same list, as a sentence
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * "Most trained / least trained" is the one-line version of the figure. It reads
 * the *same* `familyBalance` array the map is painted from, so the sentence and
 * the colours cannot disagree.
 */
function BalanceCard({ balance }: { balance: FamilyBalance[] }) {
  if (balance.length < 2) return null;
  const most = balance[0]!;
  const least = balance[balance.length - 1]!;

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("progress.balance.title")}</h2>
        <CalendarDays className="w-4 h-4 text-[var(--tl-text-muted)]" />
      </div>
      <div className="tl-card-body flex flex-col gap-3">
        <BalanceLine
          tone="var(--tl-success)"
          label={t("progress.balance.most")}
          family={familyLabel(most.family)}
          value={tInterp("progress.body.equivalentSets", {
            n: most.stimulus.toFixed(1),
          })}
        />
        <BalanceLine
          tone="var(--tl-danger)"
          label={t("progress.balance.least")}
          family={familyLabel(least.family)}
          value={tInterp("progress.body.equivalentSets", {
            n: least.stimulus.toFixed(1),
          })}
        />
        <p className="text-[11px] text-[var(--tl-text-muted)] leading-relaxed">
          {t("progress.balance.hint")}
        </p>
      </div>
    </section>
  );
}

function BalanceLine({
  tone,
  label,
  family,
  value,
}: {
  tone: string;
  label: string;
  family: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        className="w-2.5 h-2.5 rounded-full shrink-0"
        style={{ background: tone }}
        aria-hidden
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] text-[var(--tl-text-muted)]">
          {label}
        </span>
        <span className="block text-sm font-semibold truncate">{family}</span>
      </span>
      <span className="text-xs text-[var(--tl-text-secondary)] tabular-nums">
        {value}
      </span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Assistant — deterministic priorities, straight from the planner
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * The three priorities come from the planner's own weakness map, so this card
 * cannot recommend something the plan is not already doing. The optional local
 * LLM adds a *reordering* on top; it never replaces this floor.
 */
function AssistantCard() {
  const { plan, sets, payload } = useStore();

  const priorities = useMemo(() => {
    if (!plan) return [];
    return Object.entries(plan.weakness)
      .sort((a, b) => (a[1] as number) - (b[1] as number))
      .slice(0, 3);
  }, [plan]);

  const weekly = useMemo(() => volumeByFamily(sets, 7), [sets]);

  return (
    <section className="tl-card">
      <div className="tl-card-head">
        <h2>{t("progress.assistant.title")}</h2>
        <Badge tone="accent">{t("home.badge.zen")}</Badge>
      </div>
      <div className="tl-card-body">
        {priorities.length === 0 ? (
          <p className="text-sm text-[var(--tl-text-muted)]">
            {t("progress.assistant.empty")}
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {priorities.map(([family, score]) => {
              const done = weekly.find((f) => f.family === family)?.total ?? 0;
              return (
                <li key={family} className="flex gap-3">
                  <IconLayers
                    size={16}
                    className="mt-0.5 text-[var(--tl-accent)] shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">
                      {tInterp("progress.assistant.priority", {
                        family: familyLabel(family),
                      })}
                    </p>
                    <p className="text-xs text-[var(--tl-text-secondary)] mt-0.5">
                      {tInterp("progress.assistant.detail", {
                        sets: done,
                        score: Math.round(score as number),
                      })}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-[11px] text-[var(--tl-text-muted)] mt-3 leading-relaxed">
          {payload
            ? t("progress.assistant.withBodyLab")
            : t("progress.assistant.withoutBodyLab")}
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Small pieces
   ══════════════════════════════════════════════════════════════════════════ */

/** One proportional segment of a family's split. */
function Seg({ n, tone }: { n: number; tone: string }) {
  if (n === 0) return null;
  return (
    <span
      className="h-1.5 rounded-full"
      style={{ background: tone, width: `${Math.min(100, n * 8)}%` }}
    />
  );
}

function Legend({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="w-2.5 h-2.5 rounded-sm"
        style={{ background: tone }}
        aria-hidden
      />
      {children}
    </span>
  );
}

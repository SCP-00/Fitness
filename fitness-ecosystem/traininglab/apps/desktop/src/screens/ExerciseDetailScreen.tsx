/**
 * Ficha de ejercicio — `Guía · Resumen · Rango · Historial`.
 *
 * Three of the four tabs are already fed by the core catalog, and this screen's
 * job is to render them without inventing anything:
 *
 *   * **Guía**     ← `technique.ts`: setup, execution, mistakes, safety, breathing,
 *                    tempo and the RIR target, per *movement pattern*, plus the
 *                    variant-specific cues when they exist.
 *   * **Resumen**  ← `catalog.ts` + `traits.ts`: muscles with their role,
 *                    equipment, load type, progression levers and joint load.
 *   * **Historial** ← `exerciseHistory()` over TrainingLab's own logged sets: one
 *                    block per training day, heaviest first, warm-ups flagged
 *                    and excluded from volume. Real data or an honest empty
 *                    state — never a placeholder.
 *   * **Rango**    ← nothing yet. It is disabled with the reason written on it
 *                    rather than hidden or faked (`TRAININGLAB_UI_PLAN.md` §9).
 *
 * @module screens/ExerciseDetailScreen
 */

import { useMemo, useState } from "react";
import { marksOf } from "../lib/records";
import { exerciseHistory, type HistoryDay } from "../features/stats/derive";
import {
  getExerciseById,
  getExerciseTechnique,
  getIntensityLabel,
  jointStressLabel,
  type Cue,
} from "@fitness/bodylab-exercises";
import { getTraits } from "@fitness/bodylab-exercises";
import { muscleFamilyOf } from "@fitness/bodylab-training";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { categoryLabel, familyLabel, muscleLabel } from "../lib/format";
import { ExerciseThumbLarge } from "../features/exercises/ExerciseThumb";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  SectionCard,
  TabStrip,
} from "../ui/primitives";
import { IconBack, IconInfo, IconLayers } from "../ui/icons";
import { navigate } from "../app/router";
import { useStore } from "../app/store";

/** Progression levers in the user's words (see `traits.ts`). */
const PROGRESSION_LABEL: Record<string, string> = {
  load: "carga",
  reps: "repeticiones",
  leverage: "palanca",
  time: "tiempo",
  tempo: "tempo",
  range: "rango",
  volume: "volumen",
};

/** Axial load, in the user's words. Three is "be careful with your back today". */
const SPINE_LABEL: Record<number, string> = {
  1: "Carga axial baja",
  2: "Carga axial media",
  3: "Carga axial alta",
};

type TabId = "guide" | "summary" | "rank" | "history";

export default function ExerciseDetailScreen({
  exerciseId,
  tab: initialTab = "guide",
}: {
  exerciseId: string;
  tab?: string;
}) {
  const [tab, setTab] = useState<TabId>(
    (["guide", "summary", "rank", "history"] as const).includes(
      initialTab as TabId,
    )
      ? (initialTab as TabId)
      : "guide",
  );

  const exercise = useMemo(() => getExerciseById(exerciseId), [exerciseId]);
  const technique = useMemo(
    () => getExerciseTechnique(exerciseId),
    [exerciseId],
  );
  const traits = useMemo(() => getTraits(exerciseId), [exerciseId]);
  const lang = getLanguage();

  if (!exercise) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <EmptyState
          icon={<IconInfo size={28} />}
          title={t("ex.missing")}
          body={t("ex.missingHint")}
          action={
            <Button variant="primary" onClick={() => navigate("exercises")}>
              {t("ex.back")}
            </Button>
          }
        />
      </div>
    );
  }

  const cue = (c: Cue) => c[lang] ?? c.en;
  const families = [
    ...new Set(exercise.muscles.map((m) => muscleFamilyOf(m.muscle))),
  ];

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      <button
        type="button"
        onClick={() => navigate("exercises")}
        className="self-start inline-flex items-center gap-1.5 text-sm text-[var(--tl-text-secondary)] hover:text-[var(--tl-text)] tl-focusable rounded-lg px-1 py-1"
      >
        <IconBack size={16} />
        {t("ex.back")}
      </button>

      <ExerciseThumbLarge
        label={familyLabel(families[0] ?? "core")}
        alt={exercise.name[lang] ?? exercise.name.en}
      />

      <div>
        <h1 className="text-2xl font-bold leading-tight">
          {exercise.name[lang] ?? exercise.name.en}
        </h1>
        <p className="text-sm text-[var(--tl-text-secondary)] mt-1">
          {families.map((f) => familyLabel(f)).join(" · ")}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          <Badge tone="neutral">{categoryLabel(exercise.category)}</Badge>
          <Badge tone="neutral">
            {exercise.equipment[lang] ?? exercise.equipment.en}
          </Badge>
          {technique && (
            <Badge tone="accent">
              {t("ex.level")} {exercise.difficulty}/5
            </Badge>
          )}
          {traits?.unilateral && (
            <Badge tone="info">{t("ex.unilateral")}</Badge>
          )}
        </div>
      </div>

      <TabStrip
        active={tab}
        onChange={(id) => setTab(id as TabId)}
        tabs={[
          { id: "guide", label: t("ex.tab.guide") },
          { id: "summary", label: t("ex.tab.summary") },
          {
            id: "rank",
            label: t("ex.tab.rank"),
            disabled: true,
            title: t("ex.rankLockedWhy"),
          },
          { id: "history", label: t("ex.tab.history") },
        ]}
      />

      {tab === "guide" && technique && (
        <GuideTab exerciseId={exerciseId} technique={technique} cue={cue} />
      )}

      {tab === "summary" && (
        <SummaryTab exerciseId={exerciseId} muscles={exercise.muscles} />
      )}

      {tab === "rank" && (
        <Card padded={false} className="p-5">
          <div className="flex items-start gap-3">
            <IconLayers
              size={20}
              className="text-[var(--tl-text-muted)] mt-0.5"
            />
            <div>
              <p className="font-semibold">{t("ex.rank.title")}</p>
              <p className="text-sm text-[var(--tl-text-secondary)] mt-1">
                {t("ex.rank.body")}
              </p>
            </div>
          </div>
        </Card>
      )}

      {tab === "history" && <HistoryTab exerciseId={exerciseId} />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Guía
   ══════════════════════════════════════════════════════════════════════════ */

function GuideTab({
  exerciseId,
  technique,
  cue,
}: {
  exerciseId: string;
  technique: NonNullable<ReturnType<typeof getExerciseTechnique>>;
  cue: (c: Cue) => string;
}) {
  return (
    <>
      {/* The three lines people actually read while standing at the rack. */}
      <Card>
        <p className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)] mb-2">
          {t("ex.guide.quick")}
        </p>
        <ol className="space-y-2">
          {technique.setup.slice(0, 3).map((step, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 w-6 h-6 rounded-lg bg-[var(--tl-surface-2)] border border-[var(--tl-border)] text-[var(--tl-accent)] font-bold text-xs flex items-center justify-center">
                {i + 1}
              </span>
              <span className="text-[var(--tl-text-secondary)]">
                {cue(step)}
              </span>
            </li>
          ))}
        </ol>
      </Card>

      <SectionCard
        title={t("ex.guide.setup")}
        icon={<IconInfo size={16} />}
        defaultOpen={false}
      >
        <CueList items={technique.setup} cue={cue} />
      </SectionCard>

      <SectionCard
        title={t("ex.guide.execution")}
        icon={<IconInfo size={16} />}
        defaultOpen={false}
      >
        <CueList items={technique.execution} cue={cue} />
      </SectionCard>

      <SectionCard
        title={t("ex.guide.mistakes")}
        hint={t("ex.guide.mistakesHint")}
        icon={<IconInfo size={16} />}
        defaultOpen={false}
      >
        <CueList items={technique.mistakes} cue={cue} />
      </SectionCard>

      <SectionCard
        title={t("ex.guide.safety")}
        icon={<IconInfo size={16} />}
        defaultOpen={false}
      >
        <CueList items={technique.safety} cue={cue} />
      </SectionCard>

      <SectionCard
        title={t("ex.guide.breathing")}
        icon={<IconInfo size={16} />}
        defaultOpen={false}
      >
        <p className="text-sm text-[var(--tl-text-secondary)]">
          {cue(technique.breathing)}
        </p>
      </SectionCard>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Fact label={t("ex.guide.tempo")} value={technique.tempo} />
          <Fact
            label={t("ex.guide.effort")}
            value={`RIR ${technique.effort.rir}`}
          />
          <Fact
            label={t("ex.techniqueLevel")}
            value={`${technique.techniqueLevel}/5`}
          />
        </div>
        <p className="text-xs text-[var(--tl-text-muted)] mt-3">
          {cue(technique.techniqueWhy)}
        </p>
        <p className="text-xs text-[var(--tl-text-muted)] mt-2">
          {cue(technique.effort.note)}
        </p>
        {technique.hasVariantCues && (
          <p className="text-xs text-[var(--tl-accent)] mt-3">
            {t("ex.guide.variant")}
          </p>
        )}
      </Card>

      <p className="text-[11px] text-[var(--tl-text-muted)] text-center">
        {t("ex.guide.provenance")} · {exerciseId} · {technique.pattern}
      </p>
    </>
  );
}

function CueList({ items, cue }: { items: Cue[]; cue: (c: Cue) => string }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--tl-text-muted)]">{t("ex.noCues")}</p>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li
          key={i}
          className="flex gap-2 text-sm text-[var(--tl-text-secondary)]"
        >
          <span className="text-[var(--tl-accent)] shrink-0">•</span>
          <span>{cue(item)}</span>
        </li>
      ))}
    </ul>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Resumen
   ══════════════════════════════════════════════════════════════════════════ */

function SummaryTab({
  exerciseId,
  muscles,
}: {
  exerciseId: string;
  muscles: { muscle: string; intensity: 1 | 2 | 3 }[];
}) {
  const exercise = getExerciseById(exerciseId)!;
  const traits = getTraits(exerciseId);
  const lang = getLanguage();
  const ordered = [...muscles].sort((a, b) => b.intensity - a.intensity);

  return (
    <>
      <Card>
        <p className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)] mb-3">
          {t("ex.summary.muscles")}
        </p>
        <ul className="space-y-2">
          {ordered.map((m) => (
            <li key={m.muscle} className="flex items-center gap-3 text-sm">
              <span className="w-24 shrink-0">
                <Badge
                  tone={
                    m.intensity === 3
                      ? "accent"
                      : m.intensity === 2
                        ? "neutral"
                        : "neutral"
                  }
                >
                  {getIntensityLabel(m.intensity, lang)}
                </Badge>
              </span>
              <span className="text-[var(--tl-text-secondary)]">
                {muscleLabel(m.muscle)}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <p className="text-sm text-[var(--tl-text-secondary)]">
          {exercise.description[lang] ?? exercise.description.en}
        </p>
        {exercise.hypertrophyNote && (
          <p className="text-xs text-[var(--tl-text-muted)] mt-2">
            {exercise.hypertrophyNote[lang] ?? exercise.hypertrophyNote.en}
          </p>
        )}
      </Card>

      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Fact
            label={t("ex.summary.equipment")}
            value={exercise.equipment[lang] ?? exercise.equipment.en}
          />
          <Fact
            label={t("ex.guide.effort")}
            value={`${exercise.hypertrophy}/5`}
          />
          {traits && (
            <>
              <Fact
                label={t("ex.summary.joint")}
                value={jointStressLabel(traits.jointStress, lang)}
              />
              <Fact
                label={t("ex.summary.spine")}
                value={SPINE_LABEL[traits.spineLoad]}
              />
            </>
          )}
        </div>
        {traits && traits.progression.length > 0 && (
          <div className="mt-3">
            <p className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
              {t("ex.summary.progression")}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {traits.progression.map((axis) => (
                <Badge key={axis} tone="neutral">
                  {PROGRESSION_LABEL[axis] ?? axis}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </Card>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Small pieces
   ══════════════════════════════════════════════════════════════════════════ */

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide text-[var(--tl-text-muted)]">
        {label}
      </div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Historial
   ══════════════════════════════════════════════════════════════════════════ */

/** `1234,5 kg` in Spanish, `1234.5 kg` in English — storage stays kg. */
function kg(n: number): string {
  const lang = getLanguage();
  const formatted = new Intl.NumberFormat(lang === "es" ? "es-ES" : "en-US", {
    maximumFractionDigits: 1,
  }).format(n);
  return `${formatted} kg`;
}

function formatDayDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  if (!y || !m || !d) return date;
  const lang = getLanguage();
  return new Date(y, m - 1, d).toLocaleDateString(lang === "es" ? "es-ES" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * The logged history of this exercise, one block per training day.
 *
 * Warm-up sets are shown (they are real work) but struck through as warm-ups and
 * excluded from the day's tonnage; a `D`/`F` note from an imported log is kept as
 * a chip instead of being dropped, because losing it would rewrite the owner's
 * history. The estimated 1RM is labelled as an estimate — it is Epley, and only
 * shown when there is a real load with reps.
 */
function HistoryTab({ exerciseId }: { exerciseId: string }) {
  const { sets } = useStore();
  const history = useMemo(() => exerciseHistory(sets, exerciseId), [sets, exerciseId]);
  // All-time marks over **every** logged set, not just the days rendered below:
  // a "best ever" that silently forgot older sessions would be a lie.
  const marks = useMemo(
    () =>
      marksOf(sets.filter((s) => s.exerciseId === exerciseId && s.warmup !== true)),
    [sets, exerciseId],
  );

  if (history.totalDays === 0) {
    return (
      <EmptyState
        icon={<IconInfo size={28} />}
        title={t("ex.history.empty")}
        body={t("ex.history.emptyHint")}
      />
    );
  }

  const hiddenDays = history.totalDays - history.days.length;

  return (
    <div className="flex flex-col gap-3" data-testid="exercise-history">
      <Card>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span className="text-[var(--tl-text-secondary)]">
            {tInterp("ex.history.days", { n: history.totalDays })}
          </span>
          <span className="text-[var(--tl-text-secondary)]">
            {tInterp("ex.history.sets", { n: history.totalWorkingSets })}
          </span>
          <span className="text-[var(--tl-text-secondary)]">
            {tInterp("ex.history.volume", { kg: kg(history.totalVolumeKg) })}
          </span>
        </div>
        {marks.bestWeightKg !== null && (
          <p className="text-sm mt-2">
            <span className="font-semibold">{t("ex.history.best")}</span>{" "}
            {kg(marks.bestWeightKg)}
            {marks.bestEst1RmKg !== null && (
              <span className="text-[var(--tl-text-secondary)]">
                {" · "}
                {tInterp("ex.history.e1rm", { kg: kg(marks.bestEst1RmKg) })}
              </span>
            )}
          </p>
        )}
      </Card>

      {history.days.map((day) => (
        <HistoryDayCard key={day.date} day={day} />
      ))}

      {hiddenDays > 0 && (
        <p className="text-xs text-[var(--tl-text-muted)]">
          {tInterp("ex.history.more", { n: hiddenDays })}
        </p>
      )}
    </div>
  );
}

function HistoryDayCard({ day }: { day: HistoryDay }) {
  return (
    <Card>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-semibold text-sm">{formatDayDate(day.date)}</p>
        <p className="text-xs text-[var(--tl-text-secondary)]">
          {day.volumeKg > 0
            ? tInterp("ex.history.dayVolume", {
                n: day.workingSets,
                kg: kg(day.volumeKg),
              })
            : tInterp("ex.history.daySets", { n: day.workingSets })}
        </p>
      </div>
      <ul className="mt-2 flex flex-col gap-1">
        {day.sets.map((set) => (
          <li
            key={set.id}
            className="flex flex-wrap items-center gap-2 text-sm"
            data-testid="history-set"
          >
            <span className={set.warmup ? "text-[var(--tl-text-muted)] line-through" : ""}>
              {set.weight !== null
                ? tInterp("ex.history.setLoad", {
                    kg: kg(set.weight),
                    reps: set.reps ?? 0,
                  })
                : set.durationSec !== null
                  ? tInterp("ex.history.setTime", { sec: set.durationSec })
                  : t("ex.history.setBodyweight")}
            </span>
            {set.warmup && <Badge tone="neutral">{t("ex.history.warmup")}</Badge>}
            {!set.warmup && set.notes && <Badge tone="info">{set.notes}</Badge>}
          </li>
        ))}
      </ul>
    </Card>
  );
}

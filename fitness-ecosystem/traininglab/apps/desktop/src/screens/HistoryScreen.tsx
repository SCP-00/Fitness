/**
 * Historial — what has already been trained, newest first, and the two things
 * you can do to a closed session: rename it (and say where it happened) or
 * delete it.
 *
 * The third destination of the mockup's rail and the first one that never
 * existed in the old front: it opens the record the log has been building since
 * the first imported Symmetry session. What it shows is exactly what the owner's
 * own log supports — and nothing else:
 *
 *   * one card per **closed** session (see `closedSessionHistory` for the rule
 *     and why today's open session is not here);
 *   * date, name when the source gave one, provenance and place;
 *   * working sets, warm-up sets, exercises and volume (`weight × reps` over
 *     working sets — warm-ups never inflate it);
 *   * the session's effort marks (`D` near failure, `F` to failure, `W` for the
 *     ramp), because they are how the owner reads his own hard days;
 *   * a **duration only when a source supports it**. An imported date-only sheet
 *     leaves `durationMin: null` and the tile simply does not render, which is
 *     the whole point of the `MINUTES_TRUSTWORTHY` rule in `derive.ts`.
 *
 * **Edit and delete (2026-10-21).** The store has been able to delete a session
 * since 2026-10-08, but no screen offered it: deleting your own history from a
 * list is the one action that must not be casual. So:
 *
 *   * the confirmation states the **numbers that disappear** (sets, working
 *     volume, warm-ups), computed from the sets themselves by
 *     `lib/session-delete.ts` — never from a guess;
 *   * the sets go **with** the session, because a session-less set would keep
 *     counting in volumes and PRs while becoming invisible here;
 *   * deletion is followed by a 20-second **Deshacer** that restores the record
 *     and its sets through `restoreSession` — the same lane the agent's
 *     `restore_session` undo uses, so human and agent cannot diverge;
 *   * editing touches only what the log actually stores as free text: the name
 *     and the place. Reps, loads and times are the record, not a form.
 *
 * Reading order and numbers come from the same function the MCP's `read_history`
 * mirrors, so the screen and an agent cannot disagree about what a session was.
 *
 * @module screens/HistoryScreen
 */

import { useEffect, useMemo, useState } from "react";
import { Clock, Layers, Pencil, Trash2, Trophy, Undo2 } from "lucide-react";
import { t, tInterp, getLanguage } from "../lib/i18n";
import { EFFORT_MARKERS, EFFORT_MEANING } from "../lib/effort";
import { exerciseName } from "../lib/plan";
import { Badge, Chip, EmptyState, SectionCard } from "../ui/primitives";
import { useStore } from "../app/store";
import {
  closedSessionHistory,
  type SessionHistoryEntry,
} from "../features/stats/derive";
import { sessionDeletePlan } from "../lib/session-delete";
import type { TLSet, TLSession } from "../lib/types";

/** How long «Deshacer» stays available after a deletion. */
const UNDO_MS = 20_000;

export default function HistoryScreen() {
  const {
    sessions,
    sets,
    loading,
    removeSession,
    restoreSession,
    editSession,
  } = useStore();
  const lang = getLanguage();

  const { entries, total } = useMemo(
    () => closedSessionHistory(sessions, sets),
    [sessions, sets],
  );

  /** The session that can still be brought back, with the sets it took. */
  const [undo, setUndo] = useState<{
    session: TLSession;
    sets: TLSet[];
    expiresAt: number;
  } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!undo) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [undo]);

  const secondsLeft = undo
    ? Math.max(0, Math.ceil((undo.expiresAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (undo && secondsLeft <= 0) setUndo(null);
  }, [undo, secondsLeft]);

  if (loading) return <div className="tl-loading">{t("common.loading")}</div>;

  const totalSets = entries.reduce((sum, e) => sum + e.workingSets, 0);
  const totalVolume = entries.reduce((sum, e) => sum + e.volumeKg, 0);
  const shown = entries.length;

  /** Delete one session, remembering exactly what it took for the undo. */
  const deleteSession = (session: TLSession) => {
    const plan = sessionDeletePlan(session, sets);
    const removed = new Set(plan.setIds);
    const removedSets = sets.filter((row) => removed.has(row.id));
    removeSession(session.id, { deleteSets: true });
    setUndo({
      session,
      sets: removedSets,
      expiresAt: Date.now() + UNDO_MS,
    });
  };

  return (
    <div className="tl-page">
      <header className="tl-topbar">
        <div className="tl-welcome">
          <h1>{t("nav.history")}</h1>
          <p>
            {total === 0
              ? t("hist.pageHintEmpty")
              : tInterp("hist.pageHint", { n: total })}
          </p>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-2">
            <span className="tl-pill" title={t("hist.pillSetsHint")}>
              <Layers className="w-3.5 h-3.5" aria-hidden />
              {tInterp("hist.pillSets", { n: totalSets })}
            </span>
            <span className="tl-pill" title={t("hist.pillVolumeHint")}>
              <Trophy className="w-3.5 h-3.5" aria-hidden />
              {tInterp("hist.pillVolume", { kg: formatKg(totalVolume, lang) })}
            </span>
          </div>
        )}
      </header>

      {undo && (
        <div
          role="status"
          aria-live="polite"
          className="tl-card p-3 mb-3 flex items-center gap-3 flex-wrap border border-[var(--tl-accent)]/40"
        >
          <Undo2 className="w-4 h-4 text-[var(--tl-accent)]" aria-hidden />
          <span className="text-sm">
            {t("hist.deleted")}
            <span className="text-[var(--tl-text-muted)]">
              {" · "}
              {tInterp("hist.undoSets", { n: undo.sets.length })}
            </span>
          </span>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              className="tl-btn tl-btn-primary tl-focusable"
              onClick={() => {
                restoreSession(undo.session, undo.sets);
                setUndo(null);
              }}
            >
              {tInterp("hist.undoIn", { n: secondsLeft })}
            </button>
            <button
              type="button"
              className="tl-btn tl-btn-ghost tl-focusable"
              onClick={() => setUndo(null)}
            >
              {t("hist.dismiss")}
            </button>
          </div>
        </div>
      )}

      {total === 0 ? (
        <EmptyState
          icon={<Clock size={28} />}
          title={t("hist.empty")}
          body={t("hist.emptyHint")}
        />
      ) : (
        <SectionCard
          title={t("hist.listTitle")}
          hint={
            shown < total
              ? tInterp("hist.listHintCapped", { shown, total })
              : t("hist.listHint")
          }
          icon={<Clock size={18} />}
        >
          <ul className="flex flex-col gap-3 list-none p-0 m-0">
            {entries.map((entry) => {
              const session = sessions.find((row) => row.id === entry.id);
              return (
                <SessionCard
                  key={entry.id}
                  entry={entry}
                  lang={lang}
                  session={session}
                  sets={sets}
                  onEdit={editSession}
                  onDelete={deleteSession}
                />
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

/** One closed session: the day, what it was, what it cost, and its two actions. */
function SessionCard({
  entry,
  lang,
  session,
  sets,
  onEdit,
  onDelete,
}: {
  entry: SessionHistoryEntry;
  lang: "es" | "en";
  /** The stored record. Missing only if the list and the log disagree. */
  session: TLSession | undefined;
  sets: readonly TLSet[];
  onEdit: (id: string, patch: Partial<TLSession>) => void;
  onDelete: (session: TLSession) => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");
  const [name, setName] = useState(entry.title ?? "");
  const [place, setPlace] = useState<"" | "gym" | "home">(
    entry.location ?? "",
  );

  const shown = open ? entry.exercises : entry.exercises.slice(0, 4);
  const hidden = entry.exercises.length - shown.length;

  // What the delete confirmation is allowed to promise: the sets themselves,
  // not the card's totals (they come from the same derivation, but the plan also
  // knows which ids go and whether some were already missing).
  const plan = useMemo(
    () => (session ? sessionDeletePlan(session, sets) : null),
    [session, sets],
  );

  const startEdit = () => {
    setName(entry.title ?? "");
    setPlace(entry.location ?? "");
    setMode("edit");
  };

  const saveEdit = () => {
    if (!session) return;
    const trimmed = name.trim();
    onEdit(session.id, {
      title: trimmed.length > 0 ? trimmed.slice(0, 80) : undefined,
      location: place === "" ? undefined : place,
    });
    setMode("view");
  };

  return (
    <li className="tl-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold">{formatDay(entry.date, lang)}</span>
            {entry.title && (
              <span className="text-[var(--tl-text-secondary)] truncate">
                {entry.title}
              </span>
            )}
            {entry.location && (
              <Badge tone="neutral">{t(`hist.place.${entry.location}`)}</Badge>
            )}
            {entry.source && entry.source !== "traininglab" && (
              <Badge tone="info" title={t("hist.sourceHint")}>
                {entry.source}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 flex-wrap text-xs text-[var(--tl-text-muted)] mt-1">
            <span>
              {tInterp("hist.sets", { n: entry.workingSets })}
              {entry.warmupSets > 0 &&
                ` · ${tInterp("hist.warmup", { n: entry.warmupSets })}`}
            </span>
            <span>
              {tInterp("hist.exercises", { n: entry.exercises.length })}
            </span>
            {entry.volumeKg > 0 && (
              <span>
                {tInterp("hist.volume", { kg: formatKg(entry.volumeKg, lang) })}
              </span>
            )}
            {/* No trustworthy duration → no tile. A made-up "1 min" is worse
                than an empty spot. */}
            {entry.durationMin !== null && (
              <span>{tInterp("hist.duration", { n: entry.durationMin })}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {EFFORT_MARKERS.filter((mark) => entry.markers[mark] > 0).map(
            (mark) => (
              <Badge
                key={mark}
                tone={mark === "F" ? "danger" : "warning"}
                title={`${EFFORT_MEANING[mark].label[lang]} · ${EFFORT_MEANING[mark].detail[lang]}`}
              >
                {mark} · {entry.markers[mark]}
              </Badge>
            ),
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap mt-3">
        {shown.map((line) => (
          <Chip key={line.exerciseId}>
            {exerciseName(line.exerciseId, lang)} ×{line.sets}
          </Chip>
        ))}
        {entry.exercises.length > 4 && (
          <button
            type="button"
            className="tl-focusable text-[11px] text-[var(--tl-text-muted)] underline decoration-dotted"
            onClick={() => setOpen((value) => !value)}
          >
            {open
              ? t("hist.showLess")
              : tInterp("hist.moreExercises", { n: hidden })}
          </button>
        )}
      </div>

      {mode === "view" && (
        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            className="tl-btn tl-btn-ghost tl-focusable"
            style={{ padding: "8px 14px" }}
            onClick={startEdit}
          >
            <Pencil className="w-4 h-4" aria-hidden />
            {t("hist.edit")}
          </button>
          <button
            type="button"
            className="tl-btn tl-btn-ghost tl-focusable"
            style={{ padding: "8px 14px", color: "var(--tl-danger)" }}
            onClick={() => setMode("delete")}
            disabled={!session}
          >
            <Trash2 className="w-4 h-4" aria-hidden />
            {t("hist.delete")}
          </button>
        </div>
      )}

      {mode === "edit" && (
        <div className="mt-3 rounded-xl border border-[var(--tl-border)] bg-[var(--tl-surface-2)] p-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mb-1">
            {t("hist.editName")}
            <input
              type="text"
              className="tl-input mt-1 w-full px-3 py-2 text-sm font-normal normal-case tracking-normal"
              value={name}
              maxLength={80}
              placeholder={t("hist.editNamePlaceholder")}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-[var(--tl-text-muted)] mt-2 mb-1">
            {t("hist.editPlace")}
            <select
              className="tl-input mt-1 w-full px-3 py-2 text-sm font-normal normal-case tracking-normal"
              value={place}
              onChange={(event) =>
                setPlace(event.target.value as "" | "gym" | "home")
              }
            >
              <option value="">{t("hist.place.none")}</option>
              <option value="gym">{t("hist.place.gym")}</option>
              <option value="home">{t("hist.place.home")}</option>
            </select>
          </label>
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              className="tl-btn tl-btn-primary tl-focusable"
              style={{ padding: "8px 14px" }}
              onClick={saveEdit}
            >
              {t("hist.save")}
            </button>
            <button
              type="button"
              className="tl-btn tl-btn-ghost tl-focusable"
              style={{ padding: "8px 14px" }}
              onClick={() => setMode("view")}
            >
              {t("hist.cancel")}
            </button>
          </div>
        </div>
      )}

      {mode === "delete" && plan && (
        <div
          role="alertdialog"
          aria-label={t("hist.deleteTitle")}
          className="mt-3 rounded-xl border border-[var(--tl-danger)]/40 bg-[var(--tl-danger)]/10 p-3"
        >
          <p className="font-semibold text-sm">{t("hist.deleteTitle")}</p>
          <p className="text-[13px] text-[var(--tl-text-secondary)] mt-1">
            {tInterp("hist.deleteBody", {
              n: plan.workingSets + plan.warmupSets,
              kg: formatKg(plan.volumeKg, lang),
            })}
          </p>
          {plan.warmupSets > 0 && (
            <p className="text-xs text-[var(--tl-text-muted)] mt-1">
              {/* One warm-up set is common, so it gets its own sentence: the
                  plural key would print «Se incluyen 1 series». */}
              {plan.warmupSets === 1
                ? t("hist.deleteWarmupOne")
                : tInterp("hist.deleteWarmup", { n: plan.warmupSets })}
            </p>
          )}
          {plan.missingSets > 0 && (
            <p className="text-xs text-[var(--tl-text-muted)] mt-1">
              {tInterp("hist.deleteMissing", { n: plan.missingSets })}
            </p>
          )}
          <div className="flex items-center gap-2 mt-3">
            <button
              type="button"
              className="tl-btn tl-focusable"
              style={{
                padding: "8px 14px",
                background: "var(--tl-danger)",
                color: "#fff",
                fontWeight: 800,
              }}
              onClick={() => {
                if (session) onDelete(session);
              }}
            >
              {t("hist.deleteConfirm")}
            </button>
            <button
              type="button"
              className="tl-btn tl-btn-ghost tl-focusable"
              style={{ padding: "8px 14px" }}
              onClick={() => setMode("view")}
            >
              {t("hist.cancel")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}

/** `mié, 7 oct 2026` — the day as the owner reads it, never a UTC slice. */
function formatDay(date: string, lang: "es" | "en"): string {
  return new Date(`${date}T00:00:00`).toLocaleDateString(
    lang === "es" ? "es-ES" : "en-GB",
    { weekday: "short", day: "numeric", month: "short", year: "numeric" },
  );
}

/** Tonnage with the user's thousands separator (`149 107 kg` in Spanish). */
function formatKg(kg: number, lang: "es" | "en"): string {
  return `${Math.round(kg).toLocaleString(lang === "es" ? "es-ES" : "en-GB")} kg`;
}

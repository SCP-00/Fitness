/**
 * Rutinas — the approved mockup's sixth screen (`mockup/06-rutinas.html`).
 *
 * **2026-10-18 (port).** The destination was the one honest placeholder left in
 * the rail. The owner's decision for it was already made: *plantillas del
 * usuario, editables* — so this screen is a shelf and an editor, not a catalogue
 * of programs somebody else invented. Three consequences, all deliberate:
 *
 *   * **Nothing is recommended here.** The mockup draws six curated cards with
 *     "Popular", "Para principiantes" and "Reto 30 días" badges; there is no
 *     source for those claims in this app, so the shelf shows *your* routines
 *     and an honest empty state with the two ways to fill it.
 *   * **The only data it writes is a template.** Every item is a catalogue
 *     exercise with the same prescription the planner uses, clamped by
 *     `lib/routines.ts`. "Usar hoy" calls the store's own
 *     `addExerciseToToday` — the same verb the queue screen and the MCP action
 *     use — so a routine cannot prescribe something the app would refuse by
 *     hand. It adds rows; it never rewrites the plan or the week.
 *   * **The estimate is labelled.** Minutes are `setup + sets × (0.5 min +
 *     rest)` and every place that prints them says `~`.
 *
 * Saving today's session is a **snapshot of the rows on screen** (after swaps,
 * skips and the plan's own prescription), which makes "guardar el
 * entrenamiento de hoy" a copy of something real rather than a re-plan.
 *
 * @module screens/RoutinesScreen
 */

import { useEffect, useMemo, useState } from "react";
import { useStore } from "../app/store";
import { ExerciseThumb } from "../features/exercises/ExerciseThumb";
import { familyLabel } from "../lib/format";
import { getLanguage, t, tInterp } from "../lib/i18n";
import { exerciseName, type PlannedRow } from "../lib/plan";
import {
  ROUTINE_LIMITS,
  duplicateRoutine,
  routineFromRows,
  routineItemFor,
  routineTotals,
  type Routine,
  type RoutineItem,
} from "../lib/routines";
import {
  ROUTINE_TEMPLATES,
  buildTemplateRoutines,
  type RoutineTemplate,
  type TemplateBuild,
} from "../lib/routine-templates";
import { MIcons } from "../ui/mockup-icons";

/** The page's own rep presets, identical to the queue screen's. */
const REP_PRESETS = [
  { min: 6, max: 8 },
  { min: 8, max: 12 },
  { min: 10, max: 12 },
  { min: 12, max: 15 },
  { min: 15, max: 20 },
] as const;
const REST_PRESETS = [30, 45, 60, 90, 120, 150, 180] as const;
const SET_PRESETS = [1, 2, 3, 4, 5, 6, 8, 10] as const;
const RIR_PRESETS = [0, 1, 2, 3, 4, 5] as const;
/** How many picker candidates are rendered at once (more once there is a query). */
const PICKER_LIMIT = 6;
const PICKER_LIMIT_SEARCH = 40;

/** What the editor holds while the user types (never written until Guardar). */
interface Draft {
  id?: string;
  name: string;
  notes: string;
  items: RoutineItem[];
}

export default function RoutinesScreen() {
  const {
    settings,
    rows,
    routines,
    loading,
    plan,
    saveRoutine,
    saveRoutines,
    deleteRoutine,
    applyRoutineToday,
  } = useStore();

  const [search, setSearch] = useState("");
  const [viewing, setViewing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  /** The routine a "Usar hoy" was just applied to, for the sheet's receipt. */
  const [applied, setApplied] = useState<{ id: string; n: number } | null>(null);
  const [duplicated, setDuplicated] = useState<string | null>(null);
  /** The template shelf, and the preview of the one being confirmed. */
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [preview, setPreview] = useState<{
    template: RoutineTemplate;
    build: TemplateBuild;
  } | null>(null);
  const [created, setCreated] = useState<string[] | null>(null);

  const query = search.trim().toLocaleLowerCase();
  const visible = useMemo(() => {
    if (!query) return routines;
    return routines.filter((routine) => {
      const names = routine.items.map((item) =>
        exerciseName(item.exerciseId, getLanguage()).toLocaleLowerCase(),
      );
      const families = routineTotals(routine).families.map((family) =>
        familyLabel(family).toLocaleLowerCase(),
      );
      return [routine.name.toLocaleLowerCase(), ...names, ...families].some(
        (haystack) => haystack.includes(query),
      );
    });
  }, [routines, query]);

  if (loading || !settings || !plan) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const selected = routines.find((routine) => routine.id === viewing) ?? null;

  const openNew = () =>
    setDraft({ name: "", notes: "", items: [] });

  const openFromToday = () => {
    const name = tInterp("ru.fromTodayName", {
      date: new Date().toLocaleDateString(
        getLanguage() === "es" ? "es-ES" : "en-GB",
        { day: "numeric", month: "short" },
      ),
    });
    const routine = routineFromRows(name, rows as PlannedRow[]);
    if (routine) setDraft({ name: routine.name, notes: "", items: routine.items });
  };

  const openEdit = (routine: Routine) =>
    setDraft({
      id: routine.id,
      name: routine.name,
      notes: routine.notes ?? "",
      items: routine.items.map((item) => ({ ...item })),
    });

  const onSave = () => {
    if (!draft) return;
    const stored = saveRoutine({
      id: draft.id,
      name: draft.name,
      notes: draft.notes,
      items: draft.items,
    });
    if (!stored) return;
    setDraft(null);
    setViewing(stored.id);
  };

  const onUse = (routine: Routine) => {
    const n = applyRoutineToday(routine);
    setApplied({ id: routine.id, n });
    setViewing(routine.id);
  };

  const onDuplicate = (routine: Routine) => {
    const copy = duplicateRoutine(
      routine,
      `${routine.name} · ${t("ru.copySuffix")}`,
    );
    if (!copy) return;
    const stored = saveRoutine({
      name: copy.name,
      notes: copy.notes,
      items: copy.items,
    });
    if (stored) setDuplicated(stored.name);
  };

  const onDelete = (routine: Routine) => {
    deleteRoutine(routine.id);
    setViewing(null);
    setApplied(null);
  };

  /**
   * Build the preview against the user's **usable** catalogue, not the whole
   * one: a template offered for gear the user does not own would be a promise
   * the app cannot keep. Nothing is written until the confirm button.
   */
  const openPreview = (template: RoutineTemplate) => {
    setPreview({
      template,
      build: buildTemplateRoutines(
        template,
        plan.usable,
        (key) => t(key),
        routines.map((routine) => routine.name),
      ),
    });
  };

  /**
   * The only write of the whole flow: each routine goes through the store's own
   * `saveRoutine`, so a template can never bypass validation. Existing routines
   * are only read (for their names) — no routine is edited or replaced.
   */
  const confirmTemplate = () => {
    if (!preview) return;
    // One write, not N: `saveRoutine` reads `routines` from this render, so a
    // loop would keep the last routine only.
    const stored = saveRoutines(
      preview.build.routines.map((routine) => ({
        name: routine.name,
        notes: routine.notes,
        items: routine.items,
      })),
    );
    setCreated(stored.map((routine) => routine.name));
    setPreview(null);
    setTemplatesOpen(false);
  };

  return (
    <>
      <header className="topbar">
        <span className="pill">
          <MIcons.list />
          {routines.length === 1
            ? t("ru.countOne")
            : tInterp("ru.count", { n: routines.length })}
        </span>
        <div className="spacer" />
        <button
          type="button"
          className="btn btn-lg tl-focusable"
          onClick={() => setTemplatesOpen(true)}
        >
          <MIcons.layers />
          {t("ru.tpl.button")}
        </button>
        <button type="button" className="btn btn-lg tl-focusable" onClick={openNew}>
          <MIcons.plus />
          {t("ru.create")}
        </button>
      </header>

      <div className="content">
        <div className="stack" style={{ gap: 6 }}>
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: "-0.6px" }}>
            {t("ru.title")}
          </h1>
          <p className="small muted" style={{ margin: 0 }}>
            {t("ru.sub")}
          </p>
        </div>

        {routines.length > 0 && (
          <div className="field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <MIcons.search />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t("ru.search")}
              aria-label={t("ru.search")}
              className="grow"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--tl-text)",
                // 16 px, not 14: below that iOS Safari zooms on focus.
                fontSize: 16,
                minWidth: 0,
              }}
            />
          </div>
        )}

        {routines.length === 0 ? (
          <section className="card card-pad ru-empty">
            <MIcons.list />
            <h2 style={{ margin: 0, fontSize: 17 }}>{t("ru.empty.title")}</h2>
            <p className="small muted" style={{ margin: 0, maxWidth: "48ch" }}>
              {t("ru.empty.body")}
            </p>
            <div className="row-wrap" style={{ marginTop: 6 }}>
              <button
                type="button"
                className="btn btn-primary tl-focusable"
                onClick={() => setTemplatesOpen(true)}
              >
                <MIcons.layers />
                {t("ru.tpl.empty")}
              </button>
              <button
                type="button"
                className="btn tl-focusable"
                onClick={openFromToday}
                disabled={rows.length === 0}
              >
                <MIcons.notebook />
                {t("ru.empty.fromToday")}
              </button>
              <button type="button" className="btn tl-focusable" onClick={openNew}>
                <MIcons.plus />
                {t("ru.empty.blank")}
              </button>
            </div>
            {rows.length === 0 && (
              <p className="tiny muted" style={{ margin: 0 }}>
                {t("ru.empty.fromTodayNone")}
              </p>
            )}
          </section>
        ) : visible.length === 0 ? (
          <p className="small muted" style={{ margin: 0 }}>
            {tInterp("ru.search.empty", { q: search.trim() })}
          </p>
        ) : (
          <div className="ru-grid">
            {visible.map((routine) => {
              const totals = routineTotals(routine);
              const first = routine.items[0]!.exerciseId;
              return (
                <article key={routine.id} className="ru-card">
                  <div className="ru-card-head">
                    <ExerciseThumb exerciseId={first} size={46} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <div className="ru-name">{routine.name}</div>
                      <div className="ru-meta">
                        {metaLabel(totals)}
                      </div>
                    </div>
                  </div>

                  <div className="row-wrap">
                    {totals.families.slice(0, 3).map((family) => (
                      <span key={family} className="tag">
                        <i className="dot" />
                        {familyLabel(family)}
                      </span>
                    ))}
                  </div>

                  {routine.notes && (
                    <p className="tiny muted ru-notes">{routine.notes}</p>
                  )}

                  <div className="ru-foot">
                    <span className="tiny muted grow">{updatedLabel(routine)}</span>
                    <button
                      type="button"
                      className="btn btn-sm tl-focusable"
                      onClick={() => setViewing(routine.id)}
                    >
                      {t("ru.card.view")}
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary tl-focusable"
                      onClick={() => onUse(routine)}
                    >
                      {t("ru.card.use")}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {duplicated && (
          <p className="small muted" style={{ margin: 0 }}>
            {tInterp("ru.detail.duplicated", { name: duplicated })}
          </p>
        )}

        {created && created.length > 0 && (
          <p className="small muted" role="status" style={{ margin: 0 }}>
            {tInterp("ru.tpl.created", {
              n: created.length,
              names: created.join(" · "),
            })}
          </p>
        )}
      </div>

      {selected && (
        <RoutineSheet
          routine={selected}
          applied={applied?.id === selected.id ? applied.n : null}
          onClose={() => {
            setViewing(null);
            setApplied(null);
          }}
          onUse={() => onUse(selected)}
          onEdit={() => {
            setViewing(null);
            openEdit(selected);
          }}
          onDuplicate={() => onDuplicate(selected)}
          onDelete={() => onDelete(selected)}
        />
      )}

      {templatesOpen && (
        <TemplateSheet
          preview={preview}
          onPick={openPreview}
          onBack={() => setPreview(null)}
          onConfirm={confirmTemplate}
          onClose={() => {
            setTemplatesOpen(false);
            setPreview(null);
          }}
        />
      )}

      {draft && (
        <RoutineEditor
          draft={draft}
          onChange={setDraft}
          onCancel={() => setDraft(null)}
          onSave={onSave}
          candidates={plan.usable.map((entry) => ({
            id: entry.exercise.id,
            name: exerciseName(entry.exercise.id, getLanguage()),
            families: entry.families.map((family) => familyLabel(family)),
          }))}
        />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   The template shelf — pick a split, read what it would create, confirm
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Two steps in one modal: the three splits, then the preview of the chosen
 * one with its days, prescriptions and any slot the user's gear cannot fill.
 * The confirm button is the only writer, and it only **adds** routines.
 */
function TemplateSheet({
  preview,
  onPick,
  onBack,
  onConfirm,
  onClose,
}: {
  preview: { template: RoutineTemplate; build: TemplateBuild } | null;
  onPick: (template: RoutineTemplate) => void;
  onBack: () => void;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEscape(preview ? onBack : onClose);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={t("ru.tpl.title")}
        data-testid="template-sheet"
      >
        <div className="card-head">
          <span className="card-title">
            <MIcons.layers />
            {preview ? t("ru.tpl.preview.title") : t("ru.tpl.title")}
          </span>
          <div className="spacer" />
          <button
            type="button"
            className="icon-btn tl-focusable"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <MIcons.x />
          </button>
        </div>

        <div className="card-body" style={{ paddingTop: 14 }}>
          {preview === null ? (
            <>
              <p className="small muted" style={{ margin: 0 }}>
                {t("ru.tpl.sub")}
              </p>
              {ROUTINE_TEMPLATES.map((template) => (
                <div
                  key={template.id}
                  className="card"
                  data-testid={`template-${template.id}`}
                  style={{
                    marginTop: 10,
                    padding: 12,
                    display: "flex",
                    gap: 12,
                    alignItems: "center",
                  }}
                >
                  <div className="grow" style={{ minWidth: 0 }}>
                    <div className="ru-name">{t(template.nameKey)}</div>
                    <div className="ru-meta">{t(template.blurbKey)}</div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-primary tl-focusable"
                    onClick={() => onPick(template)}
                  >
                    {t("ru.tpl.pick")}
                  </button>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="ru-name" style={{ fontSize: 17 }}>
                {t(preview.template.nameKey)}
              </div>
              <p className="small muted" style={{ margin: "4px 0 0" }}>
                {t("ru.tpl.keep")}
              </p>

              {preview.build.routines.map((routine) => {
                const totals = routineTotals(routine);
                return (
                  <div key={routine.id} style={{ marginTop: 12 }}>
                    <div className="small bold secondary">
                      {routine.name} · {metaLabel(totals)}
                    </div>
                    {routine.items.map((item) => (
                      <div
                        key={item.exerciseId}
                        className="tiny muted"
                        style={{ marginTop: 3 }}
                      >
                        {exerciseName(item.exerciseId, getLanguage())} —{" "}
                        {item.sets} × {item.repsMin}–{item.repsMax} · RIR{" "}
                        {item.rir ?? 2}
                      </div>
                    ))}
                  </div>
                );
              })}

              {preview.build.gaps.length > 0 && (
                <p className="tiny muted" style={{ margin: "12px 0 0" }}>
                  {tInterp("ru.tpl.gaps", { n: preview.build.gaps.length })}:{" "}
                  {preview.build.gaps
                    .map(
                      (gap) =>
                        `${t(gap.dayNameKey)} · ${familyLabel(gap.family)}`,
                    )
                    .join(" / ")}
                </p>
              )}

              <div className="row-wrap" style={{ marginTop: 16 }}>
                <button
                  type="button"
                  className="btn btn-lg tl-focusable"
                  onClick={onBack}
                >
                  {t("ru.tpl.back")}
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-lg grow tl-focusable"
                  onClick={onConfirm}
                  disabled={preview.build.routines.length === 0}
                >
                  <MIcons.layers />
                  {tInterp("ru.tpl.create", {
                    n: preview.build.routines.length,
                  })}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   The sheet — one routine, read-only, with its verbs
   ══════════════════════════════════════════════════════════════════════════ */

function RoutineSheet({
  routine,
  applied,
  onClose,
  onUse,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  routine: Routine;
  /** Rows added by the last "Usar hoy" on this routine, or `null`. */
  applied: number | null;
  onClose: () => void;
  onUse: () => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const totals = routineTotals(routine);
  useEscape(onClose);

  return (
    <>
      <div className="overlay" onClick={onClose} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={routine.name}
      >
        <div className="card-head">
          <span className="card-title">
            <MIcons.list />
            {routine.name}
          </span>
          <div className="spacer" />
          <button
            type="button"
            className="icon-btn tl-focusable"
            aria-label={t("common.close")}
            onClick={onClose}
          >
            <MIcons.x />
          </button>
        </div>

        <div className="card-body" style={{ paddingTop: 14 }}>
          <div className="ru-sheet-head">
            <ExerciseThumb exerciseId={routine.items[0]!.exerciseId} size={64} />
            <div className="grow" style={{ minWidth: 0 }}>
              <div className="ru-name" style={{ fontSize: 17 }}>
                {routine.name}
              </div>
              <div className="ru-meta">{metaLabel(totals)}</div>
              <div className="tiny muted" style={{ marginTop: 4 }}>
                {updatedLabel(routine)}
              </div>
            </div>
          </div>

          <div className="row-wrap" style={{ marginTop: 12 }}>
            {totals.families.map((family) => (
              <span key={family} className="tag">
                <i className="dot" />
                {familyLabel(family)}
              </span>
            ))}
          </div>

          {routine.notes && (
            <p className="secondary small" style={{ margin: "12px 0 0" }}>
              {routine.notes}
            </p>
          )}

          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="small bold secondary" style={{ marginBottom: 8 }}>
            {t("ru.detail.overview")}
          </div>
          <div className="summary-grid">
            <div className="summary-cell">
              <MIcons.layers />
              <b>{totals.exercises}</b>
              <span>{t("ru.cell.exercises")}</span>
            </div>
            <div className="summary-cell">
              <MIcons.bars />
              <b>{totals.sets}</b>
              <span>{t("ru.cell.sets")}</span>
            </div>
            <div className="summary-cell">
              <MIcons.clock />
              <b>~{totals.minutes}</b>
              <span>{t("ru.cell.minutes")}</span>
            </div>
            <div className="summary-cell">
              <MIcons.users />
              <b>{totals.families.length}</b>
              <span>{t("ru.cell.families")}</span>
            </div>
          </div>

          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="small bold secondary" style={{ marginBottom: 6 }}>
            {tInterp("ru.detail.exercises", { n: routine.items.length })}
          </div>

          {routine.items.map((item, index) => (
            <div key={item.exerciseId} className="detail-row">
              <span className="bold muted">{index + 1}</span>
              <span className="detail-thumb">
                <ExerciseThumb exerciseId={item.exerciseId} size={42} />
              </span>
              <span>
                <span className="detail-name">
                  {exerciseName(item.exerciseId, getLanguage())}
                </span>
                <span className="detail-rx">
                  {item.sets} × {item.repsMin}–{item.repsMax} · RIR{" "}
                  {item.rir ?? 2} · {tInterp("ent.restSec", { s: item.restSec })}
                </span>
              </span>
              <span className="tag">
                {familyLabel(routineTotals({ ...routine, items: [item] }).families[0] ?? "")}
              </span>
            </div>
          ))}

          {applied !== null && (
            <p className="small muted" style={{ margin: "12px 0 0" }}>
              {applied > 0
                ? applied === 1
                  ? t("ru.detail.addedOne")
                  : tInterp("ru.detail.added", { n: applied })
                : t("ru.detail.none")}
            </p>
          )}

          <div className="row-wrap" style={{ marginTop: 16 }}>
            <button
              type="button"
              className="btn btn-primary btn-lg grow tl-focusable"
              onClick={onUse}
            >
              <MIcons.play />
              {t("ru.card.use")}
            </button>
            <button type="button" className="btn btn-lg tl-focusable" onClick={onEdit}>
              <MIcons.notebook />
              {t("ru.detail.edit")}
            </button>
          </div>

          <div className="row-wrap" style={{ marginTop: 10 }}>
            <button type="button" className="btn btn-sm tl-focusable" onClick={onDuplicate}>
              <MIcons.copy />
              {t("ru.detail.duplicate")}
            </button>
            <div className="spacer" />
            {confirming ? (
              <>
                <span className="small muted" style={{ alignSelf: "center" }}>
                  {tInterp("ru.detail.deleteConfirm", { name: routine.name })}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-danger tl-focusable"
                  onClick={onDelete}
                >
                  {t("ru.detail.deleteYes")}
                </button>
                <button
                  type="button"
                  className="btn btn-sm tl-focusable"
                  onClick={() => setConfirming(false)}
                >
                  {t("ru.edit.cancel")}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn btn-sm tl-focusable"
                onClick={() => setConfirming(true)}
              >
                <MIcons.trash />
                {t("ru.detail.delete")}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   The editor — name, notes, exercises and their prescription
   ══════════════════════════════════════════════════════════════════════════ */

function RoutineEditor({
  draft,
  onChange,
  onCancel,
  onSave,
  candidates,
}: {
  draft: Draft;
  onChange: (next: Draft) => void;
  onCancel: () => void;
  onSave: () => void;
  candidates: { id: string; name: string; families: string[] }[];
}) {
  const [picker, setPicker] = useState("");
  const [error, setError] = useState(false);
  useEscape(onCancel);

  const chosen = new Set(draft.items.map((item) => item.exerciseId));
  const query = picker.trim().toLocaleLowerCase();
  const found = candidates.filter((entry) => {
    if (!query) return true;
    return (
      entry.name.toLocaleLowerCase().includes(query) ||
      entry.families.some((family) =>
        family.toLocaleLowerCase().includes(query),
      )
    );
  });
  const matches = found
    .filter((entry) => !chosen.has(entry.id))
    .slice(0, query ? PICKER_LIMIT_SEARCH : PICKER_LIMIT);

  const patchItem = (index: number, over: Partial<RoutineItem>) =>
    onChange({
      ...draft,
      items: draft.items.map((item, i) =>
        i === index ? { ...item, ...over } : item,
      ),
    });

  const addItem = (exerciseId: string) => {
    const item = routineItemFor(exerciseId);
    if (!item || chosen.has(exerciseId)) return;
    onChange({ ...draft, items: [...draft.items, item] });
    // Clear the query so the next search starts fresh; leaving it filled showed
    // "no match" right after the only match had been added.
    setPicker("");
    setError(false);
  };

  const removeItem = (index: number) =>
    onChange({
      ...draft,
      items: draft.items.filter((_, i) => i !== index),
    });

  const moveItem = (from: number, to: number) => {
    if (to < 0 || to >= draft.items.length || from === to) return;
    const items = [...draft.items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved!);
    onChange({ ...draft, items });
  };

  const submit = () => {
    if (!draft.name.trim() || draft.items.length === 0) {
      setError(true);
      return;
    }
    onSave();
  };

  return (
    <>
      <div className="overlay" onClick={onCancel} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={draft.id ? t("ru.detail.edit") : t("ru.edit.new")}
      >
        <div className="card-head">
          <span className="card-title">
            <MIcons.notebook />
            {draft.id ? t("ru.detail.edit") : t("ru.edit.new")}
          </span>
          <div className="spacer" />
          <button
            type="button"
            className="icon-btn tl-focusable"
            aria-label={t("common.close")}
            onClick={onCancel}
          >
            <MIcons.x />
          </button>
        </div>

        <div className="card-body" style={{ paddingTop: 14 }}>
          <div className="field">
            <label className="field-label" htmlFor="ru-name">
              {t("ru.edit.name")}
            </label>
            <input
              id="ru-name"
              data-testid="routine-name"
              value={draft.name}
              autoFocus
              maxLength={ROUTINE_LIMITS.name}
              placeholder={t("ru.edit.namePlaceholder")}
              onChange={(event) => {
                onChange({ ...draft, name: event.target.value });
                if (event.target.value.trim()) setError(false);
              }}
              style={{
                width: "100%",
                fontSize: 16,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--tl-text)",
                padding: 0,
              }}
            />
          </div>

          <div className="field" style={{ marginTop: 12 }}>
            <label className="field-label" htmlFor="ru-notes">
              {t("ru.edit.notes")}
            </label>
            <textarea
              id="ru-notes"
              rows={2}
              value={draft.notes}
              maxLength={ROUTINE_LIMITS.notes}
              placeholder={t("ru.edit.notesPlaceholder")}
              onChange={(event) =>
                onChange({ ...draft, notes: event.target.value })
              }
              style={{
                width: "100%",
                fontSize: 16,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--tl-text)",
                padding: 0,
                resize: "vertical",
              }}
            />
          </div>

          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="small bold secondary" style={{ marginBottom: 8 }}>
            {tInterp("ru.edit.items", { n: draft.items.length })}
          </div>

          {draft.items.length === 0 ? (
            <p className="small muted" style={{ margin: "0 0 12px" }}>
              {t("ru.edit.empty")}
            </p>
          ) : (
            draft.items.map((item, index) => (
              <div key={item.exerciseId} className="ru-item">
                <span className="bold muted">{index + 1}</span>
                <ExerciseThumb exerciseId={item.exerciseId} size={40} />
                <div className="ru-item-main">
                  <div className="detail-name">
                    {exerciseName(item.exerciseId, getLanguage())}
                  </div>
                  <div className="ru-item-fields">
                    <label className="ru-mini">
                      <span>{t("ru.edit.sets")}</span>
                      <select
                        className="stepper-input"
                        value={item.sets}
                        onChange={(event) =>
                          patchItem(index, { sets: Number(event.target.value) })
                        }
                      >
                        {SET_PRESETS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ru-mini">
                      <span>{t("ru.edit.reps")}</span>
                      <select
                        className="stepper-input"
                        value={`${item.repsMin}-${item.repsMax}`}
                        onChange={(event) => {
                          const [min, max] = event.target.value
                            .split("-")
                            .map(Number);
                          patchItem(index, { repsMin: min, repsMax: max });
                        }}
                      >
                        {REP_PRESETS.map((preset) => (
                          <option
                            key={`${preset.min}-${preset.max}`}
                            value={`${preset.min}-${preset.max}`}
                          >
                            {preset.min}–{preset.max}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ru-mini">
                      <span>{t("ru.edit.rest")}</span>
                      <select
                        className="stepper-input"
                        value={item.restSec}
                        onChange={(event) =>
                          patchItem(index, {
                            restSec: Number(event.target.value),
                          })
                        }
                      >
                        {REST_PRESETS.map((seconds) => (
                          <option key={seconds} value={seconds}>
                            {seconds} s
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="ru-mini">
                      <span>{t("ru.edit.rir")}</span>
                      <select
                        className="stepper-input"
                        value={item.rir ?? 2}
                        onChange={(event) =>
                          patchItem(index, { rir: Number(event.target.value) })
                        }
                      >
                        {RIR_PRESETS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
                <div className="ru-item-actions">
                  <button
                    type="button"
                    className="icon-btn tl-focusable"
                    title={t("ru.edit.up")}
                    aria-label={t("ru.edit.up")}
                    disabled={index === 0}
                    onClick={() => moveItem(index, index - 1)}
                  >
                    <MIcons.arrowUp />
                  </button>
                  <button
                    type="button"
                    className="icon-btn tl-focusable"
                    title={t("ru.edit.down")}
                    aria-label={t("ru.edit.down")}
                    disabled={index === draft.items.length - 1}
                    onClick={() => moveItem(index, index + 1)}
                  >
                    <MIcons.arrowDown />
                  </button>
                  <button
                    type="button"
                    className="icon-btn tl-focusable"
                    title={t("ru.edit.remove")}
                    aria-label={t("ru.edit.remove")}
                    onClick={() => removeItem(index)}
                  >
                    <MIcons.trash />
                  </button>
                </div>
              </div>
            ))
          )}

          <div className="divider" style={{ margin: "14px 0" }} />
          <div className="field" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <MIcons.search />
            <input
              value={picker}
              onChange={(event) => setPicker(event.target.value)}
              placeholder={t("ru.edit.search")}
              aria-label={t("ru.edit.search")}
              className="grow"
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "var(--tl-text)",
                fontSize: 16,
                minWidth: 0,
              }}
            />
          </div>

          <div className="ru-picker">
            {matches.length === 0 ? (
              <p className="small muted" style={{ margin: "8px 0 0" }}>
                {found.length > 0 ? t("ru.edit.already") : t("ru.edit.noResults")}
              </p>
            ) : (
              matches.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="ru-pick tl-focusable"
                  onClick={() => addItem(entry.id)}
                >
                  <ExerciseThumb exerciseId={entry.id} size={34} />
                  <span className="grow" style={{ minWidth: 0 }}>
                    <span className="detail-name">{entry.name}</span>
                    <span className="ru-meta">{entry.families.join(" · ")}</span>
                  </span>
                  <MIcons.plus />
                </button>
              ))
            )}
          </div>

          {error && (
            <p className="small" style={{ margin: "10px 0 0", color: "var(--tl-warning)" }}>
              {t("ru.edit.invalid")}
            </p>
          )}

          {/*
           * Sticky on purpose. The editor can hold 24 exercises plus the
           * picker; without this the two buttons sat at the very end of a
           * 88 vh scroll and "Guardar" was off screen whenever you added an
           * exercise (audited in the running build, 2026-10-18).
           */}
          <div className="ru-actions">
            <button
              type="button"
              className="btn btn-primary btn-lg grow tl-focusable"
              onClick={submit}
            >
              <MIcons.check />
              {t("ru.edit.save")}
            </button>
            <button type="button" className="btn btn-lg tl-focusable" onClick={onCancel}>
              {t("ru.edit.cancel")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   Small pieces
   ══════════════════════════════════════════════════════════════════════════ */

/** The one-line totals of a routine, singular-aware ("1 ejercicio"). */
function metaLabel(totals: ReturnType<typeof routineTotals>): string {
  return tInterp(totals.exercises === 1 ? "ru.metaOne" : "ru.meta", {
    exercises: totals.exercises,
    sets: totals.sets,
    minutes: totals.minutes,
  });
}

/** `18 oct` — the date of the last edit, in the user's language. */
function updatedLabel(routine: Routine): string {
  const date = new Date(routine.updatedAt);
  if (Number.isNaN(date.getTime())) return "";
  return tInterp("ru.updated", {
    date: date.toLocaleDateString(
      getLanguage() === "es" ? "es-ES" : "en-GB",
      { day: "numeric", month: "short" },
    ),
  });
}

/** Escape closes a dialog — the keyboard path every overlay needs. */
function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
}

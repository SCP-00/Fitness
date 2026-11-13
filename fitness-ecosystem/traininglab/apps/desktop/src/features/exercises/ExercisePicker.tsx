/**
 * The one exercise picker.
 *
 * Hoy, Entrenamiento and Rutinas used to carry three search boxes with three
 * slightly different candidate lists. This is the single modal they share: it
 * reads the catalogue through `buildRows()`, the stars through `favorites` and
 * gear legality through the planner's own `usable` list, then hands the chosen
 * ids back to the caller. It never writes a row itself — each screen keeps its
 * own verb (`addExerciseToToday` or `routineItemFor`), so the picker cannot
 * invent a second data path.
 *
 * @module features/exercises/ExercisePicker
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useStore } from "../../app/store";
import { favoriteIds } from "../../lib/favorites";
import {
  filterExercisePicker,
  pickerFiltersActive,
  type PickerExercise,
} from "../../lib/exercise-picker";
import { familyLabel } from "../../lib/format";
import { t, tInterp } from "../../lib/i18n";
import { MIcons } from "../../ui/mockup-icons";
import { Chip } from "../../ui/primitives";
import { allFamilies, buildRows } from "./library";
import { ExerciseThumb } from "./ExerciseThumb";

export interface ExercisePickerProps {
  title: string;
  onClose: () => void;
  /** Receives the chosen ids; the caller writes them through its own verb. */
  onConfirm: (ids: string[]) => void;
  /** Multi-select for "Añadir varios" and the routine builder. */
  multiple?: boolean;
  /** Ids already in the destination; they stay visible but cannot be chosen. */
  inUse?: readonly string[];
  /** The gear scope the screen starts with. */
  defaultOnlyGear?: boolean;
}

export function ExercisePicker({
  title,
  onClose,
  onConfirm,
  multiple = false,
  inUse = [],
  defaultOnlyGear = true,
}: ExercisePickerProps) {
  const { settings, plan } = useStore();
  const panel = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  const [query, setQuery] = useState("");
  const [family, setFamily] = useState<string | null>(null);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [onlyGear, setOnlyGear] = useState(defaultOnlyGear);
  const [selected, setSelected] = useState<string[]>([]);

  const families = useMemo(() => allFamilies().map(familyLabel), []);
  const used = useMemo(() => new Set(inUse), [inUse]);

  const items = useMemo<PickerExercise[]>(() => {
    const usable = new Set(
      (plan?.usable ?? []).map((entry) => entry.exercise.id),
    );
    const starred = new Set(favoriteIds(settings));
    return buildRows().map((row) => ({
      id: row.id,
      name: row.name,
      families: row.families.map(familyLabel),
      equipment: row.equipment,
      favorite: starred.has(row.id),
      gearLegal: usable.has(row.id),
    }));
  }, [plan, settings]);

  const rows = useMemo(
    () =>
      filterExercisePicker(items, {
        query,
        family,
        onlyFavorites,
        onlyGear,
      }),
    [items, query, family, onlyFavorites, onlyGear],
  );
  const filters = { query, family, onlyFavorites, onlyGear };
  const filtersActive = pickerFiltersActive(filters, defaultOnlyGear);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    search.current?.focus();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close.current();
        return;
      }
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(
        panel.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled]), a[href]",
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
    // The modal is mounted once per opening; a changing parent callback must
    // not re-run the focus lock or steal the caret back to the search field.
  }, []);

  const toggle = (id: string) => {
    if (used.has(id)) return;
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id],
    );
  };

  const choose = (id: string) => {
    if (used.has(id)) return;
    if (multiple) toggle(id);
    else onConfirm([id]);
  };

  const selectable = rows.filter((item) => !used.has(item.id));
  const allSelected =
    selectable.length > 0 &&
    selectable.every((item) => selected.includes(item.id));

  const toggleAll = () => {
    setSelected(allSelected ? [] : selectable.map((item) => item.id));
  };

  const clearFilters = () => {
    setQuery("");
    setFamily(null);
    setOnlyFavorites(false);
    setOnlyGear(defaultOnlyGear);
  };

  return (
    <div
      className="exercise-picker-backdrop"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={panel}
        className="exercise-picker"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid="exercise-picker"
        onKeyDown={(event) => {
          if (event.key !== "Escape") return;
          // The picker can sit on top of a routine editor or a sheet whose
          // document-level Escape handler is still mounted. Stop it here so
          // Escape closes only this layer.
          event.stopPropagation();
          event.preventDefault();
          close.current();
        }}
      >
        <div className="exercise-picker-head">
          <span className="card-title">
            <MIcons.dumbbell />
            {title}
          </span>
          <span className="badge badge-plain">
            {tInterp("picker.count", {
              shown: rows.length,
              total: items.length,
            })}
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

        <div className="exercise-picker-body">
          <div className="exercise-picker-search">
            <MIcons.search />
            <input
              ref={search}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t("picker.search")}
              aria-label={t("picker.search")}
              className="grow"
              data-testid="exercise-picker-search"
            />
            {query !== "" && (
              <button
                type="button"
                className="icon-btn tl-focusable"
                aria-label={t("picker.clearSearch")}
                onClick={() => setQuery("")}
              >
                <MIcons.x />
              </button>
            )}
          </div>

          <div className="exercise-picker-filters">
            <Chip
              active={onlyFavorites}
              onClick={() => setOnlyFavorites((value) => !value)}
            >
              <span className="row" style={{ gap: 4 }}>
                <MIcons.star />
                {t("ex.fav")}
              </span>
            </Chip>
            <Chip
              active={onlyGear}
              onClick={() => setOnlyGear((value) => !value)}
            >
              <span className="row" style={{ gap: 4 }}>
                <MIcons.dumbbell />
                {t("picker.onlyGear")}
              </span>
            </Chip>
            <span className="exercise-picker-filter-divider" aria-hidden />
            {families.map((label) => (
              <Chip
                key={label}
                active={family === label}
                onClick={() =>
                  setFamily((current) => (current === label ? null : label))
                }
              >
                {label}
              </Chip>
            ))}
          </div>

          {filtersActive && (
            <div className="exercise-picker-active">
              <span className="tiny muted">{t("picker.filtered")}</span>
              <button
                type="button"
                className="btn btn-sm tl-focusable"
                onClick={clearFilters}
              >
                {t("ex.clearFilters")}
              </button>
            </div>
          )}

          <div className="exercise-picker-list">
            {rows.length === 0 ? (
              <div className="exercise-picker-empty">
                <p className="small muted" style={{ margin: 0 }}>
                  {t("picker.empty")}
                </p>
                {filtersActive && (
                  <button
                    type="button"
                    className="btn btn-sm tl-focusable"
                    onClick={clearFilters}
                  >
                    {t("ex.clearFilters")}
                  </button>
                )}
              </div>
            ) : (
              <>
                {multiple && selectable.length > 0 && (
                  <button
                    type="button"
                    className="exercise-picker-selectall tl-focusable"
                    onClick={toggleAll}
                  >
                    <span
                      className={`checkbox ${allSelected ? "is-on" : ""}`}
                      aria-hidden
                    >
                      <MIcons.check />
                    </span>
                    <span className="small bold">
                      {tInterp("ent.add.selectAll", { n: selectable.length })}
                    </span>
                  </button>
                )}
                {rows.map((item) => {
                  const disabled = used.has(item.id);
                  const on = selected.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={`exercise-picker-row tl-focusable ${
                        disabled ? "is-in-use" : ""
                      } ${on ? "is-selected" : ""}`}
                      data-exercise-id={item.id}
                      disabled={disabled}
                      aria-pressed={multiple ? on : undefined}
                      onClick={() => choose(item.id)}
                    >
                      {multiple && (
                        <span
                          className={`checkbox ${on ? "is-on" : ""}`}
                          aria-hidden
                        >
                          <MIcons.check />
                        </span>
                      )}
                      <ExerciseThumb exerciseId={item.id} size={38} />
                      <span className="exercise-picker-main">
                        <span className="exercise-picker-name">
                          {item.name}
                        </span>
                        <span className="exercise-picker-meta">
                          {item.families.slice(0, 3).join(" · ")}
                          {item.equipment ? ` · ${item.equipment}` : ""}
                        </span>
                      </span>
                      {item.favorite && (
                        <span
                          className="exercise-picker-star"
                          title={t("ex.fav")}
                          aria-label={t("ex.fav")}
                        >
                          <MIcons.star />
                        </span>
                      )}
                      {disabled ? (
                        <span className="badge badge-plain">
                          {t("picker.inUse")}
                        </span>
                      ) : (
                        !item.gearLegal && (
                          <span className="badge badge-plain">
                            {t("picker.noGear")}
                          </span>
                        )
                      )}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        <div className="exercise-picker-foot">
          {multiple ? (
            <>
              <span className="small muted">
                {tInterp(
                  selected.length === 1
                    ? "picker.selectedOne"
                    : "picker.selected",
                  { n: selected.length },
                )}
              </span>
              <div className="spacer" />
              <button
                type="button"
                className="btn tl-focusable"
                onClick={onClose}
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary tl-focusable"
                disabled={selected.length === 0}
                onClick={() => onConfirm(selected)}
                data-testid="exercise-picker-add"
              >
                <MIcons.plus />
                {tInterp("picker.add", { n: selected.length })}
              </button>
            </>
          ) : (
            <>
              <span className="tiny muted">{t("picker.tap")}</span>
              <div className="spacer" />
              <button
                type="button"
                className="btn tl-focusable"
                onClick={onClose}
              >
                {t("common.close")}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

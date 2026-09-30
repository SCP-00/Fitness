/**
 * Ejercicios — the library.
 *
 * Questions this screen answers: *what can I do, with what I have, and how is it
 * executed?* It is reachable from the shell at `#/ejercicios`, and it accepts the
 * filters in the URL (`#/ejercicios/pecho`) so a link can carry a view.
 *
 * The screen owns no catalog logic: projection, search, filtering and sorting all
 * live in `features/exercises/library.ts`. What is here is the arrangement —
 * search first, filters as chips, rows that are single big tap targets.
 *
 * @module screens/ExercisesScreen
 */

import { useMemo, useState } from "react";
import {
  allFamilies,
  buildRows,
  queryLibrary,
  type ExerciseRowData,
  type LibraryFilters,
} from "../features/exercises/library";
import { ExerciseThumb } from "../features/exercises/ExerciseThumb";
import { t, tInterp } from "../lib/i18n";
import { familyLabel } from "../lib/format";
import {
  Badge,
  Card,
  Chip,
  EmptyState,
  NavRow,
  SectionHeader,
} from "../ui/primitives";
import { IconClose, IconDumbbell, IconSearch } from "../ui/icons";
import { navigate } from "../app/router";

const CATEGORIES = [
  "compound",
  "isolation",
  "bodyweight",
  "cable",
  "machine",
  "cardio",
] as const;

export default function ExercisesScreen({
  initialFamily,
}: {
  /** From the route (`#/ejercicios/pecho`), so a deep link can preselect. */
  initialFamily?: string;
}) {
  const families = useMemo(() => allFamilies(), []);
  const rows = useMemo(() => buildRows(), []);

  const [filters, setFilters] = useState<LibraryFilters>({
    query: "",
    family: (initialFamily as LibraryFilters["family"]) ?? null,
    category: null,
  });
  const [sort, setSort] = useState<"az" | "level">("az");

  const result = useMemo(
    () => queryLibrary(rows, filters, sort),
    [rows, filters, sort],
  );

  const active = filters.family !== null || filters.category !== null;

  return (
    <div className="mx-auto w-full max-w-3xl flex flex-col gap-4">
      <SectionHeader
        title={t("ex.title")}
        hint={tInterp("ex.count", {
          total: result.total,
          guide: result.withGuide,
        })}
      />

      {/* ── Search ───────────────────────────────────────────────────────── */}
      <div className="relative">
        <IconSearch
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--tl-text-muted)] pointer-events-none"
        />
        <input
          value={filters.query}
          onChange={(e) =>
            setFilters((prev) => ({ ...prev, query: e.target.value }))
          }
          placeholder={t("ex.search")}
          aria-label={t("ex.search")}
          /* No `type` attribute on purpose: the app-wide touch rules and the
             iOS font-size guard key off the element, not an attribute. */
          className="tl-input w-full pl-10 pr-10 py-2.5"
        />
        {filters.query !== "" && (
          <button
            type="button"
            aria-label={t("ex.clear")}
            onClick={() => setFilters((prev) => ({ ...prev, query: "" }))}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-[var(--tl-text-muted)] hover:text-[var(--tl-text)] tl-focusable"
          >
            <IconClose size={16} />
          </button>
        )}
      </div>

      {/* ── Filters ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-2">
        {/* Horizontal strips rather than a wrapping block: on a phone 13 family
            chips would eat a third of the screen. `tl-hscroll` hides the bar. */}
        <div className="tl-hscroll -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto">
          {families.map((family) => (
            <Chip
              key={family}
              active={filters.family === family}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  family: prev.family === family ? null : family,
                }))
              }
            >
              {familyLabel(family)}
            </Chip>
          ))}
        </div>
        <div className="tl-hscroll -mx-4 px-4 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto items-center">
          {CATEGORIES.map((category) => (
            <Chip
              key={category}
              active={filters.category === category}
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  category: prev.category === category ? null : category,
                }))
              }
            >
              {t(`ex.cat.${category}`)}
            </Chip>
          ))}
          <span className="mx-1 h-5 w-px bg-[var(--tl-border)] shrink-0" />
          <Chip active={sort === "az"} onClick={() => setSort("az")}>
            {t("ex.sort.az")}
          </Chip>
          <Chip active={sort === "level"} onClick={() => setSort("level")}>
            {t("ex.sort.level")}
          </Chip>
        </div>
      </div>

      {/* ── The list ─────────────────────────────────────────────────────── */}
      {result.rows.length === 0 ? (
        <EmptyState
          icon={<IconDumbbell size={28} />}
          title={t("ex.none")}
          body={t("ex.noneHint")}
          action={
            active ? (
              <Chip
                onClick={() =>
                  setFilters({ query: "", family: null, category: null })
                }
              >
                {t("ex.clearFilters")}
              </Chip>
            ) : undefined
          }
        />
      ) : (
        <Card padded={false} className="divide-y divide-[var(--tl-border)]">
          {result.rows.map((row) => (
            <ExerciseListRow key={row.id} row={row} />
          ))}
        </Card>
      )}

      {/* Honest footer: the sorting shortcut we cannot offer yet, and why. */}
      {result.searching && result.matching > 0 && (
        <p className="text-xs text-[var(--tl-text-muted)] text-center">
          {tInterp("ex.showing", { n: result.matching })}
        </p>
      )}
    </div>
  );
}

function ExerciseListRow({ row }: { row: ExerciseRowData }) {
  const muscles =
    row.primaryMuscles.length > 0
      ? row.primaryMuscles.join(" · ")
      : row.familyLabel;
  return (
    <NavRow
      className="rounded-none px-4 py-3"
      onClick={() => navigate("exercises", [row.id])}
      leading={<ExerciseThumb label={row.familyLabel} size={44} />}
      title={row.name}
      subtitle={`${muscles} · ${row.equipment}`}
      trailing={
        <div className="flex items-center gap-1.5 shrink-0">
          {/* A badge that is on every row distinguishes nothing. These two do:
              an extra coaching layer for this variant, and a conditioning slot. */}
          {row.hasVariantCues && <Badge tone="accent">{t("ex.variant")}</Badge>}
          {row.isCardio && <Badge tone="info">{t("ex.cardio")}</Badge>}
          <Badge tone="neutral">
            {t("ex.level")} {row.difficulty}
          </Badge>
        </div>
      }
    />
  );
}

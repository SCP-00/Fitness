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
import { useStore } from "../app/store";
import { favoriteIds, withFavorite } from "../lib/favorites";
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
import { IconClose, IconDumbbell, IconSearch, IconStar } from "../ui/icons";
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
  const { settings, patch } = useStore();
  const families = useMemo(() => allFamilies(), []);
  const rows = useMemo(() => buildRows(), []);

  const [filters, setFilters] = useState<LibraryFilters>({
    query: "",
    family: (initialFamily as LibraryFilters["family"]) ?? null,
    category: null,
    onlyFavorites: false,
  });
  const [sort, setSort] = useState<"az" | "level">("az");

  /* The stars live in settings (2026-10-20), so the library reads the same list
     the store persists — and a star tapped here survives the reload, the backup
     and the next session. */
  const favs = favoriteIds(settings);
  const result = useMemo(
    () => queryLibrary(rows, filters, sort, favs),
    [rows, filters, sort, favs],
  );

  const active =
    filters.family !== null ||
    filters.category !== null ||
    filters.onlyFavorites === true;

  if (!settings) {
    return <div className="tl-loading">{t("common.loading")}</div>;
  }

  const toggleFavorite = (id: string) => {
    patch(withFavorite(settings, id));
  };

  /* Grouped by muscle family for the A–Z view — 94 rows in one flat list is
     what made this screen unreadable. Searching or difficulty-sorting keeps
     a single flat list (grouping would scramble a ranked order). */
  const grouped: [string, ExerciseRowData[]][] | null =
    !result.searching && sort === "az" && result.rows.length > 0
      ? (() => {
          const map = new Map<string, ExerciseRowData[]>();
          for (const row of result.rows) {
            const list = map.get(row.familyLabel);
            if (list) list.push(row);
            else map.set(row.familyLabel, [row]);
          }
          const ordered: [string, ExerciseRowData[]][] = [];
          for (const family of families) {
            const key = familyLabel(family);
            const list = map.get(key);
            if (list) {
              ordered.push([key, list]);
              map.delete(key);
            }
          }
          for (const rest of map) ordered.push(rest); // safety net
          return ordered;
        })()
      : null;

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
            chips would eat a third of the screen. `tl-hscroll` hides the bar.
            From `sm` up they wrap instead (2026-10-23): the 13 family chips are
            1110 px wide against a 768 px row, so `romboides` and `pantorrillas`
            sat outside the row with no scrollbar to hint at them and no way to
            filter by them on a desktop. Two rows of chips cost 30 px. */}
        {/* `-mx-3.5` = the 14 px `.content` gutter on a phone; `-mx-4` (16 px)
            stuck out 2 px and widened the page (audited 2026-10-18). */}
        <div className="tl-hscroll -mx-3.5 px-3.5 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-x-visible">
          <Chip
            active={filters.onlyFavorites === true}
            title={t("ex.favOnly")}
            onClick={() =>
              setFilters((prev) => ({
                ...prev,
                onlyFavorites: !prev.onlyFavorites,
              }))
            }
          >
            <span className="flex items-center gap-1">
              <IconStar size={11} />
              {t("ex.fav")}
            </span>
          </Chip>
          <span className="mx-1 h-5 w-px bg-[var(--tl-border)] shrink-0" />
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
        <div className="tl-hscroll -mx-3.5 px-3.5 sm:mx-0 sm:px-0 flex gap-1.5 overflow-x-auto sm:flex-wrap sm:overflow-x-visible items-center">
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

      {/* ── Legend: "what does Level mean?" answered on screen (owner, 2026-10-08) ── */}
      <div className="rounded-xl border border-[var(--tl-border)] bg-[var(--tl-surface-2)] px-3.5 py-2.5 text-xs text-[var(--tl-text-secondary)] flex items-start gap-2">
        <span className="mt-0.5 flex shrink-0 items-center gap-0.5" aria-hidden>
          {[1, 2, 3, 4, 5].map((i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full ${i <= 3 ? "bg-[var(--tl-accent)]" : "bg-[var(--tl-border-strong)]"}`}
            />
          ))}
        </span>
        <p>
          <span className="font-semibold text-[var(--tl-text)]">
            {t("ex.level")}
          </span>{" "}
          — {t("ex.difficultyHint")}
        </p>
      </div>

      {/* ── The list ─────────────────────────────────────────────────────── */}
      {result.rows.length === 0 ? (
        /* Two different empties, because they mean different things: nothing
           starred yet (a feature to discover) is not "your search found
           nothing" (a query to change). */
        filters.onlyFavorites === true && favs.length === 0 ? (
          <EmptyState
            icon={<IconStar size={28} />}
            title={t("ex.favNone")}
            body={t("ex.favNoneHint")}
            action={
              <Chip
                onClick={() =>
                  setFilters((prev) => ({ ...prev, onlyFavorites: false }))
                }
              >
                {t("ex.clearFilters")}
              </Chip>
            }
          />
        ) : (
          <EmptyState
            icon={<IconDumbbell size={28} />}
            title={t("ex.none")}
            body={t("ex.noneHint")}
            action={
              active ? (
                <Chip
                  onClick={() =>
                    setFilters({
                      query: "",
                      family: null,
                      category: null,
                      onlyFavorites: false,
                    })
                  }
                >
                  {t("ex.clearFilters")}
                </Chip>
              ) : undefined
            }
          />
        )
      ) : grouped ? (
        /* Grouped by muscle family (A–Z sort): 94 rows in one flat list is
           what made this screen unreadable — headers give it structure. */
        <div className="flex flex-col">
          {grouped.map(([label, groupRows]) => (
            <section key={label}>
              <div className="sticky top-0 z-10 flex items-baseline justify-between gap-2 px-4 py-2 bg-[var(--tl-surface-2)] border-b border-[var(--tl-border)]">
                <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--tl-text-muted)]">
                  {label}
                </h3>
                <span className="text-[11px] tabular-nums text-[var(--tl-text-muted)]">
                  {groupRows.length} {t("ex.exercises")}
                </span>
              </div>
              <div className="divide-y divide-[var(--tl-border)]">
                {groupRows.map((row) => (
                  <ExerciseListRow
                    key={row.id}
                    row={row}
                    favorite={favs.includes(row.id)}
                    onToggle={() => toggleFavorite(row.id)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card padded={false} className="divide-y divide-[var(--tl-border)]">
          {result.rows.map((row) => (
            <ExerciseListRow
              key={row.id}
              row={row}
              favorite={favs.includes(row.id)}
              onToggle={() => toggleFavorite(row.id)}
            />
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

function ExerciseListRow({
  row,
  favorite,
  onToggle,
}: {
  row: ExerciseRowData;
  favorite: boolean;
  onToggle: () => void;
}) {
  const muscles =
    row.primaryMuscles.length > 0
      ? row.primaryMuscles.join(" · ")
      : row.familyLabel;
  return (
    /* The star is a sibling of the row, not a child of it: `NavRow` renders a
       `<button>` when it navigates, and a button inside a button is invalid
       HTML — it also hijacks the tap on iOS. */
    <div className="flex items-center">
      <div className="min-w-0 flex-1">
        <NavRow
          className="rounded-none px-4 py-3"
          onClick={() => navigate("exercises", [row.id])}
          leading={
            // The reference the row is actually about: without `exerciseId` this slot
            // was a monogram for all 151 exercises while 115 of them have media.
            <ExerciseThumb
              exerciseId={row.id}
              label={row.familyLabel}
              size={44}
            />
          }
          title={row.name}
          subtitle={`${muscles} · ${row.equipment}`}
          trailing={
            <div className="flex items-center gap-1.5 shrink-0">
              {/* A badge that is on every row distinguishes nothing. These two do:
              an extra coaching layer for this variant, and a conditioning slot. */}
              {row.hasVariantCues && (
                <Badge tone="accent">{t("ex.variant")}</Badge>
              )}
              {row.isCardio && <Badge tone="info">{t("ex.cardio")}</Badge>}
              {/* Difficulty as a 5-dot meter — a wordless scale reads faster than
              "Nivel 3", and the title spells out what the dots mean. */}
              <span
                className="flex items-center gap-0.5 pl-1"
                title={`${t("ex.level")} ${row.difficulty}/5`}
                aria-label={`${t("ex.level")} ${row.difficulty}/5`}
              >
                {[1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i <= row.difficulty
                        ? "bg-[var(--tl-accent)]"
                        : "bg-[var(--tl-border-strong)]"
                    }`}
                  />
                ))}
              </span>
            </div>
          }
        />
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={favorite}
        aria-label={t(favorite ? "ex.favRemove" : "ex.favAdd")}
        title={t(favorite ? "ex.favRemove" : "ex.favAdd")}
        /* 44 px square: the brief's minimum touch target, and the reason the
           icon is not simply drawn inside the row. */
        className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-lg tl-focusable ${
          favorite
            ? "text-[var(--tl-accent)]"
            : "text-[var(--tl-text-muted)] hover:text-[var(--tl-text)]"
        }`}
      >
        <IconStar size={17} className={favorite ? "fill-current" : ""} />
      </button>
    </div>
  );
}

/**
 * A real line-art map with a generated pixel mask. The PNG is the anatomy; the
 * grey-scale mask only identifies muscle regions. React colours those pixels
 * from the selected period's real, family-weighted training stimulus.
 *
 * **Two figures since 2026-09-30 (f).** The owner supplied `Modelo2D_Woman.png`
 * for the female profile, and its mask was derived from the male one instead of
 * being traced by hand (`scripts/build-body-map-mask.mjs`: the two drawings are
 * the same anatomical rig, so the regions transfer through four landmarks
 * measured on each silhouette). Both figures are the *same* 13 families and the
 * same lenses — only the drawing and its mask change, which is why nothing else
 * in this component branches on sex.
 *
 * The two PNGs also have opposite polarity: the male map is dark line work on
 * white (the CSS inverts it), the woman is light line work on black (drawn as
 * it comes). That is the only per-figure styling difference.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { familyLabel } from "../../lib/format";
import { t, tInterp } from "../../lib/i18n";
import type { BodyMapFigure } from "../../lib/settings";
import { anatomyFocusesForFamily, primaryExercisesForFocus } from "./anatomy";
import type { FamilyBalance } from "./derive";

export interface Band {
  key: "excellent" | "strong" | "moderate" | "weak" | "veryLow";
  min: number;
  color: string;
}

/** The training-map palette: green → lime → amber → orange → red. */
export const BANDS: Band[] = [
  { key: "excellent", min: 80, color: "#39d98a" },
  { key: "strong", min: 60, color: "#9ce847" },
  { key: "moderate", min: 40, color: "#ffc857" },
  { key: "weak", min: 20, color: "#ff7908" },
  { key: "veryLow", min: 0, color: "#ff4f4f" },
];

/**
 * The goal-lens palette, deliberately the reverse gradient: red = far from
 * the goal, green = at it. Same five bands, opposite direction — that is the
 * whole trick that makes the mode switch readable at a glance.
 */
export const GOAL_BANDS: Band[] = [
  { key: "excellent", min: 80, color: "#39d98a" },
  { key: "strong", min: 60, color: "#9ce847" },
  { key: "moderate", min: 40, color: "#ffc857" },
  { key: "weak", min: 20, color: "#ff7908" },
  { key: "veryLow", min: 0, color: "#ff4f4f" },
];

/** Family IDs encoded in public/traininglab-body-map-regions.png. */
export const BODY_MAP_FAMILIES = [
  "chest",
  "shoulders",
  "triceps",
  "biceps",
  "forearms",
  "lats",
  "traps",
  "rhomboids",
  "core",
  "glutes",
  "quadriceps",
  "hamstrings",
  "calves",
] as const;

/**
 * The two drawings, with everything that differs between them. `invert` is the
 * CSS filter: the male PNG is dark-on-white (so it is inverted to light-on-dark) and
 * the woman's is already light-on-dark.
 */
const FIGURES: Record<
  BodyMapFigure,
  {
    image: string;
    mask: string;
    width: number;
    height: number;
    frameWidth: number;
    invert: boolean;
  }
> = {
  male: {
    image: `${import.meta.env.BASE_URL}traininglab-body-map.png`,
    mask: `${import.meta.env.BASE_URL}traininglab-body-map-regions.png`,
    width: 1044,
    height: 1024,
    frameWidth: 1044,
    invert: true,
  },
  female: {
    image: `${import.meta.env.BASE_URL}traininglab-body-map-woman.png`,
    mask: `${import.meta.env.BASE_URL}traininglab-body-map-woman-regions.png`,
    width: 1536,
    height: 1024,
    // Crop the source's wide side margins in the viewport so both anatomies
    // render at the same scale; image and mask retain matching source pixels.
    // Hit-testing needs no crop: the canvas rect already spans the full source.
    frameWidth: 1044,
    invert: false,
  },
};

function bandFor(index: number): Band {
  return BANDS.find((band) => index >= band.min) ?? BANDS[BANDS.length - 1]!;
}

function rgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

export function BodyMap({
  balance,
  label,
  mode = "training",
  goals = null,
  goalsUnavailable,
  figure = "male",
}: {
  balance: FamilyBalance[];
  label: string;
  /** `training` = stimulus lens (default); `goal` = proximity lens. */
  mode?: "training" | "goal";
  /** Pre-computed per-family goal proximity (required in goal mode). */
  goals?: Map<string, import("./goals").FamilyGoal> | null;
  /** Goal mode with no usable source: shown as the map's one-line why. */
  goalsUnavailable?: string | null;
  /** Which drawing to paint. Same families, same lenses, different anatomy. */
  figure?: BodyMapFigure;
}) {
  const fig = FIGURES[figure];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskPixels = useRef<Uint8ClampedArray | null>(null);
  const indexRef = useRef(new Map<string, number>());
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedFocus, setSelectedFocus] = useState("");
  const index = useMemo(
    () => new Map(balance.map((row) => [row.family as string, row.index])),
    [balance],
  );
  indexRef.current = index;
  const byFamily = useMemo(
    () => new Map(balance.map((row) => [row.family as string, row])),
    [balance],
  );

  const bands = mode === "goal" ? GOAL_BANDS : BANDS;
  /**
   * Which band paints one family, per lens. Kept behind a ref so the mask's
   * `onload` (which runs once, holding the first render's closure) repaints
   * with the *current* mode instead of the mode that existed at mount.
   */
  const bandOf = (family: string): Band | null => {
    if (modeRef.current === "goal") {
      const goal = goals?.get(family);
      if (!goal) return null;
      return bandFor(goal.index);
    }
    const value = indexRef.current.get(family);
    return value === undefined ? null : bandFor(value);
  };
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    // A figure switch invalidates the loaded mask: never paint one drawing's
    // regions through the other's mask.
    maskPixels.current = null;
    const mask = new Image();
    mask.src = fig.mask;
    mask.onload = () => {
      const layer = document.createElement("canvas");
      layer.width = mask.naturalWidth;
      layer.height = mask.naturalHeight;
      const context = layer.getContext("2d", { willReadFrequently: true });
      if (!context) return;
      context.drawImage(mask, 0, 0);
      maskPixels.current = context.getImageData(
        0,
        0,
        layer.width,
        layer.height,
      ).data;
      paint();
    };
    mask.onerror = () => {
      maskPixels.current = null;
    };

    return () => {
      mask.onload = null;
      mask.onerror = null;
    };
    // The mask is immutable per figure; balance changes repaint the display
    // canvas below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fig.mask]);

  function paint() {
    const canvas = canvasRef.current;
    const pixels = maskPixels.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context || !pixels) return;
    canvas.width = fig.width;
    canvas.height = fig.height;

    const image = context.createImageData(fig.width, fig.height);
    const familyColors = BODY_MAP_FAMILIES.map((family) => {
      const band = bandOf(family);
      if (!band) return [214, 220, 225, 165] as const;
      return [...rgb(band.color), 218] as const;
    });

    for (let pixel = 0; pixel < fig.width * fig.height; pixel += 1) {
      const region = pixels[pixel * 4]!;
      if (region < 1 || region > familyColors.length) continue;
      const color = familyColors[region - 1]!;
      const offset = pixel * 4;
      image.data[offset] = color[0]!;
      image.data[offset + 1] = color[1]!;
      image.data[offset + 2] = color[2]!;
      image.data[offset + 3] = color[3]!;
    }
    context.putImageData(image, 0, 0);
  }

  useEffect(() => {
    paint();
    // `paint` reads the refs plus the memoised lens inputs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode, goals, figure]);

  function selectAt(clientX: number, clientY: number) {
    const canvas = canvasRef.current;
    const pixels = maskPixels.current;
    if (!canvas || !pixels) return;
    const rect = canvas.getBoundingClientRect();
    // The canvas renders the *whole* source image (uniform scale, cropped by
    // the box's overflow), so the client ratio maps straight onto source
    // pixels. Do not use frameWidth/cropX here: those describe the visible
    // frame, not the rect we are measuring — mixing them (the first female
    // build) shifted every click toward the centre and picked the wrong family.
    const x = Math.min(
      fig.width - 1,
      Math.max(
        0,
        Math.floor(((clientX - rect.left) / rect.width) * fig.width),
      ),
    );
    const y = Math.min(
      fig.height - 1,
      Math.max(
        0,
        Math.floor(((clientY - rect.top) / rect.height) * fig.height),
      ),
    );
    const family = BODY_MAP_FAMILIES[pixels[(y * fig.width + x) * 4]! - 1];
    if (family) setSelected(family);
  }

  const selectedRow = selected ? byFamily.get(selected) : undefined;
  const selectedGoal = selected ? goals?.get(selected) : undefined;
  const unavailable = mode === "goal" ? (goalsUnavailable ?? null) : null;
  const anatomyFocuses = selected ? anatomyFocusesForFamily(selected) : [];
  const focus = anatomyFocuses.find((item) => item.id === selectedFocus);
  const suggestedExercises = focus ? primaryExercisesForFocus(focus.id) : [];

  useEffect(() => {
    setSelectedFocus(anatomyFocusesForFamily(selected ?? "")[0]?.id ?? "");
  }, [selected]);

  return (
    <div className="tl-body-map" data-label={label} data-figure={figure}>
      <div
        className="tl-body-figure"
        style={{ aspectRatio: `${fig.frameWidth} / ${fig.height}` }}
      >
        <img
          className={`tl-body-image ${fig.invert ? "is-inverted" : "is-plain"}`}
          src={fig.image}
          width={fig.width}
          height={fig.height}
          alt={t("progress.body.mapAlt")}
          draggable={false}
        />
        <canvas
          ref={canvasRef}
          className="tl-body-map-canvas"
          aria-hidden="true"
          onClick={(event) => selectAt(event.clientX, event.clientY)}
        />
      </div>
      <div className="tl-body-picker-wrap">
        <label className="tl-body-picker-label" htmlFor="body-map-family">
          {t("progress.body.selectFamily")}
        </label>
        <select
          id="body-map-family"
          className="tl-body-picker"
          value={selected ?? ""}
          onChange={(event) => setSelected(event.currentTarget.value || null)}
        >
          <option value="">{t("progress.body.tapHint")}</option>
          {BODY_MAP_FAMILIES.map((family) => (
            <option key={family} value={family}>
              {familyLabel(family)}
            </option>
          ))}
        </select>
      </div>{" "}
      {unavailable && <p className="tl-body-goal-note">{unavailable}</p>}
      <p className="tl-body-selection" aria-live="polite">
        {selected
          ? mode === "goal"
            ? tInterp("progress.body.goalStats", {
                family: familyLabel(selected),
                goal: selectedGoal?.targetCm?.toFixed(1) ?? "—",
                actual: selectedGoal?.actualCm?.toFixed(1) ?? "—",
                index: selectedGoal?.index ?? 0,
              })
            : tInterp("progress.body.selectedStats", {
                family: familyLabel(selected),
                stimulus: selectedRow?.stimulus.toFixed(1) ?? "0.0",
                sets: selectedRow?.total ?? 0,
                index: selectedRow?.index ?? 0,
              })
          : t("progress.body.tapHint")}
      </p>
      {selected && anatomyFocuses.length > 0 && (
        <section
          className="tl-body-anatomy-focus"
          aria-label={t("progress.body.focusTitle")}
        >
          <h4>{t("progress.body.focusTitle")}</h4>
          <div
            className="tl-body-focus-options"
            role="group"
            aria-label={t("progress.body.focusTitle")}
          >
            {anatomyFocuses.map((item) => (
              <button
                key={item.id}
                type="button"
                className="tl-body-focus-chip"
                aria-pressed={selectedFocus === item.id}
                onClick={() => setSelectedFocus(item.id)}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </div>
          <h5>{t("progress.body.exerciseTitle")}</h5>
          <ul className="tl-body-exercise-list">
            {suggestedExercises.map((exercise) => (
              <li key={exercise.id}>{exercise.name.es}</li>
            ))}
          </ul>
          <p className="tl-body-anatomy-note">
            {t("progress.body.exerciseEvidenceNote")}
          </p>
          {selected === "core" && (
            <p className="tl-body-anatomy-note">
              {t("progress.body.deepCoreNote")}
            </p>
          )}
          {selected === "quadriceps" && (
            <p className="tl-body-anatomy-note">
              {t("progress.body.quadricepsSpecificityNote")}
            </p>
          )}
        </section>
      )}
      <div className="tl-legend">
        {bands.map((band) => (
          <div key={band.key} className="tl-legend-row">
            <span
              className="tl-legend-dot"
              style={{ background: band.color }}
            />
            {t(`progress.band.${band.key}`)}
          </div>
        ))}
        <div className="tl-legend-row">
          <span className="tl-legend-dot" style={{ background: "#d6dce1" }} />
          {t("progress.body.noData")}
        </div>
      </div>
    </div>
  );
}

/**
 * What each measurement **can and cannot** support, in one place.
 *
 * Plan T02 asks for a catalogue that carries unit, protocol, source, applicable
 * population and limits. The protocol (where the tape goes) lives in
 * `./protocols.ts`; this file carries the rest — the unit, and the sentence that
 * stops a number from becoming a claim it cannot back.
 *
 * Every verdict here is copied from the reviewed document
 * `docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md` §6 («Qué se puede y qué no se puede
 * afirmar») and its bibliography (F2 Whyte & Gallagher 2022, F3 Hodgdon & Beckett
 * 1984, F6 Merrill et al. 2019). Nothing is added from memory: if a claim is not in
 * that table, it does not belong here.
 *
 * Why the UI needs it as data: the app shows a circumference next to an estimated
 * body-fat percentage with the same typographic weight. A tape reading is a fact;
 * the percentage is an estimate with a standard error; a skinfold percentage is not
 * an individual claim at all. Those three must not look alike.
 *
 * @module measurements/facts
 */

import type { Bilingual } from "./protocols";

/** How a number earns the right to be stated. */
export type ClaimVerdict = "measured" | "estimate" | "not-supported";

export interface MeasurementClaim {
  statement: Bilingual;
  verdict: ClaimVerdict;
  /** Short citation, as printed next to the number. */
  source: string;
}

export interface MeasurementFacts {
  /** Canonical unit the app stores. */
  unit: "cm" | "kg" | "%";
  claims: MeasurementClaim[];
}

const F2 = "Whyte & Gallagher 2022, F2";
const F3 = "Hodgdon & Beckett 1984 (US Navy), F3";
const F6 = "Merrill et al. 2019, F6";
const DOC = "Protocolo de medición §6";

const GIRTH_MEASURED: MeasurementClaim = {
  verdict: "measured",
  source: DOC,
  statement: {
    en: "A circumference is a direct reading: repeatable when the protocol is respected.",
    es: "Un perímetro es una lectura directa: repetible si se respeta el protocolo.",
  },
};

const NO_TREND_UNDER_NOISE: MeasurementClaim = {
  verdict: "measured",
  source: DOC,
  statement: {
    en: "Do not call a difference a trend when both readings sit inside the tape's own error (~0.5–1 cm).",
    es: "No llames tendencia a una diferencia si ambas lecturas caen dentro del error de la cinta (~0,5–1 cm).",
  },
};

const girth = (): MeasurementFacts => ({
  unit: "cm",
  claims: [GIRTH_MEASURED, NO_TREND_UNDER_NOISE],
});

export const MEASUREMENT_FACTS: Record<string, MeasurementFacts> = {
  // ── Girths: a fact, with a noise floor ──────────────────────────────────
  wrist: girth(),
  neck: girth(),
  shoulders: girth(),
  chest: girth(),
  waist: {
    unit: "cm",
    claims: [
      GIRTH_MEASURED,
      NO_TREND_UNDER_NOISE,
      {
        verdict: "measured",
        source: DOC,
        statement: {
          en: "Waist-to-height is one of the few ratios the tape does support; it is the waist reading's strongest published use.",
          es: "La relación cintura/altura es una de las pocas que la cinta sí sostiene; es el uso publicado más sólido de la cintura.",
        },
      },
    ],
  },
  hips: girth(),
  biceps: girth(),
  forearm: girth(),
  thigh: girth(),
  calf: girth(),

  // ── Base: stature and the scale ─────────────────────────────────────────
  height: {
    unit: "cm",
    claims: [
      {
        verdict: "measured",
        source: DOC,
        statement: {
          en: "Height and sitting height together describe body proportion better than height alone.",
          es: "Estatura y estatura sentado juntas describen la proporción corporal mejor que la estatura sola.",
        },
      },
    ],
  },
  weight: {
    unit: "kg",
    claims: [
      {
        verdict: "measured",
        source: F2,
        statement: {
          en: "Body mass is a direct reading; on its own it says nothing about composition.",
          es: "La masa corporal es una lectura directa; por sí sola no dice nada de la composición.",
        },
      },
    ],
  },

  // ── Derived figures: estimates, and one that is not an individual claim ─
  body_fat_percentage: {
    unit: "%",
    claims: [
      {
        verdict: "estimate",
        source: F3,
        statement: {
          en: "Circumference-based body fat is an estimate: SEE ±3.5 % against hydrostatic weighing.",
          es: "El porcentaje de grasa por perímetros es una estimación: SEE ±3,5 % frente a pesaje hidrostático.",
        },
      },
      {
        verdict: "not-supported",
        source: F2,
        statement: {
          en: "A skinfold-based percentage is not an individual claim: the error is large per person and valid only at group level.",
          es: "El porcentaje por pliegues no es una afirmación individual: el error por persona es grande y solo vale a nivel de grupo.",
        },
      },
      {
        verdict: "not-supported",
        source: DOC,
        statement: {
          en: "It does not identify where the fat is; only the skinfolds speak about distribution.",
          es: "No identifica dónde está la grasa; solo los pliegues hablan de distribución.",
        },
      },
    ],
  },
  lean_mass: {
    unit: "kg",
    claims: [
      {
        verdict: "estimate",
        source: F3,
        statement: {
          en: "Lean mass inherits the body-fat estimate's error, because it is computed from it.",
          es: "La masa magra hereda el error de la estimación de grasa, porque se calcula a partir de ella.",
        },
      },
      {
        verdict: "estimate",
        source: F6,
        statement: {
          en: "Volumes or segment parameters predicted from measurements can be off by up to 40 %: show them as an estimate with its range, never as a figure.",
          es: "Los volúmenes o parámetros segmentarios predichos desde medidas pueden errar hasta un 40 %: muéstralos como estimación con su rango, nunca como cifra.",
        },
      },
    ],
  },
};

/** The claim that keeps the app from drawing a body it has not measured. */
export const NOT_A_SCAN: MeasurementClaim = {
  verdict: "not-supported",
  source: DOC,
  statement: {
    en: "A parametric 3D body would be an approximation: circumferences constrain it, they do not determine it.",
    es: "Un cuerpo 3D paramétrico sería una aproximación: los perímetros lo constriñen, no lo determinan.",
  },
};

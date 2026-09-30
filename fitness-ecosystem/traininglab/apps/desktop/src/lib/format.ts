/**
 * Renderer for the planner's structured reasons and advisories.
 *
 * Core never writes UI copy: it emits `{ code, params }` and this module turns
 * those into the user's language. That keeps the maths package pure and the app
 * fully bilingual (the previous English strings leaked into the Spanish UI).
 *
 * @module lib/format
 */

import type { PlanAdvisory, PlanReason } from "./plan";
import { getLanguage } from "./i18n";

const COPY: Record<string, { en: string; es: string }> = {
  // Reasons
  "reason.weak_family": {
    en: "{family} is your weakest available family ({score}/100)",
    es: "{family} es tu familia más débil disponible ({score}/100)",
  },
  "reason.no_anthro": {
    en: "{family} has no BodyLab measurement yet",
    es: "{family} aún no tiene medición en BodyLab",
  },
  "reason.weekly_gap": {
    en: "only {sets} sets this week",
    es: "solo {sets} series esta semana",
  },
  "reason.stress_aware": {
    en: "lower joint/spine stress for today’s readiness",
    es: "menor estrés articular/de columna para tu estado de hoy",
  },
  "reason.model_ranked": {
    en: "prioritised by your local model ({score}%)",
    es: "priorizado por tu modelo local ({score}%)",
  },
  "reason.coverage": {
    en: "covers today’s missing {group} work",
    es: "cubre el trabajo de {group} que faltaba hoy",
  },
  "reason.cardio_due": {
    en: "conditioning score is {score}/100 — aerobic work belongs in today",
    es: "tu condición física está en {score}/100 — el trabajo aeróbico toca hoy",
  },
  "reason.cardio_goal": {
    en: "recomposition goal — conditioning programmed as its own block",
    es: "objetivo de recomposición — acondicionamiento como bloque propio",
  },
  "reason.swapped": {
    en: "swapped by you",
    es: "cambiada por ti",
  },
  "reason.coach": {
    en: "chosen by your local coach",
    es: "elegida por tu coach local",
  },
  // Advisories
  "advisory.readiness_low": {
    en: "Low readiness: volume cut to {n}% of the plan.",
    es: "Estado bajo: volumen reducido al {n}% del plan.",
  },
  "advisory.no_equipment": {
    en: "No exercise is available with the declared equipment — add what you own.",
    es: "No hay ningún ejercicio posible con el equipamiento declarado — añade lo que tengas.",
  },
  "advisory.above_ceiling": {
    en: "{families} reaches {n} sets this week (above the {level} ceiling of {ceiling}) — leave it out next time.",
    es: "{families} llega a {n} series esta semana (por encima del techo {level} de {ceiling}) — déjala fuera la próxima vez.",
  },
  "advisory.group_no_time": {
    en: "No time left for {group} work in {n} minutes.",
    es: "No queda tiempo para el trabajo de {group} en {n} minutos.",
  },
  "advisory.group_no_equipment": {
    en: "No {group} exercise is possible with your equipment.",
    es: "No hay ningún ejercicio de {group} posible con tu equipamiento.",
  },
  "advisory.left_out": {
    en: "Left out for time: {ids}{more}.",
    es: "Fuera por tiempo: {ids}{more}.",
  },
  "advisory.volume_capped": {
    en: "Session capped at {n} working sets — the {level} volume ceiling for a single session.",
    es: "Sesión limitada a {n} series de trabajo — techo de volumen {level} para una sola sesión.",
  },
  "advisory.cardio_no_room": {
    en: "Conditioning is due but there is no room left today.",
    es: "El acondicionamiento toca pero hoy no hay hueco.",
  },
  "advisory.cardio_no_gear": {
    en: "Conditioning is due but no bike/rope/stairs are declared.",
    es: "El acondicionamiento toca pero no has declarado bici/cuerda/escaleras.",
  },
  "advisory.fatigued_all": {
    en: "Every available exercise overlaps a sore area — rest or change focus.",
    es: "Todos los ejercicios disponibles tocan zonas con agujetas — descansa o cambia de enfoque.",
  },
};

const GROUP_LABEL: Record<string, { en: string; es: string }> = {
  push: { en: "push", es: "empuje" },
  pull: { en: "pull", es: "tracción" },
  legs: { en: "legs", es: "pierna" },
  core: { en: "core", es: "core" },
};

function fill(
  template: string,
  params: Record<string, string | number>,
): string {
  let out = template;
  for (const [k, v] of Object.entries(params)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function lookup(key: string): string {
  const entry = COPY[key];
  if (!entry) return key;
  return entry[getLanguage()] ?? entry.en;
}

const FAMILY_LABEL: Record<string, { en: string; es: string }> = {
  chest: { en: "chest", es: "pecho" },
  shoulders: { en: "shoulders", es: "hombros" },
  triceps: { en: "triceps", es: "tríceps" },
  biceps: { en: "biceps", es: "bíceps" },
  forearms: { en: "forearms", es: "antebrazos" },
  lats: { en: "lats", es: "dorsales" },
  traps: { en: "traps", es: "trapecios" },
  rhomboids: { en: "rhomboids", es: "romboides" },
  quadriceps: { en: "quadriceps", es: "cuádriceps" },
  hamstrings: { en: "hamstrings", es: "isquios" },
  glutes: { en: "glutes", es: "glúteos" },
  calves: { en: "calves", es: "pantorrillas" },
  core: { en: "core", es: "core" },
};

/** Translated family label (falls back to the raw id). */
export function familyLabel(family: string): string {
  const entry = FAMILY_LABEL[family];
  return entry ? (entry[getLanguage()] ?? entry.en) : family;
}

/**
 * The 34 catalog muscles, in the user's words.
 *
 * The catalog names muscles for the *model* (`chest_upper`, `triceps_long`) and
 * a screen cannot show those. This is the only place the mapping lives, and it
 * falls back to the raw id, so a muscle added to the core catalog shows up as
 * "new_muscle" instead of an empty cell.
 */
const MUSCLE_LABEL: Record<string, { en: string; es: string }> = {
  chest_upper: { en: "Upper chest", es: "Pecho superior" },
  chest_lower: { en: "Lower chest", es: "Pecho inferior" },
  pectoralis_minor: { en: "Pectoralis minor", es: "Pectoral menor" },
  serratus_anterior: { en: "Serratus anterior", es: "Serrato anterior" },
  anterior_deltoid: { en: "Front deltoid", es: "Deltoides anterior" },
  lateral_deltoid: { en: "Side deltoid", es: "Deltoides lateral" },
  posterior_deltoid: { en: "Rear deltoid", es: "Deltoides posterior" },
  triceps_long: { en: "Triceps (long head)", es: "Tríceps (cabeza larga)" },
  triceps_lateral: {
    en: "Triceps (lateral head)",
    es: "Tríceps (cabeza lateral)",
  },
  triceps_medial: {
    en: "Triceps (medial head)",
    es: "Tríceps (cabeza medial)",
  },
  biceps_long: { en: "Biceps (long head)", es: "Bíceps (cabeza larga)" },
  biceps_short: { en: "Biceps (short head)", es: "Bíceps (cabeza corta)" },
  brachioradialis: { en: "Brachioradialis", es: "Braquiorradial" },
  forearm_flexors: { en: "Forearm flexors", es: "Flexores del antebrazo" },
  forearm_extensors: {
    en: "Forearm extensors",
    es: "Extensores del antebrazo",
  },
  lats_upper: { en: "Lats (upper)", es: "Dorsal (porción alta)" },
  lats_mid: { en: "Lats (mid)", es: "Dorsal (porción media)" },
  lats_lower: { en: "Lats (lower)", es: "Dorsal (porción baja)" },
  traps_upper: { en: "Upper traps", es: "Trapecio superior" },
  traps_mid: { en: "Mid traps", es: "Trapecio medio" },
  traps_lower: { en: "Lower traps", es: "Trapecio inferior" },
  rhomboids: { en: "Rhomboids", es: "Romboides" },
  rectus_abdominis: { en: "Rectus abdominis", es: "Recto abdominal" },
  obliques: { en: "Obliques", es: "Oblicuos" },
  erector_spinae: { en: "Erector spinae", es: "Erectores espinales" },
  iliopsoas: { en: "Iliopsoas", es: "Iliopsoas" },
  gluteus_maximus: { en: "Gluteus maximus", es: "Glúteo mayor" },
  gluteus_medius: { en: "Gluteus medius", es: "Glúteo medio" },
  quadriceps: { en: "Quadriceps", es: "Cuádriceps" },
  adductors: { en: "Adductors", es: "Aductores" },
  hamstrings: { en: "Hamstrings", es: "Isquiotibiales" },
  calves: { en: "Calves", es: "Gemelos" },
  soleus: { en: "Soleus", es: "Sóleo" },
  tibialis_anterior: { en: "Tibialis anterior", es: "Tibial anterior" },
};

/** Translated muscle label (falls back to the raw id). */
export function muscleLabel(muscle: string): string {
  const entry = MUSCLE_LABEL[muscle];
  return entry ? (entry[getLanguage()] ?? entry.en) : muscle;
}

const CATEGORY_LABEL: Record<string, { en: string; es: string }> = {
  compound: { en: "Compound", es: "Compuesto" },
  isolation: { en: "Isolation", es: "Aislamiento" },
  bodyweight: { en: "Bodyweight", es: "Peso corporal" },
  cable: { en: "Cable", es: "Polea" },
  machine: { en: "Machine", es: "Máquina" },
  cardio: { en: "Cardio", es: "Cardio" },
};

/** Translated category label (falls back to the raw id). */
export function categoryLabel(category: string): string {
  const entry = CATEGORY_LABEL[category];
  return entry ? (entry[getLanguage()] ?? entry.en) : category;
}

/** One reason as a short, translated phrase. */
export function formatReason(reason: PlanReason): string {
  switch (reason.code) {
    case "weak_family":
      return fill(lookup("reason.weak_family"), {
        family: familyLabel(reason.family ?? ""),
        score: reason.score ?? 0,
      });
    case "no_anthro":
      return fill(lookup("reason.no_anthro"), {
        family: familyLabel(reason.family ?? ""),
      });
    case "weekly_gap":
      return fill(lookup("reason.weekly_gap"), { sets: reason.sets ?? 0 });
    case "stress_aware":
      return lookup("reason.stress_aware");
    case "model_ranked":
      return fill(lookup("reason.model_ranked"), { score: reason.score ?? 0 });
    case "coverage": {
      const group =
        GROUP_LABEL[reason.group ?? ""]?.[getLanguage()] ?? reason.group ?? "";
      return fill(lookup("reason.coverage"), { group });
    }
    case "cardio_due":
      return fill(lookup("reason.cardio_due"), { score: reason.score ?? 0 });
    case "cardio_goal":
      return lookup("reason.cardio_goal");
    case "swapped":
      return lookup("reason.swapped");
    case "coach":
      return reason.note
        ? `${lookup("reason.coach")} — ${reason.note}`
        : lookup("reason.coach");
  }
}

/** One advisory line for the "notes for today" block. */
export function formatAdvisory(advisory: PlanAdvisory): string {
  const key = `advisory.${advisory.code}`;
  const families = (advisory.families ?? []).map(familyLabel).join(", ");
  const ids = (advisory.ids ?? []).join(", ");
  const more =
    advisory.n && advisory.ids
      ? ` (+${Math.max(0, advisory.n - advisory.ids.length)} more)`
      : "";
  const level = advisory.level ?? "intermediate";
  return fill(lookup(key), {
    families,
    ids,
    more,
    n: advisory.n ?? 0,
    ceiling: advisory.ceiling ?? 0,
    level:
      level === "beginner"
        ? getLanguage() === "es"
          ? "principiante"
          : "beginner"
        : level === "advanced"
          ? getLanguage() === "es"
            ? "avanzado"
            : "advanced"
          : getLanguage() === "es"
            ? "intermedio"
            : "intermediate",
    group:
      GROUP_LABEL[advisory.group ?? ""]?.[getLanguage()] ??
      advisory.group ??
      "",
  });
}

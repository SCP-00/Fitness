/**
 * Equipment model — "what can I actually do with what I own".
 *
 * The catalog's free-text `equipment` field is for humans. Planning needs a
 * machine-checkable answer to "can this user perform this exercise?", so every
 * exercise also declares structured requirements (see `traits.ts`) and the user
 * declares the gear they own **item by item** (a mountain bike, a pull-up bar,
 * a pair of adjustable dumbbells…). Capabilities are derived, never typed.
 *
 * Pure data + pure functions: no DOM, no I/O. @module equipment
 */

/** A physical capability an exercise can require. */
export type Capability =
  | "bodyweight"
  | "mat"
  | "dumbbell"
  | "kettlebell"
  | "barbell"
  | "bench"
  | "rack"
  | "pullup_bar"
  | "dip_bars"
  | "rings"
  | "bands"
  | "cable"
  | "machines"
  | "bike"
  | "jump_rope"
  | "box"
  | "ab_wheel"
  | "strap"
  | "stairs";

export interface EquipmentPreset {
  id: string;
  name: { en: string; es: string };
  /** Capabilities granted by owning one of these. */
  capabilities: Capability[];
  /** Typical setup/teardown cost, minutes (feeds the time budget). */
  setupMin: number;
  /**
   * Load model when the item carries external weight. `null` for items that
   * are not loaded (a bike, a bar for pull-ups…).
   */
  load: { maxLoadKg: number; incrementKg: number } | null;
  /** One-line, honest guidance shown when adding the item. */
  hint: { en: string; es: string };
}

/**
 * The pick-list a user shops from when declaring their gear. Order is
 * deliberate: the most common home items first.
 */
export const EQUIPMENT_PRESETS: EquipmentPreset[] = [
  {
    id: "bodyweight",
    name: {
      en: "Bodyweight (always available)",
      es: "Peso corporal (siempre disponible)",
    },
    capabilities: ["bodyweight"],
    setupMin: 0,
    load: null,
    hint: {
      en: "Every exercise that needs nothing but you.",
      es: "Todo ejercicio que no necesita nada más que tú.",
    },
  },
  {
    id: "mat",
    name: { en: "Exercise mat", es: "Colchoneta" },
    capabilities: ["mat"],
    setupMin: 0,
    load: null,
    hint: {
      en: "Floor work: core, glute bridges, mobility.",
      es: "Trabajo en suelo: core, puentes de glúteo, movilidad.",
    },
  },
  {
    id: "dumbbells-adjustable",
    name: {
      en: "Adjustable dumbbells (pair)",
      es: "Mancuernas ajustables (par)",
    },
    capabilities: ["dumbbell"],
    setupMin: 1,
    load: { maxLoadKg: 24, incrementKg: 1 },
    hint: {
      en: "Set the real max you own: it caps load suggestions.",
      es: "Pon el máximo real que tienes: limita las sugerencias de carga.",
    },
  },
  {
    id: "dumbbells-fixed",
    name: { en: "Fixed dumbbells", es: "Mancuernas fijas" },
    capabilities: ["dumbbell"],
    setupMin: 0,
    load: { maxLoadKg: 20, incrementKg: 2 },
    hint: { en: "Heaviest pair you own.", es: "El par más pesado que tengas." },
  },
  {
    id: "kettlebell",
    name: { en: "Kettlebell", es: "Pesa rusa" },
    capabilities: ["kettlebell"],
    setupMin: 0,
    load: { maxLoadKg: 24, incrementKg: 4 },
    hint: {
      en: "Swings, goblet squats, carries.",
      es: "Swings, sentadilla goblet, paseos.",
    },
  },
  {
    id: "barbell-plates",
    name: { en: "Barbell + plates", es: "Barra + discos" },
    capabilities: ["barbell"],
    setupMin: 2,
    load: { maxLoadKg: 60, incrementKg: 2.5 },
    hint: {
      en: "Total loadable weight, per side increments.",
      es: "Peso total cargable e incremento por lado.",
    },
  },
  {
    id: "bench",
    name: { en: "Bench", es: "Banco" },
    capabilities: ["bench", "box"],
    setupMin: 1,
    load: null,
    hint: {
      en: "Presses, rows, step-ups, hip thrusts.",
      es: "Presses, remos, subidas al cajón, hip thrust.",
    },
  },
  {
    id: "rack",
    name: { en: "Squat rack / stands", es: "Rack o soportes" },
    capabilities: ["rack"],
    setupMin: 1,
    load: null,
    hint: {
      en: "Squats and presses you can bail out of.",
      es: "Sentadillas y presses de los que puedas salir.",
    },
  },
  {
    id: "pullup-bar",
    name: {
      en: "Pull-up bar (prono/supino/neutral)",
      es: "Barra de dominadas (prono/supino/neutro)",
    },
    capabilities: ["pullup_bar"],
    setupMin: 0,
    load: null,
    hint: {
      en: "Pull-ups, chin-ups, hanging core, scapular work.",
      es: "Dominadas, supinas, core colgado, trabajo escapular.",
    },
  },
  {
    id: "dip-bars",
    name: {
      en: "Dip bars / parallel bars",
      es: "Paralelas / barras de fondos",
    },
    capabilities: ["dip_bars", "rack"],
    setupMin: 1,
    load: null,
    hint: {
      en: "Dips, inverted rows, L-sits, knee raises.",
      es: "Fondos, remo invertido, L-sit, elevación de rodillas.",
    },
  },
  {
    id: "rings",
    name: { en: "Gymnastic rings", es: "Anillas" },
    capabilities: ["rings", "pullup_bar"],
    setupMin: 2,
    load: null,
    hint: {
      en: "Hardest stability: scales by leverage alone.",
      es: "La estabilidad más dura: progresas por palanca.",
    },
  },
  {
    id: "bands",
    name: { en: "Resistance bands", es: "Bandas elásticas" },
    capabilities: ["bands"],
    setupMin: 1,
    load: null,
    hint: {
      en: "Home substitutes for cables: rows, presses, flys.",
      es: "Sustituto casero de poleas: remos, presses, aperturas.",
    },
  },
  {
    id: "cable",
    name: { en: "Cable machine", es: "Máquina de poleas" },
    capabilities: ["cable"],
    setupMin: 1,
    load: { maxLoadKg: 60, incrementKg: 2.5 },
    hint: {
      en: "Constant tension for isolation work.",
      es: "Tensión constante para trabajo de aislamiento.",
    },
  },
  {
    id: "machines",
    name: { en: "Gym machines", es: "Máquinas de gimnasio" },
    capabilities: ["machines"],
    setupMin: 1,
    load: { maxLoadKg: 120, incrementKg: 5 },
    hint: {
      en: "Leg press/curl/extension, peck deck, calf raises.",
      es: "Prensa, curl/extensión, pec deck, elevación de talones.",
    },
  },
  {
    id: "bike",
    name: {
      en: "Bike (MTB / road / spin)",
      es: "Bicicleta (MTB / ruta / estática)",
    },
    capabilities: ["bike"],
    setupMin: 2,
    load: null,
    hint: {
      en: "Cardio: steady zone 2 and hill intervals.",
      es: "Cardio: rodada continua Z2 e intervalos de subida.",
    },
  },
  {
    id: "jump-rope",
    name: { en: "Jump rope", es: "Cuerda de saltar" },
    capabilities: ["jump_rope"],
    setupMin: 1,
    load: null,
    hint: {
      en: "Cheapest conditioning interval there is.",
      es: "El intervalo de acondicionamiento más barato que existe.",
    },
  },
  {
    id: "box",
    name: { en: "Box / step", es: "Cajón / escalón" },
    capabilities: ["box"],
    setupMin: 0,
    load: null,
    hint: {
      en: "Step-ups, split squats, box squats.",
      es: "Subidas, sentadilla búlgara, sentadilla al cajón.",
    },
  },
  {
    id: "ab-wheel",
    name: { en: "Ab wheel", es: "Rueda abdominal" },
    capabilities: ["ab_wheel"],
    setupMin: 0,
    load: null,
    hint: {
      en: "The cheapest hard core exercise you can own.",
      es: "El ejercicio de core duro más barato que puedes tener.",
    },
  },
  {
    id: "strap",
    name: { en: "Nordic strap / anchor", es: "Correa/gancho nórdico" },
    capabilities: ["strap"],
    setupMin: 1,
    load: null,
    hint: {
      en: "Nordic curls: the best hamstring builder at home.",
      es: "Curl nórdico: el mejor constructor de isquios en casa.",
    },
  },
  {
    id: "stairs",
    name: { en: "Stairs / hill", es: "Escaleras / cuesta" },
    capabilities: ["stairs"],
    setupMin: 0,
    load: null,
    hint: {
      en: "Free interval conditioning, outdoors or indoors.",
      es: "Acondicionamiento por intervalos gratis, dentro o fuera.",
    },
  },
];

/** One gear item the user owns (an inventory row). */
export interface OwnedEquipment {
  /** Stable uuid. */
  id: string;
  /** Preset id it was created from, `custom` when typed from scratch. */
  presetId: string;
  /** User-editable label ("Mancuernas del garaje"). */
  label: string;
  capabilities: Capability[];
  /** Overrides the preset when the user knows better. */
  maxLoadKg: number | null;
  incrementKg: number | null;
  setupMin: number;
}

/** Build an inventory row from a preset. */
export function ownedFromPreset(
  presetId: string,
  id: string,
): OwnedEquipment | null {
  const preset = EQUIPMENT_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return {
    id,
    presetId: preset.id,
    label: preset.name.es,
    capabilities: [...preset.capabilities],
    maxLoadKg: preset.load?.maxLoadKg ?? null,
    incrementKg: preset.load?.incrementKg ?? null,
    setupMin: preset.setupMin,
  };
}

/** Union of every capability the inventory grants (bodyweight is implicit). */
export function ownedCapabilities(items: OwnedEquipment[]): Set<Capability> {
  const set = new Set<Capability>(["bodyweight"]);
  for (const item of items) for (const cap of item.capabilities) set.add(cap);
  return set;
}

/**
 * Does the inventory satisfy a requirement list?
 * Each entry is an OR-group (any capability of the group); groups are ANDed.
 */
export function satisfies(
  requirements: Capability[][],
  owned: Set<Capability>,
): boolean {
  return requirements.every((group) => group.some((cap) => owned.has(cap)));
}

/** Heaviest load the inventory can put on an exercise's load type. */
export function maxLoadFor(
  loadType: string,
  items: OwnedEquipment[],
): number | null {
  const capable: Record<string, Capability[]> = {
    dumbbell: ["dumbbell"],
    barbell: ["barbell"],
    kettlebell: ["kettlebell"],
    cable: ["cable"],
    machine: ["machines"],
  };
  const caps = capable[loadType];
  if (!caps) return null;
  const loads = items
    .filter(
      (i) =>
        i.capabilities.some((c) => caps.includes(c)) && i.maxLoadKg !== null,
    )
    .map((i) => i.maxLoadKg as number);
  return loads.length > 0 ? Math.max(...loads) : null;
}

/** Smallest weight jump the inventory can make for a load type (progression). */
export function incrementFor(
  loadType: string,
  items: OwnedEquipment[],
): number | null {
  const capable: Record<string, Capability[]> = {
    dumbbell: ["dumbbell"],
    barbell: ["barbell"],
    kettlebell: ["kettlebell"],
    cable: ["cable"],
    machine: ["machines"],
  };
  const caps = capable[loadType];
  if (!caps) return null;
  const increments = items
    .filter(
      (i) =>
        i.capabilities.some((c) => caps.includes(c)) && i.incrementKg !== null,
    )
    .map((i) => i.incrementKg as number);
  return increments.length > 0 ? Math.min(...increments) : null;
}

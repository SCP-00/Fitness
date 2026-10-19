/* ==========================================================================
   TrainingLab · MOCKUP behaviour
   --------------------------------------------------------------------------
   These pages are a static replica of the reference mockups, so nothing here
   touches IndexedDB or the real store. What IS real:

     * the exercise catalog  → `data/catalog.json` (dumped from the app)
     * the exercise media    → `assets/media/manifest.json` (36 cleared GIFs +
       129 public-domain stills + an honest "sin referencia" state)
     * the palette           → TrainingLab's shipped tokens

   The interactions that decide whether the design works — dragging a session
   to another day, typing a weight, switching a lens, opening a panel — are
   implemented for real, because a mockup you cannot poke is a picture.
   ========================================================================== */

// ── Icons (lucide-style, 24×24, stroke = currentColor) ──────────────────────
const ICONS = {
  home: '<path d="M3 10.2 12 3l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  dumbbell:
    '<path d="M6.5 6.5v11M17.5 6.5v11M3 9v6M21 9v6M6.5 12h11"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  library: '<rect x="3" y="4" width="6" height="16" rx="1.5"/><rect x="11" y="4" width="6" height="10" rx="1.5"/><path d="M19 20V8"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  list: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
  settings:
    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.3a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.7 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.4 1z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  play: '<path d="M7 4.5v15l13-7.5z"/>',
  chevronRight: '<path d="m9 5 7 7-7 7"/>',
  chevronLeft: '<path d="m15 5-7 7 7 7"/>',
  chevronDown: '<path d="m5 9 7 7 7-7"/>',
  chevronUp: '<path d="m5 15 7-7 7 7"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  check: '<path d="m4 12.5 5 5L20 6.5"/>',
  circleCheck: '<circle cx="12" cy="12" r="9"/><path d="m8 12.5 2.7 2.7L16 9.5"/>',
  circle: '<circle cx="12" cy="12" r="9"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  alert: '<path d="M10.3 4.2 2.6 17.4A1.8 1.8 0 0 0 4.2 20h15.6a1.8 1.8 0 0 0 1.6-2.6L13.7 4.2a1.8 1.8 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
  target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  zap: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>',
  flame: '<path d="M12 3c3 4 5 6 5 9a5 5 0 0 1-10 0c0-1.4.5-2.5 1.4-3.6"/>',
  bars: '<path d="M5 20V13M10 20V9M15 20V5M20 20v-4"/>',
  users: '<circle cx="9" cy="8" r="3.4"/><path d="M3 20c0-3.3 2.7-5.4 6-5.4s6 2.1 6 5.4"/><path d="M16 5.2a3.4 3.4 0 0 1 0 6.6M18 20c0-2.2-.8-3.9-2-5"/>',
  pause: '<path d="M9 5v14M15 5v14"/>',
  rotate: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
  trash: '<path d="M4 7h16M9 7V5h6v2M6 7l1 13h10l1-13M10 11v6M14 11v6"/>',
  arrowUp: '<path d="M12 20V5M6 11l6-6 6 6"/>',
  arrowDown: '<path d="M12 4v15M6 13l6 6 6-6"/>',
  arrowRight: '<path d="M4 12h15M13 6l6 6-6 6"/>',
  repeat: '<path d="M4 9h13l-3-3M20 15H7l3 3"/>',
  grip: '<circle cx="9" cy="6" r="1.3"/><circle cx="15" cy="6" r="1.3"/><circle cx="9" cy="12" r="1.3"/><circle cx="15" cy="12" r="1.3"/><circle cx="9" cy="18" r="1.3"/><circle cx="15" cy="18" r="1.3"/>',
  star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.8l5.9-.8z"/>',
  heart: '<path d="M12 20s-7-4.4-7-9.3A4 4 0 0 1 12 7.6 4 4 0 0 1 19 10.7C19 15.6 12 20 12 20z"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  filter: '<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 18 5-5 3.5 3.5L16 13l4 4"/>',
  sparkles: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.4 2.4M15.3 15.3l2.4 2.4M17.7 6.3l-2.4 2.4M8.7 15.3l-2.4 2.4"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4.5l3 2M9 3h6"/>',
  trendingUp: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  pie: '<path d="M12 3a9 9 0 1 0 9 9h-9z"/>',
  calendarPlus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/>',
  shuffle: '<path d="M16 4h4v4M20 4l-6.5 6.5M8 20H4v-4M4 20l6.5-6.5M16 20h4v-4M14 14l6 6"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
  eraser: '<path d="m7 17-4-4 9-9 5 5-6 6M7 17h13M13 21H7"/>',
  notebook: '<rect x="5" y="3" width="15" height="18" rx="2"/><path d="M3 7h4M3 12h4M3 17h4M10 8h6M10 12h6"/>',
  trophy: '<path d="M8 4h8v4a4 4 0 0 1-8 0z"/><path d="M8 5H5v2a3 3 0 0 0 3 3M16 5h3v2a3 3 0 0 1-3 3M10 20h4M12 12v8M9 20h6"/>',
  scale: '<path d="M12 4v16M7 20h10M5 8h14M5 8l-2.5 5h5zM19 8l-2.5 5h5z"/>',
  activity: '<path d="M3 12h4l2.5-6 3 12 2.5-6h6"/>',
  refresh: '<path d="M20 12a8 8 0 1 1-2.4-5.7"/><path d="M20 4v5h-5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  lightbulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 3.5 10.9V16h-7v-2.1A6 6 0 0 1 12 3z"/>',
  gauge: '<path d="M4 18a8 8 0 1 1 16 0"/><path d="M12 18l4-4"/>',
  move: '<path d="M12 3v18M3 12h18"/><path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  bot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M9 14h.01M15 14h.01M2 12v3M22 12v3"/>',
  ruler: '<path d="m4 14 6-6M3 15l6 6L21 9l-6-6z"/><path d="m8 11 2 2M11 8l2 2M14 5l2 2"/>',
  wind: '<path d="M3 8h11a3 3 0 1 0-3-3M3 16h7a3 3 0 1 1-3 3M3 12h18"/>',
  bike: '<circle cx="6" cy="17" r="3.2"/><circle cx="18" cy="17" r="3.2"/><path d="M6 17 10 8h5l3 9M9 8h4"/>',
  flame2: '<path d="M12 2c1 4 4 5 4 9a4 4 0 0 1-8 0c0-1 .3-1.7.8-2.4"/>',
  layersOff: '<path d="M4 4l16 16"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
};

function iconMarkup(name, cls) {
  const body = ICONS[name] || ICONS.circle;
  return `<svg class="icon ${cls || ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/** Replace every `<i data-icon="x">` with the SVG. */
function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((el) => {
    const name = el.dataset.icon;
    if (!el.dataset.hydrated) {
      el.outerHTML = iconMarkup(name, el.dataset.iconClass);
    }
  });
}

// ── Muscle & family helpers ────────────────────────────────────────────────
const MUSCLE_ES = {
  chest_upper: "Pecho superior", chest_lower: "Pecho inferior",
  pectoralis_minor: "Pectoral menor", serratus_anterior: "Serrato",
  anterior_deltoid: "Hombro anterior", lateral_deltoid: "Hombro lateral",
  posterior_deltoid: "Hombro posterior", triceps_long: "Tríceps largo",
  triceps_lateral: "Tríceps lateral", triceps_medial: "Tríceps medial",
  biceps_long: "Bíceps largo", biceps_short: "Bíceps corto",
  brachioradialis: "Braquiorradial", forearm_flexors: "Flexores",
  forearm_extensors: "Extensores", lats_upper: "Dorsal superior",
  lats_mid: "Dorsal medio", lats_lower: "Dorsal inferior",
  traps_upper: "Trapecio superior", traps_mid: "Trapecio medio",
  traps_lower: "Trapecio inferior", rhomboids: "Romboides",
  rectus_abdominis: "Recto abdominal", obliques: "Oblicuos",
  erector_spinae: "Erectores", iliopsoas: "Psoas ilíaco",
  gluteus_maximus: "Glúteo mayor", gluteus_medius: "Glúteo medio",
  quadriceps: "Cuádriceps", adductors: "Aductores", hamstrings: "Isquios",
  calves: "Gemelos", soleus: "Sóleo", tibialis_anterior: "Tibial anterior",
};

/** Movement patterns, in the user's words (the catalog's own vocabulary). */
const PATTERN_ES = {
  horizontal_push: "Empuje horizontal", vertical_push: "Empuje vertical",
  horizontal_pull: "Tirón horizontal", vertical_pull: "Tirón vertical",
  shoulder_abduction: "Abducción de hombro", shoulder_flexion: "Flexión de hombro",
  shoulder_extension: "Extensión de hombro", elbow_flexion: "Flexión de codo",
  elbow_extension: "Extensión de codo", forearm_flexion: "Flexión de muñeca",
  forearm_extension: "Extensión de muñeca", squat: "Sentadilla", lunge: "Zancada",
  hinge: "Bisagra de cadera", knee_extension: "Extensión de rodilla",
  knee_flexion: "Flexión de rodilla", hip_extension: "Extensión de cadera",
  hip_abduction: "Abducción de cadera", hip_adduction: "Aducción de cadera",
  plantar_flexion: "Flexión plantar", tibialis: "Tibial", carry: "Transporte",
  core_flexion: "Flexión de tronco", core_rotation: "Rotación de tronco",
  core_anti_extension: "Anti-extensión", core_anti_lateral: "Anti-flexión lateral",
  cardio_steady: "Cardio continuo", cardio_interval: "Intervalos",
};

const FAMILY_ES = {
  chest: "Pecho", shoulders: "Hombros", triceps: "Tríceps", biceps: "Bíceps",
  forearms: "Antebrazos", lats: "Dorsales", traps: "Trapecios",
  rhomboids: "Romboides", core: "Core", glutes: "Glúteos",
  quadriceps: "Cuádriceps", hamstrings: "Isquios", calves: "Pantorrillas",
};

/** Granular muscle → rule-level family (mirrors core/training/plan.ts). */
function familyOf(muscle) {
  if (muscle.startsWith("chest") || muscle === "pectoralis_minor" || muscle === "serratus_anterior") return "chest";
  if (muscle.endsWith("_deltoid")) return "shoulders";
  if (muscle.startsWith("triceps")) return "triceps";
  if (muscle.startsWith("biceps")) return "biceps";
  if (muscle.startsWith("forearm")) return "forearms";
  if (muscle.startsWith("lats")) return "lats";
  if (muscle.startsWith("traps")) return "traps";
  if (muscle === "rhomboids") return "rhomboids";
  if (muscle === "quadriceps") return "quadriceps";
  if (muscle === "hamstrings") return "hamstrings";
  if (muscle.startsWith("gluteus")) return "glutes";
  return "core";
}

const familyTag = (family) =>
  `<span class="tag" style="color:var(--fam-${family})"><i class="dot"></i>${FAMILY_ES[family] || family}</span>`;

// ── Real data: catalog + media ─────────────────────────────────────────────
const TL = {
  catalog: null,
  media: null,
  async load() {
    const [catalog, media] = await Promise.all([
      fetch("data/catalog.json").then((r) => r.json()).catch(() => null),
      fetch("assets/media/manifest.json").then((r) => r.json()).catch(() => null),
    ]);
    TL.catalog = catalog;
    TL.media = media;
    return TL;
  },
  byId(id) {
    return TL.catalog?.exercises.find((e) => e.id === id) || null;
  },
  /** The image/GIF the app would show, or null (→ the honest empty state). */
  mediaFor(id) {
    return TL.media?.[id] || null;
  },
  mediaUrl(id) {
    const m = TL.mediaFor(id);
    if (!m) return null;
    if (m.gif) return `assets/media/${m.gif}`;
    if (m.stills?.length) return `assets/media/${m.stills[0]}`;
    return null;
  },
  /** Markup for one exercise's reference media, including the empty state. */
  renderMedia(id, opts = {}) {
    const m = TL.mediaFor(id);
    const url = TL.mediaUrl(id);
    if (!url) {
      return `<div class="media-missing"><div><i data-icon="image"></i>Sin referencia</div><div class="tiny">Pendiente de sustituir</div></div>`;
    }
    const alt = TL.byId(id)?.en || id;
    const cls = opts.imgClass || "";
    const label = m.gif ? "GIF" : m.stills.length > 1 ? "2 fotos · inicio / fin" : "Foto";
    return `
      <img src="${url}" alt="${alt}" loading="lazy" class="${cls}" />
      <div class="media-note">${label} · ${m.source}</div>`;
  },
};

window.TL = TL;
window.iconMarkup = iconMarkup;

// ── The rail ───────────────────────────────────────────────────────────────
const NAV = [
  ["hoy", "Hoy", "home", "01-hoy.html"],
  ["entrenamiento", "Entrenamiento", "dumbbell", "02-entrenamiento.html"],
  ["historial", "Historial", "clock", "08-historial.html"],
  ["progreso", "Progreso", "chart", "07-progreso.html"],
  ["ejercicios", "Ejercicios", "library", "05-ejercicios.html"],
  ["semana", "Semana", "calendar", "04-semana.html"],
  ["rutinas", "Rutinas", "list", "06-rutinas.html"],
  ["ajustes", "Configuración", "settings", "09-ajustes.html"],
];

function renderRail() {
  const host = document.querySelector("[data-rail]");
  if (!host) return;
  const active = document.body.dataset.page;
  host.innerHTML = `
    <div class="rail-brand">
      <div class="rail-logo"><i data-icon="dumbbell"></i></div>
      <div class="rail-name">Training<span>Lab</span></div>
    </div>
    <nav class="rail-nav">
      ${NAV.map(
        ([key, label, ic, href]) => `
        <a class="rail-item ${key === active ? "is-active" : ""}" href="${href}">
          <i data-icon="${ic}"></i><span>${label}</span>
        </a>`,
      ).join("")}
    </nav>
    <div class="rail-quote">
      <b>Disciplina hoy,</b> resultados mañana.
      <hr />
    </div>`;
}

// ── Generic interactions ───────────────────────────────────────────────────
/** Click a `.seg-item` or `.tab` → it becomes the active one in its group. */
/**
 * Tabs and segmented controls.
 *
 * A group becomes REAL when its pages exist: if `#<group>-<value>` (or any
 * `[data-panel="<group>:<value>"]`) is on the page, only the selected panel
 * stays visible. Without panels the control is a visual filter stub, which is
 * honest for a mockup — what matters is that the two cases are distinguishable
 * instead of every tab looking broken.
 */
function wireSwitchers() {
  document.querySelectorAll("[data-switch]").forEach((group) => {
    const apply = (value, animate) => {
      const name = group.dataset.switch;
      const panels = document.querySelectorAll(`[data-panel^="${name}:"]`);
      if (!panels.length) return false;
      panels.forEach((p) => p.classList.toggle("hide", p.dataset.panel !== `${name}:${value}`));
      if (animate) {
        const shown = document.querySelector(`[data-panel="${name}:${value}"]`);
        shown?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 140 });
      }
      return true;
    };

    group.addEventListener("click", (e) => {
      const item = e.target.closest(".seg-item, .tab, [data-switch-item]");
      if (!item || !group.contains(item)) return;
      group.querySelectorAll(".is-active").forEach((n) => n.classList.remove("is-active"));
      item.classList.add("is-active");
      apply(item.dataset.value, true);
      document.dispatchEvent(new CustomEvent("tl:switch", { detail: { group: group.dataset.switch, value: item.dataset.value } }));
    });

    // Honour the initial `is-active` so a page loads on the right panel.
    const initial = group.querySelector(".is-active")?.dataset.value ?? "all";
    apply(initial, false);
  });
}

/**
 * Modals and drawers.
 *
 * `data-open-modal="x"` reveals the overlay AND the dialog; `data-close="x"`
 * hides both. Before this, the create-exercise button removed `hide` from the
 * first `[data-modal="crear"]` it found — the overlay — leaving the dialog
 * itself invisible.
 */
function wireModals() {
  const show = (name, on) => {
    document.querySelectorAll(`[data-modal="${name}"], [data-modal-panel="${name}"], [data-drawer="${name}"]`)
      .forEach((n) => n.classList.toggle("hide", !on));
  };
  document.querySelectorAll("[data-open-modal]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.openModal, true));
  });
  document.querySelectorAll("[data-open-drawer]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.openDrawer, true));
  });
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => show(btn.dataset.close, false));
  });
  // Clicking the backdrop closes the dialog above it.
  document.querySelectorAll(".overlay[data-modal]").forEach((ov) => {
    ov.addEventListener("click", () => show(ov.dataset.modal, false));
  });
}

window.tlShow = (name, on) => {
  document.querySelectorAll(`[data-modal="${name}"], [data-modal-panel="${name}"], [data-drawer="${name}"]`)
    .forEach((n) => n.classList.toggle("hide", !on));
};

/** Real weight/rep steppers: −, +, and typing straight into the box. */
function wireSteppers() {
  document.querySelectorAll("[data-stepper]").forEach((box) => {
    const input = box.querySelector("input");
    const step = Number(box.dataset.step || 1);
    const min = box.dataset.min !== undefined ? Number(box.dataset.min) : -Infinity;
    const max = box.dataset.max !== undefined ? Number(box.dataset.max) : Infinity;
    const decimals = Number(box.dataset.decimals || 0);
    const clamp = (v) => Math.min(max, Math.max(min, v));
    const show = (v) => (decimals ? v.toFixed(decimals) : String(Math.round(v * 100) / 100));
    const set = (v) => {
      input.value = show(clamp(v));
      box.dispatchEvent(new CustomEvent("tl:step", { detail: { value: Number(input.value) } }));
    };
    box.querySelectorAll("[data-step]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dir = btn.dataset.step === "up" ? 1 : -1;
        set((Number(input.value) || 0) + dir * step);
      });
    });
    input.addEventListener("input", () => {
      // Spanish keyboards: accept the comma, never truncate "75,5".
      input.value = input.value.replace(",", ".");
    });
    input.addEventListener("change", () => set(Number(input.value) || 0));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp") { e.preventDefault(); set((Number(input.value) || 0) + step); }
      if (e.key === "ArrowDown") { e.preventDefault(); set((Number(input.value) || 0) - step); }
    });
  });
}

/** Numeric keypad → writes into whichever stepper is focused/last used. */
function wireKeypad() {
  const pads = document.querySelectorAll("[data-numpad]");
  if (!pads.length) return;
  let target = document.querySelector("[data-stepper] input") || null;
  document.querySelectorAll("[data-stepper] input").forEach((input) => {
    input.addEventListener("focus", () => { target = input; });
  });
  pads.forEach((pad) => {
    pad.addEventListener("click", (e) => {
      const key = e.target.closest("[data-key]")?.dataset.key;
      if (!key || !target) return;
      const cur = target.value || "";
      if (key === "del") target.value = cur.slice(0, -1);
      else if (key === ",") target.value = cur.includes(".") ? cur : cur + ".";
      else if (key === "ok") { target.dispatchEvent(new Event("change")); return; }
      else target.value = cur + key;
      target.dispatchEvent(new Event("input"));
    });
  });
}

/** HTML5 drag & drop: reorder rows, move day cards between columns. */
function wireDrag() {
  let dragged = null;
  document.querySelectorAll("[data-drag]").forEach((el) => {
    el.setAttribute("draggable", "true");
    el.addEventListener("dragstart", (e) => {
      dragged = el;
      el.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", el.dataset.drag);
    });
    el.addEventListener("dragend", () => {
      el.classList.remove("is-dragging");
      document.querySelectorAll(".is-over").forEach((n) => n.classList.remove("is-over"));
      dragged = null;
      renumber();
    });
  });

  document.querySelectorAll("[data-drop]").forEach((zone) => {
    zone.addEventListener("dragover", (e) => {
      if (!dragged) return;
      e.preventDefault();
      zone.classList.add("is-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
    zone.addEventListener("drop", (e) => {
      e.preventDefault();
      zone.classList.remove("is-over");
      if (!dragged) return;
      const row = dragged;
      if (zone.dataset.drop === "list") {
        // Insert before the row under the cursor, else at the end.
        const over = e.target.closest("[data-drag]");
        if (over && over !== row) {
          const boxes = [...zone.querySelectorAll("[data-drag]")];
          const from = boxes.indexOf(row);
          const to = boxes.indexOf(over);
          zone.insertBefore(row, from < to ? over.nextSibling : over);
        } else if (!over) {
          zone.appendChild(row);
        }
      } else {
        zone.appendChild(row);
      }
    });
  });
}

/** Re-number the `.exrow-idx` cells after any reorder. */
function renumber() {
  document.querySelectorAll("[data-renumber]").forEach((list) => {
    [...list.querySelectorAll("[data-drag]")].forEach((row, i) => {
      const idx = row.querySelector(".exrow-idx, .daycard-idx");
      if (idx) idx.textContent = String(i + 1);
    });
  });
}

/** `?open=` reveals a drawer, `?modal=` the dialog — so a single URL can be
 * shared for review, and so the screenshot script can capture them. */
function wireDeepLinks() {
  const params = new URLSearchParams(location.search);
  const open = params.get("open");
  if (open) window.tlShow(open, true);
  const modal = params.get("modal");
  if (modal) window.tlShow(modal, true);
}

/** Toast used by the "mockup only" affordances. */
function toast(message) {
  let el = document.querySelector(".tl-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "tl-toast";
    el.style.cssText =
      "position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:80;" +
      "background:var(--tl-surface-3);border:1px solid var(--tl-accent-border);" +
      "color:var(--tl-text);padding:10px 16px;border-radius:10px;font-size:12.5px;" +
      "box-shadow:var(--shadow)";
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.remove("hide");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add("hide"), 2200);
}
window.tlToast = toast;

// ── Gallery (Ejercicios) rendered from the REAL catalog ────────────────────
async function renderGallery() {
  const host = document.querySelector("[data-gallery]");
  if (!host) return;
  const catalog = TL.catalog;
  if (!catalog) {
    host.innerHTML = `<p class="muted">No se pudo cargar data/catalog.json — sirve la carpeta con un servidor HTTP.</p>`;
    return;
  }
  const count = document.querySelector("[data-gallery-count]");
  if (count) count.textContent = `${catalog.count} ejercicios`;

  // Filter affordances the mockup supports: family, equipment, "solo lo mío".
  const state = { family: "all", gear: "all", pattern: "all", own: false, query: "" };

  const families = [...new Set(catalog.exercises.map((e) => familyOf(e.primaryMuscles[0] || "rectus_abdominis")))].sort();

  function paint() {
    const rows = catalog.exercises.filter((e) => {
      const fam = familyOf(e.primaryMuscles[0] || "rectus_abdominis");
      if (state.family !== "all" && fam !== state.family) return false;
      if (state.gear && state.gear !== "all" && e.equipment.es !== state.gear) return false;
      if (state.pattern && state.pattern !== "all" && e.pattern !== state.pattern) return false;
      if (state.query && !`${e.es} ${e.en}`.toLowerCase().includes(state.query.toLowerCase())) return false;
      if (state.own) {
        // "Sólo lo que puedo hacer con mi equipo": the mockup's declared gear.
        const mine = /bodyweight|dumbbell|barbell|bench|band|mat|pull-up|jump rope|kettlebell/i;
        if (!mine.test(e.equipment.en)) return false;
      }
      return true;
    });

    host.innerHTML = rows
      .map((e) => {
        const fam = familyOf(e.primaryMuscles[0] || "rectus_abdominis");
        const secondary = e.primaryMuscles
          .slice(1, 3)
          .map((m) => FAMILY_ES[familyOf(m)])
          .filter(Boolean);
        const media = TL.mediaFor(e.id);
        return `
        <article class="gcard" data-exercise="${e.id}">
          <div class="gcard-art">
            ${TL.renderMedia(e.id)}
            ${media ? `<span class="gcard-tag">${media.gif ? "GIF" : "FOTO"}</span>` : ""}
            <span class="gcard-fav" title="Favorito"><i data-icon="star"></i></span>
          </div>
          <div class="gcard-body">
            <div class="gcard-name">${e.es}</div>
            <div class="gcard-muscles">${[FAMILY_ES[fam], ...secondary].join(" · ")}</div>
            <div class="gcard-tags">
              ${familyTag(fam)}
              <span class="tag"><i data-icon="dumbbell"></i>${e.equipment.es}</span>
            </div>
            <div class="gcard-actions">
              <span class="gcard-action" data-open-detail="${e.id}"><i data-icon="notebook"></i>Ficha</span>
              <span class="gcard-action"><i data-icon="plus"></i>Hoy</span>
              <span class="gcard-action"><i data-icon="list"></i>Rutina</span>
              <span class="gcard-action"><i data-icon="star"></i>Favorito</span>
            </div>
          </div>
        </article>`;
      })
      .join("");

    hydrateIcons(host);
    const shown = document.querySelector("[data-gallery-shown]");
    if (shown) shown.textContent = `${rows.length} de ${catalog.count}`;
    wireDetail();
  }

  document.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const { filter, value } = btn.dataset;
      if (filter === "own") {
        state.own = !state.own;
        btn.classList.toggle("is-active", state.own);
      } else {
        state[filter] = state[filter] === value ? "all" : value;
        document.querySelectorAll(`[data-filter="${filter}"]`).forEach((b) => b.classList.toggle("is-active", b === btn && state[filter] !== "all"));
      }
      paint();
    });
  });

  const search = document.querySelector("[data-gallery-search]");
  if (search) search.addEventListener("input", () => { state.query = search.value; paint(); });

  // The three dropdowns. Each one is populated from the real catalog, so the
  // list of options can never drift from what the app actually contains.
  const familySelect = document.querySelector("[data-family-select]");
  if (familySelect) {
    familySelect.innerHTML =
      `<option value="all">Músculo</option>` +
      families.map((f) => `<option value="${f}">${FAMILY_ES[f] || f}</option>`).join("");
    familySelect.addEventListener("change", () => { state.family = familySelect.value; paint(); });
  }

  const equipSelect = document.querySelector("[data-equipment-select]");
  if (equipSelect) {
    const gear = [...new Set(catalog.exercises.map((e) => e.equipment.es))].sort((a, b) => a.localeCompare(b, "es"));
    equipSelect.innerHTML =
      `<option value="all">Equipamiento</option>` + gear.map((g) => `<option value="${g}">${g}</option>`).join("");
    equipSelect.addEventListener("change", () => { state.gear = equipSelect.value; paint(); });
  }

  const patternSelect = document.querySelector("[data-pattern-select]");
  if (patternSelect) {
    const pats = [...new Set(catalog.exercises.map((e) => e.pattern).filter(Boolean))].sort();
    patternSelect.innerHTML =
      `<option value="all">Patrón</option>` + pats.map((p) => `<option value="${p}">${PATTERN_ES[p] || p}</option>`).join("");
    patternSelect.addEventListener("change", () => { state.pattern = patternSelect.value; paint(); });
  }

  paint();
}

/** The right-hand detail panel (ficha) — filled from the catalog+media. */
function wireDetail() {
  document.querySelectorAll("[data-open-detail]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.preventDefault();
      showDetail(el.dataset.openDetail);
    });
  });
}

function showDetail(id) {
  const e = TL.byId(id);
  const panel = document.querySelector("[data-detail]");
  if (!e || !panel) return;
  const fam = familyOf(e.primaryMuscles[0] || "rectus_abdominis");
  panel.querySelector("[data-detail-name]").textContent = e.es;
  panel.querySelector("[data-detail-en]").textContent = e.en;
  panel.querySelector("[data-detail-media]").innerHTML = TL.renderMedia(e.id);
  panel.querySelector("[data-detail-meta]").innerHTML = [
    familyTag(fam),
    `<span class="tag"><i data-icon="dumbbell"></i>${e.equipment.es}</span>`,
    `<span class="tag"><i data-icon="gauge"></i>${e.category}</span>`,
  ].join("");

  // The three families the exercise trains, by intensity.
  panel.querySelector("[data-detail-muscles]").innerHTML = e.muscles
    .filter((m) => m.intensity >= 2)
    .map((m) => `<span class="tag">${MUSCLE_ES[m.muscle] || m.muscle}${m.intensity === 3 ? " · principal" : ""}</span>`)
    .join("");

  // Real coaching copy from core/exercises/technique.ts — not lorem ipsum.
  const t = e.technique;
  const es = (v) => (v && (v.es || v.en)) || "";
  const steps = panel.querySelector("[data-detail-steps]");
  const mistakes = panel.querySelector("[data-detail-mistakes]");
  const safety = panel.querySelector("[data-detail-safety]");
  const why = panel.querySelector("[data-detail-why]");
  if (t) {
    why.textContent = es(t.why);
    steps.innerHTML = t.execution
      .map((c, i) => `<div class="cue"><span class="cue-num">${i + 1}</span><p>${es(c)}</p></div>`)
      .join("");
    mistakes.innerHTML = t.mistakes.map((c) => `<p>• ${es(c)}</p>`).join("");
    safety.innerHTML =
      t.safety.map((c) => `<p>• ${es(c)}</p>`).join("") +
      `<p style="opacity:.9">Respiración: ${es(t.breathing)}</p>`;
    const meta = panel.querySelector("[data-detail-techmeta]");
    meta.innerHTML = [
      `Nivel técnico ${t.level}/5`,
      `RIR ${t.rir}`,
      `Estrés articular ${t.jointStress}/3`,
      `Tempo ${t.tempo}`,
    ].map((s) => `<span class="tag">${s}</span>`).join("");
    const note = panel.querySelector("[data-detail-effort]");
    note.textContent = `${es(t.effortNote)}`;
  }

  hydrateIcons(panel);
  panel.classList.remove("hide");
  panel.scrollTop = 0;
  panel.dataset.current = id;
}
window.showDetail = showDetail;

// ── Boot ───────────────────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  renderRail();
  hydrateIcons();
  wireSwitchers();
  wireModals();
  wireSteppers();
  wireKeypad();
  wireDrag();
  wireDeepLinks();
  renumber();

  await TL.load();
  hydrateIcons();
  await renderGallery();

  // Any element that shows real media needs the manifest loaded first.
  document.querySelectorAll("[data-media]").forEach((el) => {
    el.innerHTML = TL.renderMedia(el.dataset.media);
  });
  document.querySelectorAll("[data-media-title]").forEach((el) => {
    const ex = TL.byId(el.dataset.mediaTitle);
    if (ex) el.textContent = ex.es;
  });
  hydrateIcons();
});

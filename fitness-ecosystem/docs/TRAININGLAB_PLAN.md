# TrainingLab — Plan del módulo de entrenamiento

> **Filosofía (inalterable):** software **open-source**, **gratis**, **100 % local y
> privado**, con calidad de producto premium. Nada de cuentas, telemetría o nube
> obligatoria. La IA de rutinas es **opcional y corre en tu máquina**.
>
> Estado: **PLANIFICADO** (V2.0 del roadmap de `PLAN.md`), **excepto el puente de
> datos BodyLab→TrainingLab, que ya existe**: `apps/web/src/lib/traininglab-export.ts`
> (contrato `bodylab-traininglab-link` v1) exporta el mapa de debilidades
> antropométricas + la carga de entrenamiento, y está fijado por tests de contrato
> (`apps/web/src/__tests__/data-integrity.test.ts`). Cualquier cambio que rompa el
> shape debe subir `TRAININGLAB_EXPORT_VERSION` y actualizar esa suite en el mismo
> commit. Este documento define alcance, fases, esquemas y puntos de integración.
> La meta de producto sigue siendo la del `PLAN.md` §8: correcto, verificable y
> mantenible — no lo más grande posible.

---

## 1. Por qué ahora

BodyLab ya tiene, de forma verificada, casi toda la base de datos que un
entrenador necesita para personalizar rutinas:

| Activo existente | Dónde vive | Uso para TrainingLab |
|---|---|---|
| 64 ejercicios con músculo objetivo, músculos secundarios por intensidad, equipo, variantes (banda/máquina) | `apps/web/src/lib/exercises.ts` + `asset-manifest.json` (stills/GIFs) | Biblioteca + generación de rutinas |
| Registro de series y esfuerzos máximos | IndexedDB `exerciseSets`, `maxEfforts` (`lib/db.ts`) | Historial, PRs, volumen semanal |
| Perfil + medidas + snapshots | IndexedDB `profile`, `measurements`, `snapshots` | Metas, progreso real, ajuste de cargas |
| Scoring muscular (grupos fuertes/débiles) | `core/anthropometry` (`score.ts`, ratios) | **Detectar el músculo débil → programarlo primero** |
| Modelo 3D personal (auto-fit a medidas) | `BodyViewer3D` + engine OxiHuman 0.2.1 | Feedback visual del cuerpo que entrenas |
| Diseño de producto (spec §1–§106) | `BodyLab_Web_UI_Design_Specification.md` | Estética y UX coherentes desde el día 1 |
| Shell de escritorio | `apps/desktop/src-tauri` (Tauri v2, beta) | App nativa offline, sin navegador |
| **Puente de datos (contrato v1, YA EXISTE)** | `apps/web/src/lib/traininglab-export.ts` → `bodylab-traininglab-link.json` | Input directo del planificador: `muscleScores` (qué está débil), `muscleLoad` (qué está sin entrenar), `personalRecords` (e1RM por ejercicio), `trainingLog` (historial completo de series) y `exerciseCatalog` (vocabulario de 64 ejercicios) |

El diferenciador de TrainingLab frente a Hevy/Strong/Fitbod **no** es copiar un
registrador: es cerrar el ciclo **medición → cuerpo 3D → músculo débil → rutina
que lo ataca → vuelve a medir** — todo local y con IA opcional.

---

## 2. Alcance por fases (orden sugerido de implementación)

### F1 — Registro de sesión (MVP usable)
- **Pantalla "Hoy"**: lista de ejercicios de la rutina activa; tocar para
  registrar series (`peso × reps`), con **descanso cronometrado** y navegación
  por teclado (el app ya es keyboard-first, spec §104).
- Guardar en `exerciseSets` (store ya existe). Timers, RPE opcional, notas.
- Vista de **historial** por ejercicio (series, volumen, PR) leyendo `maxEfforts`.
- Criterio de salida: ciclo completo registrar → ver → editar → borrar, con E2E.

### F2 — Biblioteca + programas manuales
- Filtros por grupo muscular/equipo/nivel; favoritos.
- Reutilizar el reproductor `ExerciseGif` (stills/placeholders) y añadir demo
  animada propia con `record_anim_frame`/`export_anim_json` de OxiHuman cuando
  haya presupuesto (GIFs 100 % nuestros, sin licencias).
- **Plantillas** de rutinas (Push/Pull/Legs, Upper/Lower, Full body, x días) como
  datos (no IA) + editor simple de rutinas.
- El generador **determinista** (sin IA) selecciona ejercicios por déficit de
  score muscular y equipo disponible — funciona en cualquier PC.

### F3 — IA local de rutinas (opcional, opt-in)
- **Motor**: Ollama (o similar) en `localhost`, modelos abiertos ~3–4B cuantizados
  (familia Qwen3, Apache-2.0). Sin GPU → fallback al generador determinista de F2.
- **Prompt construido con datos reales**: perfil, medidas y deltas recientes,
  scores musculares por grupo, frecuencia disponible, equipo, objetivo (fuerza /
  hipertrofia / recomposición), lesiones/exclusiones.
- **Salida JSON validada**: el LLM solo propone un plan que se valida contra el
  **schema de rutina** y contra **reglas duras** (nunca 2 días seguidos del mismo
  grupo grande, volumen semanal dentro de rango, sin ejercicios que no existen en
  el catálogo). Si falla la validación → reintento acotado → fallback determinista.
- El LLM **nunca** ve ni decide sobre datos privados fuera de su contexto local.

### F4 — Ciclo de rendimiento cerrado
- Métricas por ejercicio: 1RM estimado (Epley/Epley modificado), volumen semanal,
  series a RIR, tendencia.
- Correlación con medidas: si el score de un grupo sube, mostrarlo en Overview y
  en el modelo 3D (los deltas ya existen en `CurrentValues`/`ProgressTimeline`).

### F5 — Escritorio nativo (sobre el prototipo Tauri ya esqueleto)
- Notificaciones/tray (recordatorio), exportación a archivo real, y opcionalmente
  SQLite vía plugin — cada puente se añade con un permiso explícito en
  `capabilities/default.json`, nunca por defecto.

---

## 3. Arquitectura (regla de independencia del core)

Sigue la regla congelada de `PLAN.md` §3: `core` NO puede importar React, Three,
Tauri ni DOM.

```
bodylab/
├─ core/training/            # NUEVO — lógica pura, sin UI
│  ├─ plan.ts                # tipos: Routine, Day, ExerciseSlot, Set prescription
│  ├─ generator.ts           # generador determinista (reglas + scores)
│  ├─ validator.ts           # valida planes (reglas duras) y la salida JSON del LLM
│  ├─ progression.ts         # 1RM estimado, volumen, deltas
│  └─ llm/                   # solo orquestación de prompt/parse (sin red)
│     ├─ prompt.ts
│     └─ ollama-client.ts    # fetch a http://localhost:11434 (opt-in)
├─ apps/web/src/features/training/
│  ├─ TodaySession.tsx       # registro con teclado + descanso
│  ├─ LibraryBrowser.tsx     # F2
│  ├─ RoutineBuilder.tsx     # F2 (plantillas)
│  └─ AiAssistant.tsx        # F3 opt-in
└─ apps/desktop/src-tauri/   # shell nativo existente (F5)
```

- **Persistencia V1**: IndexedDB (misma `db.ts`, nuevas stores `routines`,
  `sessions`, o reutilizar `exerciseSets`). Sin migración de datos: nunca romper
  lo que ya guarda el usuario.
- **IA**: cliente HTTP a Ollama con timeout, modelo configurable en Settings y
  **off por defecto**; se enciende solo si el usuario lo activa y el modelo está
  descargado.
- **i18n**: EN/ES como el resto (todo string nuevo por `i18n.ts`).

---

## 4. Schemas (borrador, JSON Schema en `core/training`)

```ts
interface Routine {
  id: string; name: string; goal: 'strength' | 'hypertrophy' | 'recomposition';
  daysPerWeek: number; equipment: Equipment[]; createdAt: string;
  days: Day[];
}
interface Day { id: string; focus: MuscleGroup[]; slots: ExerciseSlot[]; }
interface ExerciseSlot {
  exerciseId: string;        // debe existir en exercises.ts
  sets: number; repsMin: number; repsMax: number;
  rir?: number;              // reps in reserve
  restSec: number;
}
interface AiProposal {
  name: string; rationale: string; days: { focus: string; slots: string[] }[];
  // slots referencian exerciseId reales del catálogo
}
```

Validación dura mínima del `validator.ts`:
1. Todos los `exerciseId` existen y su equipo es compatible.
2. Un músculo grande no se entrena 2 días seguidos.
3. Volumen semanal por grupo dentro de [4, 22] series (ajustable por nivel).
4. Al menos 1 ejercicio por cada grupo objetivo del día (según F2/IA).
5. El LLM debe citar el músculo objetivo que el score marcó como débil.

---

## 5. Cómo la IA "sabe" qué programar

El prompt de F3 se alimenta de lo que BodyLab ya calcula:

```
Perfil: M/32 · 1.78 m · 78.5 kg · 8 mediciones en 60 días
Grupos por score (0-100): pecho 68 · espalda 61 · glúteo-medio 34 ← DÉBIL
Equipo: mancuernas, bandas
Objetivo: recomposición · 4 días/semana · 45 min
Historial reciente (30 d): 24 sesiones, volumen 11 400 kg
Regla: glúteo-medio recibe ≥6 series/semana (banded hip abduction, clamshell…)
```

El catálogo ya contiene los ejercicios para grupos pobres añadidos en la
expansión de contenido (`clamshells`, `fire-hydrants`, `banded-hip-abduction`,
`tibialis-raise`, `push-up-plus`, `face-pulls`, `band-pull-apart`…) con
variantes de equipo, que es exactamente lo que un generador necesita.

> **Tabla CSV-like para el LLM (decisión abierta §7.4, resuelta en diseño):** el
> payload del contrato v1 ya es plano y explícito (`muscleScores`, `muscleLoad`,
> `trainingLog`, `exerciseCatalog`), pensado para serializarse a tabla/CSV en el
> prompt del AGENT.md/SKILL del modelo local. El planificador **consumir ese JSON
> es la fuente de verdad**; el LLM nunca recalcular scores ni 1RM — los lee. El
> LLM propone; las reglas duras del `validator.ts` y los modelos matemáticos
> deciden.

---

## 6. Hitos y verificación (cada fase cierra verde)

| Hito | Entregable | Verificación |
|---|---|---|
| T1 | `core/training` tipos + validator + tests unit | `pnpm test` core |
| T2 | Generador determinista | Golden outputs (mismo input → mismo plan) |
| T3 | UI Hoy/historial (F1) | E2E Playwright registro completo |
| T4 | Plantillas + editor (F2) | E2E crear/editar/exportar rutina |
| T5 | Cliente Ollama + validación (F3) | Test con modelo pequeño; fallback determinista sin Ollama |
| T6 | Dashboard rendimiento (F4) | Web vitest + E2E |
| T7 | Puentes nativos Tauri (F5) | Build release en CI local |

Regla transversal: **nada de F2+ rompe F1**, y **ninguna fase exige conexión** —
todo se prueba offline en CI.

---

## 7. Decisiones abiertas (para resolver en T1)

1. Repeticiones objetivo: rangos (recomendado) vs fijos.
2. Progresión automática de cargas (¿+2.5 % cuando se cumplen rangos?) — en V1 se
   sugiere sugerencia, no auto-escritura.
3. RPE vs RIR vs solo series×reps para no abrumar.
4. ¿El LLM propone solo el plan semanal o también ajustes por sesión?
5. Nivel del usuario: auto-estimado por PRs existentes vs pregunta inicial.

---

*Última actualización: 2026-09-05. Vinculado a `PLAN.md` (roadmap V2.0) y a la
spec de diseño §97–106 (UX PC/teclado).*

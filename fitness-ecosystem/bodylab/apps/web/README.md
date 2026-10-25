# BodyLab Web Application

> React + TypeScript + Vite — Aplicación web de análisis corporal local-first.

Arquitectura global verificada del monorepo: [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).
Testing: [docs/TESTING.md](../../../docs/TESTING.md) · Arquitectura: [docs/ARCHITECTURE.md](../../../docs/ARCHITECTURE.md).

## 🚀 Inicio Rápido

```bash
# Instalar dependencias (desde fitness-ecosystem/)
pnpm install

# Ejecutar en desarrollo (desde esta carpeta)
pnpm dev                # o: npx vite
# http://localhost:5173
```

### Atajo del Escritorio (Windows)

```bash
# Instalar atajo (desde fitness-ecosystem/)
powershell.exe -ExecutionPolicy Bypass -File install-shortcut.ps1

# O ejecutar directamente el launcher del repo
# fitness-ecosystem/"BodyLab Dev.bat"
```

## 🏗️ Arquitectura (verificada)

```text
src/
├── main.tsx / App.tsx        # Bootstrap; ThemeProvider → AppProvider → Router
├── i18n.ts                   # Traducciones (EN/ES)
├── test-setup.ts             # Setup de vitest (jsdom)
├── pages/                    # Rutas: /, /measure, /history, /body, /progress,
│                             #   /references, /data, /settings (+ legadas /dashboard…)
│   ├── Overview.tsx          # Dashboard principal + AnalyticsDashboard
│   ├── Measure.tsx           # Measurement sessions guiadas
│   ├── Measurements.tsx      # Historial (/history) + tab Condición (Navy, J-P, tutoriales)
│   ├── BodyView.tsx          # Body explorer 2D (mapa muscular)
│   ├── Progress.tsx          # Timeline + A/B comparison
│   ├── References.tsx        # Perfiles de referencia
│   ├── ExportImport.tsx      # Data Vault (.bodylab)
│   └── Settings.tsx          # Ajustes
├── components/
│   ├── layout/               # Layout, Sidebar, BottomNav
│   ├── AnalyticsDashboard.tsx
│   ├── BodyMap.tsx           # Mapa muscular 2D (body-muscles)
│   ├── ExerciseGif.tsx       # GIF lazy-loading (IntersectionObserver)
│   ├── Onboarding.tsx        # Primera experiencia
│   └── ThemeToggle.tsx       # Dark/light mode
├── features/
│   ├── body/                 # BodyToolbar, ExerciseLog, MuscleDetailPanel,
│   │                         #   MuscleList, SymmetryPanel
│   └── progress/             # CurrentValues, ProgressTimeline, SnapshotComparison,
│                             #   timeline-config.ts (METRIC_CONFIG/COMPOSITION_CONFIG)
├── lib/
│   ├── store.tsx             # Estado global (React Context + useReducer)
│   ├── db.ts                 # Persistencia IndexedDB (schema v1, migración de localStorage)
│   ├── queries.ts            # Capa de lectura de datos
│   ├── constants.ts          # Re-exporta fórmulas desde @fitness/bodylab-anthropometry
│   ├── anthropometry.ts      # Helpers UI de antropometría
│   ├── types.ts              # Tipos del dominio
│   ├── exercises.ts          # 64 ejercicios, ratings musculares
│   ├── muscle-info.ts        # Info de grupos musculares
│   ├── shortcuts.ts          # Atajos de teclado de la página
│   ├── traininglab-export.ts # Puente de datos hacia TrainingLab
│   └── theme-context.tsx     # Tema (persistido en localStorage)
└── __tests__/
    ├── contract.test.ts              # 6 tests de contrato core↔web (ids, unidades, derivados)
    └── integration-total.test.ts     # tests de integración total (assets, GIFs, anatomía)
```

> `e2e-critical-flows.test.ts` (39 tests) se **eliminó** el 2026-09-11 en la pasada adversarial: reimplementaba las fórmulas dentro del propio test y las comparaba consigo mismas (sin señal real). La cobertura de esos flujos ahora sale del código real (core + `contract.test.ts` + `tests/adversarial/`).

Flujo de datos: `Componentes → useApp() (store) → queries.ts → db.ts → IndexedDB`. Excepción: `pages/ExportImport.tsx` (Data Vault) accede a `db.ts` directamente para export/import masivo.
Fórmulas/matemática: **nunca** en la UI — se importan de `@fitness/bodylab-*` (aliases en `vite.config.ts` y `tsconfig.app.json`).

> Las carpetas `components/{body,charts,forms,ui}`, `hooks/` y `utils/` existen como placeholders vacíos — no añadir código suelto ahí sin decidir su propósito.

## 🎨 Design System

El design system de BodyLab es **in-app** (no hay paquete de UI separado): las primitivas se implementan con Tailwind en `src/components/` y `src/features/`, y los tokens (color, espaciado, radios, tipografía) viven como variables CSS en `src/index.css`, con variantes `dark`.

> El antiguo `bodylab/packages/ui` se retiró el 2026-09-11: no tenía consumidores, ni tests, ni dark mode, y duplicaba este sistema.

Convenciones:
- Usa los tokens (`var(--color-*)`) para superficies, bordes y texto; no inventes colores.
- Todo estado interactivo expone `focus-visible` (y `dark:` cuando aplique).
- Los valores numéricos de medidas usan `tabular-nums`.

### Dark Mode

```tsx
// ThemeToggle activa/desactiva dark mode
// Persiste en localStorage
// Flash prevention via inline script en index.html
// CSS variables: --color-bg, --color-surface, --color-text
```

## 🏋️ Exercise Database

64 ejercicios en 8 categorías:

| Categoría | Ejercicios | Ejemplos |
|-----------|-----------|---------|
| Chest | 6 | Bench Press, Incline DB, Fly, Cable Crossover |
| Shoulders | 5 | OHP, Lateral Raise, Face Pulls, Arnold Press |
| Biceps | 5 | Barbell Curl, Incline DB, Hammer, Preacher, Chin-ups |
| Triceps | 5 | Close-Grip Bench, Overhead Ext, Skull Crushers, Pushdown, Dips |
| Back | 6 | Deadlift, Barbell Row, Pull-ups, Cable Row, DB Row, Lat Pulldown |
| Legs | 10 | Squat, Front Squat, RDL, Leg Press, Lunges, Hip Thrust, Side-Lying Hip Abduction |
| Forearms | 3 | Wrist Curl, Reverse Wrist Curl, Farmer's Walk |
| Core | 4 | Cable Crunch, Hanging Leg Raise, Russian Twist, Plank |

> La tabla de arriba lista 44 ejercicios por grupo muscular (inventario legacy/parcial). El catálogo real es de **64 ejercicios**, clasificados por `category` ∈ `compound` (18) · `isolation` (15) · `bodyweight` (12) · `machine` (12) · `cable` (7), con **36 GIFs animados + 21 stills** de dominio público.

### Ratings por Ejercicio

- **Technical Difficulty** (1-5): Beginner → Expert
- **Hypertrophy Effectiveness** (1-5): Low → Maximum
- **Muscle Contextual**: La barra de hipertrofia se ajusta según el músculo seleccionado

### GIFs Animados

36 GIFs animados (180×180) de `exercises-dataset`:
- Ubicación: `public/exercises/gifs/` (manifest: `asset-manifest.json`)
- Carga lazy por GIF (IntersectionObserver) vía `ExerciseGif.tsx`
- Licencia: MIT (código) + Gym Visual royalty-free (medios)
- 100% offline — incluidos en el bundle

## 🧪 Testing

Ver [docs/TESTING.md](../../../docs/TESTING.md). La web usa su propia config de vitest (jsdom, `src/test-setup.ts`):

```bash
# Todos los tests web (6 contrato + 30 integración = 36) — SIEMPRE desde esta carpeta
npx vitest run

# Solo contrato core↔web
npx vitest run __tests__/contract

# Solo integración total (ejercicios ↔ GIFs ↔ manifest, anatomía)
npx vitest run __tests__/integration-total

# Cobertura web
npx vitest run --coverage

# Browser E2E real (Playwright + Chromium, levanta su propio Vite en :5199)
pnpm test:e2e
```

### Estado E2E navegador
- Arranque de las rutas + decodificación real de GIF + mapa muscular 2D + sesión de medición guiada + guard de chips del design system + roundtrip `.bodylab` + persistencia del registro de ejercicio (IndexedDB).
- **5 adversariales** (`e2e/adversarial.spec.ts`): import de `.bodylab` corrupto/malformado sin crash, payload XSS almacenado inerte, entrada de texto hostil, integridad de navegación.
- El **visor 3D y su atlas anatómico se eliminaron el 2026-10-23** (junto con sus dos flujos E2E `product.spec.ts` y `anatomy-xray.spec.ts`). Registro histórico: `docs/REMOVED_3D_MODEL.md`.

> `vitest.config.ts` debe mantener los mismos aliases `@fitness/*` que `vite.config.ts`/`tsconfig.app.json` — sin ellos los tests que importan core fallan al ejecutarse desde esta carpeta.

### Contrato core↔web (6)

`contract.test.ts` fija los invariantes entre el motor y la UI: ids/unidades de medidas, derivados (composición, riesgo, edad corporal) y que no haya deriva silenciosa entre `@fitness/bodylab-*` y lo que la web muestra.

### Suite adversarial (39 core/parser + 5 navegador)

Añadida el 2026-09-11 con filosofía de **confianza cero**. Ataca fronteras y entradas degeneradas en vez de repetir fórmulas:

| Suite | Tests | Qué ataca |
|-------|-------|-----------|
| `tests/adversarial/test_analytics_adversarial.test.ts` | — | NaN/±Infinity, series vacías/de 1 punto, varianza cero, valores enormes/negativos; detectó el bug de unidades cm/m |
| `e2e/adversarial.spec.ts` | 5 | `.bodylab` corrupto/malformado, XSS almacenado, entrada hostil; detectó el crash al importar |

3 defectos menores quedan **fijados con `it.fails`** como tripwire: pasarán a fallar cuando el comportamiento cambie.

## 📦 Build

```bash
# Build producción
pnpm build                # = tsc -b && vite build

# Output: dist/
```

Los medios offline (GIFs, stills, fuentes) son la mayor parte del bundle. Los chunks de ruta se cargan bajo demanda. El presupuesto de tamaño se comprueba en cada build (`pnpm build` imprime el top-5 de assets). El visor 3D y sus ~11 MB de activos (OHPK, wasm, atlas) se eliminaron el 2026-10-23 (`docs/REMOVED_3D_MODEL.md`).

## 📄 Licencia

Apache-2.0 — Ver [LICENSE](../../../LICENSE)

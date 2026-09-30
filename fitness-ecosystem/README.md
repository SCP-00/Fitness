# Fitness Ecosystem

> Ecosistema open-source para antropometría, modelado corporal y entrenamiento.

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![License: CC BY-SA 4.0](https://img.shields.io/badge/License-CC%20BY--SA%204.0-lightgrey.svg)](https://creativecommons.org/licenses/by-sa/4.0/)
[![Tests](https://img.shields.io/badge/tests-453%20root%20%2B%2036%20web%20%2B%2019%20e2e-brightgreen)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-6.x-blue)]()

## 🎯 Objetivo

Dos aplicaciones independientes pero compatibles:

- **BodyLab** — Antropometría, modelado corporal 2D/3D, anatomía, ejercicio y progreso
- **TrainingLab** — Rutinas, registro, equipamiento, progresión y asistente LLM

## 🏗️ Arquitectura

```text
fitness-ecosystem/
├── bodylab/
│   ├── core/                    # Motor puro (sin UI)
│   │   ├── anthropometry/       # McCallum, Venus, Adonis, WHtR
│   │   ├── measurements/        # Modelo de datos
│   │   ├── composition/         # Composición corporal
│   │   ├── references/          # Perfiles de referencia
│   │   ├── progress/            # Evolución temporal
│   │   ├── validation/          # Validación
│   │   ├── export/              # CSV, JSON, Fitness Bundle
│   │   └── analytics/           # Body Age, Health Risk, Prediction, Correlation
│   ├── integrations/            # Adaptadores externos
│   │   ├── oxihuman/            # 3D paramétrico
│   │   ├── musclemapjs/         # 2D mapas musculares
│   │   └── clad-body/           # Validación ISO 8559-1
│   ├── packages/
│   │   └── contracts/           # JSON Schemas
│   └── apps/
│       ├── web/                 # React + Vite + Tailwind
│       └── desktop/             # Tauri (Windows)
├── traininglab/                 # App 2: Entrenamiento (FUTURE)
├── tests/                       # suites de core + tests/adversarial/
└── docs/                        # Especificaciones
```

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
pnpm install

# Ejecutar BodyLab en desarrollo
pnpm dev

# Abrir en navegador
# Windows: haz doble clic en "BodyLab Dev" del escritorio
# Manual: cd bodylab/apps/web && npx vite

# Ejecutar tests
pnpm test

# Typecheck
pnpm typecheck

### App de Escritorio (Tauri 2, beta)

```bash
# Desarrollo (abre una ventana nativa apuntando al dev server de Vite)
cd bodylab/apps/desktop && pnpm dev

# Instalador Windows (NSIS) — requiere Rust + VS Build Tools (C++)
cd bodylab/apps/desktop && pnpm build
# → bodylab/apps/desktop/src-tauri/target/release/bundle/nsis/BodyLab_*_x64-setup.exe
```

Requisitos una sola vez: Rust stable (rustup.rs) y Visual Studio Build Tools con la carga "Desktop development with C++". La app es la misma web envuelta en WebView2: 100% offline, datos en IndexedDB del webview, sin permisos nativos (solo `core:default` + `opener`).

**Launchers (raíz del repo):**
- `BodyLab.bat` — arranca la app de escritorio ya compilada (sin consola). Si no hay build, te indica qué hacer.
- `BodyLab Dev.bat` — menú de desarrollo: servidor web (1), escritorio con hot-reload (2), build de release + smoke test (3), pipeline completo (4).
- `TrainingLab.bat` — levanta el servidor local y abre TrainingLab en el navegador.
- `LAN Server.bat` — sirve **las dos** apps en un puerto (8090) tras una página hub, para probarlas en el móvil.

El binario de release pasa un **smoke test** (`scripts/smoke-desktop.ps1`: versión, ventana, estabilidad, contenedor de storage, cierre elegante) — el mismo que ejecuta el job `e2e-desktop-smoke` de CI.

### Atajo del Escritorio

```bash
# Instalar los atajos (PowerShell) — BodyLab, BodyLab Dev, TrainingLab, LAN Server
cd fitness-ecosystem
powershell.exe -ExecutionPolicy Bypass -File install-shortcut.ps1
```

El script es idempotente, escribe en el escritorio **real** (que con OneDrive
redirigido es `%OneDrive%\Desktop`) y fija un `IconLocation` explícito en
`resources/brand/<app>-icon.ico`. Ese detalle importa: un `.lnk` que deja el
icono al ejecutable (`icon=,0`) hereda el recurso **embebido en el binario**, y
si el binario es anterior al arte de marca se queda con el icono por defecto.
Los `.ico` multinivel se generan junto al resto de la marca:

```bash
node scripts/render-brand-icons.mjs   # favicons + apple-touch + 512 + .ico (16→256)
```

## ✨ Características Principales

### 📊 Análisis Antropométrico
- **McCallum** (proporciones masculinas)
- **Venus** (proporciones femeninas)
- **Adonis Index** (proporción hombros/cintura)
- **WHtR** (relación cintura/altura)
- **Frame Size** (clasificación de complexión)

### 🧬 Analytics Avanzado (Wave 5)
- **Body Composition** — % grasa corporal (US Navy + BMI)
- **Health Risk** — WHtR + BMI + factores de riesgo
- **Body Age** — Edad corporal derivada de métricas
- **Progress Prediction** — Regresión lineal a 30 días
- **Correlation Engine** — Detección de patrones entre mediciones

### 🏋️ Sistema de Ejercicios
- **64 ejercicios** en 8 categorías musculares (36 GIFs + 21 stills de dominio público)
- **29 grupos musculares** de entrenamiento (hipertrofia contextual)
- Ratings de **dificultad técnica** (1-5)
- Ratings de **hipertrofia** (1-5) contextualizados por músculo
- **36 GIFs animados** de ejercicios (100% offline)
- Registro de **series, repeticiones, peso, RPE**
- Cálculo de **1RM** (fórmula de Epley)
- Tracking de **máximo esfuerzo** por ejercicio

### 🎨 UI/UX
- **Dark mode** con bajo contraste
- **Design System** in-app — tokens Tailwind (`index.css`) + componentes propios
- **Measurement Sessions** guiadas
- **Body Explorer** 2D/3D interactivo
- **A/B Comparison** de snapshots
- **Data Vault** con export/import
- **Responsive** (desktop, tablet, mobile)

### 💾 Persistencia
- **IndexedDB** (web) — datos locales, nunca al servidor
- **SQLite** (desktop, futuro)
- **Migrations** con schema versioning
- Export **.bodylab** (ZIP con manifest)
- **100% offline** — sin cuentas, sin cloud

## 📄 Licencia

**Apache-2.0** — Ver [LICENSE](LICENSE) para detalles.

Componentes de terceros mantienen sus propias licencias. Ver [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## 🧪 Testing

```bash
# Todo el pipeline de calidad en UN comando (CI-ready):
pnpm check            # typecheck + 453 root + 36 web + 21 E2E navegador (producto + adversarial + x-ray)

# 453 tests en la suite raíz (core + contrato + adversarial)
pnpm test

# Tests específicos
cd bodylab/apps/web && npx vitest run           # Web tests (36)
cd bodylab/apps/web && pnpm test:e2e            # E2E navegador (21)
npx vitest run tests/adversarial                # Solo la suite adversarial
```

### Cobertura de Tests

| Módulo | Tests | Estado |
|--------|-------|--------|
| Anthropometry | 198 | ✅ |
| Measurements | 20 | ✅ |
| Database Schema | 9 | ✅ |
| Export | 8 | ✅ |
| Web (integration + contract) | 36 | ✅ |
| Score | 26 | ✅ |
| WHtR | 21 | ✅ |
| Adonis | 15 | ✅ |
| McCallum | 18 | ✅ |
| References | 10 | ✅ |
| Golden Dataset | 10 | ✅ |
| Composition | 8 | ✅ |
| Progress | 6 | ✅ |
| **Total** | **453** | ✅ |

> Filas legacy y parciales por módulo — el inventario real, archivo por archivo, está en [docs/TESTING.md](docs/TESTING.md). Verificado el 2026-09-11: `pnpm test` **453/453 PASS en 24 archivos**, vitest web **36/36** (30 integración + 6 contrato) y Playwright **21/21** (14 producto + 5 adversariales + 2 x-ray). Se eliminaron 39 tests tautológicos y se añadieron suites adversariales (ver `docs/TESTING.md` §5).

## 🤝 Contribuciones

Ver [CONTRIBUTING.md](CONTRIBUTING.md) antes de enviar un Pull Request.

## 📝 Documentación

- [PLAN.md](PLAN.md) — Plan maestro del proyecto
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arquitectura verificada (fuente de verdad)
- [TESTING.md](docs/TESTING.md) — Estrategia de testing y comandos
- [UI_DESIGN.md](docs/UI_DESIGN.md) — Reglas de interfaz y contrato responsive
- [TRAININGLAB_UI_PLAN.md](docs/TRAININGLAB_UI_PLAN.md) — Contrato de diseño de TrainingLab
- [PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — Especificación del producto
- [RELEASE_NOTES.md](RELEASE_NOTES.md) — Notas de versión
- [CHANGELOG.md](CHANGELOG.md) — Historial de cambios
- [RESOURCE_MATRIX.md](RESOURCE_MATRIX.md) — Recursos externos

---

*Desarrollado con ❤️ por la comunidad open-source*

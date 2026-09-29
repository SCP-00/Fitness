# BodyLab

> Aplicación de antropometría, modelado corporal 2D/3D, anatomía, ejercicio y progreso.
> Local-first · Open-source · Sin cuentas · Sin cloud.

## 🎯 Función

**"¿Cómo han cambiado mis medidas, composición y características corporales respecto a mis referencias y a mi propio historial?"**

## 📦 Arquitectura

```text
bodylab/
├── core/                    # Motor puro (sin UI, sin React, sin DOM)
│   ├── anthropometry/       # McCallum, Venus, Adonis, WHtR, Frame Size
│   ├── measurements/        # Modelo de datos para mediciones
│   ├── composition/         # Composición corporal, marco óseo
│   ├── references/          # Perfiles de referencia configurables
│   ├── progress/            # Evolución temporal, snapshots
│   ├── validation/          # Validación con clad-body
│   ├── export/              # CSV, JSON, Fitness Bundle (.bodylab)
│   ├── analytics/           # Body Age, Health Risk, Prediction, Correlation
│   └── database/            # Schema + repositorios
│
├── integrations/            # Adaptadores externos
│   ├── oxihuman/            # 3D paramétrico (Apache-2.0)
│   ├── musclemapjs/         # 2D mapas musculares (MIT)
│   └── clad-body/           # Validación ISO 8559-1 (Apache-2.0)
│
├── packages/
│   └── contracts/           # JSON Schemas
│
├── apps/
│   ├── web/                 # React + Vite + Tailwind
│   └── desktop/             # Tauri (Windows)
│
└── tests/                   # 453 tests en la suite raíz (core + contrato + adversarial)
```

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| UI Framework | React | 19.x |
| Language | TypeScript | 6.x |
| Build | Vite | 8.x |
| Styling | Tailwind CSS | 4.x |
| Charts | Recharts | 3.x |
| 3D | Three.js + OxiHuman | — |
| 2D | body-muscles | — |
| State | React Context | — |
| Persistence | IndexedDB (web) | — |
| Testing | Vitest | 4.x (web) / 1.x (core) |
| Desktop | Tauri | 2.x |

## 🚀 Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Abrir navegador
# Windows: bodylab/apps/web/start-dev.bat
# Manual: cd bodylab/apps/web && npx vite

# Ejecutar tests
pnpm test

# Typecheck
pnpm typecheck

# Build producción
cd bodylab/apps/web && npx vite build

# App de escritorio (Tauri 2, beta) — instalador NSIS Windows
# Requiere Rust + VS Build Tools (C++)
cd bodylab/apps/desktop && pnpm dev      # ventana nativa en desarrollo
cd bodylab/apps/desktop && pnpm build    # → src-tauri/target/release/bundle/nsis/
```

## 📊 Features Implementadas

### Core (Motor puro)
- ✅ McCallum formula (male proportions)
- ✅ Venus Index (female proportions)
- ✅ Adonis Index (shoulder/waist ratio)
- ✅ WHtR (waist-to-height ratio)
- ✅ Frame Size classification
- ✅ Score calculation (attenuation function)
- ✅ Body Composition (US Navy + BMI)
- ✅ Health Risk Indicators
- ✅ Body Age Score
- ✅ Progress Prediction (linear regression)
- ✅ Correlation Engine (Pearson)
- ✅ Golden dataset tests

### Web App
- ✅ Onboarding (9 pasos, bilingual EN/ES)
- ✅ Overview con analytics dashboard
- ✅ Measurement Sessions guiadas
- ✅ Body Explorer 2D interactivo
- ✅ Body Explorer 3D (OxiHuman + Three.js)
- ✅ Exercise tracking (64 ejercicios, 36 GIFs animados + 21 stills)
- ✅ Progress con A/B comparison
- ✅ Data Vault (export/import .bodylab)
- ✅ Reference profiles
- ✅ Settings
- ✅ Dark mode (bajo contraste)
- ✅ Responsive (desktop, tablet, mobile)
- ✅ Design System in-app (tokens en `index.css` + componentes propios)

### Testing
- ✅ 453 tests en la suite raíz (core + 6 contrato + 39 adversariales) + 36 tests web (6 contrato + 30 integración) + 21 E2E navegador (14 producto + 5 adversariales + 2 x-ray, render 3D real + atlas de anatomía)
- ✅ Suites adversariales (confianza cero): analytics + parser binario + import hostil en navegador
- ✅ Golden dataset (10 tests)
- ✅ Roundtrip data integrity
- ✅ TypeScript strict (0 errores)

## 📄 Licencia

Apache-2.0 — Ver [LICENSE](../LICENSE)

## 📚 Documentación técnica

- [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) — Arquitectura verificada (fuente de verdad)
- [docs/TESTING.md](../docs/TESTING.md) — Estrategia de testing y comandos
- [docs/PERFORMANCE.md](../docs/PERFORMANCE.md) — Baseline de rendimiento y budgets

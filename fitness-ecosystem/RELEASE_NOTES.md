# BodyLab — Release Notes

## Current Version: V1.1.0-dev

## What is BodyLab?

BodyLab is an open-source, local-first application for tracking, analyzing, and visualizing anthropometric measurements and body composition over time.

**Philosophy:** Reference Profile, not Ideal Body. Proximity to reference, not beauty score. Information, not judgment.

## Key Features

### 🎯 Anthropometric Analysis
- **McCallum Formula** for male proportions
- **Venus Index** for female proportions
- **Adonis Index** (shoulder-to-waist ratio)
- **WHtR** (waist-to-height ratio) for health
- **Frame size classification** (small/medium/large)

### 🧬 Advanced Analytics
- **Body Composition** — % body fat (US Navy + BMI methods)
- **Health Risk Indicators** — WHtR + BMI + risk factors
- **Body Age Score** — Composite body age from metrics
- **Progress Prediction** — Linear regression with R² confidence
- **Correlation Engine** — Pearson correlation between measurements

### 🏋️ Exercise System
- **64 exercises** across 5 categories (compound, isolation, bodyweight, machine, cable)
- **Specific muscle groups** (not generic "chest" — chest_upper, chest_lower)
- **Technical difficulty** (1-5) and **hypertrophy** (1-5) ratings per exercise
- **Muscle-contextual hypertrophy** — bars adjust based on selected muscle
- **36 animated GIFs + 21 public-domain stills** showing proper form (100% offline)
- **Exercise tracking** — sets, reps, weight, RPE, 1RM estimation
- **Max effort tracking** per exercise

### 📊 2D Body Visualization
- Interactive muscle map with body-muscles library
- Color-coded heatmap: green→yellow→orange→red
- Front/back view switching
- Hover shows name, score, status, training volume
- Color legend always visible

### 🎮 3D Body Visualization
- Parametric body generation (OxiHuman + Three.js)
- Camera presets (Front/Back/Side)
- Graceful failure state with retry
- Interaction hints on first use
- Lazy loading (doesn't load on unrelated routes)

### 📈 Progress Tracking
- Timeline visualization with Recharts
- **A/B Snapshot Comparison** — compare any two dates
- **"What Changed?"** — deterministic analysis of changes
- Trend analysis (improving/declining/stable)

### 🎨 UI/UX
- **Dark mode** with low contrast
- **Design System** in-app — Tailwind tokens (`index.css`) + component conventions
- **Measurement Sessions** — guided workflow
- **Data Vault** — export/import with .bodylab format
- **Responsive** — desktop, tablet, mobile
- **Bilingual** — English and Spanish

### 💾 Data Management
- **IndexedDB** persistence (web)
- **SQLite** ready (desktop)
- **Schema versioning** with migrations
- **Export/Import** — JSON, CSV, .bodylab (ZIP)
- **100% offline** — no accounts, no cloud, no telemetry

## Installation

### Web Application
```bash
cd bodylab/apps/web
pnpm install
npx vite
# Open http://localhost:5173
```

### Desktop Launcher (Windows)
```bash
# Double-click "BodyLab Dev" on desktop
# Or run: bodylab/apps/web/start-dev.bat
```

## System Requirements

### Web
- Modern browser (Chrome, Firefox, Safari, Edge)
- WebGL support (for 3D visualization)
- No internet required

### Desktop (beta, Windows)
- Windows 10/11 (64-bit) + WebView2
- 4 GB RAM minimum
- 500 MB disk space

## Testing

- **453 root-suite tests** across 24 files (100% pass rate)
- **36 web tests** (30 integration + 6 core↔web contract)
- **39 adversarial tests** (confianza cero: analytics + binary parser; 2 known defects pinned)
- **19 real-browser E2E flows** (14 product + 5 adversarial, Playwright + Chromium)
- **10 golden dataset tests**
- **TypeScript strict** (0 errors) · **oxlint clean** (0 warnings)

## Architecture

```
BodyLab
├── Core Engine (TypeScript) — NO UI imports
│   ├── Anthropometry (McCallum, Venus, Adonis, WHtR)
│   ├── Measurements (data model)
│   ├── Composition (body fat, lean mass)
│   ├── References (configurable profiles)
│   ├── Progress (snapshots, timeline)
│   ├── Validation (clad-body)
│   ├── Export (JSON, CSV, .bodylab)
│   └── Analytics (body age, health, prediction, correlation)
├── Integrations
│   ├── body-muscles (2D muscle map)
│   ├── OxiHuman (3D parametric body)
│   └── clad-body (ISO 8559-1 validation)
├── Web App (React 19 + Vite 8 + Tailwind 4)
│   ├── Design System (in-app tokens + components)
│   ├── Exercise Database (64 exercises + 36 GIFs + 21 stills)
│   └── Analytics Dashboard
└── Desktop App (Tauri 2) — beta (NSIS)
```

## Third-Party Components

| Component | License | Purpose |
|---|---|---|
| body-muscles | MIT | 2D muscle visualization |
| OxiHuman | Apache-2.0 | 3D parametric body |
| Three.js | MIT | 3D rendering |
| Recharts | MIT | Charts and graphs |
| Tailwind CSS | MIT | Styling |
| exercises-dataset | MIT + Gym Visual | Exercise GIFs |
| Tauri | MIT/Apache-2.0 | Desktop framework |

## License

Apache-2.0 — See [LICENSE](LICENSE) for details.

## Acknowledgments

- OxiHuman by cool-japan (Apache-2.0)
- body-muscles (MIT)
- exercises-dataset by hasaneyldrm (MIT)
- MakeHuman Community (CC0 assets)
- All contributors and open-source projects

---

*Version: 1.1.0-dev*
*Last updated: 2026-09-11*

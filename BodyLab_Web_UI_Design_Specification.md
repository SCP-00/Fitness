# BodyLab Web UI/UX Design Specification
## Product-grade redesign for an open-source, local-first anthropometric web application

**Document type:** implementation specification for an AI coding agent  
**Target:** `bodylab/apps/web` implementation + in-app Tailwind design tokens  
**Primary objective:** turn the current technically functional web app into a polished, modular, highly usable product without rewriting the domain core.  
**Design direction:** scientific instrument + modern personal analytics, not generic "fitness dashboard".  
**Primary language:** Spanish and English must remain first-class citizens.  
**Important product principle:** BodyLab reports measurements and proximity to selected references; it must not present a beauty score or imply a single "ideal body".

**Status note (2026-09-11):** the `bodylab/packages/ui` package referenced throughout this spec was **removed** — the web app never imported it, and the design system is the in-app Tailwind token layer (`apps/web/src/index.css`) plus components in `src/components/` and `src/features/`. Read any "packages/ui" guidance below as "in-app `src/components/`".

---

# 0. Executive directive to the implementation agent

Treat this document as a product and implementation contract.

The goal is **not** to make the existing pages prettier by adding shadows, gradients, animations, or more cards.

The goal is to make the application:

1. easier to understand within 5–10 seconds,
2. faster to measure with,
3. better at explaining change over time,
4. easier to explore through the 2D body map,
5. more useful when a user has only a few measurements,
6. visually coherent across every page and state,
7. modular enough that new features can be added without making page components grow into 500–700 line files,
8. respectful of the local-first/privacy philosophy,
9. excellent on desktop while remaining fully usable on tablet and mobile,
10. performant when the 3D body viewer is loaded.

**Do not add unrelated product features simply because they are technically interesting.**

Do not introduce:
- social feeds,
- accounts/cloud synchronization,
- AI coaching,
- photo body analysis,
- camera-based measurement,
- gamification,
- unnecessary onboarding decoration,
- large marketing-style hero sections inside the app.

The existing project already has a strong technical foundation. The redesign must make the UI reflect that foundation.

---

# 1. Current implementation context

The current repository already contains:

- React + TypeScript + Vite web application.
- Tailwind CSS.
- React Router.
- Recharts.
- Three.js.
- OxiHuman integration.
- MuscleMapJS integration.
- existing 2D body view.
- existing 3D body viewer.
- onboarding flow.
- measurements page.
- dashboard.
- progress page.
- export/import.
- settings.
- local-first intent.
- reusable UI package placeholder.

Important current implementation issues that the redesign must account for:

### 1.1 Latest-measurement problem

The web UI frequently uses patterns equivalent to:

```ts
measurements.find(m => m.type === type)
```

This is incorrect when historical measurements are append-only.

The UI architecture must use domain/application queries such as:

```ts
getLatestMeasurement(type)
getMeasurementHistory(type)
getLatestSession()
getMissingMeasurementTypes()
getSnapshotComparison(a, b)
```

Never make a visual redesign while leaving this data-selection problem intact.

### 1.2 Business logic duplicated in web

The web currently has anthropometric calculation logic duplicated under `apps/web/src/lib`.

The redesigned UI must consume the core domain/application layer.

Target:

```text
UI
  ↓
Application/use-case layer
  ↓
Core/domain
  ↓
Repository / integrations
```

Not:

```text
React component
  ↓
local calculation
  ↓
localStorage
```

### 1.3 Persistence

The product direction is local-first. The web should use the repository abstraction and IndexedDB implementation rather than making UI code responsible for persistence details.

### 1.4 Page decomposition

Existing page files are large. The redesign must use feature-based composition.

Target:

```text
apps/web/src/
├── app/
├── routes/
├── features/
│   ├── overview/
│   ├── measurements/
│   ├── body/
│   ├── progress/
│   ├── references/
│   └── data/
├── components/
├── repositories/
├── services/
├── hooks/
└── i18n/
```

---

# 2. Product positioning

## 2.1 What BodyLab is

BodyLab is:

> A private, local-first tool for recording anthropometric measurements, evaluating them against explicit reference profiles, visualizing the body, and understanding change over time.

## 2.2 What BodyLab is not

It is not:

- a calorie tracker,
- a social fitness platform,
- a body-rating app,
- a medical diagnostic device,
- a "perfect body" generator.

The UI must reinforce this distinction.

---

# 3. Design language

## 3.1 Visual direction

Use:

**Scientific / Editorial / Instrument / Calm Analytics**

Avoid:

**Gym bro / neon fitness / aggressive gamification / SaaS template / glassmorphism everywhere**

The interface should feel like a carefully designed measurement instrument.

Reference qualities worth borrowing from established fitness products:

- Hevy: fast navigation and strong "record → inspect → history" information flow. Its current product emphasizes quick logging, historical comparison, and concise progress analytics. citeturn919145search1turn919145search9
- Fitbod: detailed drill-down pages where a user can move from a high-level item into instructions/history/details. Apply the information hierarchy, not the branding. citeturn919145search15
- Modern health/analytics concepts: metric cards should communicate one fact clearly instead of combining multiple unrelated values.
- Interactive anatomy viewers: selection, isolation, system toggles, detail panels, and persistent interaction hints are strong patterns for BodyLab's body explorer. citeturn919145search2turn919145search6

Do not copy visual identities from these products.

---

# 4. Global layout

## 4.1 Desktop

Use a fixed left navigation rail/sidebar.

```text
┌───────────────┬─────────────────────────────────────────────┐
│               │                                             │
│   BodyLab     │   page content                              │
│               │                                             │
│   Overview    │                                             │
│   Measure     │                                             │
│   Body        │                                             │
│   Progress    │                                             │
│               │                                             │
│   Reference   │                                             │
│   Data        │                                             │
│   Settings    │                                             │
│               │                                             │
│   ● Local     │                                             │
│               │                                             │
└───────────────┴─────────────────────────────────────────────┘
```

Recommended sidebar width:

- expanded: `248–264px`
- compact mode: `72px`
- mobile: hidden, replaced by bottom navigation or menu drawer.

The current sidebar gradient-heavy implementation must be replaced with a mostly neutral surface.

**PC binding:** desktop is the primary canvas — button system §98, action architecture §99, window/shell rules §105, acceptance checklist §106.

## 4.2 Main content

Use:

```css
max-width: 1440px;
margin-inline: auto;
padding-inline: clamp(20px, 3vw, 48px);
```

Do not allow pages to become a giant full-width spreadsheet.

Recommended content width:

- normal page: 1180–1320px,
- dense analytics page: up to 1400px,
- measurement wizard: 900–1080px,
- focused detail panel: 720–960px.

## 4.3 Page rhythm

Every page should follow:

```text
Page header
↓
Context / primary action
↓
Primary content
↓
Secondary content
```

Do not begin pages with 8–12 cards.

---

# 5. Design tokens

Create a single token layer. Tailwind utilities may consume these tokens.

## 5.1 Color system

Base:

```text
--bg-app:        #F5F7FA
--bg-surface:    #FFFFFF
--bg-subtle:     #F8FAFC
--bg-elevated:   #FFFFFF

--text-primary:  #111827
--text-secondary:#475569
--text-muted:    #64748B
--text-disabled: #94A3B8

--border:        #E2E8F0
--border-strong: #CBD5E1
```

Brand:

```text
--brand:         #2563EB
--brand-hover:   #1D4ED8
--brand-soft:    #EFF6FF
```

Semantic:

```text
--success:       #16A34A
--success-soft:  #F0FDF4

--warning:       #D97706
--warning-soft:  #FFFBEB

--attention:     #EA580C
--attention-soft:#FFF7ED

--danger:        #DC2626
--danger-soft:   #FEF2F2
```

Do not use gradients as the default visual language.

Gradients are permitted only for:
- onboarding backdrop,
- occasional product-brand accent,
- special visualization effects.

## 5.2 Dark mode

Dark mode is allowed architecturally, but it is not the redesign priority.

The light theme must be excellent first.

If dark mode is implemented, do not simply invert colors. Re-map semantic tokens.

## 5.3 Typography

Use a consistent UI font stack.

Prefer:

```text
Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif
```

Numeric data should have deliberate hierarchy.

Recommended:

```text
Display:     36–48px / 1.05 / 600
H1:          28–32px / 1.15 / 700
H2:          20–24px / 1.25 / 650
H3:          16–18px / 1.3 / 600
Body:        14–16px / 1.5
Label:       12–13px / 1.4 / 500
Numeric:     24–40px / tabular numerals
```

Use:

```css
font-variant-numeric: tabular-nums;
```

for measurement values, dates, scores, deltas, and chart labels.

---

# 6. Spacing and shape

Use an 8px base rhythm:

```text
4
8
12
16
20
24
32
40
48
64
```

Cards:

```text
radius: 14–18px
```

Avoid excessive 20–24px rounding on every element.

Buttons:

```text
small: 8–10px radius
medium: 10–12px radius
large/primary: 12px radius
```

Borders are important. Prefer:

```text
1px solid #E2E8F0
```

instead of large shadows.

Use shadows only when elevation is meaningful:

```text
shadow-xs: barely perceptible
shadow-sm: popover/modal
shadow-md: overlay
```

The main content should not look like 20 floating cards.

---

# 7. Navigation model

Replace current:

```text
Dashboard
Measurements
Body
Progress
Export
Settings
```

with:

```text
Overview
Measure
Body
Progress

Reference
Data
Settings
```

## 7.1 Navigation labels

Use action-oriented naming.

Bad:

```text
Measurements
```

Better:

```text
Measure
```

The page can still be titled:

```text
Measurements
```

but the navigation should represent the user's intent.

## 7.2 Primary navigation order

The user should encounter:

1. Overview
2. Measure
3. Body
4. Progress

because this corresponds to:

```text
understand
→ record
→ explore
→ compare
```

---

# 8. Global top bar

Desktop page header should contain:

```text
[Page title]
[small supporting context]                   [primary action]
```

Examples:

```text
Overview
Last assessment: Aug 30, 2026                [Measure now]
```

or:

```text
Progress
Tracking change across 4 snapshots           [New snapshot]
```

Do not repeat the same page title in multiple cards.

---

# 9. Primary action rules

There should normally be one visually dominant action per page.

Use:

```text
Measure now
Continue measuring
Save session
Compare snapshots
Explore body
```

not:

```text
Add
Create
Submit
Go
Continue
```

The button should explain the task.

**PC binding:** three-tier button system and “one dominant action per page” rules: §98–99.

---

# 10. Overview redesign

This is the most important page.

## 10.1 Goal

Answer:

> "What is the current state of my body data, and what changed recently?"

within 5 seconds.

**PC binding:** full PC dashboard anatomy, KPI caps, and split-pane rules: §100.

## 10.2 Layout

```text
┌─────────────────────────────────────────────────────────────┐
│ Overview                                   [Measure now]     │
│ Latest assessment · Aug 30, 2026                            │
│                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│ │ 78.2 kg      │ │ 21            │ │ 4 snapshots │           │
│ │ −0.6 kg      │ │ 82% complete │ │ Since June  │           │
│ └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                             │
│ ┌──────────────────────────┐ ┌────────────────────────────┐ │
│ │ BODY                     │ │ KEY CHANGES                │ │
│ │                          │ │                            │ │
│ │     2D body map          │ │ Chest    +1.6 cm           │ │
│ │                          │ │ Waist    −2.0 cm           │ │
│ │                          │ │ Hips     +0.8 cm           │ │
│ │                          │ │                            │ │
│ │ [Front] [Back]           │ │ [View progress →]          │ │
│ └──────────────────────────┘ └────────────────────────────┘ │
│                                                             │
│ RECENT MEASUREMENTS                                         │
│                                                             │
│ Chest      103.4 cm       +1.6       Aug 30                │
│ Waist       81.4 cm       −2.0       Aug 30                │
│ Hips        97.1 cm       +0.8       Aug 30                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 10.3 Overview metric cards

Maximum: 3–4.

Good:

```text
Current weight
78.2 kg
−0.6 kg vs previous session
```

Good:

```text
Measurement coverage
82%
8 / 10
```

Good:

```text
Latest session
Aug 30
8 measurements
```

Do not put BMI, body-fat percentage, water, lean mass, bone mass, symmetry, reference name, and other metrics all above the fold.

Those belong deeper in the page.

## 10.4 “What changed” module

This module is required.

It must compare the latest valid session/snapshot with the previous comparable session.

Example:

```text
What changed

Chest      +1.6 cm
Waist      −2.0 cm
Biceps     +0.6 cm
Thigh      +0.8 cm

7 measurements changed
```

Every row is clickable.

Clicking:

```text
Chest
```

opens the metric detail.

## 10.5 Empty Overview

When no measurements exist:

```text
Start your first measurement

BodyLab becomes more useful once you have
your first complete measurement session.

[ Start measuring ]

You can save partial sessions and continue later.
```

Never display a giant blank chart.

---

# 11. Measurement workflow

This is the highest-priority UX feature.

## 11.1 Concept

Replace the mental model:

```text
fill random fields
```

with:

```text
measurement session
→ guided fields
→ review
→ save
```

## 11.2 Session header

```text
New measurement session

Aug 30, 2026
Morning

Progress
██████████████░░ 8 / 10

[Save draft]
```

A draft can exist locally.

## 11.3 Measurement order

Use a deterministic order.

Example:

```text
Profile/context
↓
Neck
Shoulders
Chest
Waist
Abdomen
Hips
Upper arm
Forearm
Thigh
Calf
↓
Bilateral
↓
Composition
```

Allow users to skip a metric.

## 11.4 Guided field

Each measurement field should contain:

```text
CHEST
Around the fullest part of the chest.

Previous
102.4 cm

Current
[ 103.4 ] cm

Δ
+1.0 cm
```

Optional:

```text
[How to measure]
```

opens a contextual guide.

## 11.5 Numeric entry behavior

Requirements:

- numeric input,
- unit suffix visually attached,
- min/max validation,
- decimal support where appropriate,
- keyboard-friendly,
- arrow/up-down step behavior where useful,
- Enter advances to next measurement,
- Escape closes contextual help,
- invalid values remain visible and explain why,
- never clear user input because validation failed.

Example:

```text
┌─────────────────────────────────┐
│ 103.4                         cm │
└─────────────────────────────────┘
```

Do not use placeholder text as the only label.

**PC binding:** two-pane session layout and the mandatory keyboard contract (Enter/↑↓/Ctrl+Enter, ghost previous value, autosave draft): §101.

## 11.6 Progress indicator

Use:

```text
8 of 10 measurements
```

plus a visual bar.

Avoid gamified language.

Bad:

```text
Amazing! You're crushing it!
```

Good:

```text
8 of 10 measurements recorded.
```

## 11.7 Review step

Before save:

```text
Review session

10 measurements
2 changed since last session
0 validation issues

Chest      103.4 cm      +1.0
Waist       81.4 cm      −2.0
Hips        97.1 cm      +0.8

[Back to measurements]        [Save session]
```

After save:

```text
Session saved
Aug 30 · 08:42

[View progress]
[Continue exploring]
```

Do not use a disruptive full-page success animation.

---

# 12. Measurements page

## 12.1 Main structure

```text
Measurements
Your recorded measurements                           [New session]

CURRENT SESSION
────────────────────────────────────────────

8 / 10 recorded

Chest        103.4 cm     +1.0
Waist         81.4 cm     −2.0
Hips          97.1 cm     +0.8
...

HISTORY
────────────────────────────────────────────

Aug 30
Aug 23
Aug 16
Aug 09
```

## 12.2 Region groups

Use collapsible sections:

```text
Upper body
Torso
Arms
Lower body
Composition
Bilateral
```

Do not use emoji as the primary region icons.

Use Lucide icons or a small custom line-icon set.

## 12.3 Measurement row

```text
┌──────────────────────────────────────────────┐
│ Chest                         103.4 cm        │
│ Previous 102.4 cm        +1.0 cm             │
│ Reference 105.8 cm       2.3% below           │
│                                      →        │
└──────────────────────────────────────────────┘
```

Click row → detail.

---

# 13. Metric detail view

This should become a reusable pattern.

## 13.1 Detail panel

Desktop: right-side drawer or split panel.

Mobile: full-screen page.

```text
Chest
──────────────────────

103.4 cm

+1.0 cm
since previous session

Reference
105.8 cm
−2.4 cm from reference

[Chart]

History
Aug 30    103.4
Aug 23    102.4
Aug 16    101.8

[How to measure]
```

## 13.2 Chart behavior

Chart must support:

- range selector: 1M / 3M / 6M / All,
- hover/tap point,
- current point emphasized,
- previous point comparison,
- reference shown as a subtle horizontal line if applicable.

Avoid chart decorations that do not encode information.

## 13.3 Reference line

Use a subtle dashed line:

```text
Reference 105.8 cm
────────────────────
```

Do not use red/green solely to imply moral judgment.

---

# 14. Body page

This is the product's visual differentiator.

## 14.1 Page model

```text
Body
────────────────────────────────────────────────────────

[2D] [3D]

[Front] [Back]

┌──────────────────────────┐ ┌───────────────────────────┐
│                          │ │ Selected                   │
│                          │ │                           │
│       interactive       │ │ Chest                     │
│       body model        │ │                           │
│                          │ │ 103.4 cm                  │
│                          │ │ −2.4 cm reference         │
│                          │ │ +1.0 cm previous         │
│                          │ │                           │
│                          │ │ [History]                 │
└──────────────────────────┘ └───────────────────────────┘
```

## 14.2 2D body map

Requirements:

- clickable regions,
- hover state,
- keyboard-focus state,
- selected state,
- front/back switch,
- bilateral distinction,
- current measurement badge on selected region,
- tooltip only for brief information,
- persistent detail panel for actual data.

The 2D model is not decoration.

Each visible region should map to a real domain identifier.

## 14.3 Color strategy

Do not permanently color the entire body green/yellow/red.

Instead:

- neutral body by default,
- selected region receives strong accent,
- measured regions can have subtle data halos,
- proximity/status is secondary.

Example:

```text
default:
neutral gray

hover:
brand outline

selected:
brand fill / outline

status:
small badge
```

---

# 15. 3D body interaction

Use the existing OxiHuman pipeline as the primary body generator. OxiHuman is specifically designed as a client-side parametric human-body generator and currently documents Apache-2.0 code with CC0 bundled body-mesh data. This fits BodyLab's local-first philosophy well. citeturn919145search0

## 15.1 3D goals

The model must feel interactive, not like an image embedded in a card.

Required interactions:

- orbit,
- pan,
- zoom,
- reset camera,
- front/back presets,
- left/right presets if useful,
- click/select body region,
- hover highlight,
- hide/show measurement overlays,
- toggle measurement labels,
- toggle reference visualization,
- optionally toggle wireframe/debug only in developer mode.

## 15.2 Controls

Use familiar behavior:

```text
Left drag      Orbit
Right drag     Pan
Wheel          Zoom
Double click   Focus selected region
R              Reset camera
```

For touch:

```text
one finger     orbit
two fingers    pan/zoom
double tap     focus
```

Do not make the user discover controls without help.

Display a small contextual hint on first use:

```text
Drag to rotate · Scroll to zoom · Click a region to inspect
```

Dismiss automatically after first interaction.

## 15.3 Raycasting

Use Three.js raycasting for real mesh selection rather than fake coordinate hotspots. Three.js explicitly provides `Raycaster` for mouse picking in 3D scenes. citeturn370161search13

Selection pipeline:

```text
pointer event
↓
raycast
↓
mesh/userData body region
↓
domain region ID
↓
selection state
↓
detail panel
```

Never make the UI depend on mesh names alone.

Create an explicit mapping:

```ts
meshId -> BodyRegionId
```

## 15.4 Selection appearance

Selected mesh should receive:

- outline or emissive accent,
- slight material change,
- optional scale = 1.005–1.01 only where visually safe,
- no exaggerated pulsing.

Avoid strobing or large glow effects.

## 15.5 Camera transitions

When selecting a body region:

```text
current camera
↓
smooth focus
↓
selected region centered
```

Use 300–600ms easing.

Do not instantly teleport the camera.

## 15.6 Measurement overlays in 3D

For selected region, show:

```text
Chest
103.4 cm
+1.0 cm
```

Use screen-space labels or anchored DOM overlays.

The label must not permanently cover anatomy.

Allow:

```text
Show measurements
```

toggle.

## 15.7 Clipping / anatomy exploration

Do not make anatomy clipping part of V1 core workflow.

Prepare the architecture for it.

Three.js supports clipping planes, and its newer `ClippingGroup` is available for WebGPU scenes. citeturn919145search8turn919145search12

Future architecture:

```text
VisibilityState
├── skin
├── superficial muscles
├── deep muscles
├── skeleton
└── organs
```

For V1:

- body surface,
- interactive regions,
- optional anatomy detail panel.

No giant layer-control toolbar.

---

# 16. 3D renderer strategy

Three.js now provides `WebGPURenderer`, designed as the modern rendering path with automatic WebGL2 fallback where needed. citeturn370161search6turn370161search14

Do not make WebGPU support a hard requirement for the UI to work.

Use progressive enhancement:

```text
WebGPU available
→ WebGPURenderer

WebGPU unavailable
→ WebGL2 fallback
```

The application must still operate if the 3D model fails.

Fallback:

```text
3D view unavailable

The interactive 3D model could not be loaded.
Your measurements and 2D body view are still available.

[Use 2D body view]
[Retry]
```

Never leave a giant blank white rectangle.

---

# 17. 3D performance requirements

Never initialize the 3D scene on every page.

Load it only when needed.

Use:

```text
route-level lazy loading
+
component lazy loading
+
asset lazy loading
```

Do not render the 3D canvas while it is outside the viewport.

Pause rendering when:

- tab is hidden,
- route is left,
- component is not visible,
- reduced motion is enabled where appropriate.

Use an FPS-conscious render loop.

Do not create a new Three.js scene or renderer every React render.

Use stable references.

---

# 18. Body explorer information architecture

The body screen must support three levels:

### Level 1 — Explore

```text
Body map
```

### Level 2 — Inspect

```text
Selected region
```

### Level 3 — Understand

```text
measurement
history
reference
how to measure
anatomy/exercise information
```

This is similar to strong anatomy viewers, where selecting a structure opens a dedicated information context rather than replacing the entire scene. citeturn919145search2turn919145search6

---

# 19. Muscle/region detail

Use a persistent detail pane.

Example:

```text
Chest

MEASUREMENT
103.4 cm

CHANGE
+1.0 cm
since Aug 23

REFERENCE
105.8 cm
−2.4 cm

[History]

HOW TO MEASURE
Place the tape around...
[Open guide]

ANATOMY
Pectoral region
[Expand]
```

Keep the first panel concise.

Advanced detail should be expandable.

---

# 20. Progress page redesign

Progress is not a chart page.

It is a **comparison tool**.

## 20.1 Tabs

Use:

```text
Overview
Compare
Trends
Snapshots
```

Avoid:

```text
Timeline / Current / History
```

because those labels describe implementation rather than user intent.

---

# 21. Progress overview

```text
Progress

Since first session
────────────────────────────

Chest        +3.2 cm
Waist        −1.8 cm
Biceps       +1.1 cm
Thigh        +1.4 cm

[Compare snapshots]
```

## 21.1 Comparison selector

```text
Compare

FROM
[ Aug 02, 2026 ]

TO
[ Aug 30, 2026 ]

[Compare]
```

Date selectors should use accessible popovers/dialogs, not custom inaccessible dropdowns. Radix provides accessible dialog, popover, tabs, slider, and related primitives suitable for the UI package. citeturn370161search2turn370161search8

---

# 22. Snapshot comparison

This should be one of BodyLab's signature features.

```text
Aug 02                             Aug 30

Chest
101.8 cm      →                   103.4 cm
                                  +1.6 cm

Waist
83.4 cm       →                    81.4 cm
                                  −2.0 cm

Hips
96.3 cm       →                    97.1 cm
                                  +0.8 cm
```

Add optional body view:

```text
[Before]   [After]
```

For 2D:

- swipe divider,
- slider,
- synchronized front/back switching.

For 3D:

- same camera,
- same pose,
- two materials,
- optional morph interpolation.

---

# 23. A/B body comparison interaction

This should be designed now even if the full feature is implemented after V1.

Recommended interaction:

```text
Snapshot A  ●──────────── Snapshot B
             slider
```

or:

```text
A | B
```

with a draggable vertical split.

Requirements:

- lock camera in A/B mode,
- moving slider updates both views,
- measurements remain synchronized,
- no visual distortion.

Do not implement two heavy independent canvases if performance is poor.

Preferred future approach:

```text
one scene
two material/state variants
```

or render-to-texture only if necessary.

---

# 24. Trends

Use a metric selector:

```text
Metric
[ Chest ▼ ]

Period
[ 3 months ▼ ]
```

Then show:

```text
103.4
     ╱───
102 ─╯
100 ───────
98
```

Reference as a subtle baseline.

Avoid filling the chart with giant gradient areas.

---

# 25. Reference page

Reference profiles should become a first-class product surface.

Navigation:

```text
Reference
```

Page:

```text
Current reference

McCallum Recreational
Anthropometric reference

[View details]
[Change reference]
```

Reference card:

```text
SOURCE
John McCallum

TYPE
Anthropometric reference

USED FOR
Chest
Waist
Arms
Thighs
...

DATA VERSION
1.0.0
```

## 25.1 Reference philosophy

The UI must say:

```text
Reference
```

not:

```text
Perfect
Ideal
Best
Correct
```

Use language:

```text
below reference
within reference
above reference
```

unless a health-specific reference defines a different label.

---

# 26. Health vs anthropometric references

Do not visually combine these into one "score".

Use category separation:

```text
Anthropometric references
Compare proportions to a defined reference model.

Health references
Compare selected measurements to health-oriented thresholds.
```

This is especially important for the female/composition workflow.

---

# 27. Score visualization rules

Avoid giant:

```text
82 / 100
```

unless the score has a strong documented meaning.

Prefer:

```text
Reference proximity

Chest
103.4 cm
2.3% below reference
```

Optional compact status:

```text
Within reference range
```

Do not use green/red as the sole information channel.

---

# 28. Data page

Rename "Export / Import" to:

```text
Data
```

Page:

```text
Your data stays on this device.

BACKUP
────────────────────────────────

Last backup
Aug 30, 14:42

[Export backup]

RESTORE
────────────────────────────────

Restore a previous BodyLab backup.

[Import backup]

EXPORT DATA
────────────────────────────────

JSON
CSV

[Export JSON]
[Export CSV]

STORAGE
────────────────────────────────

21 measurements
4 snapshots
1 profile

Local storage
```

---

# 29. Backup UX

Export should feel trustworthy.

Before export:

```text
Export BodyLab backup

Includes:
✓ profile
✓ measurements
✓ snapshots
✓ references
✓ preferences

No data is uploaded.

[Cancel] [Export backup]
```

After export:

```text
Backup created
bodylab-2026-08-30.bodylab

[Done]
```

---

# 30. Import UX

Use a staged flow:

```text
Select backup
↓
Validate
↓
Show summary
↓
Confirm
↓
Import
↓
Success
```

Never replace current data immediately after selecting a file.

Preview:

```text
Backup summary

Created:
Aug 30, 2026

Profile:
1

Measurements:
21

Snapshots:
4

Schema:
v2

[Cancel] [Restore]
```

---

# 31. Settings redesign

Settings should be grouped.

```text
Settings

Profile
────────────────

Name
Height
Weight
Date information

Appearance
────────────────

Theme
Language
Units

References
────────────────

Current reference

Privacy
────────────────

Local-only data
Storage status

Advanced
────────────────

Diagnostics
Version
Reset local data
```

Avoid one enormous flat form.

---

# 32. Onboarding redesign

The existing onboarding should become shorter and more explanatory.

## Screen 1

```text
Welcome to BodyLab

Track your measurements.
Understand change over time.
Keep your data on your device.

[Get started]
```

## Screen 2

```text
Your profile

Name
Height
Weight
Sex / calculation profile where required
```

## Screen 3

```text
Your first measurements

You can enter them now or start with
a partial session.

[Start measuring]
[Skip for now]
```

## Screen 4

```text
Choose a reference

Select how BodyLab should interpret
your measurements.

[View references]
```

Do not put five long forms into one screen.

---

# 33. Empty states

Every empty state must explain:

1. what is missing,
2. why it matters,
3. what the user can do next.

Example:

```text
No progress data yet

Progress appears after you save
more than one measurement session.

[Create a measurement session]
```

Bad:

```text
No data
```

---

# 34. Loading states

Use skeletons for layout-bearing content.

Example:

```text
┌──────────────┐
│ █████████    │
│ █████        │
└──────────────┘
```

Never animate every skeleton aggressively.

3D loading:

```text
Loading body model
████████░░░░ 64%
```

If progress cannot be measured reliably:

```text
Preparing interactive body...
```

Do not fake a percentage.

---

# 35. Error states

Error hierarchy:

### Inline validation

```text
Enter a value between X and Y.
```

### Recoverable system issue

```text
We couldn't load the 3D model.

[Retry]
```

### Critical data issue

```text
This backup could not be imported.

The file is invalid or from an unsupported version.
Your current data has not been changed.
```

The last sentence is important.

---

# 36. Toasts

Toasts should confirm actions, not carry important information.

Good:

```text
Session saved.
```

Bad:

```text
Your score has improved by 4.2 points because...
```

Important information belongs in the page.

---

# 37. Dialogs and accessible primitives

Use accessible primitives for:

- dialog,
- confirmation,
- tooltip,
- popover,
- tabs,
- toggle groups,
- slider,
- select.

Radix Primitives is a suitable low-level option because it supplies accessible behavior and keyboard/focus handling while leaving the styling under BodyLab's control. citeturn370161search2turn370161search8

The UI package may wrap Radix primitives into BodyLab components.

Target:

```text
packages/ui/
├── dialog
├── popover
├── tabs
├── tooltip
├── select
├── slider
├── switch
├── toast
└── primitives
```

Do not leak Radix implementation details through every feature.

---

# 38. Accessibility requirements

Minimum:

- WCAG 2.2 AA-oriented implementation.
- keyboard navigation.
- visible focus ring.
- proper labels.
- semantic headings.
- buttons must use `<button>`.
- links must use `<a>`/router links.
- no clickable `<div>`.
- charts must have text summaries.
- icon-only buttons require accessible names.
- tooltips cannot be the only source of essential information.
- no color-only status communication.
- reduced-motion support.
- sufficient contrast.
- logical focus restoration after dialogs/drawers.

Radix's primitives can reduce accessibility implementation burden, but BodyLab still owns semantic labeling and content. citeturn370161search8

---

# 39. Motion design

Motion should communicate state.

Do not use animation just to make the UI "feel alive".

## 39.1 Durations

```text
micro:     100–150ms
standard:  180–250ms
panel:     250–400ms
3D focus:  300–600ms
```

## 39.2 Allowed

- button hover transition,
- sidebar active transition,
- drawer open,
- tab indicator,
- chart point focus,
- body selection,
- camera movement,
- page transition.

## 39.3 Avoid

- looping pulses,
- bouncing cards,
- constant background animation,
- floating cards,
- huge entrance animations.

The user is interacting with measurement data. The UI should remain calm.

---

# 40. Page transitions

Use the View Transition API progressively where available. It is designed to animate transitions between DOM states in SPAs and can reduce perceived latency and disorientation. Current MDN documentation marks the API as broadly available on modern browsers since late 2025, while noting limitations on older devices. citeturn370161search3turn370161search12

Fallback must be instant/no-animation.

Do not make navigation depend on View Transitions.

---

# 41. Responsive strategy

Do not simply shrink the desktop UI.

Use component-level adaptation.

CSS Container Queries are appropriate because reusable components may need to adapt to their own available width rather than only the browser viewport. citeturn370161search0turn370161search5

## Desktop

```text
sidebar
2-column content
large body viewer
persistent detail pane
```

## Tablet

```text
sidebar compact or collapsible
2-column becomes 1-column when needed
detail pane becomes drawer
```

## Mobile

```text
bottom nav
single column
detail = full-screen sheet/page
3D = reduced controls
tables become stacked rows
```

---

# 42. Mobile navigation

Bottom navigation:

```text
Overview
Measure
Body
Progress
More
```

"More" contains:

```text
Reference
Data
Settings
```

Do not show 7 tiny bottom-nav items.

---

# 43. Component library

Implement reusable visual components in `packages/ui`.

Required:

```text
Button
IconButton
LinkButton
Card
Section
PageHeader
Badge
StatusBadge
Metric
MetricDelta
MetricCard
Input
NumberInput
Select
DatePicker
Tabs
SegmentedControl
Dialog
Drawer
Popover
Tooltip
Toast
ProgressBar
Skeleton
EmptyState
ErrorState
StatRow
DataRow
```

Domain-neutral UI stays here.

---

# 44. Domain components

Keep BodyLab-specific visual components under feature folders.

Example:

```text
features/measurements/components/
├── MeasurementField
├── MeasurementRow
├── MeasurementSessionHeader
├── MeasurementReview
├── MeasurementGuide
└── MeasurementHistory
```

Body:

```text
features/body/components/
├── BodyMap2D
├── BodyViewer3D
├── BodyToolbar
├── BodySelectionPanel
├── MeasurementOverlay
├── RegionPopover
└── CameraControls
```

Progress:

```text
features/progress/components/
├── TrendChart
├── SnapshotCompare
├── ChangeSummary
├── SnapshotSelector
└── ComparisonTable
```

---

# 45. State architecture

The visual design depends on predictable state.

Separate:

### Domain state

```text
profile
measurements
sessions
snapshots
reference
```

### UI state

```text
selectedRegion
selectedMeasurement
activeTab
drawerOpen
showGuide
bodyViewMode
cameraMode
```

### Async state

```text
loading
saving
error
success
```

Do not put everything into one giant UI state object.

---

# 46. Query layer

Implement reusable selectors/queries:

```ts
getLatestMeasurement(type)
getMeasurementHistory(type)
getCurrentSession()
getLatestSession()
getSessionCompleteness()
getRecentChanges()
getBodyRegionStatus(region)
getReferenceComparison(type)
getSnapshotList()
getSnapshotComparison(from, to)
```

The UI must not directly search arrays for business meaning.

---

# 47. "Current value" semantics

There must be one official definition:

> Current measurement = latest valid measurement for the requested measurement type, ordered by recorded timestamp.

Never:

```ts
measurements[0]
```

Never:

```ts
measurements.find(...)
```

unless the collection has already been normalized to latest-per-type.

---

# 48. Charts

Use Recharts where appropriate, but standardize:

- axis typography,
- tooltip design,
- grid intensity,
- line width,
- point size,
- empty state,
- reference line,
- date formatting,
- responsive behavior.

Avoid default Recharts styling.

Every chart should have a title and a natural-language summary.

Example:

```text
Chest trend

103.4 cm today, +2.6 cm since June 1.
```

The chart should confirm the statement, not be the only way to understand it.

---

# 49. Chart colors

Reserve:

```text
brand = primary series
neutral = secondary series
reference = dashed neutral/brand-muted
success/warning = semantic states only
```

Do not use a rainbow palette.

---

# 50. Data density rules

At a glance:

- 3–4 key metrics max.
- 5–8 rows in important tables before scrolling.
- 1 primary chart per major section.
- 1 dominant visualization per screen.

The user should never face 15 equally weighted cards.

**PC binding:** enforceable density rules (≤ 4 KPIs, rows-not-cards, F-pattern layout): §100.

---

# 51. Microcopy

Use concise, factual copy.

Good:

```text
No measurement recorded yet.
```

Good:

```text
2 measurements missing from this session.
```

Good:

```text
2.3% below reference.
```

Bad:

```text
You are getting closer to your dream physique!
```

Never use body-shaming, appearance judgments, or motivational pressure as UI copy.

---

# 52. Tooltips

Tooltips are for secondary clarification.

Use them for:

```text
What does this metric mean?
Why does this reference exist?
```

Do not put the complete measurement guide only inside a tooltip.

For real instructions use:

```text
[How to measure]
```

which opens a panel.

---

# 53. Measurement guide

A measurement guide should visually show the tape position.

Structure:

```text
Chest

1. Stand relaxed.
2. Place the tape horizontally.
3. Measure around the fullest part.
4. Keep the tape snug but not compressing tissue.

[diagram]

[Done]
```

Where a local asset or original illustration is needed, create/ship original assets rather than copying copyrighted fitness imagery.

---

# 54. Assets strategy

## Primary recommendation

Prefer assets with permissive licenses and keep a manifest of every non-code asset.

### OxiHuman

Use as the primary parametric body source already aligned with the project's local-first architecture. Its current documentation states that the project is client-side, with Apache-2.0 code and CC0 bundled body-mesh data. citeturn919145search0

### Lucide

Use the existing Lucide icon system for UI icons.

### Custom SVG diagrams

For measurement guides:

- create simple original SVG diagrams,
- keep them lightweight,
- store them in a dedicated asset folder,
- document authorship/license.

### Anatomy datasets

BodyParts3D and Z-Anatomy can be valuable research/reference sources, but their geometry has attribution/share-alike obligations. BodyParts3D content is documented under CC BY-SA 2.1 Japan, while Z-Anatomy distributes derivative data under CC BY-SA 4.0 and includes additional upstream sources with their own terms. citeturn661075search1turn661075search3turn661075search9

Therefore:

**Do not casually pull Z-Anatomy/BodyParts3D meshes into the Apache-2.0 product bundle.**

Keep such assets isolated behind explicit manifests and licensing documentation if they are ever shipped.

This is especially important because the project aims for open-source redistribution.

---

# 55. Recommended asset repository structure

```text
apps/web/public/assets/
├── body/
├── guides/
├── icons/
├── illustrations/
└── textures/

resources/
└── manifests/
    ├── oxihuman.json
    ├── body-guides.json
    └── ...
```

Every external asset entry should include:

```json
{
  "name": "Example Asset",
  "source": "provider/repository",
  "license": "CC0-1.0",
  "author": "Author",
  "usedFor": ["measurement-guide"],
  "modified": false
}
```

---

# 56. Recommended 3D reference projects

Use these projects as engineering references, not as sources to copy UI.

### Open Anatomy Atlas

A Three.js anatomy viewer demonstrating:

- structure selection,
- layer/system toggles,
- detailed structure panel,
- responsive anatomy exploration. citeturn919145search6

### Body Atlas / Human Body Simulator

Useful reference for:

- orbit controls,
- anatomy detail panel,
- responsive clinical-style UI,
- 3D selection behavior. citeturn919145search2

### Anatopedia

Useful reference for:

- isolate/hide structures,
- layered anatomy,
- search,
- clipping/layer exploration. citeturn919145search10

Use their interaction patterns as inspiration, but keep BodyLab's UI simpler.

---

# 57. Interactivity hierarchy

Every screen should have three levels:

### Level 1 — obvious action

Button.

### Level 2 — contextual interaction

Hover, click, popover.

### Level 3 — deep exploration

Drawer, detail panel, chart, 3D view.

Example:

```text
Chest card
↓ click
Chest detail
↓ click chart point
Specific historical value
↓ click "How to measure"
Measurement guide
```

This creates progressive disclosure instead of overwhelming the main page.

---

# 58. Avoid modal overload

Prefer:

- inline expansion,
- side drawers,
- contextual panels.

Use modal dialogs for:

- destructive actions,
- import/export confirmation,
- important confirmations.

Do not open a modal for every small detail.

---

# 59. Desktop drawers

Use a right drawer width:

```text
360–480px
```

for quick inspection.

For large detail:

```text
520–640px
```

Never cover more than necessary.

Drawer should:

- trap focus,
- close on Escape,
- restore focus to trigger,
- have visible close button,
- remain usable with keyboard.

---

# 60. Hover states

Every clickable item needs:

```text
default
hover
focus-visible
pressed
disabled
selected
```

Do not rely only on changing text color.

Examples:

```text
row hover: #F8FAFC
selected: brand-soft + left border/accent
```

---

# 61. Selection state consistency

The same body region must have the same semantic state across:

- 2D map,
- 3D view,
- measurement list,
- detail panel,
- charts.

Use one shared selection object:

```ts
interface BodySelection {
  regionId: BodyRegionId;
  side?: 'left' | 'right' | 'bilateral';
  source: '2d' | '3d' | 'list';
}
```

Changing selection in 3D should update the measurement detail panel automatically.

---

# 62. Bilateral measurements

Bilateral metrics must be visually paired.

Example:

```text
Biceps

Left       36.2 cm
Right      36.8 cm

Difference
0.6 cm
```

Use:

```text
L
R
```

or full labels, but do not rely only on color.

Optional mini visualization:

```text
Left   ███████████████
Right  ████████████████
```

---

# 63. Symmetry UI

Do not reduce symmetry to a red/green score.

Use:

```text
Biceps

Left      36.2 cm
Right     36.8 cm

Difference
0.6 cm

Relative difference
1.6%
```

Then explain:

```text
Compare both sides using the same measuring procedure.
```

The exact interpretation should come from the core engine.

---

# 64. Body composition UI

Do not put body composition alongside anthropometric reference data as if they are one score.

Use a section:

```text
Composition

Body fat
—

Lean mass
—

Water
—

Bone mass
—
```

Each metric must show:

- value,
- date,
- source if applicable,
- reference/threshold only when scientifically justified.

Avoid language like:

```text
Excellent
Poor
Bad
```

unless a specific reference model defines it.

---

# 65. Offline indicator

Use persistent but subtle status:

```text
● Local
```

On hover/click:

```text
Your data is stored on this device.
No account is required.
```

This turns the local-first architecture into a product feature.

---

# 66. Version information

Do not put:

```text
v1.0.0-rc.1
```

as a visually prominent UI element.

Keep it in:

```text
Settings → About
```

or footer of a settings/data surface.

---

# 67. Responsive body screen

Mobile:

```text
┌─────────────────────────┐
│ Body                    │
│ [2D] [3D]               │
│                         │
│ [Front] [Back]          │
│                         │
│      BODY               │
│                         │
│   [interactive]         │
│                         │
│ ─────────────────────── │
│ Chest                   │
│ 103.4 cm                │
│ +1.0 cm                 │
│                         │
│ [View history]          │
└─────────────────────────┘
```

Detail becomes a bottom sheet or full-screen route.

---

# 68. Interaction on touch devices

Every drag interaction must have an alternative.

For example:

3D:
- gestures,
- reset button,
- front/back presets.

Charts:
- touch tooltip,
- accessible data table/summary.

Body map:
- tap selection,
- list of regions below/above if necessary.

---

# 69. Keyboard shortcuts

Optional desktop enhancement:

```text
M = Measure
B = Body
P = Progress
O = Overview
R = Reset 3D camera
Esc = close panel
```

Do not require shortcuts.

Display them only under an Advanced/Keyboard Shortcuts section.

**PC binding:** the authoritative shortcut registry and its discoverability rules: §104.

---

# 70. Performance budgets

Treat the dashboard and measurements pages as normal application screens.

3D is the heavy screen.

Rules:

- lazy-load Three.js/OxiHuman when possible,
- no 3D renderer on Overview,
- no hidden 3D canvas mounted on every route,
- charts should not cause layout shifts,
- use `content-visibility` carefully for large sections,
- avoid unnecessary React re-renders,
- memoize expensive domain transformations,
- dispose Three.js resources on unmount,
- monitor texture/model memory.

---

# 71. Skeleton and layout stability

Reserve dimensions for:

- charts,
- body viewer,
- cards,
- drawers.

Never let the screen jump dramatically when the model loads.

Example:

```text
Body canvas:
min-height: 560px desktop
min-height: 420px mobile
```

Then show the loading UI inside the reserved region.

---

# 72. Reduced-motion requirements

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Disable:

- page transitions,
- camera animations,
- decorative motion,
- animated chart entrance.

Keep functional transitions only when needed for spatial understanding.

---

# 73. Internationalization

Do not concatenate UI strings in code.

Bad:

```ts
`${count} measurements recorded`
```

Good:

```ts
t('measurements.recordedCount', { count })
```

Translations must exist for:

- English,
- Spanish.

Do not let Spanish appear inside an otherwise English UI because a translation key is missing.

The UI needs localized:
- date formats,
- number formats,
- units,
- pluralization,
- validation messages.

---

# 74. Units

UI must display the selected unit clearly.

Example:

```text
103.4 cm
78.2 kg
```

Avoid:

```text
103.4
```

with the unit hidden elsewhere.

For numeric inputs:

```text
┌──────────────────────┐
│ 103.4            cm  │
└──────────────────────┘
```

---

# 75. Date formatting

Use localized formats.

English example:

```text
Aug 30, 2026
```

Spanish:

```text
30 ago 2026
```

Time:

```text
08:42
```

Do not display ISO strings in normal UI.

---

# 76. Navigation persistence

Preserve context.

Examples:

User is on:

```text
Body → Chest
```

and then goes to:

```text
Progress
```

When returning to Body, restore reasonable state if possible:

```text
Chest selected
Front view
```

Do not restore stale state if the underlying data changed.

---

# 77. Deep links

Routes should support direct access:

```text
/body
/body?region=chest
/measurements
/measurements/session/:id
/progress
/progress/compare/:from/:to
/reference
/data
/settings
```

Do not put critical navigation state only inside React memory.

---

# 78. Route architecture

Recommended:

```tsx
<Route element={<AppLayout />}>
  <Route path="/" element={<OverviewPage />} />
  <Route path="/measurements" element={<MeasurementsPage />} />
  <Route path="/measurements/session/:id" element={<MeasurementSessionPage />} />
  <Route path="/body" element={<BodyPage />} />
  <Route path="/progress" element={<ProgressPage />} />
  <Route path="/reference" element={<ReferencePage />} />
  <Route path="/data" element={<DataPage />} />
  <Route path="/settings" element={<SettingsPage />} />
</Route>
```

---

# 79. Design-system naming rules

Use semantic names, not appearance names.

Good:

```text
MetricCard
PrimaryButton
StatusBadge
Surface
SectionHeader
```

Bad:

```text
BlueCard
BigWhiteBox
GreenButton
RoundedPanel
```

This makes future themes possible.

---

# 80. Component API examples

### MetricCard

```ts
interface MetricCardProps {
  label: string;
  value: string;
  delta?: string;
  deltaTone?: 'positive' | 'negative' | 'neutral';
  hint?: string;
  onClick?: () => void;
}
```

### NumberInput

```ts
interface NumberInputProps {
  label: string;
  value: string;
  unit: string;
  min?: number;
  max?: number;
  step?: number;
  error?: string;
  hint?: string;
}
```

### BodyRegionDetail

```ts
interface BodyRegionDetailProps {
  regionId: BodyRegionId;
  selectionSide?: 'left' | 'right' | 'bilateral';
  measurement?: Measurement;
  previousMeasurement?: Measurement;
  reference?: ReferenceComparison;
}
```

---

# 81. CSS architecture

Do not rebuild all styling with giant page-specific classes.

Prefer:

```text
design tokens
+
component styles
+
Tailwind utilities for layout
```

Avoid:

```css
.dashboard-card-7
.measurement-panel-special
```

Build consistent primitives.

---

# 82. Icons

Use Lucide consistently.

Rules:

- 16px for dense controls,
- 18–20px for regular buttons,
- 20–24px for navigation,
- 28–32px only for feature/hero use.

Do not mix multiple icon libraries.

Do not use emojis for core interface navigation.

---

# 83. Charts + accessibility

For each chart:

```text
visual chart
+
text summary
+
data table or accessible description where appropriate
```

Example:

```text
Chest increased from 101.8 cm on Aug 02
to 103.4 cm on Aug 30.
```

This matters for users who cannot inspect SVG/canvas visuals.

---

# 84. Body map accessibility

Every interactive body region needs:

```text
button/interactive element semantics
aria-label
focus state
selected state
```

Example:

```text
Chest, 103.4 cm, selected
```

Do not expose raw mesh names to screen readers.

---

# 85. "Data first, visualization second"

Every visualization must have an equivalent textual UI.

Examples:

3D selected body region:
- detail panel.

Chart:
- metric summary + values.

Body heatmap:
- list/table of regions.

This prevents the app from becoming dependent on visual interpretation.

---

# 86. Do not overuse cards

A card should represent a conceptual unit.

Use cards for:

- key metric,
- current session,
- body explorer,
- snapshot comparison.

Do not wrap every single row in a separate card.

For lists use:

```text
surface
rows
divider
```

This creates much better information density.

---

# 87. Page-specific acceptance criteria

## Overview

Must answer within one screen:

- latest session date,
- coverage,
- major current metrics,
- recent changes,
- action to measure.

## Measure

Must let user:

- start session,
- enter numeric values quickly,
- see previous value,
- skip,
- save draft,
- review,
- save,
- continue later.

## Body

Must let user:

- choose 2D/3D,
- choose front/back,
- select body region,
- inspect latest measurement,
- inspect reference comparison,
- open history.

## Progress

Must let user:

- see trends,
- select metric,
- compare two snapshots,
- inspect numeric differences.

## Reference

Must let user:

- see active reference,
- understand its purpose,
- change it,
- view source/version.

## Data

Must let user:

- export backup,
- inspect backup summary,
- restore safely,
- export JSON/CSV,
- see local storage status.

## Settings

Must let user:

- edit profile,
- change language,
- change units,
- configure appearance,
- inspect version/about,
- reset data safely.

---

# 88. Critical interaction flows

The agent must implement and test these flows.

### Flow A

```text
Overview
→ Measure now
→ measurement session
→ enter 8 values
→ review
→ save
→ return to Overview
→ recent changes visible
```

### Flow B

```text
Overview
→ click Chest
→ detail drawer
→ chart
→ history
→ measurement guide
```

### Flow C

```text
Body
→ click Chest in 2D
→ detail panel opens
→ switch to 3D
→ Chest remains selected
```

### Flow D

```text
Progress
→ Compare
→ choose Aug 02 and Aug 30
→ A/B comparison
→ metric table
```

### Flow E

```text
Data
→ Export backup
→ file generated
```

### Flow F

```text
Data
→ Import
→ validate
→ preview
→ confirm
→ restore
```

---

# 89. Visual QA checklist

Before considering a screen complete:

### Typography
- consistent hierarchy,
- no oversized titles,
- numeric values align,
- no accidental bold overload.

### Spacing
- consistent 8px rhythm,
- no arbitrary gaps,
- sections breathe.

### Color
- semantic colors are meaningful,
- brand color is controlled,
- no rainbow cards.

### Components
- same button style everywhere,
- same input style everywhere,
- same drawer/dialog behavior everywhere.

### Interaction
- hover,
- focus,
- active,
- selected,
- disabled,
- loading.

### Data
- real latest values,
- correct timestamps,
- correct deltas,
- no old `find()` semantics.

### Responsive
- desktop,
- tablet,
- 390px mobile,
- long content,
- keyboard.

---

# 90. Anti-patterns prohibited by this spec

Do not implement:

```text
❌ giant hero dashboard
❌ gradient on every card
❌ emoji as navigation icons
❌ 10+ KPI cards above fold
❌ huge "score" number as primary identity
❌ green = good / red = bad as the only meaning
❌ modal for every detail
❌ fake loading percentages
❌ fake analytics
❌ decorative 3D that cannot be interacted with
❌ 3D loading on Overview
❌ duplicated anthropometric calculations in components
❌ direct array searches for current measurement
❌ localStorage calls scattered through UI
❌ clickable divs
❌ hidden labels
❌ desktop-only layouts
❌ giant page components
```

---

# 91. Design inspiration gallery

Use these only as conceptual references.

### Fitness analytics

Hevy is particularly useful as a reference for fast navigation, progressive detail, recent activity, and compact statistics. citeturn919145search1turn919145search9

Fitbod is useful for the idea that an item can have a concise summary plus a deep detail screen with historical information and instructional content. citeturn919145search15

### Anatomy / 3D

Open Anatomy Atlas and Human Body Simulator demonstrate useful patterns for:

- selectable anatomy,
- detail sidebars,
- system/layer control,
- orbit/zoom/pan,
- responsive layouts. citeturn919145search6turn919145search2

### Web platform

Three.js:
- Raycaster for interactive object selection. citeturn370161search13
- WebGPURenderer with WebGL2 fallback. citeturn370161search6turn370161search14
- clipping support for future anatomy exploration. citeturn919145search8turn919145search12

CSS:
- Container Queries for truly modular responsive components. citeturn370161search0turn370161search5

Accessibility:
- Radix primitives for dialogs, popovers, tabs, sliders, and keyboard/focus management. citeturn370161search2turn370161search8

---

# 92. Implementation order

Do not attempt to redesign everything simultaneously.

## Phase 1 — Foundation

Implement:

```text
design tokens
packages/ui
PageShell
Sidebar
TopBar
Button
Input
NumberInput
Card
Metric
Tabs
Drawer
Dialog
Toast
Skeleton
EmptyState
```

Also fix:

```text
latest measurement query
application/use-case boundary
IndexedDB repository usage
```

## Phase 2 — Overview

Implement the new Overview from this document.

Do not port the existing dashboard card-by-card.

Rebuild it from the new information hierarchy.

## Phase 3 — Measure

Implement:

```text
MeasurementSession
MeasurementField
Review
Save draft
Save
```

## Phase 4 — Body

Rebuild:

```text
BodyMap2D
BodySelectionPanel
BodyViewer3D
```

with shared selection state.

## Phase 5 — Progress

Implement:

```text
ProgressOverview
MetricTrend
SnapshotCompare
A/B body comparison
```

## Phase 6 — Reference/Data/Settings

Rebuild these with the same design system.

## Phase 7 — Responsive/accessibility/performance

Audit every screen.

## Phase 8 — Visual regression/testing

Add component and critical-flow tests.

---

# 93. Definition of done

The redesign is not finished when:

```text
npm run build
```

passes.

It is finished when:

### Product
- core user journeys are obvious,
- a new user understands the app without explanation,
- measuring is faster than before,
- progress comparison is meaningful.

### UI
- no inconsistent cards/buttons/inputs,
- no template remnants,
- no arbitrary gradients,
- no empty giant whitespace regions,
- no accidental UI text overflow.

### 3D
- model loads on demand,
- selection works,
- camera controls are intuitive,
- fallback exists,
- resources are disposed correctly.

### Data
- latest measurement always correct,
- history preserved,
- snapshots compare correctly,
- import/export safe.

### Accessibility
- keyboard navigation works,
- dialogs/drawers manage focus,
- icon buttons have labels,
- charts have text summaries.

### Responsive
- desktop polished,
- tablet polished,
- mobile usable,
- 3D remains functional on touch.

### Engineering
- page components remain reasonably small,
- domain logic is not duplicated in React,
- UI package contains reusable primitives,
- no `any` used without explicit documented exception,
- no production `console.log`,
- CI can build/test/lint.

---

# 94. Recommended target file tree

```text
bodylab/
├── core/
├── integrations/
├── packages/
│   ├── contracts/
│   └── ui/
│       ├── components/
│       │   ├── Button/
│       │   ├── Card/
│       │   ├── Dialog/
│       │   ├── Drawer/
│       │   ├── Input/
│       │   ├── Metric/
│       │   ├── Popover/
│       │   ├── Skeleton/
│       │   ├── Tabs/
│       │   ├── Toast/
│       │   └── Tooltip/
│       ├── tokens/
│       └── index.ts
│
└── apps/
    └── web/
        └── src/
            ├── app/
            ├── routes/
            ├── features/
            │   ├── overview/
            │   ├── measurements/
            │   ├── body/
            │   ├── progress/
            │   ├── references/
            │   ├── data/
            │   └── settings/
            ├── components/
            ├── services/
            ├── repositories/
            ├── hooks/
            ├── i18n/
            └── styles/
```

---

# 95. Final design philosophy

BodyLab should feel like this:

```text
OPEN THE APP
      ↓
UNDERSTAND WHAT CHANGED
      ↓
MEASURE EASILY
      ↓
EXPLORE THE BODY
      ↓
COMPARE SNAPSHOTS
      ↓
EXPORT YOUR DATA
```

The product's most important visual element is not the gradient, not the chart, and not the 3D body.

It is:

> **the relationship between a real measurement, its historical context, and its chosen reference.**

Everything in the UI should make that relationship easier to see.

The final product should look sophisticated because of:

- hierarchy,
- spacing,
- typography,
- interaction,
- consistency,
- meaningful data visualization,
- responsive behavior,
- fast feedback,

not because of visual effects.

---

# 96. One-sentence instruction for the coding agent

> Rebuild the web UI around measurement sessions, current-vs-previous comparisons, interactive 2D/3D body exploration, and explicit reference context using a neutral scientific design system and reusable accessible components, while keeping the core domain independent, the app local-first, and the interface calm, fast, responsive, and data-first.

---

# 97. PC / desktop integration addendum — buttons, actions, dashboards

**Addendum status:** binding. Applies on top of every section above.  
**Audience:** the implementation agent working on `apps/web` (browser) and later the Tauri desktop shell.  
**Context:** BodyLab is a browser app that also ships as a desktop app. Most V1 power usage happens on a PC: a 1280–2560 px viewport, a mouse, and a keyboard. **The desktop is the primary canvas; mobile is a constrained variant — never the reverse.** Everything in this addendum is about making PC interactions deliberate, consistent, and fast.

## 97.1 Where the guidance comes from

Fitness products with strong PC/big-screen or fast-entry UX were studied for *patterns*, not branding:

- **Hevy** — logging optimized for speed “between sets”; minimal chrome; one clear path from session → exercise → set → done, and small-but-precise statistics instead of decorative charts. (Reviews consistently single out logging speed: “opening a session, finding an exercise, and logging a set takes seconds.” [Cora compare review](https://www.corahealth.app/compare/hevy); [Product Hunt reviews](https://www.producthunt.com/products/hevy/reviews).)
- **Strong** — denser volume/history tables that reward inspection; pairs well with Hevy as the “record fast, then inspect deep” model the rest of this spec already adopts.
- **Fitbod** — every list item is a door to a focused detail screen (instructions/history/parameters); apply the drill-down hierarchy, not the branding. (See §3.1.)
- **MacroFactor** — one job per screen: the scale-weight screen exists to enter *one* number and see its trend context; raw value and trend are presented as two deliberately different things. (Overview of the split: [MacroFactor on scale weight vs trend](https://www.facebook.com/macrofactorapp/posts/macrofactor-displays-your-body-weight-data-in-two-main-ways-scale-weight-and-wei/1328334419461849/).)
- **Analytics dashboards** — the best dashboards keep the initial view to roughly 5–6 cards on a single screen, lead with big bold numbers, follow the F/Z reading patterns, and always provide a path from the high-level overview down to more granularity ([Justinmind, Dashboard design best practices](https://www.justinmind.com/ui-design/dashboard-design-best-practices-ux)).

**Distilled rules the rest of this addendum makes binding:**

```text
fast entry   → one obvious primary action per screen; keyboard-complete forms; ghost "previous" value
one job      → no screen mixes two unrelated jobs (entering ≠ analyzing ≠ exporting)
5-second read→ dashboard answers "what state am I in + what changed" above the fold
density      → PC earns tables and split panes; mobile collapses them
deep inspect  → every row is a door to a focused detail view
calm chrome   → chrome is furniture, not decoration
```

---

# 98. Button system (PC)

## 98.1 Three visual tiers, one per intent

```text
Primary    filled brand          → the one page job        (Measure now · Save session)
Secondary  outlined/soft         → first alternative        (Compare snapshots · Save draft)
Tertiary   ghost / text          → low-frequency or destructive-before-confirm (Reset · Clear)
```

Rules:

1. **Never two equal-strength CTAs side by side.** One primary per view. If two actions feel equally important, the page has two jobs — split it (see §97 “one job”).
2. Buttons **state the verb + object**: `Measure now`, `Save session`, `Export backup`. Never bare `Add`, `Submit`, `Go`, `Done` on their own.
3. Destructive actions are **always** tertiary-styled and always open a confirmation dialog that explains what will and will not change.
4. Icon-only buttons are allowed only for: camera presets, close, overflow, and repeat actions already labeled elsewhere. Every icon-only button needs an `aria-label` **and** a native `title` so PC users get a tooltip.
5. Hover reveals the keyboard shortcut when one exists (`Front` shows no hint; `Save session` shows `Ctrl+Enter`). This is the PC-native discoverability channel — no settings page required.

## 98.2 Geometry (PC)

```text
height     36 px (compact rows) / 40 px (default) / 48 px (page primary)
horizontal padding   ≥ 16 px (primary) — label must never touch the edge
radius      10–12 px (medium), 12 px (primary)
icon+label  icon left, 4–8 px gap; icon inherits label color
```

Fitts's law applies on PC too: the page’s primary action should sit near a screen corner or the end of the content flow (top-right of the page header), not buried mid-list. Keep 8 px of space between adjacent buttons and **no hover-only affordance**: the resting state must already read as clickable (border/soft fill), because PC users are not touching the screen.

## 98.3 Disabled state

Never ship a mystery button. A disabled primary must explain itself on hover/focus:

```text
[Save session]  (disabled)  → title: "Save is available once you enter at least one measurement"
```

If a button can be enabled by doing something nearby, prefer keeping it enabled and showing an inline hint on click instead of disabling.

---

# 99. Action architecture (PC)

## 99.1 One dominant action per page, anchored top-right

Every routed page reserves the same slot in its page header:

```text
[Page title]  · supporting context            [ PRIMARY ACTION ]
```

| Page | Primary action | Enabled when |
|---|---|---|
| Overview | `Measure now` (or `Continue measuring` if a draft exists) | always |
| Measure | `Save session` (review step: `Save session` → success) | ≥ 1 value entered |
| Body | `Explore` context switch (`2D/3D`) is the view control, not the action; primary = selection context | — |
| Progress | `Compare snapshots` | ≥ 2 snapshots |
| Reference | `Change reference` | — |
| Data | `Export backup` | data exists |
| Settings | none (no job, just configuration) | — |

## 99.2 Contextual actions live with their content

- Actions that belong to a row/card/section stay **inside** that unit (row hover → `View history`), never in the global header.
- Do **not** duplicate the same action in the header and inside content. One job, one button, one place.
- Overflow (`⋯`) may group only tertiary actions and only when there are ≥ 3. Two actions = two visible buttons.

## 99.3 Global persistent actions

The only global action allowed across pages is **starting/continuing a measurement session**, and it is exposed in exactly two places: the Overview primary action and a compact `+ Measure` icon-button next to the active nav item when the user is on another page (see §105 registry, `M`). Never float a circular action button over content.

---

# 100. Dashboard (Overview) on PC

## 100.1 The PC dashboard anatomy

```text
┌─────────────────────────────────────────────────────────────── 1440 max ─┐
│ Overview · last assessment Aug 30, 2026              [Measure now]      │
│                                                                          │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│ │ 78.2 kg   │ │ 21 BMI*   │ │ 82%       │ │ Aug 30    │  ← 4 KPIs max │
│ │ −0.6 kg   │ │ ref-only  │ │ coverage  │ │ 8 values  │                │
│ └───────────┘ └───────────┘ └───────────┘ └───────────┘                │
│ ┌──────────────────────────────┬───────────────────────────────────────┐│
│ │ WHAT CHANGED (required)      │ BODY (mini 2D, non-interactive link)  ││
│ │ Chest   +1.6 cm   ▸          │                                       ││
│ │ Waist   −2.0 cm   ▸          │       (tap → /body?region=chest)      ││
│ │ Hips    +0.8 cm   ▸          │                                       ││
│ └──────────────────────────────┴───────────────────────────────────────┘│
│ RECENT MEASUREMENTS (rows, not cards)                                   │
│ Chest   103.4 cm   +1.6  ▸    Aug 30                                    │
│ Waist    81.4 cm   −2.0  ▸    Aug 30                                    │
│ Hips     97.1 cm   +0.8  ▸    Aug 30                                    │
└──────────────────────────────────────────────────────────────────────────┘
```

*BMI is shown only when a health reference is active, never as the lead number.

Rules (from §97 research, made binding):

1. **≤ 4 KPI cards**; the initial view fits one screen without scrolling on a 1080p display. Best-in-class dashboards cap the first view around 5–6 cards ([Justinmind](https://www.justinmind.com/ui-design/dashboard-design-best-practices-ux)); BodyLab’s “one job = what changed” dashboard is stricter.
2. **Lead with big, bold numbers**; each KPI states one fact (value + one delta or one context line), not three unrelated facts.
3. Layout follows the **F pattern** for LTR: state (KPIs) top-left → change (primary module) next → tables below. Never put the most important fact bottom-right.
4. Wide screens get **split panes** (≥ 1180 px: two columns under the KPI band; ≥ 1440 px: content `max-width` still applies — no edge-to-edge spread).
5. Recent measurements are **rows on a surface**, hover reveals a right-aligned `▸` and row actions — not 12 mini-cards.
6. Every number, row, and KPI is **clickable into its metric detail** (progressive disclosure, §57).
7. Charts on Overview: at most one, and only when it beats the “What changed” table for the job (it usually doesn’t on V1).
8. No horizontal scroll at any PC width; tables truncate with a “see all” link instead.

## 100.2 Empty dashboard (PC)

```text
Start your first measurement

BodyLab becomes useful once you record your first session.

[ Start measuring ]   [ See what BodyLab tracks ]
```

The two buttons are Primary + Secondary — still only one dominant action. Never a giant empty chart.

---

# 101. Measure flow on PC (keyboard-first)

## 101.1 Two-pane session layout (≥ 960 px)

```text
┌─────────────────────────────┬──────────────────────────────┐
│ NEW SESSION                 │  CHEST          ← ghost label│
│ Aug 30 · Morning            │  Around the fullest part…   │
│                             │                             │
│ ○ Neck          ✓ 36.2      │  Previous   102.4 cm        │
│ ● Shoulders                 │  ┌───────────┐              │
│ ◉ Chest        ← active     │  │ [ 103.4 ] │ cm   +1.0   │
│ ○ Waist                     │  └───────────┘              │
│ ○ Hips                      │                             │
│ …                           │  [ How to measure ]         │
│                             │  ← Skip   → Save later      │
│ 8 of 10 recorded            │  [ Save session ]           │
└─────────────────────────────┴──────────────────────────────┘
```

Left rail = ordered checklist (status: pending / entered / skipped / active). Right pane = one guided field. This replaces “scroll a long form” — on PC the session never scrolls.

## 101.2 Keyboard contract (mandatory on PC)

```text
Enter / Tab      commit value → advance to next field (Tab moves focus w/o commit)
↑ / ↓            adjust by step when the input is focused (or last-touched)
Wheel over value → step (with Ctrl = coarse step)
Esc              close guide / clear inline error focus
Ctrl+Enter       save session (from anywhere in the session)
Number pad       full support; no key combo may be hijacked
```

Also mandatory:

- **Ghost previous value** shown above the field at all times; after typing, the delta updates live (`+1.0 cm`) with the previous value still visible — the PC user never has to remember their last number.
- Autosave to draft on every committed value; a `Draft saved` micro-toast confirms, `Draft · 08:42` appears in the header. Closing the tab never loses the session.
- Invalid input: value stays visible, `Enter a value between 60 and 160 cm` inline; focus is not stolen.
- Review step renders the two-pane list with deltas and a final `Save session` (Ctrl+Enter), then a calm success screen with `View progress` Secondary.

## 101.3 MacroFactor-style “one number” screens

For single-value contexts (quick weigh-in from Overview, updating one metric), use a dedicated screen whose whole job is one numeric entry plus its trend context — never a form full of unrelated fields. Raw value and its trend/delta are two visually distinct data points, never merged into one ambiguous number.

---

# 102. Wide-screen comparison (Progress / Body on PC)

## 102.1 A/B compare

```text
[ Aug 02 ]  ──compare──  [ Aug 30 ]            (selectors centered, sticky)

┌─────────────── BEFORE ───────────────┐ ┌──────── AFTER ──────────────┐
│ Chest   101.8 cm                     │ │ Chest   103.4 cm   +1.6     │
│ Waist    83.4 cm                     │ │ Waist    81.4 cm   −2.0     │
└──────────────────────────────────────┘ └─────────────────────────────┘
```

- ≥ 1280 px: genuine two-pane before/after (or one scene, two states for 2D/3D body). < 1280 px: stacked with a shared, sticky selector.
- Panes scroll together (`overflow-anchor`); selectors never leave viewport.
- Mouse users get hover row states and click-to-drill (see §103).

## 102.2 Body page split (PC)

```text
Body · [2D|3D] [Front|Back]
┌──────────────────────────────┬───────────────────────────────┐
│                              │ Selected · Chest              │
│                              │ 103.4 cm   +1.0  −2.4 ref     │
│   body viewer                │ [History] [How to measure]    │
│   (min-height 560px)         │                               │
│                              │ RECOMMENDED (region context)  │
│                              │ Bench Press · · ·  (GIF)      │
└──────────────────────────────┴───────────────────────────────┘
```

Right rail 360–480 px, always mounted on ≥ 1280 px; never covers the viewer on PC.

---

# 103. PC pointer conventions

```text
click         select / activate
hover         affordance only — never required to reach content
row click     open detail (or the row’s own ▸)
double-click  (rows/tables) shortcut for "open detail + focus first action" — optional, must not be the only path
right-click   context menu: Copy value · View history · Compare with reference (numeric rows only)
wheel         scroll lists; zoom ONLY inside the 3D viewport (no global Ctrl+wheel hijack)
Escape        close topmost panel/drawer; second Escape clears selection
```

Rules: right-click menus must not replace visible actions; text selection inside numeric cells stays enabled (users copy numbers to notes/spreadsheets); no middle-click surprises (never bind it).

---

# 104. Keyboard shortcut registry (PC)

```text
M            → start/continue measurement session      (global)
O  B  P  R   → Overview · Body · Progress · Reference  (global nav)
G            → focus the body-region search on /body   (page)
F / B        → front / back on the Body page            (page)
R            → reset 3D camera                          (3D only)
1 / 2        → toggle 2D / 3D on Body                    (page)
Esc          → close panel / clear selection            (global)
Ctrl+Enter   → save session / confirm dialog            (Measure, dialogs)
/            → focus page search when present           (global)
```

Rules: shortcuts are additive, never required; every shortcut is discoverable by hovering the related control (tooltip shows `M`), listed in `Settings → Advanced → Keyboard shortcuts`, and **must not** conflict with text entry (no single-letter shortcuts while an input is focused, except inside dedicated key-capture modes).

---

# 105. Desktop window / shell (Tauri + browser)

- Minimum window width **1024 px**; below that the mobile layout rules apply instead of squeezing desktop panes.
- Content area must respect a desktop title bar/traffic-light inset when running under Tauri (safe-area padding via the shell config, not per-page hacks).
- DPI: honor the OS scale factor; never hardcode px assumptions for the shell chrome.
- Closing the window mid-session keeps the draft (§101.2 autosave) — the desktop shell must flush before quit.

---

# 106. Hater-grade PC acceptance checklist (verify, don’t assume)

Run these checks against the real running app at 1280×800 and 1920×1080 before calling PC UX done — the same adversarial posture used for the rest of the product:

**Buttons & actions**
- [ ] Every page has ≤ 1 visually dominant action, and it sits top-right of the header or in the content flow it belongs to.
- [ ] No two equal-strength buttons side by side anywhere.
- [ ] All action labels are verb+object; searching the codebase finds zero bare `Add` / `Submit` / `Go` labels.
- [ ] Every icon-only button has both `aria-label` and native `title`.
- [ ] Disabled primary buttons explain why on hover.
- [ ] No action is duplicated between the header and its content section.
- [ ] Destructive actions are ghost-style and confirm before executing.

**Dashboard**
- [ ] Overview answers “state + what changed” in ≤ 5 s at 1080p without scrolling.
- [ ] ≤ 4 KPI cards; no 12-card wall anywhere on the page.
- [ ] Recent measurements render as rows with hover affordances, not cards.
- [ ] Every number drills into metric detail; no dead numbers.
- [ ] No horizontal scroll at 1280 px.

**Measure flow**
- [ ] A full session can be completed with keyboard only (Enter/↑↓/Esc/Ctrl+Enter), and values autosave to draft.
- [ ] Ghost previous value + live delta visible while typing; invalid values stay visible with an inline reason.

**Cross-cutting**
- [ ] Escape closes the topmost panel; second Escape clears selection.
- [ ] Right-click context menu exists on numeric rows and never hides a visible alternative.
- [ ] Shortcuts don’t fire while typing in inputs; all are discoverable via hover.
- [ ] Window resizes 1280→2560 without layout breakage or dead space > ~30% width.
- [ ] Closing the app preserves an in-progress draft.

Every unchecked box is a V1.0 release-gate failure on PC, not a polish item.

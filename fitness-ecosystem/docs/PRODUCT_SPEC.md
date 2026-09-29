# BodyLab — Product Specification

## What BodyLab Is

BodyLab is a local-first, open-source application for tracking, analyzing, and visualizing anthropometric measurements and body composition over time.

It provides:
- Manual entry and tracking of body measurements
- Anthropometric calculations based on established formulas
- Configurable reference profiles (not "ideal body" — reference-based)
- 2D interactive body visualization with color-coded status
- 3D parametric body model
- Exercise tracking with animated GIF guides
- Advanced analytics (body age, health risk, prediction, correlation)
- Temporal progress comparison with A/B snapshots
- Complete data export and restore
- Offline-first operation
- Windows desktop and web deployment

## What BodyLab Is NOT

BodyLab is NOT:
- A medical diagnostic tool
- A body rating or attractiveness scoring system
- An AI-powered fitness advisor
- A photo-based body scanner
- A cloud service
- A social network
- A workout planner (TrainingLab handles this)

## Core Philosophy

```
Reference Profile, not Ideal Body.

"Proximity to reference" not "beauty score."

Information, not judgment.
```

The application communicates **data**, not **opinions**.

## V1.0/V1.1 Includes

### Core Features
- Local user profile creation
- Anthropometric measurements (manual entry)
- Measurement history with timestamps
- Anthropometric calculations (McCallum, Venus, Adonis, WHtR)
- Configurable reference profiles (health, anthropometric, user-defined)
- 2D body visualization (front/back) with interactive regions
- 3D parametric body model (OxiHuman + Three.js)
- Temporal progress comparison between snapshots
- Body composition records
- JSON export
- CSV export
- Full backup/restore (Fitness Bundle .bodylab)
- Offline operation (no internet required)
- Windows desktop application (Tauri)
- Web application (Vite + React)
- Automated test suite
- License compliance and third-party attribution
- Complete documentation

### V1.1 Features (Implemented)
- **Exercise System** — 64 exercises (36 GIF + 21 still guides)
- **Analytics Engine** — Body Age, Health Risk, Prediction, Correlation
- **Dark Mode** — Low contrast theme with system preference detection
- **Design System** — in-app Tailwind token layer + component conventions
- **Measurement Sessions** — Guided workflow with progress tracking
- **A/B Comparison** — Compare any two snapshots side by side
- **Data Vault** — Export/import with .bodylab format
- **Responsive Design** — Desktop, tablet, mobile layouts

## V1.0 Does NOT Include

- AI-generated workout plans
- Automatic workout adaptation
- LLM integration
- Automatic photo analysis
- Cloud synchronization
- User accounts
- Social features
- Mobile application
- Wearable integration
- TrainingLab integration
- Medical diagnosis or advice
- Automatic body scanning from photos
- Anatomical deep-dive modes (Phase 4+)
- Real-time camera tracking
- Augmented reality
- Smart reminders (V1.1)
- Multi-profile support (V1.1)
- Body Story narrative (V1.1)
- Gym Companion mode (V1.1)

## Scope Rule

> A feature not explicitly required by V1.0 is deferred to a future version, even if technically interesting to implement.

> The existence of possible improvements does not invalidate V1.0.

> The project must stop when the specification has been satisfied.

## Completion Condition

BodyLab V1.0 is COMPLETE only when:

1. 100% of MUST requirements pass.
2. 100% of critical acceptance criteria pass.
3. 100% of critical automated tests pass.
4. P0 bugs = 0.
5. P1 bugs = 0.
6. Data export/restore passes.
7. Offline operation passes.
8. Windows release build succeeds.
9. Third-party licenses and attributions are complete.
10. Documentation is complete.
11. Release audit passes.
12. Scope is frozen.

## Forbidden Completion Shortcuts

The agent MUST NOT declare completion because:
- the application "looks finished"
- most features work
- the score is high
- remaining problems are considered minor without evidence
- tests were skipped
- requirements were silently changed

---

*Last updated: 2026-09-11*

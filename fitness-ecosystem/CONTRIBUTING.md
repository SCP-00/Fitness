# Contributing

Gracias por tu interés en contribuir al Fitness Ecosystem.

## 📋 Directrices Generales

1. **Respetar las licencias** — Todos los componentes externos deben mantener sus licencias originales
2. **Documentar cambios** — Cada modificación a componentes de terceros debe documentarse en THIRD_PARTY_NOTICES.md
3. **Tests obligatorios** — Todo código nuevo debe incluir tests (ver [TESTING.md](docs/TESTING.md))
4. **TypeScript estricto** — No usar `any`, mantener tipado completo
5. **Convenciones de commits** — Usar [Conventional Commits](https://www.conventionalcommits.org/)
6. **Documentación viva** — Si el cambio afecta arquitectura, comandos o rendimiento, actualiza la doc correspondiente (READMEs, [ARCHITECTURE.md](docs/ARCHITECTURE.md), [PERFORMANCE.md](docs/PERFORMANCE.md))

## 🔄 Flujo de Trabajo

```bash
# 1. Clonar el repositorio
git clone <url>
cd fitness-ecosystem

# 2. Instalar dependencias (Node >= 20, pnpm >= 9)
pnpm install

# 3. Crear rama para tu feature
git checkout -b feature/mi-feature

# 4. Hacer tus cambios
# ...

# 5. Ejecutar verificaciones
pnpm typecheck                                   # 0 errores de TypeScript (todos los paquetes)

# Tests — corre cada nivel desde su propio directorio (Vitest 1.x en core, 4.x en web):
pnpm test                                        # suite raíz (core, node env)
cd bodylab && npx vitest run                     # tests de core individuales
cd bodylab/apps/web && npx vitest run            # tests web (jsdom)
pnpm test:coverage                               # cobertura core ≥ 80%

# Formato
pnpm format:check                                # Prettier

# Lint (el web app usa oxlint, no ESLint; hoy está limpio: 0 warnings / 0 errores)
pnpm lint                                        # delega en oxlint del web app
cd bodylab/apps/web && pnpm lint

# Build de producción (opcional)
pnpm build

# 6. Revisar el checklist de calidad (abajo) y el impacto de rendimiento
# 7. Commit
git commit -m "feat: añadir nueva funcionalidad"

# 8. Push
git push origin feature/mi-feature

# 9. Abrir Pull Request
```

> **Nota:** el paquete web se llama `web` (no `@fitness/bodylab-web`), así que los filtros de pnpm deben usar el nombre real. Los scripts raíz ya están corregidos: `pnpm dev`, `pnpm build`, `pnpm lint` y `pnpm typecheck` funcionan desde `fitness-ecosystem/`. Verificación integral en un solo comando: `pnpm check` (typecheck + 453 raíz + 36 web + 21 E2E).

## 📝 Convenciones de Commits

```
feat: añadir nueva funcionalidad
fix: corregir bug
docs: actualizar documentación
style: cambios de formato (no afectan el código)
refactor: refactorizar código (no añade funcionalidad)
perf: mejora de rendimiento
test: añadir o modificar tests
chore: tareas de mantenimiento
```

## 🏗️ Estructura del Proyecto

Ver [ARCHITECTURE.md](docs/ARCHITECTURE.md) — es la fuente de verdad. Resumen:

```text
fitness-ecosystem/
├── bodylab/                    # App 1: Cuerpo
│   ├── core/                   # Motor puro (sin UI): anthropometry, measurements,
│   │                           #   composition, references, progress, validation,
│   │                           #   export, analytics, database
│   ├── integrations/           # Adaptadores externos (oxihuman, musclemapjs, clad-body)
│   ├── packages/contracts/     # JSON Schemas
│   └── apps/
│       ├── web/                # React 19 + Vite 8 + Tailwind 4
│       └── desktop/            # Tauri v2 (beta: instalador NSIS verificado)
├── traininglab/                # App 2: Entrenamiento (FUTURE)
├── tests/                      # Suites core extra (golden dataset, database)
└── docs/                       # Especificaciones + calidad (ARCHITECTURE, TESTING, PERFORMANCE)
```

## ⚠️ Reglas Importantes

### Core Independence

> `core` CANNOT import React, Three.js, Tauri, DOM APIs, or UI components.

```text
UI → Application layer → Core → Repository/Integration
```

El core debe funcionar desde:
- Windows
- Browser
- Tests
- CLI
- Future TrainingLab

Nada lo enforce mecánicamente hoy (sin regla de lint): la revisión de PR debe rechazar cualquier import de `react`/`three`/`apps/` dentro de `bodylab/core`.

### Componentes de Terceros

- **No copiar código** sin verificar la licencia
- **Mantener atribuciones** en THIRD_PARTY_NOTICES.md
- **Documentar modificaciones** realizadas
- **Respetar ShareAlike** para licencias CC BY-SA

### Bases de Datos

- **Nunca sobrescribir** mediciones anteriores
- **Mantener historial** completo
- **Usar UUIDs** para todos los IDs
- **Timestamps en ISO-8601**
- El acceso a datos desde la UI pasa por `lib/store.tsx` + `lib/queries.ts`, nunca por llamadas IndexedDB ad-hoc en componentes

### Licencias

- **Apache-2.0** para código nuevo
- **MIT** para librerías de UI
- **CC0** para assets creativos
- **CC BY-SA** para anatomía (con atribución)

### Testing

Ver [TESTING.md](docs/TESTING.md) para estrategia, comandos por nivel y mapa de cobertura.

```bash
# Suite completa
pnpm typecheck && pnpm test && pnpm test:coverage
cd bodylab/apps/web && npx vitest run        # web (jsdom) — siempre desde apps/web

# Cobertura
npx vitest run --coverage                    # ≥ 80% sobre bodylab/core
```

Todo código nuevo debe incluir:
- Unit tests para funciones puras (junto al código, `*.test.ts`)
- Tests de lógica web en `apps/web/src/__tests__/` o `*.test.ts(x)`
- Roundtrip tests para export/import y persistencia
- Component tests (jsdom + Testing Library) cuando toquen componentes React

### Rendimiento (checklist de merge)

Reglas completas en [PERFORMANCE.md](docs/PERFORMANCE.md). Resumen:

- [ ] Dependencias nuevas: medir y declarar el impacto gzip en el PR
- [ ] Librerías pesadas (charts, 3D, zip, WASM) → import dinámico o chunk por ruta
- [ ] No prefetchear recursos lazy (GIFs, three, WASM, `.ohpk`)
- [ ] Core sin efectos secundarios ni estado global (tree-shaking y tests rápidos)
- [ ] Si el PR cambia el bundle: `cd bodylab/apps/web && pnpm build` y pegar el top-5 de assets
- [ ] Datos por `store.tsx`/`queries.ts` (nunca IndexedDB directo en componentes)

### Definition of Done (por feature)

```text
[ ] Requisito implementado (con ID de docs/REQUIREMENTS.md)
[ ] Unit test escrito
[ ] Integration test (si aplica)
[ ] Error handling implementado
[ ] Documentación actualizada (README/docs si aplica)
[ ] UI state manejado
[ ] Persistencia verificada (si aplica)
[ ] Export verificado (si aplica)
[ ] Sin regresiones
[ ] Criterio de aceptación superado
[ ] Sin impacto de rendimiento no declarado
```

## 🐛 Reportar Bugs

Usa [GitHub Issues](https://github.com/tu-usuario/fitness-ecosystem/issues) para reportar bugs. Incluye:

1. Descripción del problema
2. Pasos para reproducir
3. Comportamiento esperado
4. Comportamiento actual
5. Entorno (SO, navegador, versión)

## 💡 Sugerir Funcionalidades

Usa [GitHub Issues](https://github.com/tu-usuario/fitness-ecosystem/issues) con la etiqueta `enhancement`. Incluye:

1. Descripción de la funcionalidad
2. Caso de uso
3. Alternativas consideradas

## 📚 Recursos

- [PLAN.md](PLAN.md) — Plan maestro del proyecto
- [ARCHITECTURE.md](docs/ARCHITECTURE.md) — Arquitectura verificada (fuente de verdad)
- [TESTING.md](docs/TESTING.md) — Estrategia y comandos de testing
- [PERFORMANCE.md](docs/PERFORMANCE.md) — Baseline, budgets y reglas de rendimiento
- [PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — Especificación del producto
- [REQUIREMENTS.md](docs/REQUIREMENTS.md) — Requisitos con IDs
- [V1_RELEASE_GATE.md](docs/V1_RELEASE_GATE.md) — Condiciones de release
- [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) — Licencias de terceros
- [LICENSE](LICENSE) — Licencia del proyecto

---

*Gracias por contribuir al Fitness Ecosystem.*

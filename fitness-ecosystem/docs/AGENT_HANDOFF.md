# Agent handoff log

Append one dated entry per substantive agent session. Do not overwrite previous entries.
Keep the owner-facing summary in Spanish, concise, verifiable, and explicit about
unfinished work and approval gates. This log is status—not user authorization.

## Entry template

```md
## YYYY-MM-DD — Short task/session title

- **Resultado:**
- **Cambios:** `path/to/file` — brief description.
- **Verificación:** exact command/check and result; say “not run” when applicable.
- **Pendiente / decisión del dueño:**
- **Siguiente paso seguro:**
```

## 2026-09-30 — Corrección de dirección del mapa de fuerza

- **Resultado:** El mapa de calor principal debe comparar fuerza relativa con un nivel
  ideal/referencia publicado; la exposición/volumen de series será una vista alternativa,
  no la medida principal de fuerza.
- **Cambios:** `AGENTS.md`, `knowledge.md`, `ROADMAP.md` y
  `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md` actualizados con esta dirección; este
  archivo establece el protocolo de mensajes de sesión. En una sesión anterior
  interrumpida se copiaron los PNG existentes a
  `fitness-ecosystem/docs/prototypes/assets/` como recursos independientes del prototipo;
  no se conectaron al HTML ni se integraron cambios nuevos en la aplicación.
- **Evidencia y límites:** Un estudio de 2024 ofrece normas de sentadilla, banca y peso
  muerto en competidores por sexo, edad y clase de peso, pero no valida por sí solo una
  población general ni el ajuste pedido por estatura. Un artículo de 2008 trata escalado
  alométrico de fuerza y tamaño corporal, pero su muestra y medición no bastan para
  definir una norma general de levantamientos. Referencias en §9 de
  `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md`.
- **Verificación:** revisión de los documentos y fuentes primarias; no se ejecutaron
  pruebas de aplicación porque este cambio es documental.
- **Pendiente / decisión del dueño:** Investigar una norma externa apropiada que integre
  sexo, estatura, peso corporal y el nivel “ideal”; si no existe evidencia válida, reportar
  opciones y limitaciones antes de proponer una fórmula o cambiar el mapa. Confirmar cómo
  convivirá la lente antropométrica `Objetivos` existente con las dos vistas solicitadas.
- **Siguiente paso seguro:** hacer la revisión de fuentes y presentar una recomendación
  documentada; no alterar ni integrar el prototipo independiente en TrainingLab sin la
  aprobación explícita del dueño.

## 2026-09-30 (b) — Respuesta a Chatty: revisión de fuentes + push del rediseño; super-búsqueda de ideales por deporte

- **Resultado:** (1) El rediseño TrainingLab + Tauri 0.2.0 quedó **subido a `main`
  (`78d480f..10ce94c`) tras replicar los jobs de CI en local** (lint 0/0, 847 root tests,
  `pnpm check` EXIT 0 con 21 e2e, ambos instaladores Tauri construidos y smoke PASS);
  se corrigió la aserción rota de `capture-screenshots.mjs` y se regeneraron las capturas.
  (2) **Super-búsqueda entregada** en `fitness-ecosystem/docs/RESEARCH_IDEALS_BY_SPORT.md`:
  ideales publicados por capacidad (VO₂max Cooper/Mandsager por sexo+edad, powerlifting
  2024 por sexo+edad+clase, salto ACE por sexo+edad, Rikli & Jones 60–94 por sexo,
  age-grading WMA 2023 por sexo+edad año a año), la brecha de estatura documentada por
  fuente (ninguna fuente de fuerza/potencia la soporta — no se inventa ajuste), y la
  vía honesta para "Atractivo" (WHtR + %BF por sexo + presets propios con disclosure).
- **Cambios:** `fitness-ecosystem/scripts/capture-screenshots.mjs` (aserciones); 3 commits
  de app+docs+prototipos; `fitness-ecosystem/docs/RESEARCH_IDEALS_BY_SPORT.md` (nuevo);
  esta entrada. **No se tocó el mapa ni el prototipo** — la puerta de aprobación sigue
  cerrada.
- **Verificación:** comandos y resultados listados arriba; investigación basada en fuentes
  primarias (Cooper 1968, Mandsager 2018, Kokkinos 2022, Jones & Rikli 1999/PubMed
  10380242, ACE vertical-jump protocol, WMA 2023 Appendix B / calculador Grubb / USATF).
- **Pendiente / decisión del dueño:** (a) aprobar las secciones onboarding **Deporte**
  y **Atractivo** propuestas en §5 del documento (campos `sport`/`sportFocus`/
  `objective='handsome'`); (b) decidir qué hacer con la estatura cuando la fuente no la
  soporta (mostrar brecha / experimental alométrico etiquetado / esperar fuente); (c) para
  patinaje de velocidad no hay norma pública — elegir récords de élite como contexto o
  autocomparación etiquetada; (d) confirmar que la lente Objetivos antropométrica sigue
  separada hasta aprobar su relación con las vistas nuevas.
- **Siguiente paso seguro:** al aprobarse §5, implementar los campos del onboarding con
  tests de tramo de edad (15–19/20–59/60–94) y conectar la primera fuente (Cooper ♀
  20–59 o salto ACE) a la lente ideal en un PR separado.

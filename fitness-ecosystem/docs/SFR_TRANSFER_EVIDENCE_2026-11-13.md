# SFR, sustitutos y transferencia de carga — qué está probado y qué es criterio

**Fecha:** 2026-11-13 · **Ámbito:** `traininglab/apps/desktop/src/lib/exercise-substitutes.ts`,
`lib/cross-progression.ts`, `lib/set-proposal.ts`, cajón de sustitución de `ZenSession.tsx`.

Este documento existe porque el motor nuevo mezcla dos cosas que no deben confundirse: **evidencia
publicada** y **priors de entrenador**. La regla del proyecto es no inventar estándares ni presentar
una estimación como una medición, así que aquí queda separado, con la cita y el número cuando existe.

## 1. Lo que sí está respaldado por literatura

| Afirmación en el código | Fuente | Qué dice exactamente | Cómo lo usa el motor |
| --- | --- | --- | --- |
| Curl femoral **sentado** hipertrofia más que tumbado | Maeo S. et al. *Greater Hamstrings Muscle Hypertrophy but Similar Damage Protection after Training at Long versus Short Muscle Lengths.* **Med Sci Sports Exerc. 2021;53(4):825-837.** doi:10.1249/MSS.0000000000002523 | 12 semanas, una pierna sentado y otra tumbado: volumen total de isquiotibiales **+14,1 % vs +9,3 %**; la ventaja aparece en los biarticulares (BFL +14,4 % vs +6,5 %; ST +23,6 % vs +19,3 %) y **no** en el monoarticular (SM +8,2 % vs +3,6 %). Sin diferencia en protección frente al daño. | `stretchAdvantage` de curl sentado; prioridad al ordenar sustitutos de isquiotibiales. El texto de la app no promete protección frente al daño. |
| Extensión de tríceps **sobre la cabeza** hipertrofia más que en polea neutra | Maeo S. et al. *Triceps brachii hypertrophy is substantially greater after elbow extension training performed in the overhead versus neutral arm position.* **Eur J Sport Sci. 2023** (online 2022). doi:10.1080/17461391.2022.2100279 | 21 adultos, un brazo sobre la cabeza y otro neutro: mayor hipertrofia de la cabeza larga y del tríceps completo en la posición overhead. | `stretchAdvantage` de la extensión overhead y su prioridad en el cajón. |
| El estiramiento bajo tensión, no el rango por sí solo, es lo que explica la diferencia | Las dos anteriores, más la discusión de Maeo 2023 | La ventaja aparece en músculos biarticulares alargados; no se generaliza a cualquier músculo ni a cualquier ejercicio. | El motor solo marca `stretchAdvantage` en los ejercicios anotados, nunca lo infiere por patrón. |

**Lo que NO se ha verificado en esta sesión:** el curl inclinado con mancuernas y las variantes en
déficit (flexiones, zancadas) aparecen en las notas del código como ejemplos de estiramiento, pero no
se ha leído el ensayo concreto que lo mide. Hasta que se cite, la interfaz no debe afirmar superioridad
para ellos: quedan como *criterio*, no como evidencia. Tarea abierta (ver §4).

## 2. Lo que es criterio, no evidencia

- **`SFR = (hipertrofia × 2,5) / max(2, jointStress + spineLoad)`.** No existe un índice SFR publicado:
  la literatura usa «estímulo frente a fatiga» como idea cualitativa. Los tres números son nuestros.
  Por eso el valor **solo ordena** alternativas, nunca fija una carga, y el globo del badge dice
  «estimación, solo para ordenar».
- **Fémur largo → sentadilla frontal / hack / prensa / goblet.** La relación entre longitud femoral y
  inclinación del tronco es biomecánica elemental (momento en cadera frente a rodilla), pero no hay
  ensayo que compare hipertrofia entre variantes en personas con fémures largos. Se presenta como
  *consejo anatómico*, no como resultado medido.
- **Remo con apoyo de pecho frente a remo con barra.** Menos carga axial y menos fatiga de erectores es
  razonable y está anotado en `spineLoad` del catálogo, pero la superioridad hipertrófica no está
  demostrada en un ensayo directo.
- **Ratios de transferencia entre ejercicios (`DIRECT_TRANSFER_RATIOS`).** No hay coeficientes
  validados publicados para este catálogo; un mismo ratio depende de palanca, técnica y máquina. Son
  **priors de entrenador**, el resultado viaja con `sourceIsHeuristic: true` y el texto dice
  «Estimado … ajústalo si no cuadra». El coste de un prior malo es una serie de aproximación.
- **Myo-reps y excéntricas para peso corporal.** Son técnicas de entrenamiento conocidas (Fagerli para
  myo-reps; énfasis excéntrico en calistenia), sin ensayo propio en este repo que las valide aquí. Se
  ofrecen como alternativa, no como prescripción obligatoria.

## 3. Reglas de seguridad que el motor respeta

1. Ninguna sugerencia escribe una carga sin que el usuario la vea y la pueda cambiar.
2. La transferencia solo usa series **reales** del propio usuario (`extractExercise1Rms`), nunca
   valores de otros ni un estándar externo.
3. Los sustitutos respetan el inventario activo: si no hay barra, no se propone barra.
4. Los vetos biomecánicos (`evaluateBiomechanicsAndFatigue`) siguen por encima: una sugerencia nunca
   abre un grupo muscular en ventana de recuperación.

## 4. Investigación pendiente (no bloquea el uso)

- [ ] Localizar y citar el ensayo de curl inclinado (Pedrosa et al. y posteriores) y decidir si las
      notas de déficit se mantienen, se citan o se retiran.
- [ ] Buscar cualquier publicación de **ratios de transferencia** entre ejercicios (press banca →
      inclinado con mancuernas, sentadilla → prensa). Si no aparece nada utilizable, dejar los priors
      como están y no citarlos nunca como medición.
- [ ] Revisar si existe evidencia sobre longitud femoral y elección de variante; si no, mantener el
      texto como guía anatómica y sin cifras.

## 5. Estado de verificación (2026-11-13, esta sesión)

- `pnpm test`: **106 archivos / 1.467 tests** en verde (incluye `test_exercise_substitutes` y
  `test_cross_progression`).
- `pnpm test:e2e:traininglab`: **7/7** en Chromium real (5 personas + 2 journeys).
- `cd traininglab/apps/desktop && pnpm typecheck`: 0. `pnpm audit:css`: 0.
- `node scripts/audit-contrast.mjs --base http://localhost:8090`: **19 PASS / 0 FAIL**, 0 nodos de
  texto por debajo de AA tras medir el fondo real (gradiente, anillo cónico y pseudo-elementos).

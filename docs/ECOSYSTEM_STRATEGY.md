# Estrategia del ecosistema — BodyLab · TrainingLab · (NutriLab?)

> Documento vivo de dirección de producto. Nace **2026-09-28**, revisado el
> **2026-09-28** tras la primera sesión de construcción real de TrainingLab.
> Complementa (no reemplaza) `ROADMAP.md` (ejecución) y
> `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md` (contrato de diseño de TrainingLab).
> Idioma: español; identificadores de código en inglés.

---

## 1. Las dos mitades (y la tercera futura)

|               | **BodyLab** (clínico, blanco/índigo)                                                             | **TrainingLab** (gimnasio, negro/naranja)                                                                | **NutriLab** (visión, congelado)                                     |
| ------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Pregunta      | «¿Cómo está mi cuerpo y por qué?»                                                                | «¿Qué entreno hoy y con cuánto peso?»                                                                    | «¿Qué como y cómo apoya mi objetivo?»                                |
| Método        | Matemática pura: antropometría, ratios, scoring, conditioning (Cooper/FC/%grasa/pliegues/Parker) | Motor determinista (sesión del día + ventanas semanales) + modelo de decisión local + LLM local opcional | Registro manual + macros; visión de comida mucho más tarde           |
| Entrada       | Cinta, báscula, plicómetro, test de campo, bici                                                  | Su propia biblioteca de ejercicios + **equipamiento declarado ítem a ítem** + sus series registradas     | Etiquetas, recetas                                                   |
| Salida        | Scores, ideales, mapa de debilidades, tendencias, modelo 3D                                      | Sesión de hoy, dosis, descanso, carga sugerida, por qué de cada decisión                                 | Objetivo proteico/kcal alineado al peso magro que ya calcula BodyLab |
| Dato canónico | cm / kg (métrico siempre en disco)                                                               | kg en el log (mismo canon)                                                                               | g / kcal                                                             |
| Estética      | Superficies claras, índigo, precisión clínica                                                    | Acero casi negro + naranja brasa `#f97316`, energía de gimnasio                                          | Por definir                                                          |

**Principio de diseño del ecosistema:** una sola identidad visual familiar
(mismos radios, mismas tarjetas, mismo ritmo de superficies, mismos tokens
semánticos), con una personalidad cromática por app. Cambiar de app se siente
como cambiar de sala del mismo laboratorio, no como cambiar de producto.

### 1.1 Independencia y puente (decisión firme 2026-09-28)

- **TrainingLab ya NO necesita BodyLab para funcionar.** La biblioteca de
  ejercicios vive en el paquete core compartido `@fitness/bodylab-exercises`
  (94 ejercicios, con traits de equipamiento/patrón/carga/progresión) y el
  planificador arranca con ella. El export de BodyLab es **personalización**,
  no requisito: añade debilidades antropométricas, score de condición física y
  PRs reales.
- El puente sigue siendo **un archivo JSON** (`bodylab-traininglab-link`, v2):
  sin nube, sin cuentas, sin servidor. BodyLab nunca conoce a TrainingLab.
- El retorno (log → BodyLab) se estudiará en F4 con el mismo mecanismo: un
  archivo.

---

## 2. La IA de TrainingLab

### 2.0 Corrección de vocabulario (importante)

Existen tres siglas parecidas y solo una describe lo que hacemos aquí.

- **JEV** es un **modelo comercial de terceros** (TypeSafe AI, 2026): un modelo
  _System One_ que **no genera texto**, devuelve **decisiones tipadas con
  probabilidad** en decenas o cientos de milisegundos y cuesta una fracción de
  un LLM. Se usa para clasificar, enrutar, verificar y poner guardarraíles. **No
  es nuestro modelo y no debemos presentar `decision.ts` como «JEV».**
- **JEPA** (I-JEPA, V-JEPA…) es una familia de _world models_ que predicen
  representaciones latentes. Es una ruta de **investigación**, no de producto
  (§2.3). **JEV ≠ JEPA**: nunca presentar uno como el otro.
- Cuando en estos documentos se dice **«modelo de clase JEV»** significa lo
  mismo que hace JEV pero implementado por nosotros: un modelo **local, privado,
  pequeño, entrenado con los datos del propio usuario**, que **toma decisiones**
  de entrenamiento —no que escribe texto— y que puede explicar por qué eligió
  lo que eligió. La etiqueta describe **la clase de problema**, no el producto.
- **No tiene que ser JEV ni nada parecido**: hay familias de modelos públicas,
  baratas y probadas para este problema. Lo que se implementó es una de ellas
  (§2.2) y la puerta queda abierta a mejores versiones sin tocar la app.

### 2.1 Nivel 1 — Determinista (siempre activo, sin red neuronal)

Es el suelo de calidad y **ya está construido y verificado**:

- **Ventanas semanales duras** (`validator.ts`): equipo disponible, no dos días
  seguidos de una familia grande, ventana de volumen por nivel (4-12 / 6-18 /
  8-22 series), cobertura de foco, citación de músculos débiles por la IA.
- **Generador determinista de la semana** (`generator.ts`): split por forma de
  semana, dosis débil→techo / fuerte→piso, fix-point de spill, auto-validación.
- **Constructor de la sesión del día** (`session.ts`, nuevo 2026-09-28):
  presupuesto de tiempo real (los 90 minutos del owner), _readiness_ del día
  (energía, motivación, frescura), ledger semanal rodante en lugar de ventana
  rígida, y **nunca lanza**: emite avisos estructurados y devuelve la mejor
  sesión honesta posible.
- **Sugerencia de carga** (`plan.ts`): histórico real + PR (e1RM Epley que ya
  exporta BodyLab) + el incremento que permite el equipo que posees.

_Este nivel es el requisito «que se pueda usar sin el LLM»: la app es completa
y útil con toda la IA apagada._

### 2.2 Nivel 2 — Modelo de decisión local (clase JEV) — **implementado**

`core/training/decision.ts`: **bandit contextual lineal** con prior
determinista y actualización online. Misma clase de problema que JEV —decidir,
no generar— resuelta con un modelo propio y explicable.

- **Por qué un bandit y no un «world model»**: con pocos datos por usuario, un
  bandit contextual es _sample-efficient_, **explicable** (cada decisión es una
  suma de aportes visibles) y corre en microsegundos en CPU, sin dependencias.
- **Features (7)**, todas 0-1: `weaknessGap`, `weeklyGap`, `freshness`,
  `readinessFit`, `variety`, `preference`, `cheapness`.
- **Prior del entrenador**: pesos fijos que codifican lo que un buen entrenador
  hace sin conocerte (entrena lo débil y lo infraentrenado, respeta la frescura
  y tu estado del día, mantén variedad, prefiere lo que sí cumples, no compliques
  el montaje).
- **Aprendizaje**: cada sesión cerrada convierte el resultado real
  (`rewardFromOutcome`: ¿tocaste el techo del rango?, ¿completaste las series?)
  en un paso de gradiente `w += lr · reward · x`, con **pesos acotados**
  (|w| ≤ 2): ninguna secuencia de resultados puede volverlo inestable.
- **Transparencia**: `drift()` muestra cuánto se ha movido cada peso desde el
  prior y el usuario puede reiniciar el aprendizaje desde la UI.

**Siguientes versiones (backlog, sin romper nada):**

1. **Ranker aprendido offline + ajuste local**: un GBDT/MLP pequeño exportado a
   **ONNX** (CPU, <1 MB) entrenado con datasets públicos de progresión
   (fuerza, adherencia) y afinado con los logs del usuario. Misma interfaz
   (`scoreExercise`), mejor generalización con pocos datos.
2. **Modelo de fatiga/wear**: secuencia corta (GRU/TCN mínimo) sobre las últimas
   N sesiones por familia para estimar recuperación real (hoy es un _ledger_ de
   series y días de descanso).
3. **Ruta de investigación (no producto): mundo latente tipo JEPA**. I-JEPA
   (2023), V-JEPA (2024), VL-JEPA y LeJEPA (2025) demuestran que predecir en
   espacio de representaciones es práctico; aplicarlo a «series de
   entrenamiento» es terreno propio y publicable, pero **el producto no puede
   depender de ello**. Si algún día aporta, entra por la misma interfaz.

### 2.3 Nivel 3 — LLM local (llama.cpp family) — **implementado, opt-in**

`traininglab/apps/desktop/src/lib/llm.ts`: cliente compatible con la API
OpenAI (**`/v1/chat/completions`**) sobre loopback, con **tool calling real** y
bucle acotado.

- **Servidores soportados (presets en la UI)**: `llama.cpp` server (`:8080/v1`),
  LM Studio (`:1234/v1`), Ollama (`:11434/v1`), Jan (`:1337/v1`) y cualquier
  otro endpoint compatible. El usuario **carga el modelo a mano** en su app
  habitual; TrainingLab solo apunta al puerto. Recomendado: familia Qwen3 ~4B
  en Q4 por su calidad de _function calling_ y _structured outputs_.
- **Herramientas (solo lectura)**: `get_context`, `get_deterministic_plan`,
  `list_available_exercises`, `get_exercise_history`, y **una terminal**:
  `propose_session`.
- **Reglas duras antes de mostrar nada**: la propuesta pasa por
  `validateProposal` (solo ejercicios del equipo declarado, sin repetir familia
  muscular, presupuesto de tiempo con ≤10 % de gracia). Si falla, se devuelve
  **el motivo al modelo para que reintente**; si sigue fallando, la pantalla
  mantiene el plan determinista.
- **Política de uso (decisión del owner)**: se usa **poco y a demanda** («hoy
  tengo 45 min y solo mancuernas»), nunca en cada render, nunca en background.
  Un chat libre para planificar sigue en el backlog (§5, Fase C).
- **Privacidad**: desactivado por defecto; cuando se activa, la única red que
  toca es `127.0.0.1`. Sin telemetría, sin descargas.

### 2.4 Flujo real (construido)

```
BodyLab (mediciones)                 TrainingLab (hoy)
  export v2 JSON ───────────────►  import opcional + persistencia IndexedDB
        │                                       │
        │                        ┌──────────────┴───────────────┐
        │                        ▼                              ▼
        │              catálogo compartido              inventario de equipamiento
        │              (94 ejercicios + traits)         (ítem a ítem, con límites)
        │                        └──────────────┬───────────────┘
        │                                       ▼
        │                       session.ts: sesión de hoy (90 min, readiness)
        │                                       │
        │                       decision.ts: reordenación personalizada
        │                                       │
        │                  [opt-in] LLM local: reordena/narra dentro de las reglas
        │                                       ▼
        │                       validateProposal (duras) → pantalla Hoy
```

---

## 3. Cómo dirigir los dos proyectos

### 3.1 Rituales

- **Un ROADMAP vivo** (ejecución) + **este documento** (dirección). Sesión =
  leer ambos al empezar, actualizar al terminar. Sin planes trimestrales rígidos.
- **Releases verificables**: BodyLab beta tras cerrar MUSTs; TrainingLab 0.1
  (F1) → 0.2 (F2)… cada hito con su suite verde. Regla histórica: ningún cambio
  que rompa tests; ninguna cifra en docs sin haber corrido la suite.
- **Dos apps, un core**: las reglas de negocio viven en `bodylab/core/*`
  (`exercises`, `training`, …), nunca en las apps. Las apps son piel.
- **Cada test tiene un propósito**: un test existe porque protege una promesa
  de producto (una regla dura, un invariante de contrato, un bug real ya visto).
  No se añaden tests «por cobertura».

### 3.2 Reparto de esfuerzo (owner + agente)

- 55 % TrainingLab hasta F2/F3 completos (es la mitad joven y el diferenciador).
- 30 % BodyLab hasta GA (Gate A, Gate I, auditoría Gate K, distribución).
- 15 % investigación (IA local, branding, publicación, contenido/GIFs).

### 3.3 Riesgos y mitigaciones

| Riesgo                                        | Mitigación                                                                                                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| El alcance del ecosistema explota (NutriLab)  | NutriLab congelado hasta BodyLab GA + TrainingLab F2 + 4 semanas de uso real. Sin código antes.                   |
| La IA se percibe como humo                    | El nivel 1 determinista ya da valor completo; la IA es opt-in, explicable y con fallback. Nada depende de Ollama. |
| Deriva estética entre apps                    | Tokens documentados en cada `index.css`; revisión visual en cada release (capturas).                              |
| El modelo local del usuario no está instalado | La app nunca lo requiere; el panel explica cómo activarlo y qué se pierde (nada esencial).                        |
| Modelos locales alucinando prescripciones     | `validateProposal` + reglas duras en core + el plan determinista como suelo.                                      |
| Fragmentación del catálogo entre apps         | Un solo paquete core (`@fitness/bodylab-exercises`); el alias se mantiene en 5 mapas (§ AGENTS.md).               |

---

## 4. Branding: negro + naranja, y los prompts generativos

### 4.1 Lo que ya existe (2026-09-28)

- **Maestros vectoriales**: `resources/brand/bodylab-icon.svg` y
  `resources/brand/traininglab-icon.svg` (1024×1024, sin texto, con el mismo
  lenguaje: cuadrado redondeado, una sola idea, legible a 32 px).
- **Pipeline reproducible**: `node scripts/render-brand-icons.mjs` rasteriza a
  PNG (masters 1024, favicon 64, apple-touch 180, icon-512) usando el chromium
  de Playwright que ya instala la suite e2e — sin dependencias nuevas.
- **Integración**: favicons y `apple-touch-icon` en ambas apps, `theme-color`
  naranja en TrainingLab, y el juego completo de iconos del launcher Windows
  regenerado con `npx tauri icon` para el shell Tauri de BodyLab
  (`src-tauri/icons/*`, incl. `128x128@2x.png` e `icon.icns`, que el
  `tauri.conf.json` ya referenciaba pero no existían).
- **Color de TrainingLab**: fondo `#0a0a0a`, superficie `#141414`, acento
  **naranja brasa `#f97316`** (hover `#ea580c`, wash 12 %), texto `#fafafa`.
  BodyLab conserva blanco/índigo `#4f46e5`.

### 4.2 Prompts para IA generativa (reproducir/evolucionar los iconos)

**Prompt A — Icono de TrainingLab (negro + naranja).**

```
Minimalist flat vector app icon, 1024x1024, rounded square (radius 22%),
background #0a0a0a with a very subtle #1f1f1f inner border. Centered bold
geometric dumbbell rotated -24 degrees: a rounded horizontal bar plus two thick
plates per side, all in a vivid ember-orange gradient from #fb923c to #ea580c,
with a soft warm halo behind it (like heated metal) and thin lighter-orange
(#fdba74) highlight strips along the bar and plates. No text, no drop shadow
outside the shape, high contrast, crisp edges, generous negative space, premium
fitness-tech aesthetic, flat design.
```

**Prompt B — Icono de BodyLab (clínico blanco + índigo).**

```
Minimalist flat vector app icon, 1024x1024, rounded square (radius 22%),
background a soft white-to-indigo-tint gradient (#ffffff to #eef2ff) with a
thin #e0e7ff inner border. Centered: a simplified human torso silhouette with
wide shoulders and a narrow waist, filled with an indigo gradient (#6366f1 to
#4338ca), rounded corners; a horizontal caliper bar crosses it at chest height
in solid indigo (#4f46e5) with vertical end ticks and a small indigo node dot
with a light center at the right end; two faint #c7d2fe measurement lines
behind and three short light ticks inside the torso. No text, clinical and
scientific mood, flat design, crisp edges, generous negative space.
```

**Prompt C (opcional) — Hero del ecosistema (README/tienda).**

```
Wide 16:9 hero image, split composition: left half clean white with indigo
(#4f46e5) wireframe human torso crossed by measurement lines; right half matte
black with an ember-orange (#f97316) dumbbell and a rising bar-chart glow; both
halves joined by a thin data line crossing the middle. Flat vector, minimalist,
premium tech aesthetic, no text.
```

---

## 5. Plan de plataforma pública (lanzamiento)

1. **Web como escaparate**: BodyLab ya soporta GitHub Pages; publicar también
   TrainingLab web (una sola pantalla, sin router). La web es la demo; el
   escritorio es el producto serio.
2. **Escritorio primero en Windows**: instalador NSIS firmado (certificado
   pendiente), updater opt-in ya implementado; el shell Tauri de TrainingLab
   reutiliza el mismo maestro de icono.
3. **La historia de producto** (el primer pantallazo del README): «Mide tu
   cuerpo (BodyLab) → entrena lo débil (TrainingLab) → vuelve a medir». El ciclo
   cerrado medición→debilidad→dosis→re-medición es lo que Hevy/Fitbod no tienen.
4. **Confianza verificable**: 708 tests root + 82 web + 21 e2e, contrato v2
   fijado, goldens del generador. «Correcto y verificable» es parte del producto.
5. **Descubrimiento sin nube**: repositorio + posts técnicos (el modelo de
   decisión local y la validación de salidas del LLM son posts excelentes) +
   r/LocalLLaMA y comunidades de entrenamiento en casa.
6. **Modelo de negocio coherente**: open source, gratis, local. Donaciones y
   patrocinios; **nunca** separar las dos mitades con un muro de pago.

---

## 6. NutriLab (visión, sin fecha)

- **Disparador**: BodyLab GA + TrainingLab F2 + el owner usando ambas 4+ semanas.
- Alcance mínimo: registro manual de comidas + macros/kcal + «apoyo al objetivo»
  (objetivo de proteína a partir del peso magro que BodyLab ya calcula; balance
  energético alineado al `goal` que el usuario ya elige en TrainingLab).
- Sin base de datos de marcas: CSV propio al inicio. Visión por foto solo
  cuando exista un modelo local pequeño viable (misma regla: local, opt-in).

---

## 7. Cómo sabremos si vamos bien (métricas)

- **Corrección**: suites verdes y docs sin cifras sin verificar (regla dura).
- **Ciclo cerrado**: % de sesiones que siguen una debilidad medida por BodyLab.
- **Utilidad**: minutos de sesión planificada vs. presupuesto disponible
  (objetivo: ≥60 % del presupuesto aprovechado sin pasarse nunca).
- **IA**: % de propuestas del LLM aceptadas por las reglas; cuánto se separa el
  ranking aprendido del prior (si no se separa nunca, el modelo no aporta).
- **Adopción**: instalaciones desktop, estrellas, issues reproducibles.

---

_Última actualización: 2026-09-29. Vinculado a `ROADMAP.md` (ejecución) y
`fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md` (contrato de diseño)._

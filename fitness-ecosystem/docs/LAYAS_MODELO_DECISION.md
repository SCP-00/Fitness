# Modelo de decisión propio para TrainingLab (familia LAYA)

> **Fecha:** 2026-10-01
> **Ámbito:** backend / motor de decisión. No toca interfaz.
> **Estado:** contrato implementado y probado; pipeline de entrenamiento
> funcional; entrenamiento sobre datos reales **pendiente de datos y de
> decisión del dueño**.
> **Código:** [`bodylab/core/training/src/laya.ts`](../bodylab/core/training/src/laya.ts) ·
> [`ml/laya/`](../ml/laya/) ·
> [pruebas del contrato](../tests/training/test_laya_contract.test.ts)

---

## 1. Qué se ha decidido

| Decisión | Por qué |
|---|---|
| Adoptar el **contrato tipado** de LAYA (`choice` / `score`) como interfaz del modelo de decisión. | El modelo no genera texto: devuelve distribuciones calibradas. Elimina el parseo, el JSON malformado y la alucinación por construcción. |
| **Descomponer** la decisión en familia → ejercicio. | LAYA degrada con más de ~20 opciones (0.425 frente a 0.870 en un conjunto de 77 etiquetas). El catálogo tiene 94 ejercicios: una sola pregunta es inviable. |
| **No** usar la primitiva `noul`. | Su cabeza puede seguir sus propias etiquetas `false:`/`true:` en vez del estado (incidencia #156 documentada por los autores). Se sustituye por una pregunta `choice` de dos opciones con claves **neutras** `A`/`B` y el sí/no en la descripción. |
| El modelo **propone**, el suelo determinista **dispone**. | Ya existe la costura: `BuildSessionInput.modelScores`. `session.ts` y `validator.ts` conservan equipo, familias, techos, tiempo y todas las reglas duras. Un modelo no puede inventar un ejercicio que el llamador no haya ofrecido. |
| **Python** para entrenar. **TypeScript** en tiempo de ejecución. Rust no entra. | Ver §7. |
| Etiquetar `focus` con el **entrenador determinista**, no con la conducta del atleta. | Ver §6.3. Es la decisión de diseño más importante del proyecto. |
| Entrenar **fuera** del portátil por defecto. | La RTX 3050 de 6 GB no aguanta un ajuste fino completo de 421 M con AdamW. Kaggle 2×T4 es gratis y es la ruta que el propio notebook de referencia soporta. Ver §8.2. |

**Nada de esto autoriza abrir la puerta del mapa de fuerza** (heatmap frente a
referencia externa publicada). Sigue cerrada y este trabajo no la toca: aquí se
decide **qué ejercicio**, no **cuánta fuerza**.

---

## 2. Qué es LAYA (y qué no es)

**Qué es.** Una familia de modelos de decisión **no autorregresivos** publicada
por Convai Innovations, con pesos abiertos bajo **Apache 2.0**. Arquitectura:
encoder **ModernBERT-large** (395 M, bidireccional, ajustado por completo) más
una cabeza de decisión entrenada desde cero (2 capas transformer, un
puntuador por marcador de opción, una cabeza act/escalate) — **421 M** en
total. La variante multilingüe usa **mmBERT-base** (322 M, vocabulario 256 k,
contexto 1024, hasta 8192 con RoPE).

**Cómo decide.** Cada opción se puntúa en su propio token `[MASK]` y luego se
aplica `softmax` sobre las opciones *de esa pregunta*. El espacio de respuesta
se define **en tiempo de petición**: un esquema nuevo no exige reentrenar.
Todas las preguntas de una llamada se responden en **un solo paso hacia
delante** (≈33 ms en una T4; 7,2 ms/pregunta en lote).

**Tres primitivas:**

- `choice` — elige una clave de un diccionario de criterios. Devuelve la clave,
  la distribución sobre todas las opciones y una confianza calibrada.
- `score` — sitúa el estado en una rúbrica ordinal (0, 1, 2, …). Devuelve el
  nivel esperado y la distribución sobre los niveles.
- `noul` — pregunta booleana que devuelve P(verdadero) ∈ [0, 1].

**Cómo se entrena.** **RLCD** (*Reinforcement Learning for Calibrated
Decisions*): la política emite una distribución, la exploración añade ruido
gaussiano de media cero a los logits, y la recompensa es una **regla de
puntuación estrictamente propia** (logarítmica + esférica, y *ranked
probability score* para las ordinales). Maximizar la recompensa esperada exige
**reportar probabilidades honestas**: la calibración es el objetivo, no un
efecto colateral. Las actualizaciones son REINFORCE con línea base de media de
grupo (estilo GRPO).

**Qué NO es — y hay que decirlo con precisión:**

- **No es JEV.** JEV es el modelo comercial cerrado de TypeSafe AI. Nuestra
  implementación es un modelo **de la clase JEV/LAYA**, y no debe llamarse JEV
  en ninguna parte.
- **No es JEPA.** JEPA es otra arquitectura publicada y distinta. No se
  menciona ni se implica.
- **No es un LLM.** No genera texto. Lo que se pueda narrar de una decisión
  seguirá siendo trabajo del LLM local opcional, y seguirá siendo **opcional**.

---

## 3. Los números publicados, y cómo leerlos

Cifras **del fabricante** salvo donde se indique. Se reproducen porque son el
contexto de nuestras decisiones, **no** porque sean nuestro objetivo.

| Benchmark | JEV 1.13.0 | LAYA (con enrutado) | Nota |
|---|---|---|---|
| typed-decisions (2 000 decisiones) | 0.727 | **0.766** | el 0.766 es del checkpoint **ajustado** con ese mismo conjunto |
| AG News (4 etiquetas) | 0.910 | 0.950 | |
| DAIR Emotion (6 etiquetas) | 0.480 | 0.595 | JEV asignó probabilidad cero a la etiqueta real en el 16 % de los casos |
| Banking77 (77 etiquetas) | **0.870** | 0.425 | LAYA pierde: 77 opciones comparten 256 tokens de presupuesto |
| ECE (menor es mejor) | 0.246 | **0.081** | el 0.081 es **tras** ajustar temperatura por tipo de pregunta |
| Latencia p50, 1 pregunta | 236–276 ms | 32,8 ms | cifras de JEV publicadas por terceros, nunca medidas por nosotros |

**Las cuatro advertencias que van con esa tabla:**

1. **El 0.766 no es zero-shot.** Los checkpoints base puntúan **0.362** en ese
   mismo benchmark, por debajo de la línea base de clase mayoritaria (0.461).
   El texto del propio fabricante lo dice: *«Laya es una base rápida para
   especializar, no un oráculo zero-shot»*.
2. **El 0.081 de ECE tampoco es zero-shot.** El ECE crudo del checkpoint inglés
   es **0.466**; el 0.081 sale de reajustar una temperatura por tipo de pregunta
   sobre los datos de uno.
3. **Regla de puntuación propia ≠ calibración garantizada.** Un tercero
   independiente (Anthus) midió LAYA crudo en su corpus y obtuvo ECE 0.107 y
   Brier 0.189, y observó que sigue siendo el modelo más débil de los que probó
   en acierto. La calibración hay que medirla en **nuestros** datos.
4. **Una comparación de terceros contradice la nuestra.** Anthus midió JEV
   0.768 frente a LAYA 0.722 en su propio corpus. Es decir: en algunos dominios
   LAYA **no** gana. Se adopta por ser **abierto, local, rápido y especializable**,
   no porque sea mejor en abstracto.

Una lección más, de ese mismo estudio y muy relevante: ajustar LAYA con 140
etiquetas propias (≈100 s de entrenamiento en un M1 Max) subió del 0.722 al
**0.896**, por encima de JEV con la misma capa. La conclusión operativa es la
que ya teníamos escrita en `decision.ts`: **el valor está en el ajuste con
datos propios, no en el modelo base.**

---

## 4. Límites honestos (los que condicionan el diseño)

1. **Más de ~20 opciones degrada.** Las opciones comparten un presupuesto fijo
   de tokens (`head_max_len` 192 en inglés, 256 en multilingüe). Con 77
   etiquetas quedan 3–4 tokens por etiqueta y dejan de ser distinguibles.
   → **Descomposición jerárquica obligatoria.** Nuestro catálogo tiene 94
   ejercicios.
2. **Zero-shot es casi azar en decisiones tipadas.** Ver §3.
3. **Congelar el encoder no funciona.** Con 140 etiquetas, el ajuste solo-cabeza
   puntuó **0.659**, por debajo del 0.722 sin entrenar; con tasas más suaves
   tampoco superó a no entrenar. En esa tarea el aprendizaje ocurre **en el
   encoder**. `--freeze-encoder` existe para una máquina con poca memoria, no
   porque sea buena idea.
4. **`noul` puede seguir sus etiquetas.** Documentado en el número #156: con
   entradas claramente positivas puede devolver un «no» con confianza. Es la
   razón de la regla del `choice` con claves neutras.
5. **La confianza no avisa cuando no sabe leer.** En 51 idiomas, la confianza
   media del checkpoint inglés nunca baja de 0.885 aunque su acierto vaya del
   82 % al 0 %. Por eso existe un **enrutador** por escritura/idioma. Nuestros
   estados son cortos, en español, con vocabulario cerrado: aun así hay que
   decidir el checkpoint explícitamente.
6. **La ventana se trunca en silencio.** Un documento demasiado largo devuelve
   una respuesta segura calculada sobre una parte. Por eso
   `buildLayaState` tiene presupuesto y un indicador `truncated`.
7. **`action.act_probability` no sirve** (AUROC 0,30: peor que el azar en 396
   decisiones etiquetadas). **No** se usa. La única puerta válida es
   `answer_confidence`.
8. **Preguntas ordinales (`score`) son la primitiva más débil** (SST-5 0.372).
   Nuestra rúbrica de volumen usa `score` a sabiendas, con una rúbrica de 5
   niveles y tolerancia de ±1, y se mide aparte en el informe.
9. **Cada pregunta extra cuesta un paso hacia delante** (≈8 ms/pregunta;
   «Laya codifica el ítem una vez por pregunta»). Con 13 familias candidatas
   eso son ~13 pasos. **Se acepta**: son milisegundos locales, no una API.
10. **Peso en disco:** ~808 MB (inglés), ~647 MB (multilingüe). Relevante para
    el tamaño del instalador si algún día se empaqueta.

---

## 5. Encaje en TrainingLab

### 5.1 La costura ya existe

`BuildSessionInput.modelScores?: Record<string, number>` es exactamente el
punto de entrada del modelo de decisión en el constructor determinista. No hace
falta inventar arquitectura: LAYA produce `modelScores` mejor fundados que la
bandida lineal actual, y todo lo demás queda igual.

```
estado (JSON del atleta)  →  preguntas tipadas  →  respuestas  →  modelScores
                                                                    ↓
                              session.ts + validator.ts  ←  reglas duras
```

### 5.2 El estado

`buildLayaState` renderiza una sesión como un documento compacto de líneas
`clave: valor`, con presupuesto de 1800 caracteres y bandera `truncated`.
Incluye lo que una bandida lineal no puede usar: la nota libre del usuario
(«me duele el hombro derecho»), el nivel, el objetivo, la recuperación, el
equipo disponible, las cinco familias más débiles, el volumen semanal y las
familias fatigadas.

Decisiones de forma: claves **en inglés y cerradas** (es un **contrato de datos
del modelo**, no copia de interfaz: la interfaz sigue siendo responsabilidad de
`i18n.ts`); números redondeados a un decimal (el modelo necesita orden, no
precisión); truncado **por líneas completas** (un `clave: valor` a medias es
peor que una clave ausente) y `note` al final, que es lo más barato de perder.

### 5.3 Las preguntas

| id | primitiva | opciones | qué decide |
|---|---|---|---|
| `focus` | `choice` | ≤ 13 familias | qué familia entrenar primero hoy |
| `deload` | `choice` A/B | 2 | si la sesión se reduce |
| `volume` | `score` | 5 niveles | cuántas series de trabajo a la familia prioritaria |
| `ex_<familia>` | `choice` | ≤ 20 | qué ejercicio concreto dentro de esa familia |

Las dos primeras van **primero** para que, con presupuesto justo, se pierdan
las preguntas por familia y no la decisión.

### 5.4 La lectura de respuestas

`scoresFromLaya` devuelve `modelScores` listos para el constructor, con estas
garantías, todas bajo prueba:

- el ejercicio elegido puntúa 1 y sus hermanos quedan por debajo (0,3–0,7)
  conservando su orden relativo;
- una familia **sin respuesta** conserva el orden del llamador **sin comprimir**
  (penalizarla sería castigarla por un fallo del modelo, no suyo);
- una respuesta **inventada** (una opción que nadie ofreció) se rechaza;
- por debajo de `LAYA_MIN_CONFIDENCE` (0,45) la respuesta se descarta y se
  devuelve el **suelo determinista idéntico** al de no tener modelo: una
  respuesta mala **nunca** puede empeorar el resultado;
- si falta la propia respuesta de `focus`, se descarta todo, porque es la
  decisión de la que cuelga la sesión.

---

## 6. Cómo se entrena

### 6.1 La receta (del notebook de referencia, citada, no parafraseada)

- **4 épocas**, micro-lote 8, acumulación 4 (lote efectivo 64 con 2 GPU).
- **Dos tasas de aprendizaje**: encoder `2.5e-5`, cabeza `1e-4`. AdamW, weight
  decay 0.01, recorte de gradiente 1.0, programación coseno, fp16 + GradScaler,
  *gradient checkpointing*.
- **Ruido de exploración** `GROUP_SIZE = 4`, sigma de 0.4 → 0.1 lineal, con
  **proyección de media cero** sobre el eje de opciones (un ruido sesgado
  desviaría la política, no la exploraría).
- **Recompensa** `proper_reward(..., w_sph=0.75, w_rps=1.0)` más un ancla
  supervisada de entropía cruzada suave con peso 1.0. Sin ese ancla, un ajuste
  con pocos cientos de decisiones se desvía.
- **Calibración post-entrenamiento**: una temperatura por primitiva, ajustada
  por LBFGS sobre una porción **apartada antes de entrenar** (≤ 400 o el 10 %).

### 6.2 Por qué el ancla supervisada importa

El propio estudio independiente (§3) encontró que solo-cabeza **pierde** frente
a no entrenar. Nuestra tubería reproduce las dos vías —`--freeze-encoder` y
ajuste completo— y **documenta el riesgo** en lugar de esconderlo.

### 6.3 El etiquetado, que es el verdadero problema

El registro guarda **las decisiones que el atleta tomó**, y solo esas. Clonar la
conducta enseña al modelo a reproducir precisamente los hábitos que el plan
existe para corregir: una familia débil está débil *porque* se sigue saltando, y
una política clonada la seguiría saltando y lo llamaría personalización.

Por eso cada primitiva tiene **una fuente distinta, a propósito**:

| pregunta | fuente de la etiqueta |
|---|---|
| `focus` | **el entrenador determinista** (más débil primero, respetar fatiga, respetar el hueco semanal) |
| `volume` | la rúbrica del entrenador, recortada por lo que se completó de verdad |
| `ex_<familia>` | **la conducta**: dentro de la familia que eligió el entrenador, qué movimiento buscó el atleta |
| `deload` | la conducta, con un indicador transparente: series ≤ 60 % de la mediana del atleta |

Y los objetivos son **distribuciones, no one-hot**: la regla de entrenamiento es
una regla de puntuación estrictamente propia sobre la distribución completa, y
un objetivo one-hot le haría optimizar un margen de clasificación en vez de
probabilidades honestas — que es justo lo único para lo que sirve esta clase de
modelo.

La prueba `test_labels_reject_the_athletes_own_bias` fija esto: un atleta con
pecho débil (25) que registra 6 series de dorsales y 3 de pecho debe producir
una etiqueta `focus` = **pecho**, no dorsales.

---

## 7. Python o Rust

**Python para entrenar. TypeScript para ejecutar. Rust no entra en este camino.**

- **Entrenar en Rust no es viable hoy.** La receta depende de
  `laya.common.build_model`, `build_sequence`, `proper_reward`, `QTYPES` y del
  ecosistema PyTorch (`transformers`, `safetensors`, DDP). Portar RLCD a Rust
  significaría reimplementar el modelo, el tokenizador y el optimizador, y
  quedaría **por detrás** de la receta publicada en cada actualización de la
  familia. Es trabajo de especialista con riesgo de divergencia silenciosa, a
  cambio de nada que el usuario pueda percibir.
- **Ejecutar en Rust tampoco hace falta.** El modelo se consume desde
  TypeScript: `laya-serve` expone el **mismo** `POST /v1/systemone` que JEV (un
  cliente existente funciona cambiando la URL base), y existe un SDK
  `laya-ts` para Node. Si algún día hay que empaquetarlo sin Python, la vía es
  exportar a **ONNX INT8** e inferir con `onnxruntime-node` dentro de la app.
- **Rust sí tendría sentido** más adelante, y no en el modelo: en el *lado
  datos* (ingesta y agregación del registro) si algún día el CLI de datos se
  queda corto. Es una decisión distinta y no urgente.

**Unsloth Studio.** Su sección de *Training* está orientada a LLM
autorregresivos con LoRA/QLoRA. LAYA **no es un LLM**: es un encoder
bidireccional con una cabeza de decisión, y su entrenamiento es RLCD con
reglas de puntuación propias, no *next-token prediction*. **No se puede
entrenar LAYA en Unsloth Studio.** Recomendación: dejar Unsloth para el LLM
local opcional (nivel 3, el que narra la decisión) y entrenar LAYA con la
tubería de este repositorio.

---

## 8. Hardware

### 8.1 Qué acelera de verdad, y la verdad sobre Vulkan

| Vía | ¿Entrena? | ¿Infere? | Nota |
|---|---|---|---|
| **CUDA** (NVIDIA) | sí | sí | la vía nativa de PyTorch; única con *kernel* rápido medido (TileLang) |
| **XPU** (Intel Arc) | sí | sí | vía PyTorch XPU |
| **MPS** (Apple) | sí | sí | el notebook de referencia tiene guion para MPS/CPU |
| **CPU** | sí | sí | perfectamente suficiente para inferir; lento para entrenar |
| **DirectML** (onnxruntime-directml) | **no** | sí | aceleración DirectX 12 en Windows, incluidas AMD e Intel. Es **la** vía acelerada de Windows para inferencia |
| **Vulkan** | **no** | **no** | PyTorch no tiene backend Vulkan y ONNX Runtime nunca publicó su *execution provider* de Vulkan (sigue siendo una petición abierta, #21917). Ningún framework de ML mainstream entrena por Vulkan |

**Conclusión sobre Vulkan, sin rodeos:** la petición «que corra con Vulkan» no
se puede cumplir por esa vía porque no existe. Lo que sí existe y es
equivalente en la práctica: **CUDA** si hay NVIDIA, **DirectML** para inferencia
en cualquier GPU DirectX 12 (AMD/Intel incluidas) y **CPU** siempre. En esta
máquina hay NVIDIA, así que **CUDA** es la respuesta correcta.

### 8.2 Este equipo concreto

Medido en este portátil:

```
NVIDIA GeForce RTX 3050 Laptop GPU — 6 144 MiB — driver 617.14
Python 3.11.15 (gestionado por uv) · uv 0.11.29 · Node v24.16.0 · 196 GB libres
```

**6 GB de VRAM no aguantan un ajuste fino completo de 421 M parámetros.** La
cuenta, en fp16: pesos 0,84 GB + gradientes 0,84 GB + estados de AdamW en fp32
3,4 GB = **~5,1 GB antes de activaciones**, con *gradient checkpointing* o sin
él. No cabe con holgura, y un OOM a mitad de época no es un plan.

**Rutas ordenadas por coste y honestidad:**

1. **Kaggle 2×T4 (gratis) — la ruta recomendada.** El notebook de referencia
   está escrito para eso y tarda 4–6 minutos. Nuestra tubería produce el
   `dataset.jsonl`; el ajuste se lanza allí. No cuesta nada y usa la receta
   publicada tal cual.
2. **CPU local.** Correcto, verificable y **lento**: sirve para una prueba de
   humo con pocos cientos de decisiones, no para el modelo final.
3. **Ajuste solo-cabeza local.** Cabe en 6 GB, pero **la evidencia publicada
   está en contra** (§4.3). Es una opción para una máquina con poca memoria, no
   la primera.
4. **LoRA/QLoRA local.** Viable en 6 GB y es la mejor ruta local si el dueño
   quiere que el modelo se entrene en su máquina. **No está implementado**: la
   bandera existe, la implementación no. Se dice para no venderlo como hecho.

---

## 9. Protocolo de pruebas antes y después

El error que hay que evitar es comparar nuestro modelo contra el número
publicado de un tercero. **La referencia es nuestro propio suelo determinista**:
si el modelo aprendido no le gana en acierto **y** no empeora la calibración, no
ha ganado el derecho a decidir.

```bash
cd fitness-ecosystem/ml/laya

# ANTES — no necesita Torch ni checkpoint
python cli.py evaluate --dataset data/real.jsonl --model none --json data/before.json

# DESPUÉS — mismo conjunto, mismo arnés, misma métrica
python cli.py evaluate --dataset data/real.jsonl --model runs/x --json data/after.json

python cli.py compare --before data/before.json --after data/after.json
```

### 9.1 Lo ya medido (antes de entrenar)

**Suite de la aplicación** (desde `fitness-ecosystem/`):

| Comprobación | Resultado |
|---|---|
| `pnpm test` | **932/932, 60 archivos, EXIT 0** (eran 907/59: +25 del contrato nuevo) |
| `pnpm typecheck` | **EXIT 0** |
| `pnpm lint` | **0 avisos, 0 errores** |
| TrainingLab `tsc -b` | **EXIT 0** |

**Tubería en Python** (desde `ml/laya/`):

| Comprobación | Resultado |
|---|---|
| `pytest tests -q` | **38/38, EXIT 0** (incluye el bucle RLCD real con Torch 2.14.1+cpu) |
| `cli.py synth --count 400` | 400 sesiones → 400 casos |
| `cli.py evaluate --model none` | 1 759 decisiones, **accuracy 0,7419**, ECE **0,2581** |

> **Leer el 0,7419 con la etiqueta correcta.** Es sobre el **corpus sintético**,
> así que **no dice nada del producto**: verifica que la tubería funciona de
> punta a punta. Y el ECE de 0,2581 es exactamente `1 − accuracy` **por
> construcción**: el suelo es determinista y responde con probabilidad 1,0, no
> tiene incertidumbre que expresar. Está ahí precisamente para mostrar por qué
> vale la pena entrenar un modelo calibrado, no para compararse con él. Las
> pruebas fijan esa igualdad para que nadie la confunda con un resultado.

**Sin hacer todavía:** ningún entrenamiento sobre datos reales, ninguna
medición «después», ninguna exportación ONNX. Ver §11.

---

## 10. Plan de ejecución por fases

| Fase | Contenido | Estado |
|---|---|---|
| **F0** | Investigación, contrato tipado, suelo, tubería, pruebas | **hecho** |
| **F1** | Export real del registro + mapa de debilidad de BodyLab → `dataset.jsonl` de datos reales | pendiente (necesita datos del dueño) |
| **F2** | Ajuste en Kaggle 2×T4 con la receta de §6.1 | pendiente |
| **F3** | Medición «después» y comparación contra el suelo | pendiente |
| **F4** | Puerta de honestidad: ¿gana en acierto **y** no empeora ECE? Si no, no se integra | pendiente |
| **F5** | Consumo en la app: `laya-serve` como proceso local **o** ONNX + `onnxruntime-node` | pendiente |
| **F6** | LLM local **opcional** que solo *narra* la decisión ya tomada | sin cambios respecto al plan vigente |

---

## 11. Riesgos abiertos y lo que NO se ha hecho

- **No hay datos reales en el repositorio**, y no debe haberlos: el registro es
  privado. Todo lo medido hasta ahora es sobre el corpus **sintético**. Un
  modelo entrenado con él es una prueba de humo y la propia tubería lo marca
  (`"shippable": false` en el manifiesto de la ejecución).
- **No está implementado LoRA/QLoRA.** La bandera `--lora-rank` existe pero no
  hace nada. Es una promesa, no una función.
- **No está implementada la exportación ONNX.** `laya[onnx]` y
  `scripts/export_onnx.py` existen en el proyecto de la familia; integrarlos es
  trabajo de F5.
- **No se ha medido ninguna latencia real** en este equipo. Toda cifra de
  latencia de este documento es del fabricante o de terceros.
- **Riesgo de deriva entre renderizadores.** Mitigado con el fixture dorado y
  pruebas de paridad en los dos idiomas, pero sigue siendo el fallo más silencioso
  posible: si alguien cambia `laya.ts` y no regenera el fixture, la tubería
  entrena sobre otro texto. Está documentado en la cabecera del fixture.
- **Riesgo de sobreajuste con pocos datos.** Si el registro real tiene pocos
  cientos de sesiones, el ajuste completo de 421 M puede sobreajustar. La
  mitigación no es congelar el encoder (la evidencia la contradice) sino medir
  con partición temporal y reportar la curva.
- **`noul` no se usa.** Es la primitiva con mejor acierto publicado (0.857) y
  se está renunciando a ella por su fallo documentado. Si en **nuestros** datos
  no se queda «atascada», reconsiderarlo es una mejora evidente.
- **Puertas que siguen cerradas:** el heatmap de fuerza frente a referencia
  externa publicada, y la integración del prototipo independiente del mapa.
  Nada de este trabajo las abre.

---

## 12. Fuentes

- Sitio: <https://laya.convaiinnovations.com/>
- Repositorio: <https://github.com/NandhaKishorM/laya>
- Pesos: <https://huggingface.co/convaiinnovations/laya>
- Notebook de ajuste fino (2×T4, RLCD): [laya_finetune_typed_decisions_2xT4_kaggle.ipynb](https://github.com/NandhaKishorM/laya/blob/main/notebooks/laya_finetune_typed_decisions_2xT4_kaggle.ipynb)
- Comparación independiente JEV vs LAYA (Anthus): <https://anth.us/blog/jev-vs-laya/>
- Artículo del autor: <https://dev.to/nandakishor_m_6cc0adfde9f/i-built-non-autoregressive-decision-models-a-year-ago-then-a-frontier-lab-called-it-a-18me>
- Petición abierta del *execution provider* de Vulkan en ONNX Runtime: <https://github.com/microsoft/onnxruntime/issues/21917>

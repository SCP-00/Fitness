# Validación de features — antes de construir, preguntar

> Fecha: **2026-09-29**. Objetivo: antes de invertir horas en una función cara,
> comprobar que alguien la quiere de verdad. Se investigaron **comunidades chinas**
> (Keep, 训记/SynFit, 知乎/什么值得买) y **estadounidenses** (r/fitness, r/Hevy,
> r/AdvancedFitness, r/LocalLLM), más las licencias de los bancos de imágenes de
> ejercicio y la práctica real del LLM local.
>
> Regla de la casa: **una feature no entra por ser buena idea, entra porque hay
> evidencia**. La evidencia se cita; el veredicto se escribe; si es "no", se dice
> por qué y qué costaría.

---

## 1. Lo que dice el mercado chino

| Hallazgo | Fuente | Qué implica para nosotros |
| --- | --- | --- |
| **Keep** enseña cada movimiento con **GIF en bucle + texto explicativo**, y los análisis de producto lo destacan como su fortaleza frente a rivales | `woshipm.com` (análisis Keep), App Store CN | El demo animado por ejercicio **no es un extra, es el estándar del mercado chino**. Nuestro plan de GIF propio va en la dirección correcta |
| **训记 / SynFit** (el "Hevy chino") se vende como app *hardcore* de registro y su propuesta central es literalmente **训练容量 = 组数 × 重量 × 次数** (volumen = series × peso × reps), con **estadísticas de series por zona** y **cronómetro por serie** | App Store CN, 知乎 (p.55318091), dealsmoon | Valida tres cosas nuestras: volumen por músculo, temporizador de descanso por serie y "encontrar tu eslabón débil comparando volúmenes" — que es exactamente el puente BodyLab → TrainingLab |
| 训记 permite **marcar RPE y rango de repeticiones** además de peso/reps, y **crear ejercicios propios** | dealsmoon (comparativa Fitbod vs 训记) | Los dos huecos que veíamos: RIR/RPE ya lo registramos; **ejercicio personalizado sigue pendiente** y el mercado chino lo considera razón principal de elección |
| Keep segmenta por **nivel K1..K5** y ofrece "planes de entrenamiento" como producto, no como utilidad | Informe de industria (dfcfw PDF), Baidu Baike | El plan por niveles (principiante/intermedio/avanzado) y la cadencia semanal configurable son tabla, no lujo |
| En China el ecosistema local-LLM es **Qwen** (Alibaba) y sus modelos se publican con GGUF para llama.cpp | Qwen docs, ModelScope | Elegir Qwen3.5 como coach opcional es, en esa comunidad, la opción obvia y esperada |

**Veredicto CN:** el registro con volumen por zona + temporizador + demo del
movimiento + ejercicio personalizado es **el mínimo de la categoría**, no ideales.
Nuestra ventaja diferencial no es esa lista: es el **análisis antropométrico que
alimenta el plan** y el **no tener cuenta ni nube**.

## 2. Lo que dice el mercado estadounidense

Del megahilo de peticiones de **r/Hevy** (el tracker de referencia hoy: 4.9★,
271k reseñas en Google Play, 14M usuarios) y de la comparativa Hevy/Strong:

| Petición repetida | Frecuencia | Nuestra situación |
| --- | --- | --- |
| **Generador de series de calentamiento** a partir de las series de trabajo (rampa por porcentaje), que **no cuenten como volumen** y con **descanso propio** | La #1 del megahilo, hilos desde 2021 hasta hoy, y Hevy la cobra como PRO | **No la tenemos**. Es barata de hacer (aritmética pura en core) y la comunidad la pide desde hace cuatro años |
| **Tipos de serie**: normal / calentamiento / dropset / al fallo, y **superseries** | Recurrente | No tenemos tipos de serie; las superseries son de valor medio |
| **Calculadora de discos** (qué poner a cada lado) | Recurrente | No aplica al equipo del dueño (mancuernas); sí a gimnasio |
| **Ejercicios personalizados** | Recurrente (coincide con 训记) | Pendiente declarado del dueño |
| **Rango de repeticiones + RPE/RIR en la plantilla**, no solo al registrar | Recurrente | Ya lo tenemos en la prescripción del plan |
| **Feed social / seguir amigos** | Existe en Hevy, es su motor de crecimiento | **Deliberadamente fuera**: rompe el modelo de privacidad (nada sale del dispositivo; la LAN es de casa) |

**Análisis de volumen** (lo que r/AdvancedFitness y r/weightroom discuten):
los *landmarks* de Israetel (MV / MEV / MAV / MRV) son populares y útiles **como
marco**, pero la propia comunidad los critica: "MEV y MRV son buenos conceptos,
pero progresar de MEV a MRV en cada mesociclo es innecesario; muy pocos coaches
programan así" (r/weightroom, hilo de MRV). Es decir: **rangos con fuente y
educación sí; reglas duras calculadas a partir de ellos, no** — una app que
"receta" por MRV se equivoca con seguridad en algunos usuarios.

## 3. Licencias de material de ejercicio (el punto que pediste cuidar)

| Fuente | Licencia | Veredicto |
| --- | --- | --- |
| **free-exercise-db** (800+ ejercicios, 2 imágenes por ejercicio = posición inicial y final, JSON estructurado) | **Unlicense / dominio público** (LICENSE.md verificado) | **Adoptable con seguridad** como material de referencia y como stills. Ver aviso abajo |
| **wger** | CC-BY-SA (compartir igual) | Usable, pero su licencia "se pega" al paquete de assets y obliga a relicenciar lo que se combine con ella; solo si se aisla |
| **ExerciseDB / WorkoutX** (GIF animados, 1400+) | Comercial restringida: permiten usar la API/media en apps, **prohibida la redistribución** del material | **Descartado.** Meterlo en el repositorio violaría su licencia |
| **Gym Visual** (los 36 GIFs que ya tiene BodyLab) | Royalty-free *con matices*; los avisos ya dicen "verificar licencia actual para uso comercial" | **No se descarta, pero no se amplía.** Queda como material existente y documentado; el material nuevo NO dependerá de él |
| **Dibujo propio** (figura vectorial animada por patrón de movimiento) | Nuestra, Apache-2.0 | **La apuesta principal**: cero riesgo legal, cubre los 140 ejercicios (no solo los 36 con GIF), y explica *la mecánica* — que es lo que evita lesiones |

⚠️ **Aviso honesto sobre free-exercise-db**: su `LICENSE.md` es dominio público sin
ambigüedad, pero las imágenes proceden del dataset original `exercises.json` y su
trazabilidad individual no es 100 % verificable en todos los casos. Por eso el
plan es: **nuestra animación dibujada decide**; las fotos de free-exercise-db son
una mejora opcional, se incorporarían con un script que registre id, URL y fecha
en `THIRD_PARTY_NOTICES.md`, y nunca se mezclan en el mismo hueco visual.

## 4. LLM local: qué funciona de verdad

- Un desarrollador publicó una app iOS que corre **Qwen3 en el dispositivo** con
  todo el *structured output* **restringido por gramática** (un GBNF por tarea:
  borrador de rutina, tool calls, subpasos) y **greedy**: el patrón que hace fiable
  a un modelo pequeño.
- `llama-server` **genera la gramática GBNF a partir del JSON Schema de las
  herramientas** cuando `tools` está habilitado, y la combina con la propia
  (discusión abierta en llama.cpp sobre composición de gramáticas).
- Los modelos de 1–4B cuantizados **sí** hacen tool calling decente cuando el
  formato está restringido; sin restringir, fallan.

**Conclusión:** nuestro diseño (el LLM propone, la aritmética dispone) es el
correcto; lo que falta no es un modelo mejor, es **el material que el modelo
necesita en contexto**: catálogo, reglas duras, vocabulario y herramientas. Eso
es lo que se construye en esta etapa (`traininglab/apps/desktop/llm/`).

---

## 5. Tabla de decisión

Esfuerzo: **S** ≤ 2 h · **M** media jornada · **L** 1–2 jornadas · **XL** más.
Técnica: complejidad real de implementación (no líneas de código).

| # | Feature | Evidencia | Veredicto | Esfuerzo | Técnica |
| --- | --- | --- | --- | --- | --- |
| 1 | **Demo de técnica por patrón de movimiento** (SVG animado propio) + cues bilingües, errores comunes, respiración, seguridad | CN: estándar de Keep; US: quejas por apps sin demo | **CONSTRUIR YA** | L | Cinemática 2D directa (FK con longitudes fijas) + `requestAnimationFrame`; sin assets, sin licencias, sin red |
| 2 | **Nivel de esfuerzo y nivel técnico explicados** por ejercicio (RIR objetivo + por qué, 1–5 de técnica) | CN: 训记 marca RPE; US: RPE/RIR en plantilla | **CONSTRUIR YA** | S | Datos puros en core + dos *badges* en la tarjeta del ejercicio |
| 3 | **Más ejercicios** (94 → ~140), sobre todo para casa | CN+US: catálogo = razón de elección; nuestro equipo es de casa | **CONSTRUIR YA** | M | Datos + traits hechos a mano (el test exige que no haya *fallback*) |
| 4 | **Pack de conocimiento para el LLM local** (Qwen3.5-4B): system prompt, herramientas, gramáticas GBNF, Modelfile, base de hechos **generada** del catálogo | US: GBNF es el patrón fiable; CN: Qwen es el modelo esperado | **CONSTRUIR YA** | M | Generador que lee el catálogo (una sola fuente de verdad) + test de no-deriva |
| 5 | **Generador de series de calentamiento** (rampa %, excluidas del volumen, descanso propio) | US: petición #1 desde 2021, de pago en Hevy | **CONSTRUIR (siguiente)** | S–M | Aritmética pura; el valor está en la política de rampa y en que el volumen no lo cuente |
| 6 | **Ejercicio personalizado** | CN y US, ambos | **CONSTRUIR (siguiente)** | M | Datos del usuario + traits derivados; cuidado con el validador de sesión |
| 7 | **Vigilancia de mediciones caducadas** (BodyLab → TrainingLab) | Nuestra propia tesis de producto (ciclo cerrado) | **CONSTRUIR (siguiente)** | S | Comparar fechas; el valor es el aviso cruzado, no el cálculo |
| 8 | **Tipos de serie** (calentamiento/dropset/al fallo) | US, recurrente | **MEDIR ANTES** | M | Toca el modelo de datos, el export y el volumen: hacerlo sin tipos de calentamiento primero duplicaría trabajo |
| 9 | **Superseries / circuitos** | US, recurrente | **MEDIR ANTES** | M | El planificador tendría que razonar pares de ejercicios; valor real discutible para 90 min en casa |
| 10 | **Landmarks de volumen (MEV/MAV/MRV) como regla dura** | Popular pero criticado en la propia comunidad | **NO como regla; SÍ como educación con fuente** | S | Una app que "receta" por MRV se equivoca con seguridad para algunos usuarios |
| 11 | **Análisis de asimetría accionable** (trabajo unilateral correctivo) | Evidencia de fuerza, poco explorado por las apps | **CONSTRUIR (fase siguiente)** | M | Requiere umbral + aviso anti-error-de-cinta (si el desvío es grande, primero re-medir) |
| 12 | **Backups rotativos + verificación del export** | Riesgo real del local-first | **CONSTRUIR (fase siguiente)** | M | File System Access API + reabrir el propio export en un sandbox |
| 13 | **Feed social, cuentas en la nube, wearables** | Motor de crecimiento de Hevy | **NO** | — | Contradice el modelo: sin cuentas, sin telemetría, LAN de casa |
| 14 | **GIFs de bancos con licencia comercial restringida** | — | **NO** | — | Riesgo legal que tú mismo señalaste; lo sustituye el dibujo propio |
| 15 | **Nutrición / NutriLab** | — | **NO POR AHORA** | XL | Fase F congelada; ya está en el ROADMAP |

## 6. Qué se construye en esta etapa (y por qué en este orden)

1. **Demo de técnica + esfuerzo/técnica explicados** — es lo que pediste, y la
   evidencia dice que es el estándar de la categoría en China y el vacío que los
   usuarios de EE. UU. notan. Se resuelve **dibujando nosotros** la mecánica.
2. **Catálogo ampliado a ~140 ejercicios** — sin catálogo no hay plan honesto para
   quien entrena en casa, y el catálogo es la fuente de verdad de todo lo demás.
3. **Pack del LLM local** — se **genera** desde el catálogo, así que va después de
   ampliarlo; hacerlo antes significaría regenerarlo dos veces.

Las features 5–7 quedan listas para la siguiente etapa; 8–9 necesitan una decisión
de producto antes de tocar el modelo de datos; 10 se queda como educación.

---

## Fuentes

- Keep (CN): <https://apps.apple.com/cn/app/keep-ai-%E8%BF%90%E5%8A%A8%E6%95%99%E7%BB%83/id952694580> · análisis de producto con el detalle de "GIF + texto": <https://www.woshipm.com/evaluating/930118.html> · informe de industria: <https://pdf.dfcfw.com/pdf/H3_AP202204011556478581_1.pdf>
- 训记 / SynFit (CN): <https://apps.apple.com/cn/app/%E8%AE%AD%E8%AE%B0-%E8%AE%AD%E7%BB%83%E8%AE%A1%E5%88%92%E4%B8%93%E5%AE%B6/id1464915553> · guía con "volumen = series × peso × reps" y cronómetro por serie: <https://zhuanlan.zhihu.com/p/55318091> · comparativa con Fitbod (RPE, rango de reps, ejercicios propios): <https://www.dealmoon.com/post/1093785>
- Hevy / Strong (US): megahilo de peticiones: <https://www.reddit.com/r/Hevy/comments/ryzrdi/feature_request_megathread/> · calculadora de calentamiento (PRO): <https://www.hevyapp.com/features/warm-up-set-calculator/> · tipos de serie y superseries: <https://play.google.com/store/apps/details?id=com.hevy>
- Volumen (US): RP sobre landmarks: <https://rpstrength.com/blogs/articles/training-volume-landmarks-muscle-growth> · crítica de la progresión MEV→MRV: <https://www.reddit.com/r/weightroom/comments/mgvybk/detecting_and_responding_to_mrv_advanced/>
- Assets: free-exercise-db (dominio público, verificado): <https://github.com/yuhonas/free-exercise-db> · wger: <https://wger.de> · ExerciseDB/WorkoutX (restrictiva): <https://workoutxapp.com/>
- LLM local: app iOS con Qwen3 en dispositivo y GBNF por tarea: <https://www.reddit.com/r/LocalLLM/comments/1w5p4fc/shipped_an_ios_app_that_runs_qwen3_fully_ondevice/> · composición de gramáticas en llama-server: <https://github.com/ggml-org/llama.cpp/discussions/22408> · GGUF de Qwen3.5-4B: <https://huggingface.co/unsloth/Qwen3.5-4B-MTP-GGUF>

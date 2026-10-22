# Media de ejercicios — fuentes, licencias y por qué dibujamos

**Fecha:** 2026-10-21 · **Estado:** decisión tomada, verificada contra el catálogo real
**Pregunta del dueño:** ¿se pueden usar los modelos de IA actuales (o pipelines de
superpíxeles) para generar las imágenes de referencia de los ejercicios?

## Respuesta corta

**No como referencia técnica.** Un modelo pose-condicionado produce una imagen
bonita cuya postura *se parece* a la pedida; no garantiza la flexión de rodilla,
el apoyo ni el ángulo de la cadera. Y un pipeline de superpíxeles (SLIC → SVG)
reconstruye *lo que hay en la foto*, incluidos sus errores, no lo que debería
haber. La autoridad de una referencia de ejercicio tiene que ser la **pose**, no
el render. Por eso la app sigue usando el rig vectorial determinista que ya
existe (`bodylab/core/exercises/src/demo.ts`): ángulos explícitos, sin licencia,
sin archivos y — lo importante — corregible a mano.

La IA sí sirve para *decorar* una pose ya aprobada. Nada de eso se ha
empaquetado todavía, y no hace falta para cerrar la cobertura actual.

## 1. Qué hay hoy en el binario

| Pieza | Cantidad | Origen | Licencia |
|---|---|---|---|
| GIFs de animación | 36 | Gym Visual, vía `hasaneyldrm/exercises-dataset` | © Gym Visual, redistribuido **con permiso**, 180×180 (ver `public/exercises/NOTICE.md`) |
| Stills de referencia (inicio/fin) | 84 | `yuhonas/free-exercise-db` | **Unlicense** (dominio público) |
| Figuras dibujadas (fallback) | 152 | propias, `demo.ts` | ninguna: es nuestro código |
| Entradas en `asset-manifest.json` | 115 de 152 ejercicios | — | — |

Los 37 ejercicios sin media **no** se quedan en blanco: cada uno resuelve una
figura por patrón de movimiento (29 patrones) y, cuando el patrón dibujaría algo
que no es el ejercicio, una figura propia por id (`EXERCISE_DEMOS`, hoy solo
`table-row`).

## 2. ¿Hay más imágenes que podamos empaquetar legalmente?

Comprobado hoy descargando el dataset real (`dist/exercises.json`, **876
entradas**, dos JPG por ejercicio) y cruzando nombres contra los 37 ids sin
media:

```
sumo squat 0 · clamshell 0 · fire hydrant 0 · nordic 0 · copenhagen 0
hollow 0 · bulgarian 0 · pike push 0 · diamond 0 · burpee 0 · jump rope 0
tibialis → solo "Anterior Tibialis-SMR" y "Posterior Tibialis Stretch"
```

**La fuente segura está agotada por nombre.** free-exercise-db no tiene esos
ejercicios, y el NOTICE fija la regla correcta: solo emparejamiento por nombre
exacto, porque una foto equivocada es peor que ninguna. Subir una foto de "algo
parecido" rompería esa regla.

El resto del mercado, revisado con sus licencias:

| Fuente | Licencia | ¿Archivos dentro de este repo? |
|---|---|---|
| [free-exercise-db](https://github.com/yuhonas/free-exercise-db) | Unlicense | **Sí** (es la que usamos) |
| [wger](https://wger.de/api/v2/exerciseimage/) | CC BY-SA 3.0 / 4.0 **por imagen** | Sí, solo archivo por archivo, con atribución y share-alike; un mantenedor advierte que parte del material necesita auditoría ([issue 2196](https://github.com/wger-project/wger/issues/2196)) |
| [ExerciseDB](https://exercisedb.io/terms) | comercial propia | **No** para publicar archivos crudos; sí para empacar dentro del binario bajo su licencia |
| [RepDB](https://github.com/RepDB/exercise-dataset/blob/main/LICENSE-DATA.md) | "Free Tier" propia | **No**: prohíbe republicar el dataset |
| Human3.6M / Fit3D / M3GYM / AthletePose3D | solo investigación | **No** |

Conclusión: no hay una fuente CC0 nueva y mejor que la que ya usamos. El hueco de
37 ejercicios solo se cierra **dibujando**.

## 3. ¿Y con IA?

Lo que dicen las fuentes, no la intuición:

- **Difusión condicionada por pose** (ControlNet OpenPose [paper](https://arxiv.org/abs/2302.05543),
  [modelo](https://huggingface.co/lllyasviel/sd-controlnet-openpose)): la pose es
  una *condición*, no una garantía geométrica. Los propios autores de
  [From Text to Pose to Image](https://arxiv.org/html/2411.12872v1) escriben que
  las poses **nunca** se igualan perfectamente; [Buchheim et al. (WACV 2025)](https://arxiv.org/html/2411.04724)
  añade que una pose 2D tiene ambigüedad de profundidad y no controla la forma
  del cuerpo. [ControlPose (CVPR 2026)](https://cvpr.thecvf.com/virtual/2026/poster/40888)
  confirma que el problema sigue abierto.
- **Superpíxeles → SVG**: [SuperSVG (CVPR 2024)](https://arxiv.org/html/2406.09794v1)
  usa SLIC + DiffVG para vectorizar de forma general. Reconstruye la imagen; no
  identifica articulaciones. La [documentación de scikit-image](https://scikit-image.org/docs/0.25.x/auto_examples/segmentation/plot_segmentations.html)
  lo dice sin rodeos: SLIC y watershed agrupan color y posición, no anatomía.
  Además los pesos de SuperSVG no tienen licencia verificable → no empaquetables.
- **Pose → SVG determinista**: [MediaPipe Pose Landmarker](https://developers.google.com/edge/mediapipe/solutions/vision/pose_landmarker)
  da 33 landmarks y su bundle `.task` está bajo Apache 2.0 según
  [este hilo](https://github.com/google-ai-edge/mediapipe/issues/6306). Es la
  vía honesta si algún día queremos *derivar* poses de vídeo propio: detector →
  revisión humana de los puntos → renderer. [Pose Animator](https://github.com/yemount/pose-animator)
  documenta el límite del rigging SVG (pérdida de volumen al doblar
  articulaciones), que es justo lo que el rig actual evita al ser esquemático.
- **Vectorizadores**: [VTracer](https://github.com/visioncortex/vtracer) es MIT;
  [Potrace](https://potrace.sourceforge.net/) es GPLv2 (copyleft al redistribuir
  el programa). Ninguno de los dos corrige una pose mal hecha.

### Decisión

1. **La referencia autoritativa es el rig.** Ángulos explícitos, dos keyframes,
   `watch` para señalar la articulación que trabaja. Un render es reproducible y
   se audita leyendo cinco números.
2. **No se empaqueta arte generado** como referencia de técnica: no se puede
   verificar contra nada y mete una licencia de modelo en un repo abierto.
3. Si en el futuro se usa IA, será solo para **estilizar una pose ya corregida a
   mano**, nunca para decidirla, y el archivo resultante se marcará como
   ilustración, no como fotografía de referencia.
4. Donde el patrón dibujaría algo que no es el ejercicio, se añade una figura
   por id en `EXERCISE_DEMOS` — pequeña, revisada a ojo, y con el comentario de
   qué se está viendo.

## 4. Lo que sí se hizo en esta ronda

- Cues de técnica específicos (con lo que dicen las fuentes: ángulos, errores
  que mueven el riesgo, progresión) para los ejercicios que no tienen ni GIF ni
  foto: el tutorial deja de ser genérico del patrón justo donde no hay imagen
  que mirar.
- El tutorial de sesión muestra la **preparación** antes de la ejecución, que
  era el único bloque del dato que la pantalla rápida no enseñaba.

## Fuentes de técnica usadas en los cues

ACE, NASM, ExRx, Strength & Conditioning Journal y PMC (los enlaces concretos
están en el comentario de cada entrada de `technique.ts`).

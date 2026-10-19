# `mockup/` — las 8 pantallas aprobadas, replicadas

Réplica **estática y navegable** de los mockups que aprobaste. Esto no es la app
y no toca IndexedDB ni el store: es el diseño, ejecutado, para poder juzgarlo con
el ratón antes de invertir una línea en la app.

La autoridad de diseño sigue siendo
[`../docs/REDESIGN_STORM.md`](../docs/REDESIGN_STORM.md). Esta carpeta es la
traducción de ese documento a pantallas reales.

## Verlo

```bash
cd fitness-ecosystem
node mockup/tools/serve.mjs            # → http://127.0.0.1:8123
```

Hace falta un servidor HTTP: las páginas leen `data/catalog.json` y
`assets/media/manifest.json`, y `file://` lo prohíbe.

Comprobación automática de las 10 páginas — consola, peticiones, desbordamiento
horizontal, imágenes rotas, textos esperados, **y comportamiento**: abre el
modal, lo cierra y comprueba que cada pestaña deja visible exactamente un panel:

```bash
node mockup/tools/verify.mjs --shots    # deja los PNG en mockup/shots/
```

También hay rutas para revisar sin clics: `?modal=crear` abre el alta de
ejercicio propio directamente.

## Las páginas

| #   | Archivo                                          | Qué resuelve                                                                                                                                                                                                                                                            |
| --- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —   | [`index.html`](index.html)                       | Hub con el índice y las reglas de lectura                                                                                                                                                                                                                               |
| 01  | [`01-hoy.html`](01-hoy.html)                     | **Prioridad 1:1.** Qué toca hoy: los 6 ejercicios con nombre, músculos, series, reps, RIR y descanso; el equipo necesario en chips; resumen rápido; progreso; la semana; el coach y la regla que usó                                                                    |
| 02  | [`03-sesion.html`](03-sesion.html)               | Sesión en vivo (ZEN). GIF **siempre** visible; peso y reps por teclado _y_ con − / +; registro de series **debajo** y a tamaño legible; lateral solo recomendación + guía; «Siguiente» y el orden del resto, reordenable; el mismo diseño en móvil con teclado numérico |
| 03  | [`02-entrenamiento.html`](02-entrenamiento.html) | Plan del día: arrastrar para ordenar, agrupar por equipamiento (para saber dónde empezar si una máquina está ocupada), subir/bajar/cambiar/quitar, «¿por qué estos?» y **añadir varios** con prescripción común                                                         |
| 04  | [`04-semana.html`](04-semana.html)               | Semana 41 en rejilla de 7 días: mover una sesión **con el ratón**, color por familia con su progreso, volumen estimado, huecos por completar, y el detalle del día (lo hecho, lo previsto, duplicar / copiar semana / marcar descanso)                                  |
| 05  | [`05-ejercicios.html`](05-ejercicios.html)       | Galería **generada desde el catálogo real** (151 ejercicios), con imagen grande, filtros por músculo/patrón/equipo, «sólo lo que puedo hacer con mi equipo», ficha con el «por qué» y los errores reales, y alta de ejercicio propio                                    |
| 06  | [`06-rutinas.html`](06-rutinas.html)             | Rutinas completas (con su semana y su uso inmediato) y planes largos por objetivo, además de crear rutina o plan desde cero                                                                                                                                             |
| 07  | [`07-progreso.html`](07-progreso.html)           | Tu progreso real en una pantalla: cuerpo entero con mapa y anillo, grupos musculares con banda objetivo, récords, evolución de fuerza (e1RM), simetría, adherencia, historial y consejo                                                                                 |
| 08  | [`08-historial.html`](08-historial.html)         | Todo lo entrenado: sesiones por mes, con récords e incompletas marcadas, y el detalle de una sesión con repetir/copiar                                                                                                                                                  |
| 09  | [`09-ajustes.html`](09-ajustes.html)             | Perfil, objetivos, equipo disponible, preferencias, coach local y datos/backup                                                                                                                                                                                          |

## Qué es real y qué es de ejemplo

Regla de esta carpeta: **todo lo enumerable sale del código; sólo las cifras son
de ejemplo.**

| Real                                                                                                                   | De ejemplo                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| La paleta, copiada literal de `traininglab/apps/desktop/src/index.css`                                                 | Todos los números: pesos, series, volúmenes, fechas, porcentajes |
| Los **151 ejercicios**: nombre ES/EN, músculos con intensidad, equipamiento, patrón, categoría                         | Tu historial: no se ha leído ni una fila de tu IndexedDB         |
| El **«por qué»**, los **pasos de ejecución**, los **errores comunes**, la **seguridad** y el **RIR/tempo** de la ficha | La estimación de e1RM y los «récords personales»                 |
| Las **imágenes y GIF** de cada ejercicio (ver abajo)                                                                   | El coach y sus consejos: aquí hay texto fijo, no el modelo       |

`data/catalog.json` no se escribe a mano:

```bash
node mockup/tools/dump-catalog.mjs   # carga el catálogo por el Vite de la app web
```

## Medios: 129 de 151 ejercicios con referencia

Sin referencia no se inventa una figura: la tarjeta lo dice.

| Fuente                    | Cuántos | Qué es                                                                                                                                                   |
| ------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GIF ya limpiados del repo | 36      | `bodylab/apps/web/public/exercises/gifs/`, licencia Gym Visual ya admitida; se **copian**, nunca se re-descargan, para no bifurcar el rastro de licencia |
| Fotos de dominio público  | 83      | `yuhonas/free-exercise-db` (Unlicense), dos fotos por ejercicio                                                                                          |
| Fotos ya limpias del repo | 10      | `public/exercises/images/<id>/N.jpg` del propio BodyLab                                                                                                  |
| **Sin ninguna**           | **22**  | Sobre todo variantes con banda, calistenia rara y cardio de bici/escalera. Se muestran con el estado «Sin referencia»                                    |

**Un demo equivocado es peor que ningún demo.** El emparejamiento por nombre
falló al principio («Barbell Bench Press» → «Alternating Floor Press», puntuación
1.0), así que el script ahora sólo acepta coincidencias por encima de un umbral,
mantiene una tabla de coincidencias **fijadas a mano** (26) y rechaza el resto.
El informe completo está en `data/media-audit.txt`, generado con `--audit`.

```bash
node mockup/tools/fetch-media.mjs --audit   # re-descarga y re-audita
```

Los 22 que faltan se resuelven cuando lleguen **tus** assets, que es el plan que
acordamos: sustituir, no inventar.

## Lo que el mockup ya demuestra (y la app todavía no hace)

Cada punto es una queja tuya, con la pantalla donde queda resuelta:

1. **Ver el ejercicio** — 02 `03-sesion.html`, 05 `05-ejercicios.html`.
2. **Peso a mano o con el ratón** — `03-sesion.html`: escribes el número en el
   campo o usas − / +; flechas arriba/abajo también suman y restan.
3. **Registro de series debajo y más grande** — `03-sesion.html`; el lateral se
   queda sólo con progresión, cues, descanso y resumen.
4. **Saber qué viene después y cambiarlo** — `03-sesion.html` («Siguiente» + la
   lista arrastrable) y `02-entrenamiento.html` (subir/bajar/cambiar).
5. **Saber qué máquinas necesito** — `02-entrenamiento.html`, bloque «Agrupado
   por equipamiento», con el aviso de por dónde empezar si algo está ocupado.
6. **Reorganizar la semana** — `04-semana.html`, arrastrando tarjetas entre días;
   dejar un día vacío es descanso.
7. **Añadir mis propios ejercicios y varios de golpe** — `02-entrenamiento.html`
   (panel «Añadir varios» con series/reps/descanso por adelantado) y
   `05-ejercicios.html` (crear ejercicio propio).
8. **Cambiar entre días para saber qué tocó y qué toca** — `04-semana.html`
   (navegación de semanas + detalle del día con «Antes / Después»).

## Cómo se implementa esto en la app

El mockup está pensado para que el paso siguiente sea mecánico, **una pantalla
por sesión**, en este orden:

1. ✅ `01-hoy.html` → `traininglab/apps/desktop/src/screens/TodayScreen.tsx`.
   Portado (2026-10-11). Es la única pantalla que consumes a diario.
2. ✅ `03-sesion.html` → `features/today/ZenSession.tsx`. Portado (2026-10-11):
   GIF en el escenario, steppers de peso y reps, registro debajo, «Después de
   esta serie» y lateral con progresión y resumen. Lo que **no** se portó, y por
   qué, está en el docstring del módulo: el descanso sigue siendo global (una
   sola cuenta atrás), la lista es saltable pero todavía no arrastrable, y el
   tercer campo del mockup (RIR) es el panel de esfuerzo D/F que ya existía.
3. ✅ `02-entrenamiento.html` → `screens/TrainingScreen.tsx`. Portado (2026-10-18):
   la cola del día con orden propio (subir/bajar + volver al orden del plan),
   cambiar, quitar/saltar, vistas por equipamiento y por músculo, «¿Por qué
   estos?» con las razones del propio plan, y «Añadir varios» con prescripción
   común. Lo que **no** se portó, y por qué, está en el docstring del módulo: el
   selector `Casa · Gym · Parque` (sin modelo de datos), el arrastre real
   (botones en su lugar) y «Desde mi rutina» (Rutinas sigue en marcador).
4. ⏳ `04-semana.html` → `screens/WeekScreen.tsx` (ya operativo desde antes; el
   mockup añade arrastrar sesiones entre días).
5. ⏳ El resto: `06-rutinas.html` es el único destino que sigue en marcador.

Al conectar cada una: leer del store real, escribir por los reducers reales, y
**nada del mockup es fuente de datos**. Los `data-media="<id>"` que ves en el
HTML son exactamente la llamada que la app ya sabe hacer
(`features/today/ExerciseDemo.tsx`): GIF → foto → figura dibujada.

## Herramientas

| Archivo                  | Para qué                                                                                                                                  |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `tools/dump-catalog.mjs` | Catálogo real + técnica → `data/catalog.json` (usa el Vite de la app, así que los alias `@fitness/*` resuelven igual)                     |
| `tools/fetch-media.mjs`  | Referencia de todos los ejercicios + informe honesto de cobertura                                                                         |
| `tools/probe-source.mjs` | Lista nombres del índice público por patrón, para fijar a mano una coincidencia (necesita `.tmp-mock/fedb.json`)                          |
| `tools/serve.mjs`        | Servidor estático sin dependencias                                                                                                        |
| `tools/verify.mjs`       | Chromium real sobre las 10 páginas: consola, peticiones, desbordamiento, imágenes rotas, textos y el comportamiento de modales y pestañas |
| `css/tl.css`             | El sistema: tokens reales + componentes                                                                                                   |
| `js/tl.js`               | Iconos, rail, pestañas, arrastrar y soltar, steppers y el teclado numérico                                                                |

### Dos trampas que ya costaron tiempo aquí

- **`1fr` con un control de formulario dentro desborda la tarjeta.** La anchura
  intrínseca de un `<input>` son ~20 caracteres, y `1fr` es `minmax(auto, 1fr)`,
  así que ese mínimo manda. Todas las columnas con inputs usan `minmax(0, …)`.
- **`object-fit: cover` recorta el GIF.** Los GIF limpiados son cuadrados
  (180×180); al llenar un marco 16:9 se le cortan brazos y cabeza al movimiento
  que estás mirando para corregir la técnica. Los marcos grandes van con
  `contain`; sólo las miniaturas recortan.
- **Un icono sin tamaño propio se estira hasta llenar lo que lo contiene.** Los
  `<i data-icon>` se sustituyen por SVG en `js/tl.js`; mientras un contexto no
  fije el ancho, un SVG sin atributos de tamaño toma el 100 % del contenedor. El
  2026-10-11 aparecieron un chevron de **663 px** y tres iconos más de 100 px —
  `css/tl.css` define ahora `.icon { width: 18px; height: 18px; flex: none }`
  como suelo del sistema, y `tools/verify.mjs` **falla** si algún icono supera
  40 px, así que el defecto no puede volver en silencio.

# Decisiones de la ronda — 2026-10-19

Este documento fija las decisiones que la implementación de hoy aplica. No sustituye a
`REDESIGN_STORM.md` (autoridad de diseño) ni a `MCP_TOOL_SURFACE.md` (autoridad de la
superficie de agentes); las actualiza donde la evidencia cambió.

## 1. Navegación móvil

Medición de partida, en el build servido a 390 px: el raíl superior tiene **995 px** de
contenido frente a 390 visibles (2,55 pantallas), los ocho destinos ocupan 921 px y cada
pestaña mide entre 80 y 147 px de ancho por **41 px de alto**. El alto ya incumplía el
mínimo táctil de 44 px.

| Opción | Sin deslizar | Nombre legible | 44 px | Un toque | Alcance del pulgar | Coste |
|---|---|---|---|---|---|---|
| A. Etiquetas completas + scroll horizontal (actual) | No | Sí | No (41 px) | Sí | Malo | — |
| B. Activa con texto, resto iconos, misma barra superior | No (8 iconos ≈ 444 px) | Solo la activa | Sí | Sí | Malo | Bajo |
| C. Barra inferior con 8 iconos | **No** (8 × 44 + huecos ≈ 368 px; no cabe con marca ni etiquetas) | No | Sí | Sí | Bueno | Medio |
| **D. Barra inferior con 4 destinos + «Más»** | **Sí** | **Sí (la activa)** | **Sí (56 px)** | **Sí** | **Bueno** | **Medio** |

**Decisión: D.** Cuatro destinos primarios —Hoy, Entrenamiento, Historial, Progreso— y un
quinto control «Más» que abre una hoja con Ejercicios, Semana, Rutinas y Configuración. La
pestaña activa muestra su nombre; las inactivas, solo el icono. Cuando la ruta activa es
secundaria, el control «Más» adopta su icono y su nombre, de modo que la pestaña activa
siempre se puede leer. La barra tiene cinco columnas iguales (sin desplazamiento de
objetivos al navegar) y 56 px de alto. El raíl de escritorio (≥900 px) no cambia.

Por qué no B: con objetivos de 44 px, ocho iconos no caben en 390 px (y menos en 360), así
que seguiría deslizando; además el nombre solo aparece *después* de navegar, cuando el
icono ya no necesita explicación.

Por qué no C: ocho destinos a 44 px caben justos en 390 pero no en 360, y no dejan sitio
para la etiqueta activa ni para la marca. La hoja «Más» conserva el nombre visible antes
de entrar, que es el valor real de la etiqueta.

## 2. Arrastre en Entrenamiento y Semana

| Opción | Ratón | Táctil | Teclado | Dependencia | Riesgo |
|---|---|---|---|---|---|
| HTML5 drag-and-drop | Sí | **No** en iOS/Android | No | Ninguna | Alto: no cumple el caso real (iPhone) |
| Librería (dnd-kit, react-beautiful-dnd) | Sí | Sí | Parcial | Nueva dependencia | Bundle, API y mantenimiento |
| **Pointer Events + asa + teclado** | **Sí** | **Sí** | **Sí** | **Ninguna** | **Bajo** |

**Decisión: Pointer Events con un asa explícita.** El asa (`grip`) es el único punto que
inicia el arrastre, así que la lista sigue desplazándose con el dedo. Se usa
`elementFromPoint` para resolver el destino, se reordena en local durante el gesto y se
confirma una sola vez al soltar (una escritura, no una por píxel). Se conservan los
botones subir/bajar como camino accesible y se añade una región `aria-live` que anuncia la
posición. En Semana, soltar un día sobre otro **intercambia** sus planes efectivos (si el
destino es descanso, la sesión se mueve y el origen queda en descanso): es la operación que
el usuario describe como «mover la sesión», y se guarda en `weekOverrides` para sobrevivir
a una regeneración.

## 3. Cobertura MCP

Regla del dueño (2026-10-19): **lo que se puede hacer en la interfaz se puede pedir por
MCP**, con las mismas reglas, recibo e idempotencia. Esta ronda cierra las acciones que la
nueva interfaz introduce y las que ya existían sin canal:

| Acción de interfaz | Herramienta MCP | Estado |
|---|---|---|
| Reordenar la cola de hoy | `reorder_today` | Nueva |
| Saltar / restaurar / posponer un ejercicio | `set_exercise_state` | Nueva |
| Volver al orden del plan | `reset_today_order` | Nueva |
| Intercambiar dos días de la semana | `swap_week_days` | Nueva |
| Regenerar la semana | `regenerate_week` | Nueva |
| Registrar, cerrar, readiness, plan, swaps, borrar sesión, hora | las 10 existentes | Ya cubiertas |
| Crear / editar rutinas, exportar, idioma, sonido | pendientes | Documentadas como hueco |

El canal no gana una segunda implementación: cada acción valida contra el contexto que la
app publica y se aplica con el callback del store que ya usa la pantalla.

## 4. Fuera de alcance (sugerencias registradas)

- **STT durante el entrenamiento**: el dueño lo plantea como sugerencia, no como orden. Se
  deja documentado en el backlog; no se añade dependencia ni modelo en esta ronda. Cualquier
  elección futura debe medir latencia, idioma (ES/EN), consumo y privacidad antes de entrar.
- **Telemetría durable**, **mapa de fuerza con referencia publicada** y **GIFs propios**:
  siguen bajo sus gates de evidencia/contenido; no se tocan aquí.

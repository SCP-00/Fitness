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
| Regenerar la semana | `regenerate_week` | Nueva (2.ª ronda) |
| Deshacer una acción propia | `undo_action` | Nueva (2.ª ronda) |
| Crear / verter / borrar rutinas | `save_routine` / `apply_routine` / `delete_routine` | Nuevas (2.ª ronda) |
| Idioma, sonido, reiniciar modelo | `set_language` / `set_sound` / `reset_decision_model` | Nuevas (2.ª ronda) |
| Registrar, cerrar, readiness, plan, swaps, borrar sesión, hora | las 10 existentes | Ya cubiertas |
| Exportar / importar datos | — | Abierto a propósito: exportar es un diálogo de guardado del usuario; importar reemplaza la BD entera sin frontera de deshacer segura |

El canal no gana una segunda implementación: cada acción valida contra el contexto que la
app publica y se aplica con el callback del store que ya usa la pantalla. En la 2.ª ronda
la regla se hizo literal con `applyUndoOp`: el deshacer del agente y el botón *Deshacer*
de Ajustes ejecutan **el mismo código**, o los dos caminos divergirían hasta ser dos apps.

## 4. STT durante el entrenamiento — cuadro de decisión (sugerencia del dueño, deferred)

El dueño lo plantea como **sugerencia**: feedback por voz durante la sesión sin detenerse a
teclear, con algo «súper ligero como whisper turbo o variante ultra ligera, alta calidad en
EN y ES». Evaluado el 2026-10-19; **deferred** — no se añade dependencia ni modelo en esta
ronda, pero el camino queda fijado para que la implementación futura no reabra lo decided.

| Opción | Tamaño | Latencia | ES + EN | Privacidad (offline) | Integración en el stack actual | Veredicto |
|---|---|---|---|---|---|---|
| **A. Web Speech API del navegador** | 0 | ~1 s | Depende del SO/servicio | **No**: en Chrome/Safari la audio sale del dispositivo | Un `<input speech>`; sin Tauri | **Descartada** — viola el «100 % offline, sin telemetry» del producto |
| **B. whisper.cpp con modelo `tiny`/`base` int8, vía WASM (whisper.wasm) o binario lateral del Tauri shell** | tiny ≈ 75 MB, base ≈ 145 MB descargados una vez | 0,3–1 s por fragmento de 1–3 s (no streaming real: transcribe por ventanas) | **Ambos, con `multilingual`**; `base` es usable para ES ruidoso de gimnasio | **Sí**: el modelo vive en disco y nada sale | Un worker WASM + un comando Rust de apoyo; sin tocar el canal MCP | **Elegida como primera opción** — es el «whisper ligero» que pidió el dueño |
| **C. whisper.cpp con modelo `small` int8** | ≈ 240 MB | 0,5–1,5 s | Mejor que `base` en ruido | Sí | Igual que B | Reserva: si `base` falla con el ruido real del dueño |
| **D. Vosk / sherpa-onnx (modelos-streaming propios)** | 30–50 MB | **< 300 ms, streaming real** | Modelos ES/EN separados, peor en acentos LatAm | Sí | Dos integraciones distintas por idioma | Descartada por ahora: más piezas, peor ES, sin ganancia que justifique dos modelos |
| **E. Whisper en la nube (API)** | 0 | ~1 s | Excelente | **No**: la audio sube | Clave API, red, coste | **Descartada** — contrario al modelo de privacidad del ecosistema |

**Decisión: B**, con estas condiciones fijas (para que la implementación futura no negocie
de nuevo):

1. **Opt-in explícito y descarga bajo control del usuario.** El modelo se descarga la
   primera vez que activa la función, con tamaño y hash a la vista; sin descarga no hay
   botón. Nada se pre-descarga en la instalación (la app pesa 14,6 MiB hoy; 75 MB no
   viajan sin pedirlos).
2. **100 % local, siempre.** Un worker WASM con `Proxyquire`/fetch del modelo desde
   `asset://` o un comando Rust estrecho tipo `read_model`; ningún `fetch` a internet en
   el camino. El gate de privacidad de `REDESIGN_STORM.md` §8 se cumple por
   construcción.
3. **El STT escribe *hechos*, no decisiones.** Lo transcrito entra como `notes` de una
   serie vía `log_training_set` (o como feedback del día en readiness), nunca como
   cambio de plan: el modelo propone, la app dispone — también con la voz.
4. **Latencia objetivo y medición antes de prometer**: ≤ 1 s de la última palabra al
   texto en el hardware del dueño, medido con el modelo `base` sobre audio con ruido
   de gimnasio. Si `base` no llega, se prueba `small` (opción C) antes que aceptar
   latencias de streaming rotas.
5. **Detección automática de idioma** (`language: "auto"`): el dueño entrena con
   podcasts y apps en EN y ES; un selector manual sería una decisión que la voz ya
   respondió.

Por qué no A: la Web Speech API del navegador envía el audio a servidores del proveedor
en los dos motores que la app empaqueta (WebView2 de Chromium la resuelve en la nube,
Safari en la de Apple). Es la primera cosa que este producto no puede tener.

Por qué no D primero: streaming real suena mejor, pero exige dos modelos (uno por
idioma), integraciones distintas y una calidad de ES que ningún modelo abierto ligero
iguala a whisper. Si la medición de B falla, D vuelve a la mesa con datos.

## 5. Fuera de alcance (sugerencias registradas)

- **Telemetría durable**, **mapa de fuerza con referencia publicada** y **GIFs propios**:
  siguen bajo sus gates de evidencia/contenido; no se tocan aquí.
- El STT queda en **deferred con decisión B fijada** (arriba): no es «no», es «cuando la
  ronda lo permita, por este camino».

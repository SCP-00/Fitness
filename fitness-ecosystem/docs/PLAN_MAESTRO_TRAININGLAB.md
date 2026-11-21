# TrainingLab Unificado

Plan maestro aprobado el 20 de noviembre de 2026. Línea base del repositorio: `8b2f103`.

TrainingLab será la aplicación gratuita, local y sin cuenta para el practicante individual en Windows, con registro cómodo desde el teléfono. Permitirá planificar, entrenar, tomar medidas y revisar rendimiento en un mismo perfil. BodyLab podrá retirarse tras demostrar paridad, migración y recuperación. Se conserva `com.traininglab.desktop`.

La primera entrega vertical usa ocho semanas de ejemplo. Registrar la cintura con coma decimal, abrir una rutina, ver la última carga, aceptar o editar la sugerencia, registrar y corregir una serie, cerrar la sesión, reiniciar y encontrar las dos series de datos en Progreso. En una instalación nueva, Entrenar ahora, Crear mi rutina e Importar historial tienen acceso directo. Medidas y coach se configuran cuando el usuario lo decida.

## Tablero

| ID | Estado | Responsable | Depende de | Evidencia de cierre |
| --- | --- | --- | --- | --- |
| T00 | En curso | Coordinación y QA | — | Matriz de funciones, datos y pruebas. Línea base de tiempos, accesibilidad e instaladores. |
| T01 | En curso | Datos | T00 | Exportador de transición, copia unificada versionada, vista previa, conflictos y restauración. |
| T02 | En curso | Antropometría | T00 | Catálogo por unidad, protocolo, fuente, población y casos de referencia comprobados. |
| T03 | En curso | Frontend | T00 | Hoy, Sesión y Progreso navegables con estados vacíos, normales y densos. |
| T04 | En curso | Registro y progresión | T01–T03 | Recorrido vertical con copia, explicación de carga, edición, descanso y reinicio. |
| T05 | Pendiente | Antropometría y frontend | T04 | Paridad verificable para todas las filas de BodyLab. |
| T06 | En curso | Biblioteca visual | T00 | Hoja maestra y tres pilotos. Tras aprobación, lotes con revisión y manifiesto comprobado. |
| T07 | Pendiente | Modelos locales | T04 | Cola cancelable, resúmenes opcionales, matriz de evaluación y degradación sin servidor. |
| T08 | Pendiente | QA | T05–T07 | Ensayo de migración, usuarios, accesibilidad, PC, iPhone físico e instaladores. |
| T09 | Pendiente | Distribución | T08 | Descarga principal TrainingLab y recuperación de versiones antiguas. |
| X01 | Opcional | Investigación visual | T06 | Comparativa aislada del 3D con ilustraciones. |

Después de T00, datos, diseño, antropometría y biblioteca pueden avanzar en paralelo. Integrar primero una medida, su persistencia y una sola pantalla. Mantener las pruebas e imágenes de cada ronda en el relevo. La paridad y la publicación se revisan con el dueño.

## T00.1 · Matriz de conservación

Evidencia inicial revisada en `bodylab/apps/web/src/lib/db.ts`, `pages/ExportImport.tsx`, `lib/traininglab-export.ts`, `traininglab/apps/desktop/src/lib/db.ts` y `lib/backup.ts`. La columna de comprobación describe el ensayo pendiente con datos sintéticos en ambos orígenes.

| Origen | Entidad y almacenamiento actual | Cobertura de formatos actuales | Comprobación tras restaurar |
| --- | --- | --- | --- |
| BodyLab | Perfil en `profile`, edad heredada migrable | .bodylab y perfil parcial en enlace | Comparar fecha de nacimiento, estatura, sexo, preferencias y campos opcionales por nombre y tipo. |
| BodyLab | Medidas históricas en `measurements` | .bodylab, JSON/CSV según formato y enlace v2 | Comparar UUID, fecha, valor, unidad, lado y metadatos de origen. |
| BodyLab | Instantáneas en `snapshots` | .bodylab; el enlace aporta resultados derivados | Abrir una comparación histórica y comparar todos los campos de la instantánea original. |
| BodyLab | Series en `exerciseSets` | Enlace v2 con historial; .bodylab omite el almacén | Comparar UUID, variante, carga, repeticiones, fechas y metadatos de cada serie. |
| BodyLab | Esfuerzos máximos en `maxEfforts` | .bodylab omite el almacén; un PR derivado en el enlace no equivale al registro original | Comparar identificador de ejercicio y todos los campos del esfuerzo original. |
| BodyLab | Metadatos y ajustes en IndexedDB, tema/onboarding y borrador guiado en localStorage | Metadatos de exportación en .bodylab; borrador y ajustes de interfaz requieren tratamiento explícito | Recuperar idioma, referencia y preferencias equivalentes. Decidir cómo reanudar el borrador y mostrarlo en la vista previa. |
| TrainingLab | Series y sesiones en sus almacenes IndexedDB | Backup v1; CSV/Symmetry como formatos de log | Comparar los campos originales y los vínculos entre series y sesiones. Reimportar sin duplicar. |
| TrainingLab | Ajustes, rutinas, equipo y modelo de decisión en `meta` | Backup v1 incluye ajustes y estado del modelo | Abrir la rutina y el perfil de equipo activos y comparar preferencias y modelo. |
| TrainingLab | Registros de salud en `meta` | `health` en backup v1 | Comparar valores, fechas y unidades, preservando registros antiguos. |
| TrainingLab | Payload BodyLab, readiness y ledger MCP en `meta` | Payload y ledger ausentes del backup v1; readiness puede aparecer en espejo opcional de copia automática | Recuperar el contexto del enlace y del día. Verificar que una importación no ejecute acciones del ledger. |
| TrainingLab | Marcador de onboarding; historial compartido opcional en SQLite LAN | El backup local representa el dispositivo | Restaurar el perfil local; verificar por separado los datos del servidor LAN. |

| Capacidad actual | Destino en TrainingLab | Prueba de paridad |
| --- | --- | --- |
| BodyLab Inicio | Hoy y Progreso | Perfil vacío, parcial y completo con valores trazables. |
| BodyLab Medir | Progreso → Medir | Guardar una medida, corregirla y reanudar una sesión guiada. |
| BodyLab Historial | Progreso → Medidas | Filtrar y comparar medidas de dos fechas o lados. |
| BodyLab Cuerpo | Progreso 2D y Ejercicios | Consultar región, fuente de color y técnica. |
| BodyLab Progreso | Progreso | Historial, tendencias, instantáneas y comparación A/B. |
| BodyLab Referencias | Progreso → Referencias | Elegir referencia y mostrar fórmula, población y entradas aplicables. |
| BodyLab Datos | Ajustes → Datos | Matriz de formatos, previsualización, restauración y exportación. |
| BodyLab Configuración | Ajustes | Preferencias, idioma, unidades y controles de datos. |
| Tauri, web, LAN y Pages | Entradas del producto y transición | Rutas válidas desde su base real, persistencia por origen y transición accesible. |
| Copias, CLI y MCP | Contratos existentes más adaptadores cuando proceda | Ejecutar fixtures de ida y vuelta y contrastar exposición de datos con permisos efectivos. |

Sembrar dos perfiles de prueba con elementos exclusivos, dos registros iguales, un ID en conflicto y una sesión posiblemente solapada con IDs distintos. Usar UUID fijos y fechas explícitas. Comparar por registro, campo y vínculo, además de contar filas. Los conjuntos personales del repositorio quedan fuera de las fixtures. Quedan por capturar el ensayo completo y la línea base de contraste, tiempos e instaladores.

## Datos y métricas

- Publicar un BodyLab de transición con «Exportar todo para TrainingLab». Conservar lectores .bodylab, enlace v1/v2, backup TrainingLab, JSON/CSV y Symmetry según la compatibilidad de origen. Utilizar copia unificada versionada para perfil, medidas, instantáneas, máximos, log, rutinas, equipo, preferencias, modelo y procedencia.
- Validar vista previa, generar copia previa y aplicar una transacción. Igual ID y contenido se omite. Para distinto contenido, conservar la versión local y resolver explícitamente el conflicto. Avisar de posibles duplicados de procedencia diferente. Entregar recibo con recuento, registros omitidos y límites del formato.
- Comparar copias tras cierre, cuota agotada, archivo incompleto y reintento. Mantener recuperación desde versiones anteriores. Medidas nuevas privadas por defecto en LAN, coach y espejo; compartir requiere selección explícita.
- Reutilizar núcleo antropométrico y protocolos. Mostrar medida vs. estimación, unidades, método y fechas. Comparar solo sitio, lado y método compatibles. Derivar edad de fecha de nacimiento y convertir estatura en la frontera. Conservar datos originales.
- Usar rendimiento reciente, equipo, esfuerzo, recuperación, tiempo y motor determinista para las propuestas. Mantener lastre, asistencia, kilos por mancuerna y variantes diferenciadas. Etiquetar transferencias como estimaciones. Mostrar exposición, objetivos antropométricos y condición física con su propia semántica. Una referencia externa de fuerza requiere fuente aplicable, justificación ejercicio-región y decisión sobre estatura. El prototipo muscular conserva su aprobación independiente.

## Frontend

PC a 1440 × 900: rail plegable, tabla central de series y panel contextual de técnica, sustitutos, historial y explicación. A 1280 × 720 plegar el panel. A 390 × 844 mantener primero el registro y respetar barra inferior y zonas seguras. Mantener foco al editar/deshacer, Enter en el control previsto, Tab ordenado y Esc para cerrar el panel activo. Hoy permite continuar una sesión, Progreso comparte periodo entre medidas, rendimiento y exposición, y Ejercicios/Rutinas reutilizan el selector.

Usar tokens existentes con radios de 10 px para controles, 16 px para tarjetas y 24 px para paneles. Vidrio para navegación y superposiciones, y sólidos para contenido de alta densidad. Alternativa opaca al reducir transparencia o en alto contraste. Probar contraste compuesto, zoom al 200 %, foco visible, movimiento reducido, objetivos táctiles de 44 px y lector de pantalla. GPT Image produce dos direcciones visuales de Sesión con la misma información. Convertir la mejor lectura de carga y siguiente acción en componentes reales y verificar en WebView2.

[Guía de materiales de Apple](https://developer.apple.com/design/human-interface-guidelines/materials) · [WCAG](https://www.w3.org/WAI/WCAG22/quickref/) · [Hevy](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2026-Features-Guide) · [Fitbod](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout)

## GPT Image y biblioteca

Línea base de 152 ejercicios, 115 cubiertos por GIF o imagen, 36 de ellos con GIF. Recalcular por ID antes de cada lote. Conservar el medio existente si corresponde a la variante.

| Lote | IDs |
| --- | --- |
| Piloto (3) | `bird-dog`, `band-row`, `bulgarian-split-squat` |
| Empujes (9) | `push-up-plus`, `pike-push-up`, `diamond-push-up`, `band-chest-press`, `deficit-push-up`, `pseudo-planche-push-up`, `archer-push-up`, `dumbbell-squeeze-press`, `band-overhead-press` |
| Tracción, piernas y cadera (11) | `lying-hip-abduction`, `tibialis-raise`, `sumo-squat`, `banded-hip-abduction`, `clamshells`, `fire-hydrants`, `table-row`, `band-curl`, `prone-y-raise`, `nordic-curl`, `band-lat-pulldown` |
| Tronco (3) | `copenhagen-plank`, `hollow-body-hold`, `hollow-rock` |
| Cardio y circuitos (11) | `mtb-steady-ride`, `mtb-hill-intervals`, `stair-intervals`, `jump-rope-intervals`, `burpee-circuit`, `metcon-circuit`, `shadow-boxing-intervals`, `tabata-bodyweight`, `jump-rope-steady`, `bike-sprint-intervals`, `stair-climb-steady` |

Crear una hoja maestra de un adulto ficticio desde cuatro ángulos con ropa y luz constantes. Usarla como referencia y editar el inicio aprobado para obtener la fase final. A partir del catálogo y de la técnica de la variante, indicar fase, apoyos, agarre, equipo y anclaje, trayectoria, ángulo y error que evitar. Usar dos fases para dinámicos, una postura para isométricos y una secuencia o texto temporal para circuitos e intervalos. Un revisor técnico inspecciona imagen completa y miniatura. Publicar con descripción ES/EN y etiqueta de demostración ilustrada. Consolidar solo imágenes aprobadas en el manifiesto. Mantener referencias de producción y descartes fuera del instalador. Generación únicamente editorial, con coste por ejercicio aprobado, techo de gasto autorizado por lote y parada al agotarlo.

[Guía de edición de imágenes](https://developers.openai.com/api/docs/guides/image-generation)

## Agentes y modelos

Una tarjeta por agente y un responsable por archivo compartido. Usar ramas o worktrees según la tarjeta. El coordinador aprueba cambios de contrato, integra los resultados, reproduce la evidencia y actualiza el tablero. Un segundo revisor comprueba datos y técnica. Tras dos intentos con el mismo fallo, adjuntar la reproducción y el punto de reanudación.

```markdown
### [ ] Txx.n — Resultado observable
- Responsable / revisor:
- Estado:
- Depende de:
- Leer primero / archivos permitidos:
- Entrada de ejemplo y salida esperada:
- Comando y criterio de aceptación:
- Presupuesto:
- Resultado, commit y evidencia:
- Bloqueo / punto de reanudación:
```

Cálculos, guardado y validación deterministas. Modelo local de decisión existente, ajustable y reiniciable. Resumen semanal por modelo pequeño opcional sobre cifras ya calculadas. Coach local con fase de solo lectura y commit restringido a `propose_session`, sujeto a validaciones de equipo, tiempo, vetos y recuperación. Cola de una inferencia simultánea, prioridad a la acción directa, cancelación, timeout, un reintento transitorio y descarte de resultados de una revisión de datos anterior. Diagnóstico local sin medidas ni prompts personales. Evaluar Qwen clase 4B en RTX 3050 Laptop 6 GB y CPU, con versión y cuantización fijas, memoria, latencia y tasa de propuestas válidas. Evaluar equipo limitado, historial vacío, poco tiempo, español, veto, servidor desconectado y salida malformada. Cero escrituras inválidas y registro disponible sin IA.

## X01 · 3D independiente

Probar la técnica de split squat mediante humanoide genérico con licencia de redistribución, exportación GLB desde Blender y carga bajo demanda. Incluir pausa, teclado, imagen estática y alternativa a fallo de WebGL. Cinco practicantes comparan el par ilustrado y el 3D en orden alterno. Medir acierto de apoyo, inicio y trayectoria, y tiempo. Solo elevar la integración si mejora la respuesta de al menos tres y el coste de descarga, memoria y render en PC resulta aceptable. La publicación principal usa el 2D.

## Salida y retirada

- [ ] Paridad por capacidad y fixture. Migración de ambas apps, reimportación, conflicto, restauración limpia, campos desconocidos, unidades y coma decimal.
- [ ] `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm audit:css`, `pnpm --filter traininglab-desktop build`, `pnpm --filter web test:e2e:traininglab`, contraste y `node scripts/build-exercise-media-manifest.mjs --check`.
- [ ] Capturas generadas, teclado, zoom, alto contraste, movimiento reducido, lector de pantalla, WebView2 y Safari en iPhone por LAN.
- [ ] Cuatro de cinco practicantes completan cada tarea de rutina, registro, medida y explicación del periodo sin ayuda. Cero registros perdidos.
- [ ] Misma máquina y fixture que la línea base. Arranque en frío, biblioteca, vidrio y respuesta visual al registro p95 menor de 100 ms, con 10 000 series y modelo ocupado. Confirmar guardado tras completar escritura.
- [ ] Dos instaladores Tauri en transición desde el mismo commit, verificar los recursos de `dist/assets`, instalar, completar el recorrido y copiar al escritorio real. Registrar versión, hora, tamaño y hash.
- [ ] Tras T08, actualizar distribución, CI, lanzadores, Pages, LAN y README. Conservar el instalador de transición y la ruta de recuperación.


### Primera entrega incremental

- T01. El archivo de transición de BodyLab se puede revisar e importar como archivo privado. La copia manual de TrainingLab incluye ese archivo y las medidas de cintura. Quedan la incorporación a las funciones activas, los lectores históricos y el recibo de restauración unificada.
- T02/T04. Progreso registra cintura por fecha y sitio anatómico. Conserva el historial al corregir y compara el mismo punto dentro del periodo. El recorrido conjunto con una rutina y el historial de ocho semanas queda pendiente.
- T03. La navegación puede plegarse y usa superficies translúcidas con alternativas opacas de accesibilidad. Queda la disposición final de ZEN y la revisión en dispositivos.
- T06. [Piloto editorial](exercise-media-pilot/README.md) con los tres candidatos y la hoja base. Pendiente de revisión técnica y techo de gasto para la siguiente tanda.

# TrainingLab Unificado · Plan maestro de producto y tablero para agentes

> **Estado de este documento.** Revisión del 2026-11-21 sobre `main`, commit `8b2f103`. Sustituye al tablero del 20 de noviembre; la evidencia de aquella revisión se conserva en el **Anexo** al final.
>
> **Cifras recomprobadas contra el repositorio hoy** (no copiadas): `node scripts/build-exercise-media-manifest.mjs --check` → `manifest is up to date: 115 entries`; **36 GIF** en `traininglab/apps/desktop/public/exercises/gifs/`; los **37 IDs** de la cola de la sección 5 no aparecen en `asset-manifest.json` (comprobado uno a uno). 115 + 37 = 152, coherente con el catálogo declarado.
>
> **Este archivo guarda tareas, dependencias y decisiones. La evidencia numérica de cada ronda va en `AGENT_HANDOFF.md`.**

**Objetivo.** Una persona que instala TrainingLab en Windows puede preparar su semana, registrar una sesión con el teclado, tomar medidas corporales guiadas y entender qué ha cambiado desde el mes pasado. Todo funciona en una sola aplicación gratuita, local y sin cuenta. TrainingLab sustituirá por completo a BodyLab cuando pueda recuperar sus datos y reproducir sus funciones. El teléfono conserva una experiencia cómoda para registrar en el gimnasio.

**La primera entrega que probaría con el dueño** es un recorrido completo con datos de ejemplo de ocho semanas. El usuario registra su cintura, abre su rutina, ve qué hizo la última vez, acepta o corrige la carga sugerida, registra una serie y encuentra ambos cambios en Progreso. Ese recorrido permite juzgar la unificación mucho antes de terminar todas las pantallas.

Las cifras del catálogo proceden del código y el manifiesto de la revisión indicada arriba. Las metas de calidad que siguen son criterios propuestos para las entregas futuras.

## 1. Qué debe ganar la persona que entrena

| Momento | Comportamiento de la aplicación | Cómo se demuestra |
|---|---|---|
| Primera apertura | Ofrece **Entrenar ahora**, **Crear mi rutina** e **Importar historial**. Las medidas y el coach se pueden configurar después. | Una instalación limpia permite registrar la primera serie sin cuenta, conexión ni cuestionario corporal obligatorio. |
| Antes de entrenar | Hoy muestra la sesión, duración prevista, equipo y ajustes por disponibilidad. Cada ejercicio permite consultar su última ejecución y el motivo de la sugerencia. | Cambiar de gimnasio o acortar la sesión produce un plan viable. El historial conserva los valores originales. |
| Durante la sesión | La tabla de series conserva el foco, la última carga, las repeticiones y el descanso. La técnica, los sustitutos y el historial aparecen al lado en PC. | Con la prescripción precargada se registra una serie con una confirmación. Editar, deshacer y continuar funciona íntegramente con teclado. |
| Al medirse | Una guía muestra dónde colocar la cinta o calibre, la postura, la unidad y la última medición comparable. Se puede registrar solo la medida elegida. | Introducir `75,5`, corregir una entrada y recuperar ambas fechas produce el resultado esperado en pantalla, exportación y restauración. |
| Al revisar el mes | Progreso alinea medidas corporales, rendimiento por ejercicio y exposición semanal sobre el mismo periodo. Cada cifra abre sus registros de origen. | La persona puede contestar «¿mejoró mi remo?», «¿cómo cambió mi cintura?» y «¿cuántas semanas entrené?» sin interpretar colores ambiguos. |
| Al cambiar de PC | Una copia local recupera perfil, sesiones, medidas, rutinas, ajustes y procedencia de los datos. | Una instalación limpia restaura la copia y reproduce el historial y los cálculos. |

**Referencia competitiva.** Tomar de Hevy la continuidad entre rutina, registro e historial por ejercicio, y de Fitbod la adaptación al equipo, al tiempo y al rendimiento reciente. El compromiso de TrainingLab será ofrecer historial completo, progresión explicable y antropometría trazable en el mismo escritorio. El criterio de éxito será completar estas tareas con usuarios y datos reales. [Funciones gratuitas y Pro de Hevy](https://help.hevyapp.com/hc/en-us/articles/33106320824727-Everything-You-Need-to-Know-About-the-Hevy-App-2026-Features-Guide) · [Cómo construye la sesión Fitbod](https://help.fitbod.me/hc/en-us/articles/360004429814-How-Fitbod-Creates-Your-Workout)

## 2. Tablero maestro y orden de ejecución

Cada fila comienza pendiente. La casilla se marca al adjuntar el resultado indicado. Los responsables son **roles** que pueden desempeñar agentes pequeños distintos en sesiones sucesivas.

| Hecho | ID | Responsable | Depende de | Entrega verificable |
|---|---|---|---|---|
| [ ] | T00 | Coordinación y QA | — | Inventario «función actual → destino → datos → prueba». Cubrir las ocho páginas de BodyLab, ambas apps de escritorio, web/LAN, importadores, copias, CLI y MCP. Registrar una línea base de accesibilidad, tiempos y tamaño del instalador. |
| [ ] | T01 | Datos | T00 | Contrato de copia unificada, exportador completo de transición para BodyLab, importación con vista previa y prueba de restauración. |
| [ ] | T02 | Antropometría | T00 | Catálogo de medidas y cálculos con unidad, protocolo, fuente, población aplicable, limitaciones y ejemplos de referencia reproducibles. |
| [ ] | T03 | Frontend | T00 | Sistema visual implementado sobre los componentes existentes. Prototipo navegable de Hoy, Sesión y Progreso con datos vacíos, normales y densos. |
| [ ] | T04 | Registro y progresión | T01–T03 | Primer recorrido vertical completo descrito arriba. Incluye explicación de carga, corrección de series, descanso, cierre y recuperación tras reiniciar. |
| [ ] | T05 | Antropometría y frontend | T04 | Paridad de BodyLab en TrainingLab. Medición guiada, comparativas, composición, referencias, evolución, mapa 2D, educación, ajustes e importación/exportación. Cada fila de T00 enlaza su prueba. |
| [ ] | T06 | Biblioteca visual | T00 | Auditoría de cobertura, personaje base y piloto de tres ejercicios. Tras aprobar el piloto, lotes revisados hasta resolver los 37 huecos identificados. |
| [ ] | T07 | Modelos locales | T04 | Coach y resúmenes opcionales, evaluación con casos fijos, cancelación y funcionamiento completo con el servidor del modelo apagado. |
| [ ] | T08 | QA de producto | T05–T07 | Ensayo de migración, pruebas con usuarios, accesibilidad, rendimiento en PC, prueba en iPhone y verificación de instaladores. |
| [ ] | T09 | Distribución | T08 | TrainingLab pasa a ser la descarga principal. Se actualizan instalador, accesos directos, LAN, Pages, README y actualización. Queda publicada una vía para recuperar instalaciones antiguas. |
| [ ] | X01 | Investigación visual | T06 | Evaluación opcional del 3D conforme a la sección 7. Independiente de la publicación de TrainingLab. |

**Trabajo paralelo.** Tras T00 pueden avanzar datos, diseño, antropometría y biblioteca. El coordinador integra primero T01 y una sola medida de T02 con una sola pantalla de T03. Hasta demostrar ese recorrido, los demás agentes trabajan en componentes, pruebas o lotes aislados. Así se descubre pronto si la interfaz muestra un dato que el almacenamiento todavía no puede recuperar.

## 3. Unificación de datos, antropometría y progresión

### Migrar sin perder lo que ya entrenó el usuario

Hay una condición concreta para retirar BodyLab. Su archivo `.bodylab` actual exporta perfil, medidas, instantáneas y metadatos. Su base de datos también contiene series y esfuerzos máximos. El enlace v2 aporta historial de entrenamiento y resultados derivados, y el backup de TrainingLab tiene su propio contrato. **La migración debe probar qué recupera de cada origen.** Las dos aplicaciones tienen identificadores Tauri diferentes. [Exportador actual de BodyLab](bodylab/apps/web/src/pages/ExportImport.tsx) · [Base de datos de BodyLab](bodylab/apps/web/src/lib/db.ts) · [Copia de TrainingLab](traininglab/apps/desktop/src/lib/backup.ts)

1. **Conservar la identidad instalada de TrainingLab**, `com.traininglab.desktop`. Publicar una última versión de transición de BodyLab con «Exportar todo para TrainingLab». Inventariar IndexedDB y preferencias locales antes de diseñar el paquete. El usuario elige el archivo en la nueva app. Este procedimiento también sirve para perfiles de navegador que viven en orígenes distintos.
2. **Versionar la copia unificada** e incluir perfil, medidas e instantáneas completas, series, sesiones, máximos, rutinas, equipo, preferencias, estado del modelo local y los demás datos persistentes detectados en T00. Mantener lectores para `.bodylab`, enlace v1/v2, backup TrainingLab y los importadores JSON/CSV y Symmetry que ya admite cada producto. La vista previa enumera qué aporta el archivo y qué queda fuera de ese formato.
3. **Importar con recibo.** Validar primero, mostrar cantidades y conflictos por entidad, generar copia previa y aplicar la operación de forma atómica. Conservar UUID y procedencia. Un mismo ID y contenido se omite al reimportar. Un mismo ID con contenido diferente conserva la versión local y presenta la otra para resolución explícita. Registros parecidos con IDs distintos aparecen para revisión cuando puedan proceder de la misma sesión importada.
4. **Probar la vuelta completa.** Sembrar ambas apps con datos solapados y exclusivos, migrar, reimportar, reiniciar y restaurar en una instalación limpia. Comparar por ID y campo, además de totales. Simular archivo incompleto, cuota agotada y cierre durante la importación. Mantener disponible el instalador de transición y el historial de origen.
5. **Privacidad de la unificación.** Revisar qué información llega actualmente a la copia automática, al espejo del agente, al coach y al modo LAN compartido. Las medidas corporales nuevas permanecen privadas en el dispositivo por defecto. Ampliar el contenido compartido requiere una selección explícita y visible.

### Qué cálculos llegan a la pantalla

| Dato | Uso en TrainingLab | Regla de implementación |
|---|---|---|
| Peso, perímetros y medidas bilaterales | Último valor, cambio desde la fecha elegida, gráfica e historial con protocolo | Conservar unidad y precisión originales. Comparar el mismo sitio anatómico, lado y método. Situar las mediciones reales en sus fechas. |
| Estatura, cintura y composición estimada | Mostrar indicadores existentes del núcleo que sean aplicables al perfil | Documentar fórmula, entradas, método, fuente y límites. Distinguir valor medido y estimación. Convertir metros y centímetros una sola vez en la frontera de datos. |
| Rendimiento por ejercicio | Última serie comparable, récord y tendencia de 1RM estimado cuando corresponda | Reutilizar la lógica existente. Respetar peso por mancuerna, peso total, asistencia, lastre y peso corporal. Una máquina o variante diferente conserva su identidad. |
| Repeticiones, esfuerzo, equipo y tiempo | Sugerir la siguiente carga o repetición con un motivo breve y editable | Usar el motor de progresión como fuente de decisión. Identificar las transferencias entre ejercicios como estimaciones de entrenador y contrastarlas con el primer registro real. |
| Exposición por grupo muscular | Mostrar series y frecuencia en el periodo elegido | Mantener separadas exposición, objetivos antropométricos y condición física. La evolución de un perímetro por sí sola no permite atribuir un cambio a músculo, grasa o fuerza. |

**Ejemplo de aceptación.** Si la cintura pasa de 84 a 82 cm y el usuario completa más repeticiones de remo con la misma carga, Progreso muestra ambos cambios con sus fechas. La próxima sugerencia de remo cita las series y el esfuerzo que la justifican. Si falta la segunda medición, la tarjeta corporal ofrece «Volver a medir» y la progresión del remo sigue disponible.

**Referencia externa de fuerza.** Conservar abierta la investigación por ejercicio. Para integrar una norma, documentar población, protocolo, unidades, relación defendible con la región corporal y variables admitidas, especialmente estatura. Si la fuente carece de una variable requerida, presentar el límite al dueño. La integración del prototipo muscular conserva su aprobación independiente. [Protocolo antropométrico](ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md) · [Evidencia y límites de las sugerencias actuales](SFR_TRANSFER_EVIDENCE_2026-11-13.md)

## 4. Interfaz de escritorio y dirección de arte

**Diseñar primero la pantalla que se usa con las manos ocupadas.** En una ventana de 1440 × 900, la sesión tendrá navegación lateral plegable, tabla central de ejercicios y series, y panel contextual para técnica, última sesión y explicación de la carga. La acción **Registrar serie** permanece visible. A 1280 × 720 el panel contextual se puede plegar. A 390 × 844 la entrada y la acción principal preceden a la demostración, respetando la navegación inferior existente.

**Maqueta de referencia de esa pantalla (1440 × 900):** `docs/screenshots/plan-sesion-1440.webp`. Llegó adjunta al plan; es la copia re-codificada por la app de chat, no el archivo original del autor.

| Pantalla | Trabajo del agente frontend |
|---|---|
| **Hoy** | Mostrar sesión propuesta, tiempo y una acción principal. Los ajustes del día se abren en un panel. Conservar acceso directo a continuar una sesión interrumpida. |
| **Sesión / ZEN** | Números tabulares para kg, repeticiones y descanso. `Enter` registra desde el control previsto, `Tab` recorre campos en orden y `Esc` cierra el panel activo. Mantener el contexto tras editar o deshacer. |
| **Progreso / Medidas** | Entrada «Medir» desde Progreso y acceso contextual desde Hoy cuando proceda. Selector de periodo compartido. Gráficos con unidad, fecha, datos de origen y alternativa tabular. |
| **Ejercicios y rutinas** | Reutilizar el selector existente. Mostrar equipo, variante exacta, demostración y última sesión. Desde la ficha se puede usar el ejercicio hoy o añadirlo a una rutina. |
| **Semana, historial y ajustes** | Mantener arrastre con alternativa de teclado, filtros e historial por serie. Agrupar copias, migración, privacidad, accesibilidad y coach en ajustes reconocibles. |

**Redondeo y vidrio.** Partir de tres radios en los tokens existentes, 10 px para controles, 16 px para tarjetas y 24 px para paneles flotantes. Reservar el efecto de vidrio para navegación y paneles superpuestos. Usar superficies sólidas debajo de tablas, formularios y gráficos. Definir alternativas opacas para alto contraste, reducción de transparencia y equipos donde el desenfoque afecte al desplazamiento. Probar contraste sobre el fondo compuesto real. Mantener foco visible, objetivos táctiles de 44 px y zoom al 200 %. Estas decisiones aplican la jerarquía visual de los materiales de Apple al entorno Windows y web. [Guía de materiales de Apple](https://developer.apple.com/design/human-interface-guidelines/materials) · [Criterios de accesibilidad WCAG](https://www.w3.org/WAI/WCAG22/quickref/)

**Uso de GPT Image en frontend.** El agente de diseño producirá dos direcciones visuales de la misma pantalla de Sesión, con idénticos datos y jerarquía. Elegirá la que permita leer antes ejercicio, carga y siguiente acción, y traducirá la elegida a componentes reales. GPT Image también puede producir la ilustración de medición o un recurso editorial cuando ayude a completar una tarea. Texto, cifras, botones, gráficos, foco, estados y traducciones se implementan en React/CSS. La aceptación se hace sobre el prototipo navegable y las capturas del ejecutable.

## 5. Biblioteca de ejercicios con GPT Image

**Inventario comprobado.** TrainingLab contiene **152 ejercicios**. El manifiesto cubre **115 con GIF o imagen**, incluidos **36 con GIF**. Quedan **37 sin esos medios**. Algunas fichas ya ofrecen un dibujo como alternativa. Recalcular el cruce por `exerciseId` al empezar cada lote y conservar las demostraciones existentes que correspondan a la variante. [Resolución de medios en la app](traininglab/apps/desktop/src/features/exercises/media.ts) · [Generador del manifiesto](scripts/build-exercise-media-manifest.mjs)

**Una referencia visual compartida.** Crear una hoja maestra de un adulto ficticio con vistas frontal, lateral, posterior y tres cuartos. Fijar proporciones, ropa que deje visibles las articulaciones, calzado, iluminación, fondo, escala y convenciones para representar equipo. Entregar la imagen maestra en cada petición y editar el fotograma inicial aprobado para obtener el final. Registrar versión de la hoja, modelo de GPT Image utilizado, prompt, referencias y coste del intento. La consistencia se comprueba visualmente entre pares y lotes. [Guía oficial de generación y edición de imágenes](https://developers.openai.com/api/docs/guides/image-generation)

| Lote | Ejercicios pendientes por ID |
|---|---|
| [ ] **Piloto · 3** | `bird-dog`, `band-row`, `bulgarian-split-squat` |
| [ ] **Empujes · 9** | `push-up-plus`, `pike-push-up`, `diamond-push-up`, `band-chest-press`, `deficit-push-up`, `pseudo-planche-push-up`, `archer-push-up`, `dumbbell-squeeze-press`, `band-overhead-press` |
| [ ] **Tracción, piernas y cadera · 11** | `lying-hip-abduction`, `tibialis-raise`, `sumo-squat`, `banded-hip-abduction`, `clamshells`, `fire-hydrants`, `table-row`, `band-curl`, `prone-y-raise`, `nordic-curl`, `band-lat-pulldown` |
| [ ] **Tronco · 3** | `copenhagen-plank`, `hollow-body-hold`, `hollow-rock` |
| [ ] **Cardio y circuitos · 11** | `mtb-steady-ride`, `mtb-hill-intervals`, `stair-intervals`, `jump-rope-intervals`, `burpee-circuit`, `metcon-circuit`, `shadow-boxing-intervals`, `tabata-bodyweight`, `jump-rope-steady`, `bike-sprint-intervals`, `stair-climb-steady` |

**Receta por ejercicio para el agente editorial**

1. Leer la entrada de catálogo, los rasgos de equipo, la técnica específica y la demostración dibujada, si existe. Redactar una ficha de cinco líneas con variante, apoyos, equipo, fase visible y error que la imagen debe evitar. Para bandas y soportes, especificar el punto de anclaje.
2. Escoger la representación adecuada. Movimiento dinámico → inicio y final. Isométrico → una posición sostenida bien explicada. Circuito → secuencia identificada. Cardio por intervalos → imagen de la actividad más pauta temporal obtenida del catálogo. Un fotograma puede enseñar la postura en bicicleta, pero la alternancia de esfuerzos se comunica con tiempo y texto.
3. Usar este prompt base: *«Usa la hoja maestra adjunta. Representa [exerciseId y variante], fase [fase], vista [ángulo]. Mantén visibles [articulaciones, apoyo y recorrido]. Equipo [descripción y anclaje]. Conserva personaje, vestuario, cámara y escala de la referencia. Encuadre de cuerpo y equipo completos. Fondo neutro, sin texto ni logotipos»*.
4. Revisar la pareja en paralelo, tanto completa como en la miniatura real de la aplicación. Un revisor con conocimiento técnico verifica anatomía, equilibrio, agarre, equipo, anclaje y correspondencia con la variante. Añadir descripción ES/EN y la indicación «Demostración ilustrada». Si hay un error, la ficha conserva su alternativa previa hasta resolverlo.
5. Comprimir los recursos aprobados, regenerar el manifiesto con el script existente y comprobarlo con `node scripts/build-exercise-media-manifest.mjs --check`. Probar las rutas en biblioteca, sesión, instalador y LAN. Guardar las hojas maestras y descartes fuera del paquete distribuido.
6. **Control de gasto elegido por el dueño.** Ejecutar primero los tres pilotos. Informar coste total, coste por ejercicio aprobado, reintentos, tamaño y defectos. Calcular el siguiente presupuesto con el coste **por aprobado**, incluidos los descartes. Solicitar el techo de cada lote antes de generarlo y detener la cola al alcanzarlo. Nunca activar GPT Image desde la aplicación del usuario.

## 6. Cómo dirigir modelos pequeños sin sacrificar calidad

### Agentes que construyen el producto

El coordinador conserva contratos, decisiones y orden de integración. Cada agente pequeño recibe **una tarjeta, un ejemplo correcto y un criterio de parada**. Asignaciones adecuadas incluyen migrar un componente, verificar una fórmula ya documentada, preparar tres fichas visuales, añadir una fixture o comprobar una ruta del manifiesto. Reservar para el coordinador los cambios de esquema, los conflictos entre apps, las afirmaciones científicas nuevas y la decisión de publicar.

```markdown
### [ ] Txx.n — Resultado observable
- Responsable / revisor:
- Estado: pendiente | en curso | revisión | bloqueada | hecha
- Depende de:
- Leer primero:
- Archivos que puede modificar:
- Entrada de ejemplo → salida esperada:
- Criterio de aceptación y comando:
- Presupuesto de tiempo, tokens o imágenes:
- Resultado, commit y evidencia:
- Bloqueo o punto exacto de reanudación:
```

**Instrucción reutilizable para el agente:** «Abre la tarjeta y los archivos indicados. Reproduce el caso inicial. Entrega el cambio mínimo que satisface la salida esperada. Ejecuta el comando de aceptación y registra su salida real. Si necesitas cambiar un contrato compartido, una fórmula o el directorio asignado, devuelve el caso concreto al coordinador. Tras dos intentos con el mismo fallo, adjunta la reproducción para que otro agente pueda continuar».

Trabajar en ramas o worktrees por tarjeta. Un solo responsable edita cada archivo compartido durante una ronda. El coordinador revisa el diff, reproduce la aceptación y actualiza el tablero. Un agente distinto revisa migraciones y contenido técnico. Así un modelo económico puede avanzar con poco contexto y el siguiente puede retomar desde evidencia concreta.

### Modelos que funcionan dentro de TrainingLab

| Trabajo | Motor asignado | Comportamiento |
|---|---|---|
| Guardar una serie, calcular métricas, actualizar récords y validar una sesión | TypeScript determinista existente | Respuesta inmediata y reproducible, incluso con todos los modelos apagados. |
| Ajustar preferencias a partir de resultados registrados | Modelo local de decisión existente | Actualizaciones acotadas, explicación y restablecimiento desde Ajustes. |
| Explicar una semana o resumir una sesión | Modelo pequeño local opcional | Recibe métricas ya calculadas y referencias a registros. La salida es texto derivado que se puede descartar y regenerar. |
| Proponer una sesión | Coach local existente | Mantener exploración de solo lectura y petición final restringida a `propose_session`. La aplicación valida equipo, tiempo, recuperación y vetos antes de aplicar. |
| Generar demostraciones | GPT Image en la producción editorial | Los recursos aprobados viajan en el producto y se pueden consultar offline. |

**Cola de segundo plano.** Una inferencia local simultánea por defecto. Dar prioridad a la interacción directa, posponer resúmenes mientras se registra y permitir cancelar. Identificar cada trabajo por tipo, versión del modelo y revisión de sus datos. Si el usuario edita una serie, descartar el resumen obsoleto. Aplicar timeout, un reintento para fallos transitorios y alternativa determinista. Guardar diagnóstico local de duración y error sin volcar medidas ni prompts personales.

**Elección de modelo.** Empezar el benchmark con el Qwen de clase 4B ya ensayado en el proyecto. Medir en el portátil disponible, con **16 GB de RAM y RTX 3050 Laptop de 6 GB**, y repetir con CPU. Registrar versión, cuantización, memoria máxima, tiempo hasta respuesta y tasa de propuestas válidas. Usar casos fijos con historial vacío, equipo limitado, poco tiempo, veto de movimiento, petición en español, servidor desconectado y salida malformada. Una sola escritura inválida o un bloqueo del registro impide habilitar esa versión. La función opcional permanece apagada en instalaciones nuevas.

## 7. Decisión sobre el modelo 3D

**Recomiendo publicar la primera versión unificada con mapa 2D e ilustraciones técnicas revisadas.** El visor anterior se retiró tras añadir unos 11 MB y complejidad de renderizado sin resolver una pregunta útil para el usuario. En cambio, sí existe una pregunta que merece un experimento aislado: **¿rotar una demostración ayuda a identificar un apoyo o una trayectoria difícil de entender con dos imágenes?** [Historial y motivos de retirada del 3D](REMOVED_3D_MODEL.md)

Para **X01**, comparar el par ilustrado de `bulgarian-split-squat` con una demostración 3D rotatoria del mismo ejercicio. Usar un humanoide genérico realista con esqueleto, animación y licencia de redistribución documentada. Exportar desde Blender a GLB con texturas empaquetadas y escala métrica. Validar malla, apoyos y animación. Cargar modelo y visor bajo demanda en un prototipo independiente, con imagen estática inmediata, controles de teclado, pausa y alternativa si WebGL falla.

Probar ambas versiones con cinco practicantes, alternando el orden. Registrar si identifican el apoyo, la posición inicial y la trayectoria, y cuánto tardan. Elevar la integración al dueño únicamente si el 3D mejora la respuesta de al menos tres participantes, mantiene accesibilidad y entrega un coste medido de descarga, memoria y renderizado aceptable en el portátil objetivo. El experimento enseña una técnica con un humano genérico. Un avatar personalizado a partir de perímetros requeriría otra hipótesis, evidencia y decisión.

## 8. Pruebas de salida y retirada de BodyLab

- [ ] **Paridad y datos.** Cada capacidad inventariada en T00 tiene destino funcional, fixture y prueba. Migrar desde ambas apps, reimportar el mismo archivo, resolver un conflicto y restaurar en limpio. Verificar edad derivada de fecha de nacimiento, unidades, coma decimal, registros antiguos y campos desconocidos.
- [ ] **Calidad técnica.** Desde `fitness-ecosystem`, ejecutar `pnpm test`, `pnpm check`, `pnpm lint`, `pnpm audit:css`, `pnpm --filter traininglab-desktop build` y `pnpm --filter web test:e2e:traininglab`. Ejecutar además la auditoría de contraste y la comprobación del manifiesto. Registrar resultados frescos y cualquier prueba omitida.
- [ ] **Calidad visual y accesibilidad.** Capturas generadas a 390 × 844 y 1440 × 900, verificación adicional a 1280 × 720, zoom al 200 %, teclado, lector de pantalla, alto contraste y movimiento reducido. Hacer un recorrido en WebView2 y otro en Safari de iPhone físico por LAN. Registrar dispositivo, versión y hallazgos.
- [ ] **Uso real.** Cinco practicantes completan sin guía cuatro tareas: crear o recuperar su rutina, registrar y corregir una serie, tomar una medida y explicar su cambio mensual. Meta propuesta: al menos cuatro de cinco terminan cada tarea sin ayuda y cero pérdidas de registros. Conservar también los intentos fallidos y volver a probar el cambio que los resuelve.
- [ ] **Rendimiento.** Medir arranque en frío, apertura de biblioteca, respuesta al registrar y desplazamiento con vidrio activo en el mismo equipo y fixture que T00. Meta para la respuesta visual al registro: percentil 95 inferior a 100 ms. La confirmación de guardado aparece cuando se completa la escritura. Repetir con el modelo local ocupado y con 10 000 series de historial.
- [ ] **Entrega de escritorio.** Durante la transición, construir los dos instaladores Tauri desde el mismo commit, comprobar contenido de `dist/assets`, instalar, abrir y completar el recorrido de migración. Copiar ambos al escritorio real y registrar versión, hora, tamaño y hash.
- [ ] **Retirada.** Tras superar T08, publicar TrainingLab como aplicación principal, conservar el descargable de transición y documentar recuperación y reversión. Actualizar en el mismo cambio CI, lanzadores, accesos directos, documentación y la regla de cierre para que las rondas siguientes verifiquen el instalador unificado.

**Primera tarjeta para entregar a un agente pequeño:** `T00.1 — Sembrar un perfil de prueba en cada app y construir la matriz de conservación`. Su resultado debe mostrar, para cada tipo de registro, dónde vive, en qué exportación aparece, cómo se comprobará después de importar y qué dato se perdería con el mecanismo actual. Es una tarea pequeña que descubre el principal riesgo de toda la unificación.

## Anexo · estado heredado del tablero del 20 de noviembre

El tablero anterior tenía trabajo empezado. **Las casillas de la sección 2 empiezan en blanco a propósito** (así lo pide el plan), pero quien retome esto debe saber qué existe, para no rehacerlo ni duplicarlo:

- **T00.1 · matriz de conservación (hecha).** Revisada en `bodylab/apps/web/src/lib/db.ts`, `bodylab/apps/web/src/pages/ExportImport.tsx`, `bodylab/apps/web/src/lib/traininglab-export.ts`, `traininglab/apps/desktop/src/lib/db.ts` y `traininglab/apps/desktop/src/lib/backup.ts`. Falta el ensayo con perfiles sintéticos y la línea base de contraste, tiempos e instaladores.
- **T01 (parcial).** El archivo de transición de BodyLab se puede revisar e importar como archivo privado; la copia manual de TrainingLab incluye ese archivo y las medidas de cintura. Faltan la incorporación a las funciones activas, los lectores históricos y el recibo de restauración unificada.
- **T02/T04 (parcial).** Progreso registra cintura por fecha y sitio anatómico, conserva historial al corregir y compara el mismo punto dentro del periodo. Las medidas de cintura importadas exigen elegir su punto anatómico; las series compatibles se incorporan tras vista previa y conservan procedencia. Existe copia automática privada independiente con recuperación explícita. Faltan otras medidas, conflictos, el recorrido completo de ocho semanas y la prueba del ejecutable instalado.
- **T03 (parcial).** La navegación puede plegarse y usa superficies translúcidas con alternativas opacas de accesibilidad. Quedan la disposición final de ZEN (ver la maqueta de la sección 4) y la revisión en dispositivos.
- **T06 (parcial).** [Piloto editorial](exercise-media-pilot/README.md) con los tres candidatos y la hoja base; pendiente de revisión técnica y de techo de gasto para la siguiente tanda.

### Matriz de conservación (T00.1)

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

Ensayo pendiente: sembrar dos perfiles de prueba con elementos exclusivos, dos registros iguales, un ID en conflicto y una sesión posiblemente solapada con IDs distintos, con UUID fijos y fechas explícitas. Comparar por registro, campo y vínculo además de contar filas. Los conjuntos personales del repositorio quedan fuera de las fixtures.

### Línea base técnica ya medida (2026-11-13 y 2026-11-21)

No sustituye a la línea base de T00 —esa exige el ejecutable instalado— pero evita repetir mediciones:

- Preview en loopback: TTFB 4–9 ms, `load` 110–183 ms, 22 peticiones, JS transferido ~109 kB con brotli, tras arreglar el listen dual-stack y la compresión.
- `pnpm test` 107 archivos / 1.471 tests; `web test` 129; `web test:e2e` 17/17; `test:e2e:traininglab` 7/7; dos `tauri build --no-bundle` en 0 desde `8b2f103`.
- `scripts/audit-contrast.mjs`: 19 PASS / 0 FAIL. `build-exercise-media-manifest.mjs --check`: 115 entradas, sin cambios.
- Sigue ausente lo que piden T00 y T08: arranque en frío del `.exe` instalado, tamaño real del instalador, WebView2 y Safari de iPhone físico.

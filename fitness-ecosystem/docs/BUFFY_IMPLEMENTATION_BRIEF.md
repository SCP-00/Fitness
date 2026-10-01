# Buffy AI — plan de ejecución para TrainingLab usable y de alta calidad

**Prioridad:** instrucciones operativas vigentes para el siguiente trabajo de Buffy en TrainingLab.  
**Fecha de preparación:** 2026-09-30.  
**Modelo previsto:** DeepSeek V4.1 Flash + Images.  
**Alcance:** TrainingLab PC/escritorio y móvil; el prototipo del mapa 2D se mantiene independiente.  
**Regla de autoridad:** manda el pedido explícito del dueño y `AGENTS.md`; este documento organiza la ejecución, no autoriza a cruzar aprobaciones pendientes.

## 1. Encargo y definición de éxito

Lleva TrainingLab desde el estado funcional reportado en `docs/AGENT_HANDOFF.md` a una aplicación fiable y cómoda para el ciclo real **preparar → entrenar → registrar → revisar → ajustar**. Debe servir tanto en escritorio/PC como en teléfono, especialmente cuando la persona está cansada y solo quiere tomar la siguiente acción sin buscarla entre pantallas o hacer scroll largo.

No rehagas funciones ya entregadas solo para cambiarles el aspecto. Audita el estado actual, detecta huecos demostrables, trabaja en entregas pequeñas y verifica cada una. Para cualquier afirmación de “listo”, aporta la ruta, prueba o captura que lo demuestra.

Una entrega de alta calidad debe cumplir todo lo siguiente:

- El primer paso útil de Inicio es obvio; desde un entrenamiento activo se registra una serie sin navegar a otra sección.
- En móvil, las acciones frecuentes quedan al alcance del pulgar; objetivos táctiles ≥44 px, texto de entradas ≥16 px, safe areas respetadas y ninguna página se desborda horizontalmente.
- En PC, se aprovecha el espacio en paralelo, el panel lateral se puede contraer/expandir, el foco de teclado siempre es visible y la densidad no obliga a recorrer una columna interminable.
- El estado se persiste de forma predecible y los errores de guardado/importación se explican sin perder silenciosamente datos.
- Los estados vacío, parcial, inválido, cargando, sin conexión/datos opcionales y error tienen una salida útil; nunca se representan como cero o como una evaluación negativa inventada.
- Los números y colores dicen exactamente lo que los datos permiten afirmar. El mapa de condición física de cuerpo completo, el mapa muscular de fuerza, la exposición por series y los objetivos antropométricos no se mezclan semánticamente.
- Hay pruebas de lógica, componentes y recorridos de navegador proporcionales al riesgo, más verificación visual real en teléfono y PC.

## 2. Estado base que debes respetar

Lee la última entrada de `docs/AGENT_HANDOFF.md` antes de tocar código y vuelve a comprobar Git. El handoff del **2026-09-30 (c)** reporta:

- Rediseño de TrainingLab, navegación de cinco destinos, rail de escritorio plegable, barra inferior móvil, tarjetas de ejercicio contraíbles y versión Tauri 0.2.0 entregados previamente.
- Onboarding de BodyLab con deporte/objetivo y campos aditivos en el export.
- En Progreso se reporta una tarjeta **“Condición física”** con cuatro ejes de cuerpo completo (Cooper, % grasa, WHtR y FFMI), bandas/fuentes y estados sin dato. Según el handoff: suite raíz 871/871, web 115/115, lint, typechecks y builds Vite pasaron; Tauri installer no se reconstruyó en esa sesión.
- El reporte también dice que conectar deporte/objetivo con la selección de eje por defecto está pendiente.
- El mismo reporte establece explícitamente que esa tarjeta **no es** el mapa per-family de fuerza externa; ese mapa sigue pendiente y con puerta de evidencia/aprobación.
- La vista anatómica integrada conserva las lentes anteriores `Entrenamiento` y `Objetivos`; no las llames “fuerza relativa” ni las elimines/reetiquetes sin decisión del dueño.
- La lista F2 pendiente del `ROADMAP.md` incluye programa semanal visible, historial por ejercicio, editar/borrar series y sesiones con E2E, filtros/favoritos de ejercicios, plantillas manuales y perfiles de equipo casa/gimnasio.

**Estado local observado al escribir esta guía:** `git status --short` mostraba cambios no comprometidos en `traininglab/apps/desktop/src/features/stats/condition.ts` y `traininglab/apps/desktop/src/features/today/ConditionCard.tsx`. Son trabajo del usuario/agente, no los reviertas, formatees globalmente, reemplaces, muevas o incluyas en un commit sin inspeccionar primero su diff y entender quién los está trabajando. Si necesitas modificar una de esas zonas, trabaja alrededor de los cambios y documenta exactamente qué tocaste.

El handoff es un reporte de estado, no una garantía de que el estado local siga idéntico. Verifica de nuevo antes de decidir qué falta. No presentes los conteos históricos de pruebas como resultados actuales.

## 3. Jerarquía de métricas: no confundir conceptos

Mantén estas preguntas y sus datos claramente separadas:

| Vista | Qué responde | Qué datos usa | Estado / límite |
|---|---|---|---|
| **Condición física** | ¿Cómo se comparan mis capacidades/mediciones corporales con referencias publicadas aplicables? | Ejes de cuerpo completo; solo estratos que admite cada fuente | Reportada como implementada. No mide fuerza local de cada músculo. Revalidar código, copia, trazabilidad y casos sin datos. |
| **Fuerza vs. referencia externa** | ¿Qué nivel de fuerza observada/estimada alcanzo frente a un estándar externo publicado? | Rendimiento en el mismo ejercicio/protocolo que la norma y variables de estratificación soportadas | Pendiente de evidencia, cobertura y aprobación. Es la dirección pedida para el mapa muscular, no una función ya entregada. |
| **Exposición de entrenamiento** | ¿Qué grupos participaron en mis series registradas durante el periodo? | Series de trabajo y participación del catálogo | Lente alternativa; nunca llamarla fuerza, hipertrofia, recuperación o tamaño muscular. Calentamientos fuera; créditos explicados. |
| **Objetivos antropométricos** | ¿Qué tan cerca estoy de mis medidas objetivo? | Medidas y objetivos que el usuario elige/configura | Conservar separada. No sustituirla por un “ideal” de fuerza ni borrar su significado por conveniencia visual. |

La investigación existente documenta, entre otras cosas, normas de powerlifting de población competitiva por sexo/edad/clase de peso sin estrato validado de estatura. **No extrapoles esa norma a toda persona que entrena ni inventes un ajuste de altura.** FFMI y WHtR contienen estatura en sus definiciones, pero describen composición/proporción; no son conversiones de fuerza muscular ni solucionan la referencia por músculo. Para las fuentes y sus límites lee `docs/RESEARCH_IDEALS_BY_SPORT.md` y verifica la publicación primaria, población, protocolo, derechos/datos y aplicabilidad antes de codificar una cifra.

Una marca en press, sentadilla o peso muerto mide desempeño de esa tarea; no mide por separado la fuerza fisiológica de cada músculo que participa. Sin una relación validada ejercicio→región, no colorees pecho, tríceps, glúteo u otra región como si su fuerza local se hubiera medido. Si la cobertura defendible no existe, enseña “sin referencia comparable” y ofrece historial personal claramente etiquetado. Si esto impide cumplir el mapa anatómico solicitado, presenta al dueño las opciones y evidencia antes de decidir una representación sustituta.

## 4. Orden de trabajo

### Fase 0 — Orientación, límites y línea base

Antes de implementar:

1. Lee `AGENTS.md`, `knowledge.md`, `ROADMAP.md`, `docs/ARCHITECTURE.md`, `docs/PRODUCT_SPEC.md`, `docs/UI_DESIGN.md`, `docs/TRAININGLAB_UI_PLAN.md`, `docs/TESTING.md`, `docs/RESEARCH_IDEALS_BY_SPORT.md` y el final de `docs/AGENT_HANDOFF.md`.
2. Ejecuta `git status --short`, `git diff --stat` y examina los diffs de todo archivo que planeas tocar. Conserva cambios ajenos; no uses reset/checkout para “limpiar”. No crees commit ni push salvo pedido explícito.
3. Recorre la aplicación actual en los flujos Inicio → iniciar/continuar sesión → registrar → descanso → terminar → Progreso; comprueba Ajustes, biblioteca y persistencia. Registra hallazgos reproducibles con pantalla, tamaño, pasos y resultado esperado/observado.
4. Obtén una línea base fresca con las pruebas apropiadas. Separa fallo preexistente de regresión; si no puedes correr una suite, di cuál y por qué.
5. Ordena cada observación en: bug reproducible, requisito F2 faltante, deuda documentada o preferencia de diseño. No conviertas una preferencia no aprobada en una regla nueva.

Entrega al final de esta fase una lista corta P0/P1/P2 con archivos concretos. No empieces una reescritura amplia del shell.

### Fase 1 — Cerrar el ciclo de entrenamiento utilizable (P0)

El flujo de entrenamiento es el centro del producto. Verifica y completa, en este orden:

1. **Crear/abrir una sesión:** desde Inicio debe quedar claro si se inicia la sesión sugerida, se abre el plan del día o se reanuda una sesión activa. Evita CTA duplicados o que compitan.
2. **Registrar una serie rápidamente:** ejercicio actual, serie siguiente, carga, repeticiones, tipo de serie (trabajo/calentamiento), esfuerzo cuando corresponda y acción primaria claramente diferenciada. En móvil el teclado no debe ocultar el botón ni el descanso; el flujo de teclado PC conserva el patrón existente peso → Enter → reps → Enter cuando no perjudique accesibilidad.
3. **Confirmación y descanso:** feedback inmediato del guardado, contador actualizado, temporizador persistente al navegar dentro de la sesión y acción visible para omitir/añadir descanso. Audio/notificación son complementos opcionales, no la única señal.
4. **Errores y recuperación:** al fallar IndexedDB, no afirmar “guardado”; conserva los valores del formulario, muestra explicación y acción para reintentar. No pidas permisos de notificación sin clic explícito.
5. **Editar y borrar:** completar CRUD de serie y sesión con confirmación clara para operación destructiva, oportunidad de deshacer cuando sea segura y protección contra doble toque. La sesión terminada no debe quedar en estado ambiguo si falla una edición.
6. **Persistencia:** recarga, cerrar/abrir WebView y navegación deben mantener datos locales. Comprueba import/export y datos corruptos; nunca se envían logs a un servicio externo.

**Criterio P0:** flujo registrar → ver → editar → borrar cubierto con pruebas de lógica y E2E; controles y mensajes accesibles; cero pérdida silenciosa en errores simulados.

### Fase 2 — Que la planificación y revisión sean acciones reales (P1)

Completa F2 por entregas verticales; evita mostrar una pantalla “bonita” sin operaciones funcionales:

1. **Vista Semana:** reintegrar `generateRoutine` con `validateRoutine` y explicar días de entreno/descanso, tiempo, nivel, equipo y prioridades. Mostrar bloqueos como problemas corregibles con alternativas; no dejar al usuario ante una página vacía si el validador no logra plan.
2. **Historial por ejercicio:** abrirlo desde la ficha y desde una serie reciente. Mostrar fecha, carga/reps, PR/estimación usada y tendencia personal solo cuando hay suficientes datos; anotar unidades y protocolo. Vacío ≠ cero.
3. **Biblioteca:** búsqueda visible, filtros útiles (músculo/equipo/patrón/nivel), favoritos persistentes y sustitución compatible con equipo/patrón. Filtros activos deben poder quitarse con un toque y tener recuento/estado vacío.
4. **Plantillas:** PPL, Upper/Lower y Full body como plantillas editables que el usuario confirma; nunca sobrescribir una rutina o sesión guardada al aplicar una.
5. **Inventario por contexto:** implementar perfiles casa/gimnasio si el modelo existente lo soporta sin migración destructiva. Cambiar perfil explica qué sesión/rutina se recalcula; no borrar los equipos del perfil anterior.
6. **Unir con Deporte/Objetivo:** primero verifica que los campos exportados y su versión son compatibles; conecta selección de eje por defecto solo en el ámbito aprobado y explica por qué. No cambies un perfil antiguo al valor predeterminado por migración silenciosa.

**Criterio P1:** Inicio → entreno → guardar → historial/Progreso → ajustar la próxima acción se puede completar sin inventar datos, con retorno claro y en menos desplazamiento que la pantalla actual.

### Fase 3 — Prototipo independiente de mapa muscular 2D (P1, aprobación bloqueante)

El HTML base está en `docs/prototypes/muscle-map-2d.html`; hay recursos en `docs/prototypes/assets/`. El usuario aportó `Modelo2D.png` para colorear y pidió explícitamente **primero un HTML independiente y preguntar antes de incorporarlo a TrainingLab**. Esta frontera sigue activa.

La inspección del HTML realizada al preparar esta guía encontró dos problemas concretos:

- El índice coloreado se calcula dividiendo la carga/tonelaje de cada familia por el máximo entre familias. Así se compara kilos × reps entre ejercicios/grupos distintos y se llama “índice relativo”; no es fuerza relativa frente a una norma publicada ni una comparación muscular defendible.
- `renderTrend()` filtra con `map.has(m)` aunque `map` no está definido en esa función. Investiga y añade una prueba de regresión; no des por funcional la tendencia por el hecho de que el HTML abra.

Antes de reescribir el dibujo o el score:

1. Compara dimensiones, orientación, transparencia y hash de la imagen aportada con `docs/prototypes/assets/body-map.png`; confirma que `body-map-regions.png` está alineada píxel a píxel, qué significa cada ID y que ambas vistas/zonas anatómicas se corresponden. No cambies la imagen del usuario; conserva originales.
2. Si la máscara no codifica todas las regiones correctamente, arregla una máscara independiente documentando IDs, simetría, zonas sin asignar y prueba visual de overlay. El borde/contorno debe conservarse; mezcla color dentro de la silueta sin teñir fondo/contornos. En móvil, zoom/selección debe ser posible sin depender de precisión fina.
3. Separa el motor puro (datos → puntuación/banda/explicación) de la capa de canvas/imagen. Usa el catálogo real compartido mediante fixture o estructura versionada, sin conectar el prototipo a registros privados ni a la DB de TrainingLab.
4. Haz que el prototipo muestre etiquetas explícitas y conmutables: **Fuerza vs referencia externa** (solo donde haya norma comparable) y **Exposición por series**. Objetivos antropométricos permanecen como concepto separado; no los fusiones por defecto. Si la relación visual del modo fuerza con una región no es válida, el prototipo debe decir “sin referencia para esta zona” en lugar de pintar un color supuesto.
5. Fuerza: compara el mismo ejercicio, protocolo y estimador de fuerza que la fuente. Muestra cómo se obtuvo el valor del usuario y cuántas repeticiones admite el protocolo. Aplica solo sexo/edad/peso/estatura que la fuente respalde. Si faltan datos del perfil, marca qué variable falta. Conserva fuente, año, población, protocolo, banda exacta y limitación junto al valor y en “Cómo se calcula”. No conviertas “ideal” en una categoría inventada.
6. Exposición: series de trabajo del periodo y créditos parciales del catálogo documentados; excluir calentamientos. No derivar fuerza, hipertrofia, recuperación ni crecimiento del volumen.
7. Importación: valida JSON completo, esquema, IDs de ejercicios, fecha ISO real (incluidos extremos/fechas futuras), peso/reps, boolean de calentamiento, RPE si existe, duplicados y tamaño razonable; reporta filas aceptadas/rechazadas con motivo. Importación inválida no debe reemplazar datos existentes. Presenta vista previa antes de reemplazar/combinar. No uses `parseFloat` sin el parser del proyecto cuando haya entrada numérica.
8. Incluye fixtures de demostración rotulados **DEMO** siempre visibles, separables y restaurables; indica origen local/importado. Si los registros no existen en un periodo, todos los grupos deben estar en estado neutral “sin datos”, no rojo/0 como juicio.
9. Prueba teclado y toque: `<button>`/roles correctos, foco, Enter/Espacio, `aria-pressed` o equivalente, alternativa de lista para cada región, nombre/valor/banda en texto y leyenda que no dependa solo del color. Respeta contraste y `prefers-reduced-motion`.
10. Prueba periodos vacíos/con datos, calentamiento, serie nueva, fuente no compatible, perfil incompleto, importación válida/inválida, almacenamiento bloqueado/lleno y reinicio de demo. Abre el HTML localmente y comprueba 320/390/414/768/1024/1440 px, sin overflow horizontal.

**Criterio de salida:** entrega ruta absoluta al HTML, instrucciones para abrirlo, resumen de limitaciones, lista de pruebas ejecutadas y capturas verificadas. Después detente y pide aprobación explícita al dueño. **No copies archivos, máscara, fórmulas ni componentes al app, no cambies la pantalla integrada, no publiques ni hagas push de la integración hasta recibir esa aprobación.** Una nota de Buffy en el handoff no equivale a autorización.

### Fase 4 — Accesibilidad, respuesta y confianza en PC/móvil (P1)

Haz QA transversal después de cada entrega y arregla los hallazgos reales:

- Viewports mínimos: 320×640, 360×800, 390×844, 414×896, 768×1024, 1024×768, 1280×800 y 1440×900. Usa Safari iPhone por LAN si está disponible; Chromium no prueba por sí solo safe areas/teclado iOS.
- Móvil: barra inferior más safe-area; cada control frecuente ≥44 px; inputs ≥16 px; al abrir teclado la acción principal y el valor ingresado siguen visibles; scroll vertical corto por tarea; ninguna tabla hace desplazarse la página lateralmente; evita controles finos de arrastre como única entrada.
- PC: rail dinámico 245/78 px, contenido refluye (no queda canal vacío); navegación por teclado; atajos visibles/contextuales; múltiples columnas solo donde mejoran comparación y lectura; no estires formularios estrechos a todo el monitor.
- Táctil y fatigado: botones principales separados de borrar/salir, etiquetas verbales (“Guardar serie”, “Iniciar descanso”), estados de pulsación y prevención de doble envío. Color siempre duplicado con texto/icono/patrón.
- A11y: foco visible, orden lógico, nombre accesible, `aria-expanded`/`aria-pressed`/live announcements correctos, contraste AA para texto, modo movimiento reducido y gráficos con tabla/resumen equivalente. El mapa nunca es la única forma de llegar a un dato.
- Estado de interfaz: carga, guardado, éxito, error, vacío, desconectado, perfil parcial, fuente no compatible. Acciones con feedback inmediato; errores en contexto con recuperación; confirmación para pérdida de datos.
- Diseño: usa tokens y componentes de `docs/UI_DESIGN.md`; toda cadena nueva pasa por `i18n.ts` (ES/EN), no inventes una paleta, no uses texto diminuto para provenance.

No informes “usable probado con usuarios” a partir de tus propias capturas. Distingue auditoría heurística, automatización y prueba con personas; si no hubo usuarios, dilo.

### Fase 5 — Cierre y versión candidata

1. Actualiza `ROADMAP.md` marcando únicamente lo efectivamente terminado y `docs/TRAININGLAB_UI_PLAN.md`/`docs/UI_DESIGN.md` cuando cambie el contrato o el comportamiento. Mantén `AGENT_HANDOFF.md` append-only.
2. Para mapas, filtros, formularios y errores, añade tests de dominio/componente; para registrar/editar/borrar, importar y persistencia, usa E2E Playwright. Reutiliza la infraestructura del repo; no metas una dependencia nueva sin explicar por qué.
3. Ejecuta las pruebas focales durante la iteración; antes de entregar, corre los gates relevantes según `docs/TESTING.md` y reporta salida real. Como base: desde `fitness-ecosystem/`, `pnpm test`, `pnpm check`, `pnpm lint`; para app TrainingLab, `cd traininglab/apps/desktop && pnpm build`. No afirmes que el instalador Tauri está probado si no corriste su build/smoke.
4. Captura y abre imágenes reales del build/código final. Compara los tamaños de PC y móvil, y corrige cualquier overflow, texto cortado, foco tapado o panel estático antes de marcar QA visual.
5. Resume archivos, decisiones, tests con conteos/exit codes, tamaños y capturas, fallos conocidos y próximo paso. Actualiza la entrada de handoff en español con el formato existente.

## 5. Reglas UX de interacción (no negociables)

- **Una pantalla, una decisión primaria.** Las etiquetas dinámicas navegan o cambian una vista real; no son ornamento ni filtros que escondan el destino.
- **Menos recorrido, no datos escondidos.** Usa panel lateral/contexto en PC, selectores compactos y bottom sheets en móvil, resumen expandible y enlaces directos al detalle. Mantén selección/filtros al regresar.
- **Primero el siguiente paso.** En sesión activa, destaca la siguiente serie/ejercicio y el descanso; deja historial, análisis secundario y explicaciones bajo demanda, sin quitar el acceso.
- **Datos primero, celebración después.** El feedback visual/sonoro es apoyo; una confirmación no reemplaza persistencia y un sonido nunca informa el resultado exclusivo.
- **No castigar el dato ausente.** “Sin registro”, “sin referencia”, “sin objetivo configurado” y “no aplica” son estados diferentes. Neutral gris no significa bajo.
- **No usar scroll interno anidado para esconder funciones clave.** Si una lista es larga, añade búsqueda/filtros, headings y posición preservada; no fuerces un mini-scroll sin affordance.
- **Privacidad local.** Los logs y el prototipo permanecen locales; no telemetría, backend ni compartir datos de entrenamiento por conveniencia.

## 6. Decisiones que Buffy debe devolver al dueño, no tomar

Investiga, presenta 2–3 opciones con fuente, población, fórmula, cobertura, implicaciones visuales y recomendación; detente si la implementación depende de la respuesta:

1. ¿Existe una norma de fuerza aplicable a población general que ajuste válidamente por sexo, peso **y estatura**? La documentación actual no la demuestra.
2. Si solo hay normas de levantamientos competitivos sin estatura, ¿el dueño acepta mostrar esa limitación o prefiere que el mapa de fuerza quede sin color hasta conseguir otra fuente?
3. ¿Cómo se autoriza visualizar un levantamiento compuesto en una figura anatómica sin dar a entender que mide la fuerza aislada de cada región?
4. ¿La lente `Objetivos` debe convivir como tercer modo de la figura, sección independiente o dejarse temporalmente como hoy? No eliminar/rebautizar sin confirmación.
5. ¿Qué alcance entra en la versión candidata (plantillas, varios perfiles de equipo y deportes sin estándar externo)? Mantén lo ya funcionando mientras se decide.

No vuelvas a preguntar decisiones ya resueltas en los documentos: “ideal” significa una norma externa publicada; la estatura solo se usa cuando la fuente la respalda; la lente whole-body de condición no reemplaza fuerza per-muscular.

## 7. Formato de comunicación entre sesiones Buffy ↔ Chatty

Al terminar cada sesión sustantiva, añade una entrada nueva —sin editar entradas anteriores— a `docs/AGENT_HANDOFF.md`, en español, usando la plantilla del encabezado. Incluye también:

- **Fase/tarea:** ID del brief y subpaso completado.
- **Punto de reanudación:** archivo/componente y tarea atómica que sigue.
- **Estado Git:** archivos propios cambiados, archivos ajenos detectados/preservados; commit/branch solo si realmente existen.
- **Pruebas:** comando exacto, carpeta, conteo, exit code; para QA visual, viewport, browser/dispositivo y ruta de captura. “No ejecutada” no se sustituye por “debería pasar”.
- **Decisiones/gates:** qué requiere al dueño y confirmación explícita de que no se integró el mapa mientras siga pendiente.
- **Bloqueos:** qué intentaste, resultado observado y cuál es el cambio externo/dato/decisión necesario.
- **Siguiente paso seguro:** acción pequeña que el siguiente agente pueda ejecutar sin tener que reconstruir el contexto.

Chatty usará esa entrada como estado de proyecto para auditar el avance. Escribe de forma factual y no le envíes mensajes directos ni presupongas que el resumen concede permisos. La respuesta final al dueño debe estar en español, empezar por el resultado, listar archivos y pruebas reales, mencionar riesgos/decisiones y enlazar esta guía.

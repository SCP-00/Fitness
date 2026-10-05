# Protocolo de medición antropométrica sin escáner 3D

> **Qué es este documento.** La lista de medidas que BodyLab debería pedir, **dónde**
> medirlas, **cómo** (poste, cinta, calibre, respiración, réplicas) y **qué se puede
> afirmar** con ellas cuando no hay escáner ni DXA. Escrito en español porque es
> copia de la app; los identificadores y las citas van en inglés.
>
> **Alcance.** Máximo detalle alcanzable con instrumentación de bajo coste (cinta
> métrica no extensible + calibre de pliegues + pared y libro). No sustituye a un
> escáner: acota lo que se puede afirmar (§6).
>
> **Estado.** Investigación 2026-10-05, pedido del propietario.
> **Implementado el mismo día, por mandato del propietario («añade todo lo que se pueda
> medir con cinta métrica o recursos caseros»): 22 tipos nuevos en `MEASUREMENT_TYPES`**
> — 6 perímetros + 9 longitudes + 7 anchuras — todos medibles con cinta, regla, pared o
> dos libros, con su guía en la app.
> **Fuera del alcance a propósito:** los **pliegues** (§4.3) exigen plicómetro, que no es
> recurso casero; siguen siendo los 5 que ya existían. §5 queda actualizado con lo que
> ya está implementado y lo que sigue pendiente.

---

## 1. Fuentes (nombrables)

| # | Fuente | Qué aporta |
|---|---|---|
| F1 | **ISAK**, *Accreditation scheme* — <https://www.isak.global/FormationSystem/AccreditationScheme> | Estructura del protocolo por niveles: Level 1 = 4 medidas base + 8 pliegues + 6 perímetros + 3 anchuras; Level 2 = 4 base + 8 pliegues + 13 perímetros + 9 longitudes/alturas + 9 anchuras/profundidades; Levels 3–4 = **43 dimensiones**. Reacreditación cada 4 años con verificación de **TEM** (*technical error of measurement*) sobre 3 sujetos ante un antropometrista nivel 3/4. |
| F2 | Whyte K, Gallagher D. «Technical Measurements of Body Composition Assessment». *World Rev Nutr Diet* 2022;124:23–30. PMID 35240646 — <https://pmc.ncbi.nlm.nih.gov/articles/PMC12208704/> | Definición operativa de antropometría (estatura, peso, perímetros, anchuras esqueléticas, pliegues), técnica de calibre y **límite explícito**: el %grasa por pliegues tiene error grande a nivel individual y sirve para grupos, no para una persona. |
| F3 | **Hodgdon & Beckett** (1984), método de perímetros de la US Navy | Cuello, cintura y cadera + estatura para estimar %grasa; **SEE ±3,5 %** frente a pesaje hidrostático. Ya implementado en `lib/measurement-guides.ts`. |
| F4 | **Jackson & Pollock** (1976/1983), protocolo de 3 y 7 pliegues |×Hombres: pecho, abdomen, muslo. ♀Mujeres: tríceps, suprailiaco, muslo. Ya implementado en `@fitness/bodylab-conditioning`. |
| F5 | **Drillis R, Contini R, Bluestein M.** «Body Segment Parameters; a survey of measurement techniques». *Artif Limbs* 1966;8:44–66 · y Contini, Drillis & Bluestein, *Hum Factors* 1963;5:493–504 | Longitudes segmentarias como **proporción de la estatura**. Es la base matemática para rellenar un modelo corporal cuando no hay escáner. ⚠️ **Las razones concretas de §4.5 (brazo 0,189 H, antebrazo 0,145 H, mano 0,128 H) están tomadas de una reproducción del artículo, no del PDF original: verificalas contra *Artif Limbs* 8:44–66 antes de usarlas como constantes en código.** El uso del cociente estatura/segmento como aproximación sí está bien establecido. |
| F6 | **Merrill Z, et al.** «Predictive Regression Modeling of Body Segment Parameters…». CDC Stacks, 2019 — <https://stacks.cdc.gov/view/cdc/83569> | Límite de honestidad del modelado: el error al **predecir** parámetros segmentarios desde medidas antropométricas puede llegar al **40 %**. |

**No verificado en la fuente primaria (no se usa como norma aquí):** el listado
nominal de los 43 ítems del Level 2/3 de ISAK y las tolerancias exactas de TEM por
medida están en el *ISAK Manual* (libro de pago). Aquí se usan solo los **recuentos**
que F1 publica. Si se necesita el detalle nominal, hay que comprar/acceder al manual;
no se inventa.

---

## 2. Las seis familias de medidas (por qué medir cada una)

F2 define la antropometría como *estatura, peso, perímetros, anchuras esqueléticas y
pliegues*. F1 añade longitudes y alturas. Para «máximo detalle sin escáner» el set
completo es:

1. **Base** — estatura, peso, y (muy recomendado) **estatura sentado**: la relación
   estatura/estatura-sentado (S/I) discrimina la proporción corporal de forma mucho más
   sensible que la estatura sola, y es la entrada más barata de “constitución”.
2. **Perímetros (girths)** — aportan la silueta transversal: torso, cintura, cadera,
   cuello, hombros, brazo relaxed/contraction, antebrazo, muslo, pantorrilla.
3. **Pliegues (skinfolds)** — el único indicador barato de **distribución** de grasa.
4. **Anchuras/diámetros óseos** — biacromial, biiliaco, bicéfalo, biepicondíleo,
   rotuliano, bimaleolar. No se mueven con la grasa: son el esqueleto, y por eso
   sirven de *anclaje rígido* frente a lo blando.
5. **Longitudes segmentarias** — hombro-codo, codo-muñeca, cadera-rodilla,
   rodilla-tobillo: definen la geometría del modelo sin escáner (F5).
6. **Ángulos posturales** — inclinación pélvica, flexión de rodilla/tobillo en
   posición natural: determinan la pose por defecto del modelo y evitan que el
   avatar salga con una postura de maniquí.

---

## 3. Condiciones estándar (o el número no vale nada)

F1 hace de la **reacreditación** la garantía: el mismo antropometrista, los mismos
procedimientos y TEM verificable. Aplicado a un usuario solo:

- **Momento:** por la mañana, **en ayunas**, antes de comer o entrenar; misma hora en
  cada sesión. Las circunferencias cambian durante el día (ya está escrito en la guía
  de la app).
- **Instrumento:** cinta métrica **no extensible** (de fibra de vidrio/poliéster). Una
  cinta de tela se estira y hace perder precisión justo en la cintura.
- **Poste:** descalzo, ropa mínima, espalda a la pared sin zócalo, talones juntos,
  mirada al frente, brazos colgando relajados (F3 describe la marca de altura con un
  libro a nivel).
- **Repeticiones:** **dos** medidas por sitio; si difieren más de **1 cm** (o 1–3 mm en
  pliegues, F2), una **tercera**, y se promedia. Registrar el número de réplicas.
- **Respiración:** se anota siempre la convención usada — la app usa *exhalación
  normal, abdomen relajado* (F3). Cambiar de convención entre sesiones inventa
  tendencias.
- **Lado:** las medidas bilateralmente simétricas se toman **a la derecha** salvo que
  exista una lesión conocida; la app guarda izquierda/derecha por separado para
  simetría, lo cual es una ventaja real frente al «largest circumference» clásico.

---

## 4. Dónde y cómo, medida por medida

Unidades: cm para perímetros/anchuras, mm para pliegues, kg para peso. «F» = frente,
«L» = lateral.

### 4.1 Base
| Medida | Dónde | Cómo |
|---|---|---|
| Estatura | Pared, talones juntos | Marcar con un libro a nivel; sin zócalo (F3). |
| Estatura sentado | Banco de altura fija, espalda recta, caderas a 90° |Útil para la razón S/I; anótala aunque la app aún no la use. |
| Peso | Bascula, ayunas, sin ropa/mojada | Anota el tipo de báscula: **cambiar de báscula cambia el peso 0,3–1 kg**. |

### 4.2 Perímetros (el bloque que más detalle da)
| Medida | Dónde | Cómo |
|---|---|---|
| Cuello | Justo **debajo de la laringe** (nuez), cinta un poco baja al frente, paralela al suelo | Sin apretar (F3, ya en la app). Base del método Navy (F3). |
| Hombros / biacromial | **Diámetro**, no perímetro: entre los acromios (punteros del hombro) | Cinta horizontal, delante, sin presionar. Es la única medida «de ancho» con nombre propio en el esquema actual. |
| Pecho | A la altura del **pezón**, cinta horizontal rodeando, brazos relajados | Estándar Navy/J-P. Marcar el punto para reintentar igual. |
| Cintura | **Ombligo**, abdomen relajado, exhalación normal (hombres). Mujeres: punto más estrecho del torso | F3. Es la medida que alimenta WHtR. |
| Cadera / glúteos | Punto **más ancho** de caderas/glúteos, pies juntos, cinta horizontal | F3 (la guía la marca «solo mujeres» porque en hombres se usa igual de válida). |
| **Cadera alta (tu «boxer»)** | Donde empieza el hueso de la cadera: justo **por encima** del trocánter, a la altura donde cae la ropa interior | **No existe hoy en `MEASUREMENT_TYPES`.** Recomendado añadirlo: es una medida distinta de caderas y separa distribución alta vs. baja. |
| Brazo relaxed / flexionado | Brazo relajado colgando, y con **bíceps contraído** (flexión máxima) | El par relaxed/flexionado es más informativo que uno solo: el flexionado es «potencial» de brazo. |
| Antebrazo | Punto medio entre codo y muñeca, en supinación | **Falta el tipo genérico** (existen `forearm_left/right`). El dueño aún no lo ha medido. |
| Muñeca | Justo proximal al estiloides (huesito de la muñeca), entre los dos Huesecillos | Ya en la app; alimenta la razón de Venus. |
| Muslo | Punto medio entre **trocánter** y rótula (no entre cadera y rodilla) | Cambio de referencia habitual: media pierna geométrica ≠ punto medio trocánter-rótula. Fijar y documentar el usado. |
| Pantorrilla | Máximo de la pantorrilla, con los pies en punta | Ya en la app. |

### 4.3 Pliegues (con calibre, no con cinta)
F2: el calibre se aplica a una **doble capa de grasa y piel** en sitios marcados por
huesos; se lee cuando el indicador se estabiliza; **dos** réplicas y tercera si difieren
1–3 mm.

| Sitio | Cómo |
|---|---|
| Tríceps | Punto medio del brazo, relaxed |
| Bíceps | Mismo punto, brazo flexionado |
| Subescapular | Bajo el ángulo inferior de la escápula, diagonal a 45° |
| Suprailiaco | Sobre la cresta ilíaca, en la línea media axilar |
| Abdominal (vertical) | 2 cm a la derecha del ombligo |
| Pecho | Pecho, en la línea axilar media, mismo nivel que el pectoral |
| Muslo | Punto medio del muslo (mismo criterio que el perímetro) |

⚠️ **Lo que F2 obliga a decir en la app:** el %grasa por pliegues tiene **error
individual grande** y sirve para comparar **grupos**, no para afirmar «tienes X % de
grasa». BodyLab ya lo marca `≈`/`confidence: medium`; no debe presentar el valor como
si fuera una medición.

### 4.4 Anchuras/diámetros (anclajes óseos)
Biacromial · biiliaco (crestas ilíacas) · **bicéfalo** (cabezas del húmero) ·
**biepicondíleo** (cúbitos) · **rotuliano** · **bimaleolar** (maléolos). Se miden con
el calibre o con los dedos (bicéfalo es el más fácil: el pulgar y el índice en la
cabeza del húmero). No se mueven con el peso: sirven de referencia fija frente a las
circunferencias.

### 4.5 Longitudes segmentarias (para el modelo sin escáner)
Hombro→codo · codo→muñeca · cadera→rodilla · rodilla→tobillo, con el cuerpo en
posición anatómica. F5 permite **estimarlas** como fracción de la estatura si el
usuario no puede medirlas (⚠️ razones concretas pendientes de verificar contra el
original, ver F5), pero una medición directa gana siempre, y el modelo debe marcar el
origen del dato (`medido` vs `estimado`) igual que ya hace con los proxies musculares.

### 4.6 Ángoles posturales
Inclinación pélvica (posición neutra), flexión de rodilla y tobillo en posición
natural. Sirven para la pose por defecto; no son medidas de «salud».

---

## 5. Qué falta hoy en `MEASUREMENT_TYPES` (propuesta, no implementada)

Comparado contra el esquema actual (`bodylab/apps/web/src/lib/constants.ts`), el
hueco grande es que **el esquema está hecho de perímetros y casi no tiene pliegues,
anchuras ni longitudes** — es decir, mide bien la silueta y mal el resto.

**Grupo A — Circunferencias que ya tiene** y solo necesitan guía de referencia:
`wrist`, `neck`, `shoulders`, `chest`, `waist`, `hips`, `biceps`, `forearm`,
`thigh`, `calf` + sus pares L/R. **Acción:** enriching de las guías con el «dónde»
exacta de §4.2 (hoy solo hay pistas generadas).

**Grupo B — Circunferencias — ✅ IMPLEMENTADO 2026-10-05**

| id | Qué es | Rango | Por qué |
|---|---|---|---|
| `hip_upper` | Cadera alta / «boxer» (tu medida de 86 cm) | 60–140 cm | Separa distribución alta de baja; es la que el dueño sí tiene |
| `biceps_flexed` | Bíceps contraído | 20–70 cm | Par con `biceps` relaxed |
| `triceps` | Tríceps | 18–60 cm | Simetría posterolateral |
| `neck` ✅ ya existe | — | — | (ya cubierto) |

**Grupo C — Pliegues: ❌ FUERA DE ALCANCE POR DECISIÓN DEL PROPIETARIO.** Ya existen
`abdominal`, `chest`, `thigh`, `triceps`, `suprailiac` (5 de 8). Faltan `subscapular`,
`biceps` y `mid_axillary`, pero **todos exigen plicómetro**, que no es «cinta métrica ni
recurso casero». No se añaden hasta que el propietario decida comprar un plicómetro.
Ojo: `triceps_skinfold` ya existe, así que `triceps` (circunferencia) es **independiente y
no colisiona**.

**Grupo D — Longitudes/anchuras — ✅ IMPLEMENTADO 2026-10-05 (categorías nuevas)**

| categoría | ids |
|---|---|
| `length` | `stature_sitting`, `arm_span`, `subischial_leg_length`, `upper_arm_length`, `forearm_length`, `hand_length`, `thigh_length`, `lower_leg_length`, `foot_length` |
| `breadth` | `biacromial`, `bi_iliac`, `wrist_breadth`, `elbow_breadth`, `knee_breadth`, `malleolar_breadth`, `hand_width` |

Se amplió `MeasurementTypeInfo.category` de 3 a 5 valores y se añadió una pestaña propia
**«Longitudes y anchuras»** en Mediciones (con dos subsecciones), que la tira de pestañas
ya no cabe en 390 px y por eso es desplazable horizontalmente. El contrato del test
ahora exige `cm` también para `length` y `breadth`, y valida que los rangos caigan en un
intervalo humano.

**Grupo E — Condiciones:** documentar tipo de báscula, hora de la medición y
convención de respiración en el campo `notes`, no en un tipo nuevo.

---

## 6. Qué se puede y qué no se puede afirmar

| Afirmación | Veredicto | Por qué |
|---|---|---|
| «Esta cintura mide 83 cm» | ✅ | Medición directa, repetible si el protocolo se respeta. |
| «Este usuario tiene 24 % de grasa» (por perímetros Navy) | ⚠️ con cita | F3: **SEE ±3,5 %** frente a hidrostático; es estimación, no medición. |
| «Este usuario tiene X % de grasa» (por pliegues) | ❌ como afirmación individual | F2: error individual grande, válido a nivel de grupo. |
| «Este es su esqueleto» (anchuras) | ✅ | Las anchuras óseas no cambian con la grasa; es el dato más estable. |
| «Este es su volumen corporal» (estimado desde perímetros) | ⚠️ con margen visible | F6: el error de predicción de parámetros segmentarios desde antropometría puede llegar al **40 %**; hay que mostrarlo como estimación con su rango, no como cifra. |
| «Su forma 3D es esta» | ❌ sin escáner | El modelo 3D será una **aproximación paramétrica**; los perímetros la constriñen, no la determinan. |
| «Su riesgo metabólico» (cintura/altura) | ✅ con la fuente | La relación cintura/altura tiene respaldo publicado y es de las pocas cosas que la cinta sí sostiene bien. |

---

## 7. Kit y guion para el usuario (caso del dueño, ~12 min)

**Instrumento:** cinta no extensible + calibre de pliegues (Harpenden/Slimguide) +
pared y libro. Nada más.

**Orden sugerido** (de arriba abajo, para no cambiar de postura):

1. Peso (en ayunas) · 2. Estatura · 3. Estatura sentado.
4. Cuello · 5. Hombros (diámetro) · 6. Pecho · 7. Cintura · 8. Cadera ·
9. **Cadera alta (boxer)** · 10. Brazo relaxed · 11. Brazo flexionado ·
12. Antebrazo · 13. Muñeca · 14. Muslo (L/R) · 15. Pantorrilla (L/R).
16. Pliegues (7 sitios) · 17. Anchuras (biacromial, biiliaco, biepicondíleo,
    rotuliano, bimaleolar).

**Cadencia:** **semanal** solo mientras cambia el objetivo o entra en una fase nueva;
en **quincenal** en mantenimiento. El motivo no es el reflejo del crecimiento
muscular sino el **ruido de medición**: si el error técnico de la cinta es de ~0,5–1 cm
y el cambio semanal de una circunferencia es menor, medir más seguido produce
tendencias inventadas. F1 trata esto con TEM explícito por medida; aquí se traduce a
«no declares tendencia entre dos puntos que están dentro del TEM».

---

## 8. Pendiente de decisión (no implementado)

1. ~~¿Añadir el **Grupo B**?~~ — **hecho 2026-10-05.**
2. ~~¿Abrir el **Grupo D** y su categoría nueva?~~ — **hecho 2026-10-05.**
3. ¿Exigir **nº de réplicas** y **TEM por medida** en el registro, en vez de una
   única cifra? **Sin decidir** (§3 lo recomienda; el registro hoy guarda un solo valor).
4. ¿Marcar en la UI qué datos del modelo 3D son **medidos** vs **estimados por
   proporción de estatura** (F5)? **Sin decidir.**
5. ¿Comprar **plicómetro** y añadir los 3 pliegues que faltan (Grupo C)?
6. ¿Corregir el origen de «shoes size 26 cm» (registrado como `foot_length` 26 con aviso
   de verificación) midiendo el pie de verdad?

Nada de esto cruza la puerta del mapa muscular por fuerza de referencia externa; es
otro eje (geometría corporal), y sigue requiriendo aprobación del propietario.
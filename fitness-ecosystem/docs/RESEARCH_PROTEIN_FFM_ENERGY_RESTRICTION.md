# Proteína y FFM en restricción energética — síntesis del meta-análisis de Refalo, Trexler & Helms

> Fecha: **2026-10-08**. Encargo del dueño: explorar como **conocimiento científico válido** el
> artículo *"Effect of Dietary Protein on Fat-Free Mass in Energy Restricted,
> Resistance-Trained Individuals: An Updated Systematic Review With Meta-Regression"*
> (NSCA *Strength & Conditioning Journal*), DOI
> [10.1519/SSC.0000000000000888](https://doi.org/10.1519/SSC.0000000000000888).
>
> **Provenance (honesta):** el **texto completo** del artículo (abstract, introducción, métodos,
> resultados, discusión, limitaciones, aplicaciones prácticas, conclusión y las tablas 1–3) se
> recuperó de la página de **texto completo abierta en Ovid** facilitada en la misión
> (<https://www.ovid.com/jnls/nsca-scj/fulltext/10.1519/ssc.0000000000000888~effect-of-dietary-protein-on-fat-free-mass-in-energy>),
> consultada el 2026-10-08. Todo lo marcado como **«del artículo»** procede literalmente de esa
> página; la lista de referencias allí aparecía truncada, así que las referencias secundarias
> clave (Longland, Helms 2014) se **verificaron aparte** contra PubMed y se citan con su PMID.
> Lo marcado como **«inferencia nuestra»** es interpretación derivada, no está en el artículo.
> **No se tocó código de esta ronda**: esto es documentación pura.

---

## 1. Referencia bibliográfica

| Campo | Valor |
| --- | --- |
| Título | Effect of Dietary Protein on Fat-Free Mass in Energy Restricted, Resistance-Trained Individuals: An Updated Systematic Review With Meta-Regression |
| Autores | Martin C. Refalo¹, Eric T. Trexler², Eric R. Helms³·⁴ |
| Revista | *Strength & Conditioning Journal* (NSCA) |
| Ficha | **48(4): 398–412, agosto 2026** (según la ficha de Ovid); publicado *online* en **enero de 2025** (ResearchGate/Google lo fechan 2025-01; ya acumula ~12 citas) |
| DOI | **10.1519/SSC.0000000000000888** |
| Protocolo/datos/código | Open Science Framework: <https://osf.io/s2bgk/> (registrado en mayo de 2024) |
| Suplemento digital | <http://links.lww.com/SCJ/A418> |

## 2. Pregunta / PICO (del artículo, §Research Questions)

- **P — Población:** adultos sanos, 18–50 años, **no obesos** (≤27,8 % GC en hombres,
  ≤39,7 % GC en mujeres), con **≥3 meses de experiencia de entrenamiento de fuerza (RT)**,
  en **restricción energética que de verdad ha producido pérdida de grasa** (≥7 días de
  intervención; RT ≥1 vez/semana, prescrito o habitual).
- **I / C — Intervención y comparación:** **no hay comparación experimental de alta vs baja
  proteína** — la proteína diaria (g/kg de masa corporal **y** g/kg de FFM) entra como
  **predictor continuo** en una meta-regresión. (Solo **5 estudios** comparaban directamente
  alta vs baja proteína: se descartó el meta-análisis clásico por insuficiencia de datos.)
- **O — Resultado:** cambio de **masa libre de grasa (FFM)** pre→post, como cambio medio
  estandarizado (SMC) por grupo, con corrección por tamaño muestral pequeño (Morris).
- **Moderadores explorados:** duración (≤4 vs >4 semanas), déficit energético (≤300 vs
  >300 kcal/día), GC basal (terciles) y sexo.
- **Diseño:** revisión sistemática **PRISMA** + **meta-regresión bayesiana** (`brms`, R;
  priors no informativos; inferencia por densidad credible — HDI 95 % y probabilidad de
  dirección `pd`).

## 3. Método en cifras (del artículo, §Methods/§Results)

| Variable | Valor |
| --- | --- |
| Búsqueda | PubMed, SCOPUS, SPORTDiscus, **20-05-2024**; actualiza la revisión de Helms 2014 (estudios pre-2013) |
| Cribado | **916** estudios recuperados → 31 cumplían criterios → **29 analizados** (2 sin datos extraíbles pese a contactar a los autores) |
| Participantes | **455 hombres + 274 mujeres = 729**; edad 24,8 ± 4,1 (hombres, rango 19,3–31,7) y 24,7 ± 5 (mujeres, 20,7–30,7) años |
| Experiencia RT | muchas estudios no la informan; el mínimo exigido iba de **3 meses a 5 años** |
| Resultados FFM | **61 medidas**: DXA 34, BIA 10, ecografía 8, pesada hidrostática 5, antropometría 4 |
| Duración | **1–21 semanas, media 8** |
| Déficit energético | estimado por cambio de grasa (9.400 kcal/kg) y de FFM (1.816,44 kcal/kg): **36–4.637 kcal, media 557**; median split ≤300 / >300; valores >2.000 «poco plausibles» sustituidos por la mediana (304) |
| Pérdida de grasa | media ≈ **14 %** del basal (≈2–68 %) |
| Proteína ingerida | **0,8–3,2 g/kgMC/día (media 1,8)**; **0,9–4,2 g/kgFFM/día (media 2,4)** |
| GC basal | hombres 7,5–27,4 % (media 16); mujeres 17,9–35 % (media 27,4) |
| RT | **13/29 estudios prescribieron** el RT; **16/29 dejaron el RT «hábito»** del sujeto |
| Calidad (TESTEX) | rango **2–15** de 15; media y mediana **8**; solo **12/29 > 10**; la calidad **no** influyó en el SMC de FFM (análisis de sensibilidad) |
| Atípicos | 5 observaciones de 3 estudios retiradas como *outliers* (influían demasiado en el ES) |

## 4. Resultados cuantitativos (del artículo, §Meta-Regression)

### 4.1 Dosis-respuesta principal — **lineal, sin techo**

El modelo **lineal sin predictores extra** fue el mejor ajuste (comparación por Factor de
Bayes; los modelos cuadrático/cúbico no ganaron). Pendientes medianas:

| Predictor | Pendiente β (por +1 g/kg/día) | 95 % HDI | `pd` | Observaciones |
| --- | --- | --- | --- | --- |
| Proteína **g/kg de masa corporal** | **+0,07** SMC | −0,01 a 0,14 | **97 %** | 56 salidas / 27 estudios |
| Proteína **g/kg de FFM** | **+0,06** SMC | **0,01 a 0,12** (no cruza cero) | **99 %** | 55 salidas / 26 estudios |

- Varianza explicada: **R² condicional ≈ 54–55 %** (HDI 33–71 %), de la cual **83–85 % es
  heterogeneidad a nivel de estudio** (`I²` estudio 85 %/83 %, grupo 8 %/9 %, observación 3 %/4 %).
- **No hay punto óptimo/techo en el rango analizado**: los modelos no lineales no ajustaron
  mejor, es decir, dentro de 0,8→3,2 g/kgMC (y 0,9→4,2 g/kgFFM) **más proteína se asocia
  linealmente con mejor FFM**, pero el artículo advierte que subir del mínimo al máximo del
  rango solo produce una diferencia de ES **«pequeña»**.
- **El umbral práctico** (donde la recta cruza un ES de 0 — punto en el que la FFM deja de
  perderse y empieza a ganarse): **1,9 g/kgMC/día** y **2,5 g/kgFFM/día**. Por encima, hasta
  los **máximos analizados (3,2 g/kgMC · 4,2 g/kgFFM)**, la relación lineal continúa.
- **Por encima y por debajo de la RDA (del artículo + inferencia):** el rango analizado
  **arranca justo en la RDA clásica de 0,8 g/kgMC/día** y la introdución sitúa
  el debate en «el doble de la recomendación»
  (**>1,6 g/kgMC/día ≈ 2× RDA**) como lo mínimo que ya aumenta FFM en balance energético.
  El artículo **no estratifica por RDA**; la lectura directa de su recta es que **por debajo
  de ~1,9 g/kgMC/día (≈2,4× RDA) la FFM media predicha queda en negativo** (pérdida), y por
  encima, en positivo — esa traducción «RDA → umbral» es **inferencia nuestra**, no un
  resultado reportado por los autores.

### 4.2 Moderadores (Tabla 2 del artículo)

| Moderador | β g/kgMC (`pd`) | β g/kgFFM (`pd`) | Lectura |
| --- | --- | --- | --- |
| Duración ≤4 sem / >4 sem | 0,05 (80 %) / 0,07 (88 %) | 0,04 (83 %) / **0,07 (95 %)** | Más claro **>4 semanas** (≤4 sem es vulnerable a cambios de fluidos en la DXA/BIA) |
| Déficit ≤300 / >300 kcal | 0,08 (85 %) / 0,04 (84 %) | 0,07 (89 %) / 0,05 (93 %) | **Similar** entre déficits pequeños y grandes |
| GC bajo / medio / alto | **0,14 (93 %)** / 0,10 (91 %) / 0,04 (78 %) | **0,12 (94 %)** / 0,07 (89 %) / 0,03 (78 %) | **Gradiente claro: cuanto más magro, más efecto** |
| Hombres / mujeres | 0,09 (98 %) / 0,05 (81 %) | 0,09 (**99 %**) / 0,02 (**69 %**) | Evidencia **fuerte en hombres, débil en mujeres** (y hay muchas menos observaciones femeninas) |

Ninguno de estos moderadores **mejoró el ajuste** del modelo global (los modelos simples con
solo proteína fueron los más parsimoniosos); los subgrupos son análisis secundarios con menos
observaciones (p. ej. GC bajo: solo 10) y, por tanto, más incertidumbre.

### 4.3 Aplicación práctica — Tabla 3 del artículo (recomendaciones **exploratorias**)

| Prioridad de retención de FFM | Riesgo / Importancia de perder FFM | Proteína sugerida |
| --- | --- | --- |
| **Alta** | Riesgo alto **e** importancia alta («higher dietary protein intakes may be prescribed when **both** risk and importance are high») | **1,9–3,2 g/kgMC/día** · **2,5–4,2 g/kgFFM/día** |
| **Media** | Condiciones mixtas (uno alto, otro bajo) | **≥1,9 g/kgMC/día** · **≥2,5 g/kgFFM/día** |
| **Baja** | Riesgo **e** importancia bajos | Hasta 1,9 g/kgMC/día · hasta 2,5 g/kgFFM/día |

> *Nota de provenance:* la extracción de texto de la Tabla 3 en Ovid llega con las columnas
> mezcladas (pares «condición → cifra» en dos líneas); los **rangos numéricos** (1,9–3,2 /
> 2,5–4,2 · ≥1,9 / ≥2,5 · ≤1,9 / ≤2,5) están literal en la tabla, y la **mapeación
> condición→fila** es nuestra lectura alineada con la frase textual de la sección práctica.

- Los **magros** (GC < ~12 % hombres / < ~20 % mujeres) deberían apuntar «cómodamente» al
  tramo alto, porque su efecto por gramo es el mayor observado (0,14/0,12 vs 0,04/0,03).
- **Preferir la escala por FFM** cuando se pueda estimar la FFM con razonable exactitud
  (es la métrica cuyo HDI no cruza cero).
- **Presupuesto calórico:** subir proteína obliga a bajar grasa o carbohidratos; el
  beneficio debe pesarse contra el coste (rendimiento con pocas glúcidas, hormonas con poca
  grasa, adherencia). El artículo recomienda además **déficits modestos** (cita que un déficit
  de ~500 kcal/día ya impidió ganar FFM) y recuerda que **un estímulo de RT robusto probablemente
  importa más que la proteína** (ejemplo citado: Longland — 4 semanas al 40 % de déficit:
  1,2 g/kg → LBM **+0,1 ± 1,0 kg**; 2,4 g/kg → **+1,2 ± 1,0 kg**; diferencia solo 1,1 kg).

## 5. Limitaciones (del artículo, §Strengths & Limitations + §Conclusion)

1. **Exploratorio, no confirmatorio**: la heterogeneidad entre estudios (I² estudio 83–85 %)
   obliga a los autores a declarar los hallazgos como **hipótesis a probar**, no como
   recomendaciones firmes.
2. **No es un ensayo de dosis**: la mayoría de estudios no comparaba proteínas; la
   meta-regresión mezcla observaciones no experimentales.
3. **Extracción de datos por un solo autor** (riesgo de error).
4. **FFM ≠ músculo esquelético**: cambia con hidratación/glicógeno; las intervenciones ≤4
   semanas son especialmente sensibles.
5. **Proteína autorreportada** en la mayoría de estudios (registros dietéticos).
6. **RT mal caracterizado**: 16/29 con RT «hábito», sin variables informadas → imposible
   usar la calidad/volumen del RT como predictor.
7. **Déficit estimado** por contenido energético de grasa/FFM, no medido; precisión desconocida.
8. **Subgrupos con poca potencia** (mujeres: 21–22 observaciones; GC bajo: 10).
9. Corte de obesidad poco convencional (≤27,8/≤39,7 % GC) y edades 18–50 → **no extrapolar a
   obesos, mayores ni sin entrenamiento**.

## 6. Qué implica para este ecosistema (inferencia nuestra, no del artículo)

- El artículo **no mide fuerza, ni rendimiento, ni adherencia**; solo FFM. Útil como
  **contexto nutricional** del bloque educativo de BodyLab y del plan de hipertrofia
  (`docs/plan_hipertrofia_abdomen.md`), **no** como recomendación personal automática.
- Los números clave que un producto podría mostrar algún día (y que hoy **no** están en el
  código): **1,9 g/kgMC** y **2,5 g/kgFFM** como suelo de retención, con tramo alto
  **2,5–4,2 g/kgFFM** solo cuando la retención de FFM es crítica. Cualquier traducción a UI
  necesita decisión del dueño: **el artículo es exploratorio y sus autores lo dicen**.
- La conclusión operativa más sólida del texto: **la proteína tiene una relación lineal real
  pero de efecto pequeño; el estímulo de RT y el tamaño del déficit pesan más.**

## 7. Veredicto de fiabilidad

| Criterio | Veredicto |
| --- | --- |
| Revisión sistemática | ✅ PRISMA, protocolo preregistrado en OSF, datos y código R publicados |
| Síntesis cuantitativa | ⚠️ Meta-**regresión** bayesiana (no meta-análisis de comparaciones directas: solo 5 ECA comparaban dosis) |
| Calidad primaria | ⚠️ TESTEX medio 8/15; 12/29 estudios >10; calidad no alteró el resultado |
| Tamaño muestral | ✅ 29 estudios / 729 participantes / 61 medidas de FFM |
| Relevancia para el dueño | ✅ Alta si está magro y en déficit; 🟡 la evidencia en mujeres es débil (pd 69–81 %) |
| Declaración de los autores | **«Exploratorio, no confirmatorio»** — respetar |

**Fuentes verificables:**

1. Artículo completo (Ovid, texto abierto): <https://www.ovid.com/jnls/nsca-scj/fulltext/10.1519/ssc.0000000000000888~effect-of-dietary-protein-on-fat-free-mass-in-energy> — DOI <https://doi.org/10.1519/SSC.0000000000000888>.
2. Protocolo, tabla de extracción y código: <https://osf.io/s2bgk/>.
3. Suplemento digital (SCJ): <http://links.lww.com/SCJ/A418>.
4. Longland TM, Oikawa SY, Mitchell CJ, Devries MC, Phillips SM. *Higher compared with lower dietary protein during an energy deficit combined with intense exercise promotes greater lean mass gain and fat mass loss: a randomized trial.* **Am J Clin Nutr 2016 Mar;103(3):738–46** — DOI 10.3945/ajcn.115.119339, **PMID 26817506** (metadatos verificados vía NCBI E-utilities, 2026-10-08). *(El ejemplo que el propio artículo cita para «el RT pesa más que la proteína».)*
5. Helms ER, Zinn C, Rowlands DS, Brown SR. *A systematic review of dietary protein during caloric restriction in resistance trained lean athletes: a case for higher intakes.* **Int J Sport Nutr Exerc Metab 2014 Apr;24(2):127–138** (epub 2013-10-02) — DOI 10.1123/ijsnem.2013-0054, **PMID 24092765** (metadatos verificados vía NCBI E-utilities, 2026-10-08). *(La revisión anterior: 2,3–3,1 g/kgFFM que este artículo actualiza.)*

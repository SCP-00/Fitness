# Fuerza frente a una referencia externa — qué se puede sostener (2026-10-20)

**Encargo:** el dueño pidió (2026-09-30) que el mapa muscular principal compare la fuerza
registrada/estimada con una **referencia externa publicada**, estratificada por sexo, peso y
**estatura**, y que la app no invente nunca. Este documento es la respuesta de investigación:
qué existe, qué admite cada fuente y qué no se puede afirmar. **No implementa nada** y no
aprueba ninguna fórmula: el mapa de fuerza sigue bajo la puerta de evidencia del brief.

Método: búsqueda de fuentes primarias/publicadas, con URL, y descarte explícito de las que no
cumplen. La conclusión se escribe en negativo porque es lo que protege al dueño de una app que
le diga «tu espalda es 62/100» sin base.

---

## 1. Dictamen

**No existe un estándar validado que, a la vez, (a) represente a la población general que
entrena, (b) compare el mismo ejercicio y protocolo que el usuario ejecuta, y (c) ajuste por
sexo, peso corporal, edad y estatura.** Por tanto `bodylab` no debe colorear un 1RM de barra
como «fuerza ajustada por estatura»: la estatura se declara **no cubierta por la fuente**.

Lo que sí existe, con límites claros:

| Uso | Fuente | Estratos que sostiene | Protocolo | Licencia |
|---|---|---|---|---|
| Comparar un **10RM** de un ejercicio de su lista | Piper et al., *Int J Strength Cond* (2 estudios: 1.095 hombres, 371 mujeres, 18–25 a) | sexo y **categorías de peso**; mide estatura pero **no publica ajuste por estatura** | **10RM medido** (pautas NSCA), mismo equipamiento del estudio | **CC BY 4.0** (reutilizable con atribución) |
| Referencia de «usuarios que registran entrenamientos» (no norma poblacional) | Strength Level | sexo, peso y **edad**; **no** estatura | 1RM **estimado** desde series de 1–10 reps | **Sin licencia abierta**; términos prohíben acceso automatizado — no incrustar tablas |
| Solo **prensión** (dinamómetro) | Statistics Canada (6–79 a, muestra nacional) y Tomkinson et al. (2,4 M adultos, percentiles y HGS/estatura²) | sexo, edad y **altura+peso como predictores** (Statistics Canada); Tomkinson normaliza por estatura² | dinamometría Smedley III / protocolos de prensión | Statistics Canada: permiso necesario para uso comercial/adaptación; Tomkinson **CC BY 4.0** |

**La estatura solo se sostiene en prensión.** Para sentadilla, banca o peso muerto no hay
corrección publicada y validada que se pueda aplicar por persona; los exponentes alométricos
dependen de la medida y de la población (Zoeller et al. muestran que el modelo con masa
corporal no ajustaba a toda la cohorte y que los exponentes cambiaban al separar por IMC). No
es una fórmula trasladable.

## 2. Las fuentes que NO se usarían como norma

- **ExRx**: tablas con sexo, peso y franjas de edad, pero la propia fuente dice que derivan de
  sistemas de clasificación de halterofilia/powerlifting y que **no son normas de fuerza**.
  Términos prohíben reproducir.
- **Symmetric Strength**: bandas de un modelo, no percentiles poblacionales; contenido
  propietario, sin permiso de reutilización.
- **NSCA/ACSM, Baechle & Earle, Heyward**: no se confirmó una tabla general de 1RM que cubra
  los cuatro estratos a la vez. Piper presenta sus 10RM precisamente como respuesta a esa
  carencia en adultos universitarios.
- **Extrapolar normas de powerlifting competitivo** a «cualquiera que entrena»: es exactamente
  lo que el brief prohíbe, y sigue sin estrato de estatura.

## 3. Qué haría la app con esto (si el dueño lo aprueba)

1. **Vista de fuerza = comparación por ejercicio y protocolo**, nunca una puntuación corporal:
   se compara el 10RM registrado con la tabla de Piper solo si (i) el ejercicio está en su
   lista, (ii) el usuario tiene 18–25 a, (iii) el registro es un 10RM real. Fuera de eso:
   **«sin referencia comparable»**, gris, con el motivo escrito.
2. **Prensión**: es el único eje con estatura defendible — y sería un eje propio, no un
   coloreado del mapa muscular.
3. **Nunca mezclar** 1RM medido con estimado, ni ejercicios con técnica distinta, ni una
   muestra específica con una persona fuera de ella. Es el riesgo principal del diseño, y es
   el que convierte un color en una afirmación falsa.
4. **Licencias**: solo Piper (CC BY 4.0) y Tomkinson (CC BY 4.0) permiten incrustar cifras con
   atribución; Statistics Canada exige permiso para uso comercial/adaptación. Nada de ExRx,
   Strength Level ni Symmetric se copia.

## 4. Lo que este documento NO resuelve (y hay que decidir)

- ¿Se acepta que el mapa de fuerza quede **sin color** hasta tener una fuente por músculo? (la
  evidencia actual no permite pintar por región: una marca de banca no mide el tríceps).
- ¿Se ofrece Piper **solo** en su ventana de edad, con la limitación escrita, o no se ofrece?
- ¿La prensión entra como eje propio del mapa o se queda fuera?

Hasta que el dueño responda, la app mantiene lo que ya hace: `Condición física` de cuerpo
completo, lente de `Entrenamiento` y lente de `Objetivos`, con la fuerza per-músculo **no**
implementada.

## 5. Fuentes

- Piper et al., hombres — <https://journal.iusca.org/index.php/Journal/article/view/40>
- Piper et al., mujeres — <https://journal.iusca.org/index.php/Journal/article/view/138>
- Strength Level, metodología — <https://strengthlevel.com/about> · términos — <https://strengthlevel.com/terms-and-conditions>
- Statistics Canada, fuerza de prensión — <https://www150.statcan.gc.ca/n1/pub/82-003-x/2016010/article/14665-eng.htm>
- Tomkinson et al., normas internacionales de prensión — <https://pmc.ncbi.nlm.nih.gov/articles/PMC11863340/>
- Zoeller et al., escalado alométrico — <https://pmc.ncbi.nlm.nih.gov/articles/PMC4107660/>
- ExRx, estándares — <https://exrx.net/Testing/WeightLifting/StrengthStandards> · legal — <https://exrx.net/Notes/Legal>
- Symmetric Strength, estándares — <https://symmetricstrength.com/standards> · términos — <https://symmetricstrength.com/terms_of_use>

Contexto interno: `docs/BUFFY_IMPLEMENTATION_BRIEF.md` §3 y §6, `docs/RESEARCH_IDEALS_BY_SPORT.md`,
`ROADMAP.md` (Fase B, mapa de fuerza).

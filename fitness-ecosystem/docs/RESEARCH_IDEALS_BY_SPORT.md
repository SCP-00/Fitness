# Investigación: el "ideal" por disciplina, edad, sexo, estatura y objetivo

**Estado:** §3 DECIDIDA y §5 APROBADA por el dueño (2026-09-30): la lente principal es
la **condición física vs promedio publicado y franja atlética** por edad/sexo/peso/estatura;
se implementan las secciones Deporte y Atractivo del onboarding y la primera fuente
(Cooper/%BF/WHtR/FFMI) en TrainingLab. Los cambios de mapa per-family siguen gated.

Tarea asignada por el dueño (2026-09-30, "Super Search Task"): ideales por
disciplina/edad/sexo/estatura/objetivo, sección **Deporte** en las preguntas iniciales
(baloncesto→potencia/salto, patinador de velocidad→velocidad máxima, corredor→resistencia),
sección **Atractivo/Handsome** para gente que no compite, rango de edad **15–90**,
y cobertura **mujeres 70 % / hombres 30 %** (mantener documentación masculina).

---

## 1. Hallazgos por capacidad (con soporte de sexo/edad por fuente)

### 1.1 Cardiorrespiratorio (VO₂max) — soporta ♀ y ♂, edad, NO estatura
- **Fuente primaria:** Cooper (1968), fórmulas `VO₂max = (d_m − 504.9)/44.73` (12 min) y
  `VO₂max = 483/t_min + 3.5` (1.5 millas). Ya implementado en `@fitness/bodylab-conditioning`
  (tabla Cooper 1968 por sexo/edad, con provenance).
- **Umbrales por sexo+edad:** Mandsager et al. (2018, JAMA Netw Open) y Kokkinos et al.
  (2022) dan percentiles de supervivencia por edad y sexo; los gráficos derivados
  (por quéiexercise,.methodología citada) convierten esos umbrales a distancias del test
  de 12 min en km para mujeres y hombres. **No sostienen ajuste por estatura** → se declara
  la brecha, no se inventa corrección (regla del dueño).
- **Cobertura 15–90:** Cooper/Mandsager cubren adultos (20–69 bien documentado);
  60+ tiene mejor ancla funcional en §1.4; 15–19 usa tablas escolares/ACE (ver §1.3).

### 1.2 Fuerza (sentadilla/banca/peso muerto) — soporta ♀ y ♂, edad, clase de peso; NO estatura
- **Fuente:** estudio 2024 con normas de competición powerlifting estratificadas por sexo,
  edad y clase de peso corporal (ya reseñada en el handoff del 2026-09-30). Limitación
  declarada: población de competidores, no población general de gimnasio.
- La estatura no es variable del modelo (la clase de peso actúa como proxy de tamaño).
  **Acción honesta:** mostrar el estrato por clase de peso y etiquetar la estatura como
  "no soportada por la fuente".

### 1.3 Potencia (salto vertical) — soporta ♀ y ♂, edad
- **Fuente:** protocolo ACE de valoración de salto vertical — tabla de normas por edad
  (15–19 … 60–69) **y sexo** (la tabla publicada incluye ambas). Referencias adultas
  convergentes: mujeres ≈ 31–40 cm, hombres ≈ 41–50 cm (topendsports / Marathon Handbook).
- **Por deporte:** benchmarks de salto vertical por deporte, sexo y nivel
  (baloncesto, voleibol, fútbol americano, etc.) — OVR Performance compila rangos por
  nivel (preparatoria/universitario/pro). Sirve como ancla de "ideal competitivo" solo
  con nivel declarado por el usuario.

### 1.4 Funcional senior 60–94 — soporta ♀ y ♂, edad (el ancla del rango 60–90)
- **Fuente:** Rikli & Jones, *Senior Fitness Test Manual* (30-s chair stand, arm curl,
  2-min step, etc.), normas por sexo y edad 60–94; validez/reliabilidad en Jones &
  Rikli (1999, PubMed 10380242, ~4 000 citas). Normas femininas 30CST: 60–64 → 12.3,
  65–69 → 11.3, 70–74 → 10.1 repeticiones (SRALab/RehabMeasures).
- Es la pieza que cubre **hasta 90 años** con respaldo publicado — clave para el objetivo
  15–90 del dueño.

### 1.5 Carrera (corredor) — soporta ♀ y ♂, edad año a año (30–110)
- **Fuente:** tablas oficiales de age-grading **WMA 2023** (World Masters Athletics,
  Appendix B; calculador canónico de Howard Grubb; USATF las adopta). Factores por sexo
  y **edad de año en año** de 30 a 110; convierten cualquier marca (5K, 10K, maratón)
  en un porcentaje frente al mejor estándar mundial de esa edad/sexo.
- La estatura no forma parte del modelo de age-grading (las marcas ya son neutrales al
  tamaño en carreras de fondo). Declararlo así evita inventar ajustes.

### 1.6 Velocidad (patinador de velocidad) — sin norma pública general
- No existe norma poblacional publicada de "velocidad máxima" para patinaje comparable al
  Cooper o al SFT. Referencias posibles: récords ISU/World Skate (élite, no población) o
  mejor marca estacional del propio usuario (self-reference, no "ideal" externo).
- **Postura honesta:** para disciplinas sin norma publicada, el mapa muestra "sin referencia
  externa" y ofrece autocomparación (mejor marca personal) claramente etiquetada.
  Preguntar al dueño si prefiere récords de élite como techo de contexto.

### 1.7 Lo que YA vive en la app (reutilizable, no duplicar)
- Cooper/FC/%BF/pliegues + J-P por sexo (`conditioning`), somatotipo Heath-Carter proxy,
  Navy tape (♀ cadera obligatoria), WHtR (Ashwell), scores antropométricos de BodyLab y
  el preset de proporción dorada (anclado a cintura) que ya alimenta la lente Objetivos
  del mapa de TrainingLab.

## 2. La vía "Atractivo/Handsome" (15–90, mujeres primero)

Qué puede ser un "ideal" honesto para quien no compite:

1. **WHtR < 0.5** (Ashwell/WHO) — válido por igual para ♀ y ♂, cualquier adulto; ya medido
   en BodyLab. Es el único indicador "estético-salud" con respaldo universal sin ajustes.
2. **%BF por sexo** — bandas ACE (fitness/atlético) y métodos J-P/Navy ya implementados con
   sitios **distintos por sexo** (J-P ♀ = tríceps/suprailiaco/muslo). Las bandas ♀
   (esencial/atlética/fitness/aceptable) son la referencia publicada aplicable.
3. **Proporción dorada / WHR ≈ 0.7** — literatura de preferencia estética cultural
   (no norma de salud). Es LEGÍTIMO solo como **preset elegido por el usuario** con
   disclosure ("meta estética personal, no un estándar de salud"), que es exactamente
   como ya vive en la lente Objetivos.
4. **Objetivos propios** — medidas objetivo introducidas por el usuario (ya soportadas
   vía export v2 + Ajustes de TrainingLab).

**Brecha declarada:** no existe un estándar publicado de proporciones femeninas por
estatura que podamos citar sin fabricar. Por regla del dueño: no se inventa; se ofrece
WHtR + %BF por sexo + presets propios, y la sección pide confirmación antes de derivar
sustitutos.

## 3. Estatura: decisión documentada (revisada 2026-09-30 tras la aclaración del dueño)

**El objetivo real del dueño (aclaración 2026-09-30):** no es el salto ni un deporte
específico — es **evaluar la condición física del usuario frente al promedio publicado
(según edad, sexo, peso y estatura) y frente a la franja de un físico atlético**, con
datos de hombres y mujeres. Eso reencuadra la pregunta: la estatura solo es un problema
cuando la *métrica* no la usa; hay métricas publicadas cuya **definición la incluye**.

| Fuente | Sexo | Edad | Peso | Estatura |
|---|---|---|---|---|
| Cooper 1968 (bandas ya en core) | ✅ | ✅ (13–50+) | — | ❌ |
| FRIEND registry (Kaminsky 2015/2022; Peterman 2020) | ✅ | ✅ (décadas 20–79) | — | ❌ (VO₂max ya es relativo al peso) |
| %BF ACE (bandas ya en core) | ✅ | adultos | ✅ (vía %BF) | ❌ |
| **FFMI (Kouri 1995)** `FFM/h²` + normalización `6.3×(1.8−h)` | ✅ (referencias ♂/♀ distintas) | adultos | ✅ | ✅ **en la definición** |
| WHtR (Ashwell) `<0.5` | ✅ | ✅ | ✅ | ✅ **en la definición** |
| Normas powerlifting 2024 | ✅ | ✅ | ✅ (clase) | ❌ |
| Rikli & Jones SFT 60–94 | ✅ | ✅ | — | ❌ |
| WMA age-grading 2023 | ✅ | ✅ | — | ❌ |

### Decisión (4 opciones comparadas)

1. **Solo lo soportado por fuente** — cada métrica se estratifica con sus variables
   reales (Cooper: sexo+edad; %BF: sexo; FFMI/WHtR: sexo+estatura+peso). Donde la fuente
   no soporta un ajuste, se declara la brecha en pantalla. ✅ **ELEGIDA**: cero invención,
   y cubre peso+estatura del dueño a través de FFMI/WHtR sin fabricar nada.
2. **Alométrico como ajuste universal** — rechazada: el paper de 2008 no valida normas
   poblacionales por estatura (handoff 2026-09-30); inventaría un multiplicador.
3. **Métricas definidas por estatura** (FFMI normalizado, WHtR, SMI si hay BIA) — ✅
   adoptada DENTRO de la opción 1: son la respuesta honesta a "qué papel juega la
   estatura". FFMI ♂ promedio ≈ 21.4 (rango atlético hasta ~25, techo natural de Kouri),
   ♀ promedio ≈ 18.0; rangos saludables publicados ♂ 18–25 / ♀ 15–22 (contexto adulto).
4. **Esperar una fuente mejor** — no bloquea: la opción 1+3 ya cubre el objetivo; si
   aparece una norma con ajuste por estatura validado, se añade como fila nueva.

### Qué implementa la decisión (la lente "Condición física")

Ejes derivados SOLO de datos ya exportados por BodyLab (v2), cada uno con banda
publicada por sexo (+edad cuando la fuente la define) y provenance visible:

- **Cardio** — Cooper 12-min clasificado por sexo+edad (13–50+ ya en core;
  FRIEND como referencia de percentiles en la documentación).
- **Composición** — %BF medido vs bandas ACE por sexo (atlética/fitness/aceptable).
- **Proporción** — WHtR `<0.5` sano / `<0.6` aumentado / `≥0.6` alto (Ashwell), por igual
  para ♀/♂.
- **Masa muscular relativa** — FFMI = FFM/altura² (+ normalización de Kouri), informativo
  con su fuente; sin percentiles inventados.

Sin el dato de entrada de un eje → ese eje se muestra como "sin dato + cómo medirlo",
nunca como 0 ni como "malo".

## 4. Cobertura mujeres-primero (70/30)

| Capacidad | Norma ♀ publicada | Estado |
|---|---|---|
| VO₂max (Cooper/Mandsager) | ✅ gráficos y umbrales por edad | Lista |
| Fuerza (powerlifting 2024) | ✅ por sexo/edad/clase | Lista (limitación poblacional declarada) |
| Potencia (ACE salto) | ✅ tabla ♀ por edad | Lista |
| Funcional 60–94 (SFT) | ✅ normas ♀ completas | Lista |
| Carrera (WMA 2023) | ✅ factores ♀ año a año | Lista |
| Estética (WHtR, %BF ♀, J-P ♀) | ✅ ya en core | Lista |
| Velocidad (patinaje) | ❌ sin norma pública | Autocomparación etiquetada + pregunta al dueño |

## 5. Propuesta de producto (pendiente de aprobación): secciones nuevas en las preguntas iniciales

### 5.1 Sección "Deporte" (BodyLab onboarding + TrainingLab Ajustes)
- Campos: `profile.sport` (lista cerrada: general, correr, baloncesto, patinaje velocidad,
  …extensible), `profile.sportFocus` (potencia | resistencia | velocidad | movilidad).
- Efecto downstream: elige el **eje por defecto** de la lente "ideal" del mapa
  (baloncesto→salto ACE; corredor→WMA age-grade/VO₂max; patinador→autocomparación
  etiquetada hasta decidir récords) y prioriza ejes de acondicionamiento.
- Estratificación solo por variables de la fuente (§3); la estatura se muestra tal cual
  con su brecha declarada.

### 5.2 Sección "Atractivo" (objetivo estético, no competitivo)
- Campos: `profile.objective = 'handsome'` + preset estético elegible
  (WHtR < 0.5 · bandas %BF ACE por sexo · proporción dorada · objetivos propios).
- Disclosure obligatorio en pantalla: "meta estética personal; no es un estándar médico".
- No compite con la lente de fuerza externa: es otra etiqueta de objetivo, y la lente
  antropométrica existente se conserva **distinta** hasta que el dueño apruebe su fusión.

### 5.3 Edad 15–90
- 15–19: tablas ACE (salto) y escolares; 20–59: Cooper/Mandsager + powerlifting 2024;
  60–94: Rikli & Jones. El selector elige la fuente por tramo y muestra siempre cuál.

## 6. Siguiente paso seguro
1. El dueño aprueba/ajusta §5 (campos, disciplinas iniciales, preset estético).
2. Implementar campos + secciones en onboarding (EN/ES), con tests del tramo de edad.
3. Después y por separado: conectar cada disciplina a su fuente en la lente "ideal"
   (empezando por ♀ 20–59 Cooper y ACE salto, que ya tienen datos en core/protocolo).

## 7. Fuentes
- Cooper, K.H. (1968). *JAMA* 203:201–204. — fórmula y test de 12 min.
- Mandsager, K. et al. (2018). *JAMA Netw Open* 1(6):e186095. — percentiles VO₂max por edad/sexo.
- Kokkinos, P. et al. (2022). — validación de estándares VO₂max (vía whyiexercise, metodología citada).
- Jones, C.J., Rikli, R.E. (1999). 30-s chair stand, PubMed 10380242; *Senior Fitness Test Manual* (normas 60–94 por sexo); SRALab RehabMeasures 30CST.
- ACE — *Vertical Jump Assessment Protocol* (normas por edad y sexo).
- World Masters Athletics (2023). *Age Grading Tables, Appendix B*; calculador canónico H. Grubb; USATF calculators.
- Powerlifting norms study (2024) — reseñada en `AGENT_HANDOFF.md` (2026-09-30), limitaciones declaradas.
- Vanderburgh, P.M. (2008) escalado alométrico fuerza/talla — insuficiente como norma general (handoff).
- Ashwell, M. et al. — WHtR < 0.5 (ya implementado); bandas ACE %BF; Hodgdon & Beckett (1984) Navy; JPW (1980).

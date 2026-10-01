# REPORTE DE EVALUACIÓN UI/UX Y PLAN DE MEJORA: TRAININGLAB

> **Fecha:** 2026-10-01  
> **Ámbito:** TrainingLab (PC Desktop / Laptop vs. Móvil Web)  
> **Documentos de Referencia Analizados:**  
> - `fitness-ecosystem/docs/UI_DESIGN.md`  
> - `fitness-ecosystem/docs/TRAININGLAB_UI_PLAN.md`  
> - `fitness-ecosystem/docs/plan_evaluacion_qa_ui_ux.md`  
> - Componentes clave: `TodayScreen.tsx`, `ProgressScreen.tsx`, `BodyMap.tsx`, `ZenSession.tsx`, `SettingsScreen.tsx`  

---

## 1. Diagnóstico y Veredicto Ejecutivo

Tras una lectura exhaustiva de los contratos de diseño y las auditorías ergonómicas del proyecto, se identifican las fortalezas y áreas críticas de mejora:

1. **Fortalezas del Sistema Actual:**
   - La paleta fría de superficies (`#080b0e` a `#1b2229`) con acento ámbar/naranja (`#ff7300`) y tokens de contraste medido (WCAG AA/AAA) está consolidada y bien estructurada.
   - La arquitectura modular (`app/`, `ui/`, `screens/`, `features/`, `lib/`) con 6 destinos limpios por hash router (`#/hoy`, `#/ejercicios`, `#/semana`, `#/sesion`, `#/progreso`, `#/ajustes`) evita dependencias pesadas y permite transiciones inmediatas 100% offline.
   - El sistema de dibujo anatómico 2D con máscara de píxeles (`BodyMap.tsx`) soporta de forma nativa tanto el modelo masculino como el femenino (`Modelo2D_Woman.png`) con las 13 familias musculares.

2. **Áreas Críticas de Fricción Identificadas:**
   - **Inicio (Home / TodayScreen):** Riesgo de redundancia entre el botón "Empezar entrenamiento" del Hero y el registro manual directo en las tarjetas de ejercicios (`SlotCard`). Falta mayor densidad y aprovechamiento horizontal en laptops (≥1024px) para evitar sensación de "app móvil estirada".
   - **Progreso (ProgressScreen & BodyMap):**
     - El cambio entre el modelo anatómico masculino y femenino estaba relegado a los Ajustes globales, impidiendo alternar de forma inmediata en la pantalla de Progreso para comparar la anatomía femenina.
     - Las lentes de "Estímulo de Entrenamiento" (volumen real registrado) y "Objetivos Antropométricos" (medidas BodyLab / cintura) requieren una delimitación conceptual nítida frente a la tarjeta de "Condición física" (fuerza/resistencia global de normas externas).
   - **Entrenamiento (ZEN / ZenSession):**
     - En Desktop/Laptop faltaba el flujo clave de teclado: `Peso → Enter → Reps → Enter` para registrar serie sin levantar las manos del teclado.
     - En móvil, se debe asegurar que el botón de registrar serie se mantenga accesible y no quede tapado por elementos flotantes.
   - **Ajustes (SettingsScreen):**
     - Excelente organización en acordeones temáticos, pero requiere verificar que ningún botón o enlace quede huérfano y que la jerarquía de opciones sea intuitiva.

---

## 2. Decisión Estratégica: Laptop / PC vs. Móvil

### Pregunta del Dueño:
> *¿El foco debe ser en Laptop, dejando la interfaz móvil quieta hasta que comience la aplicación Android?*

### Decisión y Recomendación:
**Estrategia "Desktop-First en Potencia y Densidad + Mobile Protegido (Zero Regressions)":**

1. **85% del Foco en Laptop / PC:**
   - En laptop, el usuario dispone de teclado físico, ratón/trackpad y pantallas anchas (1366×768 hasta 1920×1080).
   - Se prioriza el aprovechamiento multi-columna, alta densidad de datos, atajos de teclado instantáneos (`Enter` para avanzar/guardar), inspección anatómica amplia y paneles de control sin scrolling innecesario.
2. **15% en Móvil (Modo Guardián de Estabilidad):**
   - **NO congelar ni romper móvil:** Dejar móvil completamente estático causaría regresiones en los tests automatizados (`audit-app-behavior.mjs`), en la suite Playwright y en las pruebas LAN desde el iPhone del usuario.
   - **Política limpia:** Todo cambio que se implemente para PC debe usar clases responsivas (`md:`, `lg:`) que mantengan en móvil un flujo vertical natural, sin desbordamientos horizontales (`overflow-x`), con áreas táctiles mínimas de 44 px y legibilidad protegida.
   - Cuando comience el desarrollo de la aplicación Android dedicada, se implementarán los patrones nativos específicos (gestos, teclados nativos, bottom sheets del sistema), evitando perder tiempo ahora en emular hacks de navegadores móviles.

---

## 3. Plan de Acción Detallado por Pantalla

### 3.1. Pantalla de Inicio (Home)
- **Claridad de jerarquía:** Dejar cristalino el rol del Hero (arrancar o continuar la sesión en ZEN) vs. la lista de ejercicios del día.
- **Optimización de rejilla en Laptop (≥1024px):** Ajustar la proporción de la columna principal frente al panel lateral (readiness + última sesión) para que no haya espacios vacíos excesivos.
- **Eliminación de redundancias:** Consolidar notas y estados para que la pantalla responda en menos de 5 segundos: *¿Qué me toca entrenar y cómo estoy hoy?*

### 3.2. Pantalla de Progreso (ProgressScreen & BodyMap)
- **Selector directo de Figura 2D:** Incorporar en la cabecera del análisis corporal un conmutador rápido para alternar entre la figura **Masculina (♂)** y **Femenina (♀)** de forma directa en Progreso, sincronizándose con las preferencias del usuario.
- **Claridad de Lentes:**
  - Lente 1: **Estímulo / Exposición** (volumen de series de las últimas semanas coloreado en verde/ámbar/rojo).
  - Lente 2: **Objetivos Antropométricos** (cercanía a proporciones ideales/medidas de BodyLab).
  - Separación de la tarjeta **Condición física** (Cooper, %BF, WHtR, FFMI) con sus fuentes publicadas explícitas.

### 3.3. Modo Entrenamiento (ZEN)
- **Flujo de teclado en Laptop (P0 Ergonómico):**
  - Input de Carga (`weight`): Al pulsar `Enter`, saltar automáticamente al input de Repeticiones.
  - Input de Repeticiones (`reps`): Al pulsar `Enter`, registrar la serie automáticamente y devolver el foco al input de carga para la siguiente serie.
- **Acción Móvil:** Garantizar que el selector de esfuerzo (RIR) se mantenga plegado por defecto para no competir con el botón de registrar.

### 3.4. Pantalla de Ajustes
- Inspección de todos los paneles y enlaces.
- Claridad en el estado de conexión con BodyLab y exportación/importación de copias de seguridad.

---

## 4. Estado de Verificación y Entregables
- Suites de pruebas (`pnpm test`): **932/932, 60 archivos, EXIT 0** (actualizado el 2026-10-01 (o)).
- Verificación de tipos (`pnpm typecheck` y TrainingLab `tsc -b`) y empaquetado (`vite build`): Exitoso.
- Lint (`pnpm lint`): **0 avisos / 0 errores**.
- Auditoría de comportamiento responsivo (97 PASS / 0 FAIL a 320–1440 px).

---

## 5. Backend: modelo de decisión propio (nuevo, 2026-10-01)

> El foco pasó de la interfaz al **motor de decisión**. Informe completo:
> [`docs/LAYAS_MODELO_DECISION.md`](fitness-ecosystem/docs/LAYAS_MODELO_DECISION.md).

- **Qué se hizo.** Contrato tipado del modelo de decisión (familia LAYA) en
  `bodylab/core/training/src/laya.ts` — estado acotado con bandera de truncado, techo duro de
  20 opciones (descomposición familia → ejercicio), `noul` descartada por su fallo documentado,
  y salida como `modelScores` sobre el **suelo determinista** que ya existía. Tubería de
  entrenamiento **RLCD** en `ml/laya/` (espejo en Python, constructor de conjuntos desde el CSV
  real, etiquetador débil, métricas publicadas, calibración de temperatura y CLI), con un
  **fixture dorado** que ata TypeScript y Python.
- **Python o Rust.** Python para entrenar, TypeScript para ejecutar. Portar RLCD a Rust
  quedaría por detrás de la receta publicada y no aporta nada perceptible al usuario.
- **Unsloth Studio** no puede entrenar LAYA: está orientado a LLM autorregresivos con LoRA.
  Se reserva para el LLM local **opcional** que solo narra la decisión.
- **Vulkan: no es viable.** PyTorch no tiene backend Vulkan y ONNX Runtime nunca publicó el
  suyo. Las vías reales son CUDA (NVIDIA — la de esta máquina), XPU, MPS, CPU y **DirectML**
  para inferencia en Windows sobre cualquier GPU DirectX 12.
- **Números medidos antes de entrenar.** `pytest` 38/38 con el bucle RLCD real; línea base del
  suelo sobre el corpus sintético: 1 759 decisiones, accuracy 0,7419 y ECE 0,2581 — que es
  exactamente `1 − accuracy` **por construcción** (el suelo es determinista y no expresa
  incertidumbre). Está ahí para justificar el entrenamiento, no para compararse.
- **Pendiente y bloqueado por datos.** No hay registro real en el repositorio, así que no hay
  entrenamiento real ni medición «después». Además, la RTX 3050 de 6 GB no aguanta un ajuste
  fino completo de 421 M: la ruta recomendada es **Kaggle 2×T4** (gratis, y la que el notebook
  de referencia soporta). LoRA/QLoRA y la exportación ONNX **no están implementados**.
- **Puertas que siguen cerradas:** el heatmap de fuerza frente a referencia externa publicada y
  la integración del prototipo independiente del mapa. Este trabajo decide **qué ejercicio**,
  nunca **cuánta fuerza**.

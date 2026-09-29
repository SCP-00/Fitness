# Plan de Modelado 3D — Huesos y Músculos (hombre estándar)

**Fecha:** 2026-09-07 · **Estado:** EN EJECUCIÓN (trabajo autónomo)
**Decisión previa:** ver `docs/ENGINE_RESEARCH.md` — Blender 5.2 (CLI headless)
como motor de diseño; OxiHuman descartado como base de cuerpo ("no me gusta").

## 0. Misión

Construir **desde cero** un modelo anatómico 3D de un **hombre de dimensiones
estándar** (estatura y perímetros de referencia CDC/ANSUR para adulto joven):
esqueleto completo + musculatura principal, en Blender, con pipeline 100% CLI
(headless `bpy`), para alimentar la web app con glTF/GLB y servir de base al
futuro modelo paramétrico propio.

## 1. Motor gráfico elegido: Blender 5.2 (CLI headless)

**Por qué Blender y no otra cosa** (investigación del 2026-09-07):
- **100% CLI**: `blender --background --python script.py` — generación,
  modificación y export sin GUI. Yo trabajo por terminal; encaja perfecto.
- **bpy como módulo Python** (PyPI, wheels para Python 3.11 — el equipo tiene
  3.11.15): el mismo código de scripts corre dentro y fuera de Blender.
- **glTF 2.0 nativo** (exportador oficial, Khronos): el formato destino de la
  web app (three.js) sin conversores externos.
- **GPL-2-or-later no contamina los assets**: los .blend/glTF que produzca son
  míos (la GPL aplica al programa, no a la obra generada).
- Instalado ya: **Blender 5.2.1 LTS** en `C:\Program Files\Blender Foundation\Blender 5.2\`.

**Alternativas evaluadas y descartadas:** OpenSim (simulación biomecánica, no
render; geometría de huesos limitada), Sloyd/avatars web (servidor, no CLI,
no offline), modelado a mano (no soy artista 3D; el CLI es mi mano).

## 2. Fuentes anatómicas ya existentes (agilizar el proceso)

| Fuente | Qué da | Licencia | Uso en el plan |
|---|---|---|---|
| **Z-Anatomy** (`resources/anatomy/`) | Atlas completo en .blend: ~1.300+ estructuras (huesos, músculos con inserciones, órganos), narrado ES/EN | **CC-BY-SA 4.0** (modelos derivados de BodyParts3D CC-BY-SA 2.1 JP) | **Fuente primaria de geometría anatómica** — se extrae por estructura con bpy, se decima y se exporta a GLB |
| **BodyParts3D / Anatomography** | ~151 huesos + músculos como OBJ/STL por pieza (FMA IDs) | CC-BY-SA 2.1 JP | Respaldo por-pieza si falta algo en Z-Anatomy |
| **OpenSim** (simtk) | Modelos biomecánicos con huesos + 163 paquetes musculares (geometrías simples) | Libre (simtk) | Referencia de nombres/paths musculares, no geometría final |
| **body-muscles** (npm, ya en el repo) | Mapa SVG 2D con 70+ músculos | (ya integrado) | Solo 2D; NO se usa para el 3D |
| **MakeHuman targets CC0** | Morfs de proporción | CC0 | Futuro modelo paramétrico propio |

**Atribución obligatoria** (CC-BY-SA): acreditar en `THIRD_PARTY_NOTICES.md` y
en la app: "BodyParts3D — The Database Center for Life Science — CC-BY-SA 2.1
Japan" + "Z-Anatomy — The libre 3D atlas of anatomy — CC-BY-SA 4.0". Las
derivaciones deben compartir la misma licencia (ShareAlike).

## 3. Dimensiones del hombre estándar (objetivo de escala)

Referencia: CDC/ANSUR II media adulto joven masculino occidental.
- **Estatura:** 175.3 cm (media ANSUR II hombre)
- Masa de referencia: ~78 kg (CDC)
- Perímetros de calibración: pecho 99.5 cm · cintura 88.0 cm · cadera 98.0 cm
- Proporciones: envergadura ≈ estatura; mitad del cuerpo = sínfisis púbica

El ensamblaje se **escala y valida** contra estas cifras con el medidor de
secciones de Blender (script de verificación de perímetros por rebanada).

## 4. Arquitectura del pipeline (todo CLI, reproducible)

```
resources/anatomy/Z-Anatomy.zip            (fuente, CC-BY-SA)
        │ unzip → Z-Anatomy.blend
        ▼
bodylab/tools/anatomy/01_inventory.py      bpy: lista objetos/huesos/músculos → JSON
        ▼
bodylab/tools/anatomy/02_extract.py        bpy: filtra esqueleto+musculatura,
        │                                   limpia, aplica transforms, decimate
        ▼
bodylab/tools/anatomy/03_assemble.py       bpy: escena limpia hombre estándar,
        │                                   escala 175.3 cm, origenes en joints
        ▼
bodylab/tools/anatomy/04_validate.py       bpy: mide perímetros/estatura → reporte
        ▼
bodylab/apps/web/public/anatomy/*.glb      GLB por sistema + maestro jerárquico
        ▼
web app (three.js GLTFLoader)              visor anatómico: capas hueso/músculo,
                                            picking, opacidad por estructura
```

Principios:
- **Cada script es idempotente** y corre con `blender --background --python X.py -- args`.
- **Inventario primero** (nunca asumir nombres de objetos): el .blend de
  Z-Anatomy es un template con jerarquía propia; se mapea a un manifiesto JSON.
- **GLB por sistema** (esqueleto.glb, muscular.glb) + un maestro con colecciones
  anidadas; la web carga bajo demanda (lazy por capas).
- **Presupuesto de polígonos**: esqueleto ≤ 250k tris total, músculos ≤ 400k tris
  total (decimate ratio guiado por inventario; los GLB quedan < 12 MB cada uno).
- **Nomenclatura estable**: `bone.<fma_id|nombre_snake>` y `muscle.<nombre_snake>`
  — la app puede hacer picking por nombre sin tabla frágil.

## 5. Fases de ejecución (trabajo autónomo)

- **F0 — Descarga y verificación** (hoy): Z-Anatomy.zip + TA2.csv (terminología
  anatómica TA2 del propio repo, útil para nombres ES/EN por estructura).
- **F1 — Inventario headless**: abrir el .blend con bpy, volcar jerarquía
  (colecciones, objetos, polígonos, materiales) a `anatomy_inventory.json`.
- **F2 — Extracción**: aislar esqueleto y musculatura, quitar órganos/piel/nervios,
  limpiar (merge by distance, aplicar transforms), decimar a presupuesto.
- **F3 — Ensamblaje del hombre estándar**: montar la escena anatómica completa,
  escalar a 175.3 cm, verificar perímetros objetivo (script 04), ajustar.
- **F4 — Export web**: GLB por sistema + maestro; DRACO opcional si hace falta
  (three.js ya soporta DRACOLoader); probar carga en la app (CDP).
- **F5 — Visor en la app**: nueva vista "Anatomía" con capas (esqueleto /
  muscular / piel futura), picking por estructura con nombre ES/EN (TA2),
  opacidad por sistema, integración con el heatmap 2D existente (mismo id de
  músculo entre 2D y 3D).
- **F6 — Paramétrico propio (futuro)**: con la base lista, estudiar rig
  MakeHuman-style con targets CC0 sobre NUESTRA malla — el sueño completo.

## 6. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El .blend de Z-Anatomy pesa y es complejo (1.300+ objetos) | Inventario primero; extracción por colecciones; nunca editar a mano |
| Objatos con escala no aplicada / orígenes raros | Paso de limpieza obligatorio (apply transforms, set origin) antes de exportar |
| GLB demasiado pesado para la web | Decimate guiado + presupuesto por sistema + DRACO si hace falta |
| Licencia ShareAlike en la app | Atribución visible + aviso legal en NOTICE/THIRD_PARTY_NOTICES; la geometría derivada queda CC-BY-SA |
| Blender 5.x cambia APIs vs 3.x (Z-Anatomy es 3.1) | Si el template no abre en 5.2, abrir con Blender 3.1 LTS portable solo para extraer, y el resto del pipeline en 5.2 |

## 7. Estado de ejecución (se actualiza al avanzar)

- [x] Decisión de motor: Blender 5.2 CLI (instalado, `--version` OK)
- [x] Prototipo 3d-next eliminado (petición explícita del usuario)
- [x] **F0:** Z-Anatomy.zip (86.7 MB → 294 MB expandido) + TA2.csv (1.5 MB) en `resources/anatomy/`
- [x] **F1:** inventario headless OK — 7,184 objetos (4,569 mallas, 2.09 M vértices, 4.10 M tris); 10,040 colecciones. Sistemas clave: `1: Skeletal system` (1,244 mallas, 599k tris), `4: Muscular system` (789 mallas, 2.14 M tris), `2: Muscular insertions` (705), `3: Joints` (480). Nomenclatura con sufijos: `.j` parte ósea, `.i` inserción, `.l/.r` lados, `.t/.s` zonas, `.g` grupos, `.ol/.or/.el/.er` orígenes/inserciones
- [x] **F2:** `02_extract.py` → `anatomy-skeleton.glb` (10.1 MB, 598,529 tris, 1,243 piezas) + `anatomy-muscles.glb` (26.5 MB, 2,137,481 tris, 788 piezas) en `apps/web/public/anatomy/`
- [x] **F3:** validación de escala — bounding box 0.669 × 0.25 × **1.696 m** (estatura ~1.70 m ≈ objetivo 175.3 cm; calibración fina pendiente en F4). El modelo trae SU propia escala física (1 unidad = 1 m), coherente entre ambos GLB
- [x] **F4 — Calibración** (`05_calibrate.py`): escala compartida esqueleto+músculos (factor 1.033456, transforma nodos, preserva mallas compartidas) → estatura del esqueleto **1.753 m exactos**, suelo en Z=0 (unión), centrado en X/Y. GLBs calibrados de reserva en `resources/anatomy/exports/` (`*-calibrated.glb` + `calibration_report.json`)
- [x] **F4 — Decimación web** (`06_decimate.py` + gltf-transform): músculos 1.28 M → **1.05 M tris únicos** (ratio 0.82, 358/411 mallas únicas; mallas <400 tris intactas, UVs fuera — sin texturas de imagen), luego **quantize 14-bit** + **EXT_meshopt_compression**. Resultado final en `apps/web/public/anatomy/`: músculos **26.76 → 5.61 MB**, esqueleto **10.13 → 2.66 MB** (total 8.3 MB). QA visual (`07_render_qa.py`): **0.06% / 0.04%** de píxeles cambian vs full-res (frontal / 3/4) — pérdida visual imperceptible. Validación post-compresión: 1.753 m exactos, 277+683 objetos íntegros. Reports en `resources/anatomy/exports/` (`decimation_report.json`, `validate_report.json`, `qa/`)
- [ ] **F5:** visor en la app (capas hueso/músculo, picking por nombre, nombres ES via TA2.csv). **Requisito:** `GLTFLoader.setMeshoptDecoder(MeshoptDecoder)` — three 0.185 lo trae en `three/examples/jsm/libs/meshopt_decoder.module.js`
- Nota F1: el .blend abre limpio en Blender 5.2 (sin recurrir a 3.1); scripts internos del template se desactivan solos en headless
- Nota F2: solo se exportaron piezas .j/.l/.r/.i y sin sufijo (se excluyeron .ol/.or/.el/.er y zonas .t/.s de huesos — piezas internas no visibles); 2 objetos con sufijo desconocido se descartaron por seguridad

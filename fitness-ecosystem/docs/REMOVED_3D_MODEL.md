# El modelo 3D de BodyLab — qué fue y por qué se eliminó

> **Estado: eliminado el 2026-10-23, por decisión del dueño («no lo deshabilites, elimínalo»).**
> Este documento es el registro histórico del intento. No describe código que exista hoy:
> todo lo que se lista abajo fue borrado del árbol de trabajo, no comentado ni apagado
> detrás de un flag.

## 1. Qué existía

BodyLab tuvo un visor de cuerpo humano paramétrico en 3D, accesible desde `/body` con un
conmutador **2D · 3D** en la barra del explorador corporal. No era una foto ni un escaneo:
un motor WASM construía una malla a partir de parámetros antropométricos y un solver la
ajustaba a las medidas reales del perfil.

| Pieza | Archivo / activo | Tamaño |
| --- | --- | --- |
| Visor React (escena, cámara, luces, material de piel, paleta de tonos, presets) | `bodylab/apps/web/src/components/BodyViewer3D.tsx` | 1 159 líneas |
| Carga del motor WASM (glue del vendedor importado como módulo data-URL) | `bodylab/apps/web/src/lib/oxihuman-loader.ts` | — |
| Mapeo medidas → parámetros del motor + solver de ajuste | `bodylab/apps/web/src/lib/morph-mapper.ts` | — |
| Parser y validador de la malla binaria OXIM | `bodylab/apps/web/src/lib/oxim-parser.ts` | — |
| Motor OxiHuman 0.2.1 (glue + binario + tipos) | `bodylab/apps/web/public/wasm/oxihuman_wasm.*` | 820 KB |
| Pack de activos OHPK v1 (SHA-256 `09c4bb1f…`, verificado contra upstream `v0.2.1`) | `bodylab/apps/web/public/oxihuman-core-v1.ohpk` | 2,0 MB |
| Modo rayos X: atlas anatómico Z-Anatomy (músculos + esqueleto, GLB meshopt) | `bodylab/apps/web/src/lib/anatomy-loader.ts` + `public/anatomy/*.glb` | 7,9 MB |
| Clasificación de grupos musculares del atlas (aislar, ocultar, teñir) | `bodylab/apps/web/src/lib/muscle-groups.ts` | — |
| Adaptador de integración (API de clase, no usada por la app) | `bodylab/integrations/oxihuman/` | 3 archivos |
| Página de previsualización del atlas | `bodylab/apps/web/public/anatomy-preview.html` | — |
| Dependencias | `three`, `@types/three` en `bodylab/apps/web/package.json` | — |

Se construyó en varias rondas entre septiembre y octubre de 2026: motor 0.2.0 → P0 por
desajuste de formato pack/engine (`RuntimeError: unreachable` al leer el OHPK v1) → motor
0.2.1 vendorizado byte a byte del demo del vendedor y pack verificado por SHA-256 → solver
de ajuste contra medidas reales → modo rayos X con el atlas anatómico escalado al cuerpo
ajustado → capas por grupo muscular teñidas con los datos del usuario.

## 2. Por qué se eliminó

El propio roadmap lo dejó escrito antes de la decisión: el cuello de botella no era el
activo sino **el flujo y el valor** del visor (`ROADMAP.md`, BL-3D-005: «queja *no es útil*»).
Un cuerpo genérico que se ajusta a cuatro perímetros no responde a ninguna pregunta que el
usuario no responda ya mejor con las medidas, los scores y el mapa 2D; y el coste era real:
~11 MB de activos, una dependencia de renderizado completa, un motor WASM de un tercero que
solo existe vendorizado (nunca publicado en npm), un atlas con licencia CC BY-SA y una
superficie de test que ningún runner sin GPU podía cubrir.

Se mantiene por tanto **una sola vista corporal**, el mapa muscular 2D, que sí se alimenta
de los scores antropométricos y es la que se usa.

## 3. Qué se borró exactamente

- Código: los cinco módulos de `src/` de la tabla anterior, el componente del visor, el
  adaptador `bodylab/integrations/oxihuman/`, el conmutador 2D/3D de `BodyToolbar`, el
  estado `bodyViewMode`/`SET_BODY_VIEW_MODE` del store y el atajo de teclado `2`.
- Activos: `public/wasm/` completo, `public/oxihuman-core-v1.ohpk`, `public/anatomy/`
  completo y `public/anatomy-preview.html`.
- Dependencias: `three` y `@types/three`; lockfile regenerado.
- Seguridad: el CSP de producción (web y `tauri.conf.json`) dejó de necesitar
  `'wasm-unsafe-eval'` y el `data:` de `script-src`.
- Tests: `tests/anthropometry/test_oxim_parser.test.ts`,
  `tests/integrations/test_oxihuman_adapter.test.ts`,
  `tests/adversarial/test_parser_adversarial.test.ts`,
  `apps/web/src/__tests__/muscle-groups.test.ts`,
  `apps/web/e2e/anatomy-xray.spec.ts`, los dos casos 3D de `e2e/product.spec.ts` y las dos
  secciones 3D de `apps/web/src/__tests__/integration-total.test.ts`.
- Metadatos de recursos: `resources/manifests/oxihuman.json`, `makehuman.json` y
  `z-anatomy.json`.
- Atribuciones que solo existían por este motor (OxiHuman/Apache-2.0, MakeHuman/CC0,
  Z-Anatomy/CC BY-SA) en `NOTICE` y `THIRD_PARTY_NOTICES.md`.

## 4. Qué sobrevive

- El mapa muscular 2D (`components/BodyMap.tsx` + `body-muscles`), la leyenda de scores, el
  panel de simetría, el log de ejercicio y las figuras esquemáticas del protocolo de
  medición. Nada de eso dependía del visor.
- La documentación de medición (`docs/ANTHROPOMETRY_MEASUREMENT_PROTOCOL.md`), que ya
  advertía de que un modelo paramétrico **constriñe** los perímetros, no los determina.
- El registro en `CHANGELOG.md` de las rondas que lo construyeron, y en el historial de git
  el código completo hasta el commit `729c729` (último con 3D).

> Los informes técnicos de `docs/ieee/` (`bodylab.tex` y su PDF) se conservan **como
> instantáneas fechadas** del estado anterior a esta eliminación; no se reescriben.

## 5. Si algún día se quisiera recuperar

El código está en el historial de git (todo el bloque anterior a `729c729`), y el upstream
es `https://github.com/cool-japan/oxihuman` (Apache-2.0, activos CC0). Cualquier reintento
debería empezar por responder la pregunta que hundió esta versión: **qué decisión del
usuario cambia al ver un cuerpo 3D que no cambie ya con el mapa 2D y las medidas**. Si la
respuesta no existe, no merece los 11 MB ni el motor.

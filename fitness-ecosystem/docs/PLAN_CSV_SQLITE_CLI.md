# Plan: datos para el LLM — export CSV, espejo SQLite y CLI de datos

> **Tipo:** diseño técnico + registro de lo implementado.
> **Fecha:** 2026-09-30 (sesión k).
> **Ámbito:** TrainingLab (datos propios), scripts del monorepo. BodyLab no cambia.
> **Petición del propietario:** «un export que permita generar un CSV que pueda leer el LLM y
> también que los usuarios puedan usar como Excel, pero internamente se usará SQLite para
> mayor agilidad con backend python en pandas o tecnología backend equivalente que el modelo
> LLM pueda usar para manipular la aplicación… es hora de ir pensando en el CLI que usará el
> LLM para optimizarlo y hacer pruebas. No es necesario aún usar Qwen3.5-4B; con que Buffy
> use el CLI para verificar los cambios es suficiente.»

---

## 1. Resumen ejecutivo

La entrega tiene tres piezas, de menor a mayor alcance:

1. **CSV de series registradas** (`Exportar CSV` en Ajustes): un archivo plano, estable y
   legible por humanos, por Excel (es-ES) y por cualquier LLM. Es el contrato de datos.
2. **Espejo SQLite** alimentado desde ese CSV: la «agilidad» que pide el propietario.
   Se implementa sobre el módulo incorporado `node:sqlite` (Node ≥ 22.5), el mismo motor que
   ya usa el store LAN opcional (`scripts/lan-store.mjs`).
3. **CLI de datos** (`scripts/fitness-data-cli.mjs`): el punto de entrada que un LLM (Buffy
   hoy, Qwen mañana) usa para ingerir, consultar con SQL, resumir y volver a exportar.

**Decisión clave:** no se añade Python/pandas como dependencia. El repo es Node puro, sin
dependencias nuevas y 100 % offline; el «backend equivalente» es `node:sqlite` + un CLI con
SQL y salida JSON. Pandas sigue siendo un consumidor posible del CSV (receta documentada en
§3.4), no un requisito. Si algún día se quiere un puente Python real, será un adaptador
opcional sobre el mismo CSV/SQLite (fase F3).

**Frontera explícita:** este plan NO toca IndexedDB (la app sigue siendo la dueña de sus
datos), NO expone SQL por HTTP (el store LAN no cambia) y NO envía nada a la red.

---

## 2. Pieza 1 — El CSV en la app (contrato de datos)

### 2.1 Por qué un CSV y no JSON

El propietario lo pidió con dos consumidores a la vez: **Excel** y **LLM**. Un CSV plano con
cabecera es lo único que ambos abren sin herramientas: Excel hace la tabla sola y cualquier
LLM lo lee como texto tabulado (y lo convierte a dataframe con una línea). El JSON de backup
completo queda para F2 (restauración de la app), con otro propósito.

### 2.2 Formato (decidido para Excel es-ES, sin sacrificar al LLM)

| Regla                 | Valor                               | Motivo                                                                                      |
| --------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------- |
| Codificación          | **UTF-8 con BOM** (`\uFEFF`)        | Excel en Windows abre acentos y `ñ` bien; LLM/pandas lo ignoran.                            |
| Fin de línea          | CRLF                                | Excel clásico; los parsers aceptan ambos.                                                   |
| Delimitador           | `;`                                 | **Excel es-ES usa `;` como separador de lista**; con `,` la tabla sale en una sola columna. |
| Decimal               | **coma** (`62,5`)                   | Excel es-ES interpreta `62,5` como número; con punto lo degrada. Pandas: `decimal=','`.     |
| Comillas              | RFC 4180 (`"…"`, `""` para comilla) | Campos con `;`, salto de línea o comillas.                                                  |
| Codificación de nulos | campo vacío                         | Legible y parseable.                                                                        |

> El CLI (§3) acepta además `,` como delimitador y `.` como decimal: **exporta cómodo para
> Excel, ingesta tolerante para el LLM**. La tolerancia es del lector, no del formato.

### 2.3 Columnas (`traininglab-sets-YYYYMMDD-HHMM.csv`)

Una fila por serie registrada (incluidos los calentamientos, marcados como tales), en orden
cronológico:

| Columna                                 | Origen                      | Notas                                                                     |
| --------------------------------------- | --------------------------- | ------------------------------------------------------------------------- |
| `set_id`                                | `TLSet.id`                  | UUID; clave de upsert idempotente en SQLite.                              |
| `timestamp`                             | `TLSet.timestamp`           | ISO-8601 con zona (como se guarda).                                       |
| `date` / `time`                         | derivadas                   | `YYYY-MM-DD` / `HH:MM` local del timestamp, para pivotes en Excel.        |
| `exercise_id`                           | `TLSet.exerciseId`          | Slug estable del catálogo core.                                           |
| `exercise_name_es` / `exercise_name_en` | catálogo                    | Nombres para humanos; nunca para joins (usar `exercise_id`).              |
| `primary_family`                        | catálogo (`muscleFamilyOf`) | Familia primaria del ejercicio (vocabulario del planificador).            |
| `pattern`                               | traits                      | Patrón de movimiento (`horizontal_push`, `hinge`, …) — clave biomecánica. |
| `equipment`                             | catálogo                    | Texto ES del equipamiento (p. ej. «Mancuernas + Banco»).                  |
| `set_index`                             | derivado                    | 1-based dentro de (día, ejercicio), calentamientos incluidos.             |
| `warmup`                                | `TLSet.warmup`              | `1`/`0` (flag explícito, no inferido del peso).                           |
| `weight_kg`                             | `TLSet.weight`              | Peso canónico en kg.                                                      |
| `weight_display`                        | ajustes                     | Mismo peso en la unidad de visualización del usuario.                     |
| `unit`                                  | ajustes                     | `kg` o `lb`.                                                              |
| `reps`                                  | `TLSet.reps`                | Entero.                                                                   |
| `rpe`                                   | `TLSet.rpe`                 | Cualitativo, si existe; el RIR no se guarda hoy.                          |
| `volume_kg`                             | derivado                    | `weight_kg × reps` (0 si falta peso o reps).                              |
| `notes`                                 | `TLSet.notes`               | Texto del usuario, citado si hace falta.                                  |

### 2.4 Implementación

- `traininglab/apps/desktop/src/lib/export-csv.ts` — **lógica pura** (sin DOM): `buildSetsCsv`,
  `csvEscape`, `formatCsvNumber`, `SETS_CSV_COLUMNS`. Testeable desde la suite raíz por ruta
  relativa (convención ya existente para `lib/*`).
- `screens/SettingsScreen.tsx` — tarjeta **«Mis datos»** con el botón `Exportar CSV`; el
  fichero se descarga con `Blob` + `<a download>`. Sin librerías nuevas.
- `lib/i18n.ts` — claves `data.title`, `data.exportCsv`, `data.exportHint`, `data.exported`.
- El BOM se añade al construir el blob (una sola vez, no dentro de `buildSetsCsv`, para que
  la función pura sea la misma que consume el test).

---

## 3. Pieza 2 — Espejo SQLite (`node:sqlite`)

### 3.1 Por qué SQLite y por qué el built-in

- SQL es el lenguaje que un LLM maneja mejor para «manipular» datos: agregados, joins,
  ventanas y mutaciones sin escribir código de aplicación.
- `node:sqlite` viene incorporado (Node ≥ 22.5; el repo corre Node 24): cero dependencias,
  cero instalación, mismo runtime que el resto de scripts. Ya es el motor de `--shared`.
- El archivo es un **espejo de trabajo**, no la base de la app: se puede borrar y
  reconstruir desde el CSV en cualquier momento (`--ingest --replace`).

### 3.2 Esquema (espejo denormalizado)

```sql
CREATE TABLE IF NOT EXISTS sets (
  set_id          TEXT PRIMARY KEY,
  timestamp       TEXT NOT NULL,
  date            TEXT NOT NULL,
  time            TEXT,
  exercise_id     TEXT NOT NULL,
  exercise_name_es TEXT,
  exercise_name_en TEXT,
  primary_family  TEXT,
  pattern         TEXT,
  equipment       TEXT,
  set_index       INTEGER,
  warmup          INTEGER NOT NULL DEFAULT 0,   -- 0/1
  weight_kg       REAL,
  weight_display  REAL,
  unit            TEXT,
  reps            INTEGER,
  rpe             REAL,
  volume_kg       REAL,
  notes           TEXT
);
CREATE INDEX IF NOT EXISTS sets_exercise ON sets(exercise_id, timestamp);
CREATE INDEX IF NOT EXISTS sets_family   ON sets(primary_family, date);

CREATE TABLE IF NOT EXISTS ingests (
  file       TEXT NOT NULL,
  ingested_at TEXT NOT NULL,
  rows       INTEGER NOT NULL
);
```

- **Upsert por `set_id`**: reingerir un export actualizado no duplica ni pierde nada; igual
  que la convención UUID + upsert del store LAN.
- `--replace`: vacía `sets` antes de ingerir (espejo limpio).
- Ruta por defecto: `fitness-ecosystem/tmp/fitness.sqlite` (gitignored), configurable con
  `--db`. El store LAN (`--shared`, `.lan-data/fitness.sqlite`) **no se toca**: es otro
  consumidor con su propio ciclo de vida.

### 3.3 El CSV como frontera con BodyLab

Nada impide exportar mañana las mediciones de BodyLab al mismo espejo (tabla 2) usando la
misma receta; esta entrega se limita a TrainingLab, que es donde está el registro.

### 3.4 Receta pandas (documentada, opcional)

```python
import pandas as pd
df = pd.read_csv("traininglab-sets-20260930-1200.csv", sep=";", decimal=",", encoding="utf-8-sig")
print(df.groupby("primary_family")["volume_kg"].sum().sort_values())
```

Equivale al `--summary` del CLI; se documenta para que un LLM con Python lo use sin
instalar nada en el repo.

---

## 4. Pieza 3 — CLI de datos (`scripts/fitness-data-cli.mjs`)

Un solo punto de entrada, sin dependencias, pensado para que **un LLM lo invoque**:
entrada por argumentos, salida JSON por defecto en los comandos de consulta, códigos de
salida honestos (0 = bien, 1 = error de uso/datos).

```bash
# Ingesta (crea el espejo si no existe). --replace para espejo limpio.
node scripts/fitness-data-cli.mjs --ingest tmp/export.csv [--db tmp/fitness.sqlite] [--replace]

# Consulta SQL arbitraria (SELECT/INSERT/UPDATE/DELETE; una sentencia).
node scripts/fitness-data-cli.mjs --sql "SELECT primary_family, SUM(volume_kg) v \
  FROM sets WHERE warmup = 0 GROUP BY 1 ORDER BY v DESC" [--db …]

# Resumen agregado listo para el LLM (JSON): totales, volumen semanal por familia,
# PRs por ejercicio, cobertura de días.
node scripts/fitness-data-cli.mjs --summary [--db …]

# Exportar de vuelta a CSV (mismo contrato de §2.2) — round-trip verificado.
node scripts/fitness-data-cli.mjs --export out.csv [--db …]

# Esquema y estado del espejo (tablas, filas, última ingesta).
node scripts/fitness-data-cli.mjs --schema [--db …]
```

- `scripts/fitness-data-lib.mjs` concentra lo puro y testeable: parser CSV tolerante
  (`parseCsv`, sniff de delimitador, decimal `,`/`.`), formateador (§2.2), apertura SQLite,
  `ingest`, `summarize`, `exportCsv`. El CLI queda como cableado fino (parseArgs + print).
- Los nombres de comando del coach (`fitness-coach-cli.mjs`, de Gemini) no se tocan: son
  otro dominio (biomecánica), y este CLI es el de **datos**.

---

## 5. Verificación (el bucle Buffy/Qwen)

1. **Tests de la suite raíz** (sin navegador):
   - `tests/training/test_export_csv.test.ts`: formato exacto (delimitador, decimal, BOM,
     citado de `;`/comillas/saltos), columnas y orden, `set_index`, `warmup`, volumen.
   - `tests/training/test_data_cli.test.ts`: CSV → `parseCsv` → `:memory:` SQLite → SQL de
     comprobación; y una ejecución real del CLI con archivos temporales (spawn) que valida
     `--ingest` + `--sql` + `--export` de punta a punta.
2. **Auditoría de navegador** (`scripts/audit-app-behavior.mjs`): en Ajustes, clic real en
   `Exportar CSV`, captura de la descarga de Playwright, lectura del archivo y, si existe
   Node/SQLite, ingesta con el CLI y verificación por SQL del número de filas y del volumen
   frente a los datos sembrados en IndexedDB. Sustituye el `WARN` textual («no ofrece
   exportación») por una prueba **funcional**.
3. **Uso real del CLI por Buffy** (petición explícita del propietario): cada verificación de
   esta sesión que toque datos se hace pasando por el CLI, no solo por los tests.

---

## 6. Fases

| Fase   | Contenido                                                                                                                                                        | Estado                          |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| **F1** | CSV en Ajustes + espejo SQLite + CLI (`ingest/sql/summary/export/schema`) + tests + auditoría funcional                                                          | **Implementada en esta sesión** |
| **F2** | Backup JSON completo de TrainingLab (resuelve el WARN restante y el plan de optimización §5.2) y push/pull con el store LAN para «manipular la app» desde el CLI | Pendiente de aprobación         |
| **F3** | Puente Python/pandas opcional (script `scripts/pandas-summary.py` de ejemplo) y herramienta `query_training_history` para el coach LLM in-app                    | Opcional                        |

## 7. Límites y decisiones abiertas

- El CSV exporta **solo las series** (la app no tiene sesiones completas en todos los flujos
  antiguos; el campo `session_id` se añadirá cuando el backup F2 lo haga estable).
- `--sql` acepta escrituras: es una herramienta local sobre un archivo local. **No debe
  exponerse por HTTP** (el store LAN no gana endpoints SQL).
- Si el propietario quiere que el CLI escriba **de vuelta en la app**, la vía es el store LAN
  (`POST /api/members/:id/sets`, ya existente) o un importador de backup JSON (F2), no tocar
  IndexedDB desde fuera del navegador.

## 8. Referencias

- `docs/plan_optimizacion_ecosistema.md` §5.2 (backup de TrainingLab — F2 de este plan).
- `docs/plan_ejecucion_llm_coach_qwen.md` §4 (CLI del coach; complementario).
- `scripts/lan-store.mjs` / `lan-api.mjs` (motor SQLite y API de casa ya existentes).
- `traininglab/apps/desktop/src/lib/llm.ts` (`buildUserRequest(…, contextCsv)`: el coach ya
  recibe contexto en formato CSV; el export formaliza ese contrato).

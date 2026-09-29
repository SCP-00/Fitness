# TrainingLab

> Aplicación de rutinas, registro, equipamiento, progresión y asistente LLM.

## 🎯 Función

**"¿Cómo debe adaptarse mi entrenamiento según mi progreso corporal?"**

## 📦 Componentes

### Core

| Módulo | Descripción |
|---|---|
| `workouts` | Construcción y registro de rutinas |
| `exercises` | Base de datos de ejercicios |
| `equipment` | Equipamiento disponible |
| `progression` | Motor de progresión determinista |
| `llm` | Asistente LLM (opcional) |

### Apps

| App | Descripción |
|---|---|
| `web` | React + Vite (WebApp) |
| `desktop` | Tauri (Windows) |

### Packages

| Package | Descripción |
|---|---|
| `contracts` | JSON Schemas |
| `ui` | Componentes compartidos |

## 🛠️ Stack

- React 18+
- TypeScript 5+
- Vite 5+
- Tauri 2 (desktop)
- Recharts (gráficas)
- SQLite (almacenamiento local)
- LLM (Ollama, OpenAI-compatible, etc.)

## 🚀 Desarrollo

```bash
# Instalar dependencias
pnpm install

# Ejecutar en desarrollo
pnpm dev

# Ejecutar tests
pnpm test

# Typecheck
pnpm typecheck
```

## 📄 Licencia

Apache-2.0 - Ver [LICENSE](../LICENSE)

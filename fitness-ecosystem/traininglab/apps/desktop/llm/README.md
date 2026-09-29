# TrainingLab coach — local LLM pack (Qwen3.5-4B)

Everything the optional local coach needs to work with **your** model, grounded
in the real catalog. Nothing here talks to the internet: the model runs on your
machine, the app talks to it over loopback, and the deterministic planner stays
in charge (the LLM proposes, the maths disposes).

## What's in this folder

| File | What it is | How it stays honest |
|---|---|---|
| `knowledge.json` | Machine-readable facts: all 143 exercises with pattern, load, joint/spine stress, RIR, tempo, media flag + the hard rules | **Generated** from `@fitness/bodylab-exercises` by `scripts/build-llm-pack.mjs`; drift test in `tests/training/test_llm_knowledge_pack.test.ts` |
| `EXERCISES.md` | The same facts as a compact table (paste into the model's context or read it yourself) | Same generator, same test |
| `Modelfile` | Ollama/llama.cpp recipe with the system prompt baked in | Test asserts it matches `buildSystemPrompt()` at runtime |

## Your model is already downloaded

You have `C:\Users\andyh\Downloads\Qwen3.5-4B\Qwen3.5-4B-Q4_K_M.gguf` (3.3 GB,
Q4_K_M quantization — the right default for a 4B model on a consumer machine).

### Option A — llama.cpp server (what the app's tool loop is tuned for)

```powershell
# from anywhere; adjust -m to your llama.cpp build location
llama-server `
  -m C:\Users\andyh\Downloads\Qwen3.5-4B\Qwen3.5-4B-Q4_K_M.gguf `
  --alias traininglab-coach `
  --port 8080 --host 127.0.0.1 `
  --jinja -c 8192 --temp 0.6
```

- `--jinja` enables the chat template **and** auto-generated GBNF grammars from
  the tool JSON schemas — this is what makes a 4B model's tool calls reliable
  (the finding from the China/USA research: small models only do tools well
  with constrained decoding).
- In TrainingLab: **Coach local → base URL** `http://127.0.0.1:8080/v1`, then
  enable it and ask for a plan.

### Option B — LM Studio

1. Import the GGUF (or search "Qwen3.5 4B" in the app).
2. Start the local server (default `http://127.0.0.1:1234/v1`).
3. Enable **tool use** in the server settings (it uses the same grammar
   restriction under the hood).

### Option C — Ollama

```powershell
cd C:\Users\andyh\Downloads\Qwen3.5-4B
copy <repo>\fitness-ecosystem\traininglab\apps\desktop\llm\Modelfile .
# point the Modelfile's FROM at the actual file name if needed
ollama create traininglab-coach -f Modelfile
ollama serve   # OpenAI-compatible endpoint on http://127.0.0.1:11434/v1
```

## Regenerating the pack (after any catalog change)

```bash
cd fitness-ecosystem
node scripts/build-llm-pack.mjs
```

CI runs the drift test; if the catalog and the pack disagree, the suite goes
red. Never edit `knowledge.json` by hand.

## How the app uses it

1. `buildSystemPrompt()` (lib/llm.ts) — the same text baked into the Modelfile.
2. Tools: `get_context`, `get_deterministic_plan`, `list_available_exercises`,
   `get_exercise_history`, and the terminal `propose_session`.
3. `validateProposal()` checks every proposed slot against the gear inventory,
   the real catalog ids and the time budget before anything reaches the screen.
4. If the model is off, slow or wrong, the deterministic plan is silently kept —
   the AI can only make the session better, never worse.

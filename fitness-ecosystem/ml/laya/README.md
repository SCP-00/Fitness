# `ml/laya` — the typed-decision model, offline tooling

Training and evaluation for TrainingLab's own decision model: a
non-autoregressive **typed-decision** model (the LAYA family) that answers
`choice` / `score` questions about a session in one forward pass, with no text
generation and nothing to hallucinate.

**This is offline tooling.** It never ships, and the app never imports it. The
runtime contract is TypeScript, in
[`bodylab/core/training/src/laya.ts`](../../bodylab/core/training/src/laya.ts),
and the two sides are locked together by
[`tests/golden_state.json`](tests/golden_state.json) plus a parity test in each
language.

Why the shape is what it is: [`docs/LAYAS_MODELO_DECISION.md`](../../docs/LAYAS_MODELO_DECISION.md).

## What runs where

| Task | Needs | Command |
|---|---|---|
| Build cases from the app's CSV | nothing but Python 3.10+ | `python cli.py build --csv sets.csv --out data/real.jsonl` |
| Synthetic corpus (pipeline test) | nothing | `python cli.py synth --out data/synth.jsonl --count 400` |
| Baseline: the deterministic floor | nothing | `python cli.py evaluate --dataset data/synth.jsonl --model none --json data/before.json` |
| Score a trained checkpoint | `laya` | `python cli.py evaluate --dataset data/real.jsonl --model runs/x --json data/after.json` |
| Before/after comparison | nothing | `python cli.py compare --before data/before.json --after data/after.json` |
| Device support on this machine | `torch` | `python cli.py devices` |
| Fine-tune | `torch`, `transformers`, `laya` | `python cli.py train --dataset data/real.jsonl --out runs/x` |

Everything except `train` and `evaluate --model <checkpoint>` runs on a bare
Python. That is deliberate: it means CI can measure the baseline, and a
contributor can reproduce a metric, without a 2.5 GB install.

## Setup

```bash
cd fitness-ecosystem/ml/laya
uv venv .venv --python 3.11
uv pip install --python .venv/Scripts/python.exe -e ".[dev]"     # tests only
uv pip install --python .venv/Scripts/python.exe torch --torch-backend=cpu
uv pip install --python .venv/Scripts/python.exe -e ".[train]"    # full training
```

On Linux/macOS the interpreter path is `.venv/bin/python` instead of
`.venv/Scripts/python.exe`.

## Tests

```bash
.venv/Scripts/python.exe -m pytest tests -q
```

38 tests. The Torch-only ones (the RLCD update rule) skip automatically when
Torch is absent; the rest — the cross-language contract, the CSV parser, the
labeller, the metrics, the temperature fit — run anywhere.

## The workflow, end to end

```bash
# 1. Pre-training baseline. This is the number the model must beat.
python cli.py evaluate --dataset data/real.jsonl --model none --json data/before.json

# 2. Train.
python cli.py train --dataset data/real.jsonl --out runs/2026-10-01 --device cuda

# 3. Post-training measurement, same harness, same dataset.
python cli.py evaluate --dataset data/real.jsonl --model runs/2026-10-01 --json data/after.json

# 4. Compare. `--before` must be our own floor, not a vendor's published number.
python cli.py compare --before data/before.json --after data/after.json
```

## Getting the CSV

In TrainingLab: **Ajustes → Exportar CSV**. The export is `;`-delimited with a
decimal comma for Excel in a Spanish locale; `read_sets_csv` handles the BOM,
the delimiter, the decimal comma and empty-as-missing. For labels that mean
anything you also need BodyLab's weakness map:

```bash
python cli.py build --csv sets.csv --out data/real.jsonl --weakness weakness.json
```

without `--weakness` every family is labelled neutral (50), which is honest but
weak. See `Labeller` in [`gym_decision/dataset.py`](gym_decision/dataset.py).

## How cases are labelled, and why it matters

The log records only the choices the athlete **made**. Cloning behaviour
teaches the model to reproduce the habits the plan exists to fix — an
undertrained family is undertrained *because* it keeps getting skipped, and a
behaviour-cloned policy would keep skipping it and call that personalisation.

So the two primitives are labelled from different sources, on purpose:

| question | label source |
|---|---|
| `focus` | the **deterministic coach** (weakest first, respect fatigue, respect the weekly gap) |
| `volume` | the coach's rubric, clipped by what was actually completed |
| `ex_<family>` | **behaviour** — inside the family the coach picked, what the athlete reached for |
| `deload` | behaviour, via a transparent proxy: total sets ≤ 60 % of the athlete's median session |

Targets are **distributions, not one-hot labels**: the training rule is a
strictly proper scoring rule over the full distribution, and a one-hot target
makes it optimise a classification margin instead of honest probabilities.

`tests/test_pipeline.py::test_labels_reject_the_athletes_own_bias` locks this.

## Before you trust a checkpoint

1. **The synthetic corpus is not training data.** `train` writes
   `"shippable": false` into the run manifest when the dataset name ends in
   `synth.jsonl`. A model trained on it is a smoke test.
2. **Head-only fine-tuning has published evidence against it.** Freezing the
   encoder scored *below* untuned on a 140-label task (0.659 vs 0.722), and at
   gentler rates it still did not beat no training: on that task the learning
   happens in the encoder. `--freeze-encoder` exists for a memory-constrained
   machine, not because it is a good idea.
3. **Calibration is not optional.** The checkpoints ship over-confident (raw
   ECE 0.466). `train` fits one temperature per primitive on a slice held out
   of training and writes them into `rl_agent_config.json`.
4. **Accuracy on a synthetic corpus is meaningless** as a product claim. It
   verifies the pipeline. Only the real log, measured against our own floor,
   says anything.

## Layout

```
gym_decision/
  schema.py     Python mirror of the app's contract (golden-fixture locked)
  dataset.py    CSV -> cases, the weak labeller, the synthetic corpus
  metrics.py    accuracy / soft acc / Brier / ECE / score MAE, and the comparator
  baselines.py  the deterministic floor: what the model must beat
  train.py      RLCD loop, temperature fit, device policy
  cli.py        the command line
tests/
  golden_state.json   cross-language fixture, generated from the TypeScript
  test_pipeline.py    the suite
```

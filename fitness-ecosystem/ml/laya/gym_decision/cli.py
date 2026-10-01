#!/usr/bin/env python3
"""Command line for the typed-decision pipeline.

Run it with a bare Python for everything except training:

    python cli.py devices
    python cli.py synth --out data/synth.jsonl --count 400
    python cli.py evaluate --dataset data/synth.jsonl --model none
    python cli.py build --csv ../sets.csv --out data/real.jsonl
    python cli.py train --dataset data/real.jsonl --out runs/2026-10-01

`evaluate --model none` is the **before** measurement: it scores the
deterministic floor through the exact harness the trained model is scored with,
so the two numbers are comparable. It needs no Torch and no checkpoint.

@module cli
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Mapping, Optional, Sequence

# Works whether it is imported as a package, run as `python -m gym_decision.cli`,
# or run directly as a script (the parent is what `gym_decision` lives in).
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from gym_decision import baselines, dataset, metrics, schema, train  # noqa: E402


def cmd_devices(args: argparse.Namespace) -> int:
    print("Device support for this workload\n")
    for name in ("cuda", "xpu", "mps", "cpu", "dml", "vulkan"):
        print(f"  {name:<7} {train.DEVICE_NOTES[name]}")
    print("\nThis machine:")
    try:
        device = train.torch_device(args.device)
        print(f"  torch selected: {device}")
    except Exception as error:  # noqa: BLE001 - a diagnostic command reports, never raises
        print(f"  {error}")
    return 0


def cmd_synth(args: argparse.Namespace) -> int:
    sessions = dataset.synth_sessions(count=args.count, seed=args.seed)
    labeller = dataset.labeller_from_synth(sessions)
    cases, skipped = dataset.build_cases(sessions, labeller)
    written = dataset.write_jsonl(cases, Path(args.out))
    print(f"synthetic sessions : {len(sessions)}")
    print(f"cases written      : {written} -> {args.out}")
    print(f"skipped            : {len(skipped)}")
    print("\nThis corpus proves the pipeline runs. It is NOT training data for a shipped model.")
    return 0


def cmd_build(args: argparse.Namespace) -> int:
    weakness: Dict[str, Optional[float]] = {}
    if args.weakness:
        weakness = json.loads(Path(args.weakness).read_text(encoding="utf-8"))
    csv_text = Path(args.csv).read_text(encoding="utf-8-sig")
    sets = dataset.read_sets_csv(csv_text)
    sessions = dataset.sessions_from_sets(sets)
    labeller = dataset.Labeller(
        weakness=weakness or {family: None for family in schema.FAMILY_ORDER},
        level=args.level,
        goal=args.goal,
    )
    cases, skipped = dataset.build_cases(sessions, labeller)
    written = dataset.write_jsonl(cases, Path(args.out))
    print(f"sets read     : {len(sets)}")
    print(f"sessions      : {len(sessions)}")
    print(f"cases written : {written} -> {args.out}")
    print(f"skipped       : {len(skipped)}")
    if not weakness:
        print(
            "\nNo --weakness file given: every family was labelled neutral (50). "
            "Export the weakness map from BodyLab for labels that mean anything."
        )
    return 0


def cmd_evaluate(args: argparse.Namespace) -> int:
    rows = dataset.read_jsonl(Path(args.dataset))
    if not rows:
        print("dataset is empty", file=sys.stderr)
        return 2

    if args.model == "none":
        predictor = baselines.FloorPredictor()
        label = "deterministic floor (no model)"
    else:
        try:
            import laya  # noqa: PLC0415
        except ImportError:
            print(
                "evaluating a real checkpoint needs the model runtime:\n"
                "  uv pip install laya\n"
                "Use --model none for the baseline, which needs nothing.",
                file=sys.stderr,
            )
            return 3
        agent = laya.load(args.model, device=args.device or None)

        def predictor(case, state, questions):  # type: ignore[no-redef]
            return agent.predict(state, questions)

        label = args.model

    report = metrics.evaluate(rows, predictor)
    report["model"] = label
    report["dataset"] = str(args.dataset)
    report["n_cases"] = len(rows)

    print(json.dumps(report, indent=2, ensure_ascii=False))
    if args.json:
        Path(args.json).write_text(
            json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
        )
    return 0


def cmd_compare(args: argparse.Namespace) -> int:
    before = json.loads(Path(args.before).read_text(encoding="utf-8"))
    after = json.loads(Path(args.after).read_text(encoding="utf-8"))
    print(json.dumps(metrics.compare_reports(before, after), indent=2, ensure_ascii=False))
    return 0


def cmd_train(args: argparse.Namespace) -> int:
    """Fine-tune. Requires Torch and the model runtime; everything else does not."""
    import torch  # noqa: PLC0415

    try:
        import laya  # noqa: PLC0415
        from laya.common import build_model, build_sequence, render_options  # noqa: PLC0415
    except ImportError:
        print(
            "training needs the runtime:\n  uv pip install torch transformers laya\n"
            "See ml/laya/README.md for the per-platform install.",
            file=sys.stderr,
        )
        return 3

    config = train.TrainConfig(
        epochs=args.epochs,
        micro_batch=args.micro_batch,
        grad_accum=args.grad_accum,
        freeze_encoder=args.freeze_encoder,
        lora_rank=args.lora_rank,
        fp16=not args.no_fp16,
        seed=args.seed,
    )
    device = train.torch_device(args.device)
    rows = dataset.read_jsonl(Path(args.dataset))
    print(f"device        : {device}")
    print(f"cases         : {len(rows)}")
    print(f"config        : {json.dumps(config.as_dict(), ensure_ascii=False)}")

    model_dir = args.base
    from huggingface_hub import snapshot_download  # noqa: PLC0415

    if not Path(model_dir).exists():
        model_dir = snapshot_download(model_dir)
    with open(Path(model_dir) / "rl_agent_config.json", encoding="utf-8") as handle:
        cfg = json.load(handle)
    cfg["gradient_checkpointing"] = True
    cfg["max_len"] = config.max_len
    cfg["head_max_len"] = config.head_max_len

    from transformers import AutoTokenizer  # noqa: PLC0415

    tokenizer = AutoTokenizer.from_pretrained(str(Path(model_dir) / "tokenizer"))
    model = build_model(cfg, encoder_dir=str(Path(model_dir) / "encoder"))
    model.to(device)

    items, dropped = encode_items(
        rows, tokenizer, cfg, build_sequence, render_options, qtypes=QTYPES
    )
    print(f"encoded items : {len(items)} ({dropped} dropped: option count mismatch)")
    if not items:
        print("nothing to train on", file=sys.stderr)
        return 4

    calibration, training_indices = train.calibrate_slice(len(items), config)
    print(f"calibration   : {len(calibration)} | training: {len(training_indices)}")
    if len(training_indices) < 8:
        print(
            "refusing to train: fewer than 8 examples. A run this small measures "
            "noise and would produce a checkpoint nobody can justify.",
            file=sys.stderr,
        )
        return 4

    import random as _random  # noqa: PLC0415

    encoder_params = [p for n, p in model.named_parameters() if "encoder." in n]
    head_params = [p for n, p in model.named_parameters() if "encoder." not in n]
    if config.freeze_encoder:
        for parameter in encoder_params:
            parameter.requires_grad_(False)
        print("encoder frozen: head-only mode. Read the README caveat before trusting it.")
    optimizer = torch.optim.AdamW(
        [
            {"params": [p for p in encoder_params if p.requires_grad], "lr": config.lr_encoder},
            {"params": head_params, "lr": config.lr_head},
        ],
        weight_decay=config.weight_decay,
    )
    steps_per_epoch = max(1, len(training_indices) // (config.micro_batch * config.grad_accum))
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=max(1, steps_per_epoch * config.epochs), eta_min=1e-6
    )
    scaler = torch.amp.GradScaler("cuda", enabled=config.fp16 and device.type == "cuda")

    pool = [items[i] for i in training_indices]
    for epoch in range(config.epochs):
        _random.Random(config.seed + epoch).shuffle(pool)
        sigma = train.sigma_for(epoch, config)
        optimizer.zero_grad(set_to_none=True)
        accumulated = 0
        for start in range(0, len(pool), config.micro_batch):
            chunk = pool[start : start + config.micro_batch]
            if not chunk:
                continue
            batch = collate(chunk, tokenizer.pad_token_id, torch, device)
            with torch.autocast(device.type, dtype=torch.float16, enabled=config.fp16 and device.type == "cuda"):
                logits, _act = model(
                    batch["input_ids"],
                    batch["attention_mask"],
                    batch["marker_pos"],
                    batch["marker_mask"],
                    batch["qtype"],
                )
            out = train.rlcd_loss(
                logits.float(),
                batch["target"],
                batch["qtype"],
                batch["marker_mask"],
                group_size=config.group_size,
                sigma=sigma,
                w_sph=config.w_sph,
                w_rps=config.w_rps,
                ce_weight=config.ce_weight,
            )
            scaler.scale(out.loss / config.grad_accum).backward()
            accumulated += 1
            if accumulated % config.grad_accum == 0 or start + config.micro_batch >= len(pool):
                scaler.unscale_(optimizer)
                torch.nn.utils.clip_grad_norm_(model.parameters(), config.grad_clip)
                scaler.step(optimizer)
                scaler.update()
                scheduler.step()
                optimizer.zero_grad(set_to_none=True)
        print(f"epoch {epoch + 1}/{config.epochs} | sigma {sigma:.3f} | last loss {float(out.loss.item()):.4f} | reward {out.reward_mean:.4f}")

    temperatures = fit_after_training(rows, calibration, items, tokenizer, model, cfg, device, torch, build_sequence, render_options)

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    from safetensors.torch import save_file  # noqa: PLC0415

    save_file(
        {k: v.half().contiguous().cpu() for k, v in model.state_dict().items()},
        str(out_dir / "model.safetensors"),
    )
    model.encoder.config.save_pretrained(str(out_dir / "encoder"))
    tokenizer.save_pretrained(str(out_dir / "tokenizer"))
    cfg["fine_tuned"] = True
    cfg["temperature"] = [temperatures.get(name, 1.2) for name in ("choice", "score", "noul")]
    cfg.pop("temperature_by_options", None)
    (out_dir / "rl_agent_config.json").write_text(
        json.dumps(cfg, indent=2), encoding="utf-8"
    )
    train.save_manifest(
        out_dir / "run_manifest.json",
        {
            "dataset": str(args.dataset),
            "n_cases": len(rows),
            "n_items": len(items),
            "n_calibration": len(calibration),
            "device": str(device),
            "config": config.as_dict(),
            "temperatures": temperatures,
            "synthetic": args.dataset.endswith("synth.jsonl"),
            "shippable": not args.dataset.endswith("synth.jsonl"),
        },
    )
    print(f"\nwrote {out_dir}")
    return 0


#: Fallback primitive codes, used only when `laya.common.QTYPES` is unavailable.
#: The ordinal code here MUST match `reference_proper_reward`'s `ordinal_index`.
DEFAULT_QTYPES = {"choice": 0, "score": 1, "noul": 2}


def encode_items(rows, tokenizer, cfg, build_sequence, render_options, qtypes=None):
    """Tokenise cases into training items. Mirrors the notebook's builder.

    `qtypes` is injected (the trainer passes `laya.common.QTYPES`) instead of
    being hardcoded: the code decides which primitive receives the ordinal
    reward term, and a wrong mapping distorts the objective silently.
    """
    qtype_of = qtypes or DEFAULT_QTYPES
    items: List[Dict[str, Any]] = []
    dropped = 0
    for row in rows:
        state = json.loads(row["state"]) if isinstance(row["state"], str) else row["state"]
        questions = json.loads(row["questions"]) if isinstance(row["questions"], str) else row["questions"]
        gold = json.loads(row["gold"]) if isinstance(row["gold"], str) else row["gold"]
        text = state["text"] if isinstance(state, dict) else state
        for question_id, question in questions.items():
            if question_id not in gold:
                continue
            kind = question["type"]
            criteria = question.get("criteria", {})
            if kind == "choice":
                keys = list(criteria.keys())
                target = [gold[question_id]["probabilities"].get(key, 0.0) for key in keys]
            elif kind == "noul":
                target = [
                    gold[question_id]["probabilities"].get("false", 0.5),
                    gold[question_id]["probabilities"].get("true", 0.5),
                ]
            else:
                levels = len(criteria) if isinstance(criteria, list) else 4
                target = [gold[question_id]["probabilities"].get(str(i), 0.0) for i in range(levels)]
            total = sum(target)
            target = [v / total for v in target] if total > 0 else [1.0 / len(target)] * len(target)
            sequence, markers = build_sequence(
                tokenizer,
                text,
                {"t": kind, "ins": question["instructions"], "crit": criteria},
                cfg["max_len"],
                cfg["head_max_len"],
            )
            expected = len(render_options({"t": kind, "crit": criteria}))
            if len(markers) != expected:
                dropped += 1
                continue
            qtype = qtype_of.get(kind, 0)
            items.append(
                {
                    "ids": sequence,
                    "markers": markers,
                    "qtype": qtype,
                    "target": target,
                    "label": target.index(max(target)),
                }
            )
    return items, dropped


def collate(chunk, pad_id, torch, device):
    """Pad a micro-batch. Same contract as the notebook's `collate_train_batch`."""
    n = len(chunk)
    length = max(len(item["ids"]) for item in chunk)
    kmax = max(len(item["markers"]) for item in chunk)
    ids = torch.full((n, length), pad_id, dtype=torch.long)
    attention = torch.zeros((n, length), dtype=torch.long)
    marker_pos = torch.zeros((n, kmax), dtype=torch.long)
    marker_mask = torch.zeros((n, kmax), dtype=torch.bool)
    target = torch.zeros((n, kmax), dtype=torch.float32)
    for row, item in enumerate(chunk):
        ids[row, : len(item["ids"])] = torch.tensor(item["ids"])
        attention[row, : len(item["ids"])] = 1
        k = len(item["markers"])
        marker_pos[row, :k] = torch.tensor(item["markers"])
        marker_mask[row, :k] = True
        target[row, : len(item["target"])] = torch.tensor(item["target"], dtype=torch.float32)
    return {
        "input_ids": ids.to(device),
        "attention_mask": attention.to(device),
        "marker_pos": marker_pos.to(device),
        "marker_mask": marker_mask.to(device),
        "target": target.to(device),
        "qtype": torch.tensor([item["qtype"] for item in chunk], device=device),
    }


def fit_after_training(rows, calibration, items, tokenizer, model, cfg, device, torch, build_sequence, render_options):
    """Fit one temperature per primitive on the slice held out of training."""
    if not calibration:
        return {}
    collected: Dict[str, List[Any]] = {"choice": [], "score": [], "noul": []}
    name_of = {0: "choice", 1: "score", 2: "noul"}
    model.eval()
    with torch.no_grad():
        for start in range(0, len(calibration), 16):
            chunk = [items[i] for i in calibration[start : start + 16]]
            batch = collate(chunk, tokenizer.pad_token_id, torch, device)
            logits, _act = model(
                batch["input_ids"],
                batch["attention_mask"],
                batch["marker_pos"],
                batch["marker_mask"],
                batch["qtype"],
            )
            logits = logits.float().cpu()
            for row, item in enumerate(chunk):
                k = len(item["markers"])
                key = name_of.get(int(item["qtype"]), "choice")
                collected[key].append((logits[row, :k].tolist(), item["target"]))
    return train.fit_temperatures(collected)


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = parser.add_subparsers(dest="command", required=True)

    devices = sub.add_parser("devices", help="report device support and what this machine selects")
    devices.add_argument("--device", default=None)
    devices.set_defaults(func=cmd_devices)

    synth = sub.add_parser("synth", help="write a synthetic corpus (pipeline test, not training data)")
    synth.add_argument("--out", required=True)
    synth.add_argument("--count", type=int, default=240)
    synth.add_argument("--seed", type=int, default=7)
    synth.set_defaults(func=cmd_synth)

    build = sub.add_parser("build", help="build cases from TrainingLab's sets CSV")
    build.add_argument("--csv", required=True)
    build.add_argument("--out", required=True)
    build.add_argument("--weakness", default=None, help="JSON file: {family: 0-100}")
    build.add_argument("--level", default="intermediate")
    build.add_argument("--goal", default="hypertrophy")
    build.set_defaults(func=cmd_build)

    evaluate = sub.add_parser("evaluate", help="score a predictor through the shared harness")
    evaluate.add_argument("--dataset", required=True)
    evaluate.add_argument("--model", default="none", help="'none' for the deterministic floor, or a checkpoint dir")
    evaluate.add_argument("--device", default=None)
    evaluate.add_argument("--json", default=None)
    evaluate.set_defaults(func=cmd_evaluate)

    compare = sub.add_parser("compare", help="before/after delta report")
    compare.add_argument("--before", required=True)
    compare.add_argument("--after", required=True)
    compare.set_defaults(func=cmd_compare)

    training = sub.add_parser("train", help="RLCD fine-tune (needs torch + laya)")
    training.add_argument("--dataset", required=True)
    training.add_argument("--out", required=True)
    training.add_argument("--base", default="convaiinnovations/laya")
    training.add_argument("--device", default=None, help="cuda | xpu | mps | cpu")
    training.add_argument("--epochs", type=int, default=4)
    training.add_argument("--micro-batch", type=int, default=8)
    training.add_argument("--grad-accum", type=int, default=4)
    training.add_argument("--freeze-encoder", action="store_true")
    training.add_argument("--lora-rank", type=int, default=0)
    training.add_argument("--no-fp16", action="store_true")
    training.add_argument("--seed", type=int, default=20261001)
    training.set_defaults(func=cmd_train)

    args = parser.parse_args(argv)
    return int(args.func(args))


if __name__ == "__main__":
    raise SystemExit(main())

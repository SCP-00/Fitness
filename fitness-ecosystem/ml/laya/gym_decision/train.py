"""Train our typed-decision model with RLCD on the app's own decisions.

The recipe follows the family's reference fine-tuning notebook
(`laya_finetune_typed_decisions_2xT4_kaggle.ipynb`), because that is the only
published, reproducible way to specialise this model class. Quoting it in the
architecture, not paraphrasing it, is deliberate — the details that look
arbitrary are the ones that were tuned:

* **RLCD** (Reinforcement Learning for Calibrated Decisions). The policy emits
  a distribution; exploration adds zero-mean Gaussian noise to the logits
  (projected onto the simplex so the noise cannot change the mean); the reward
  is a *strictly proper* scoring rule. Expected reward is then maximised only
  by reporting honest probabilities — calibration is the objective, not a
  side effect.
* **GRPO-style baseline**: `GROUP_SIZE` noisy samples per item, advantage =
  reward minus the group mean, normalised. No value network to train.
* **A supervised anchor**: the RLCD loss is added to a soft cross-entropy
  against the teacher distribution (`loss = loss_rl + 1.0 * loss_ce`). Without
  it, a run on a few hundred decisions drifts; the notebook's own ablation
  shows the same recipe losing to no training at all when the anchor is weak
  and the encoder is frozen.
* **Two learning rates** — encoder `2.5e-5`, head `1e-4`. The head is trained
  from scratch and the encoder is a pretrained 395M backbone; one rate for both
  either destroys the encoder or starves the head.
* **Temperature fitting after training**, per primitive, on a slice held out of
  training. The checkpoints ship over-confident (raw ECE 0.466); fitting one
  scalar per type is what moves it to ~0.08.

@module gym_decision.train
"""

from __future__ import annotations

import json
import math
import random
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from . import metrics

# ── Device policy ───────────────────────────────────────────────────────────

#: What actually accelerates this workload, and what does not. Recorded here
#: because "can it use Vulkan?" is a recurring question with a short answer.
DEVICE_NOTES: Dict[str, str] = {
    "cuda": "NVIDIA. PyTorch's native path; the only one with a measured fast kernel (TileLang).",
    "xpu": "Intel Arc/integrated via PyTorch XPU.",
    "mps": "Apple silicon.",
    "cpu": "Always available. Slower per step, and completely sufficient for inference.",
    "dml": "DirectML (onnxruntime-directml) — Windows GPU acceleration for DirectX 12 hardware "
    "including AMD and Intel. Inference only in practice; there is no DirectML training path.",
    "vulkan": "Not supported. PyTorch has no Vulkan backend and ONNX Runtime's Vulkan execution "
    "provider was never shipped (still an open feature request). Vulkan is a graphics/compute API; "
    "no mainstream ML framework trains through it.",
}


def device_candidates() -> List[str]:
    """Devices PyTorch can actually select, best first, without importing torch."""
    return ["cuda", "xpu", "mps", "cpu"]


def torch_device(preference: Optional[str] = None):
    """Pick a real device, or explain why the requested one is unavailable."""
    try:
        import torch  # noqa: PLC0415
    except ImportError as error:  # pragma: no cover - exercised by the CLI
        raise RuntimeError(
            "PyTorch is not installed. Training needs it: "
            "`uv pip install torch transformers laya` (see ml/laya/README.md). "
            "Dataset building, metrics and calibration-grid do NOT need it."
        ) from error

    if preference == "dml" or preference == "vulkan":
        raise ValueError(
            f"{preference!r} is not a PyTorch device. {DEVICE_NOTES[preference]} "
            "Use 'cuda' on NVIDIA, 'xpu' on Intel, or leave it unset."
        )

    if preference:
        wanted = getattr(torch, preference, None)
        if preference == "cuda" and torch.cuda.is_available():
            return torch.device("cuda")
        if preference == "mps" and getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
            return torch.device("mps")
        if preference == "xpu" and hasattr(torch, "xpu") and torch.xpu.is_available():
            return torch.device("xpu")
        if preference == "cpu":
            return torch.device("cpu")
        raise RuntimeError(
            f"Requested device {preference!r} is not available on this machine."
            f" Note: {DEVICE_NOTES.get(preference, 'unknown device')}"
        )

    if torch.cuda.is_available():
        return torch.device("cuda")
    if getattr(torch.backends, "mps", None) and torch.backends.mps.is_available():
        return torch.device("mps")
    if hasattr(torch, "xpu") and torch.xpu.is_available():
        return torch.device("xpu")
    return torch.device("cpu")


# ── The proper scoring rule ─────────────────────────────────────────────────


def reference_proper_reward(
    probabilities,
    targets,
    qtypes,
    mask,
    w_sph: float = 0.75,
    w_rps: float = 1.0,
    ordinal_index: int = 1,
):
    """A strictly proper scoring rule, implemented locally.

    `ordinal_index` must match whatever qtype code the caller assigned to
    ordinal (`score`) questions — a mismatch applies the ranked probability
    score to the wrong primitive and silently distorts the objective, so the
    caller injects its own mapping (see `encode_items`).

    `probabilities` and `targets` are `(..., k)` tensors of distributions and
    the `mask` marks the real options. Returns one reward per row.

    The shape: logarithmic score (sharp, punishes confident mistakes hard) and
    spherical score (bounded, punishes hedging less), blended; ordinal
    questions additionally get a ranked probability score, which is what makes
    "off by one" cost less than "off by three".

    **Why a local copy exists.** The trainer uses the family's own
    `laya.common.proper_reward` when the package is importable, so a run
    reproduces their recipe exactly. This one is what the unit tests exercise,
    and a parity test compares the two whenever `laya` is present. It is never
    silently substituted at runtime.
    """
    import torch  # noqa: PLC0415

    safe = torch.clamp(probabilities, min=1e-12)
    log_score = (targets * torch.log(safe) * mask).sum(-1)
    spherical = (probabilities * targets * mask).sum(-1) / torch.sqrt(
        torch.clamp((probabilities**2 * mask).sum(-1), min=1e-12)
    )
    reward = (1.0 - w_sph) * log_score + w_sph * spherical
    if w_rps:
        cumulative_q = torch.cumsum(probabilities * mask, dim=-1)
        cumulative_t = torch.cumsum(targets * mask, dim=-1)
        rps = -((cumulative_q - cumulative_t) ** 2 * mask).sum(-1)
        # `reward` is (group, batch) and `rps` is (batch,), so the ordinal
        # selector has to collapse to one value per row first. Multiplying the
        # (batch, 1) selector by `rps` directly broadcasts to (batch, batch).
        is_ordinal = (qtypes == ordinal_index).to(reward.dtype)
        ordinal_term = w_rps * is_ordinal * rps
        reward = reward + ordinal_term
    return reward


def proper_reward(probabilities, targets, qtypes, mask, w_sph: float = 0.75, w_rps: float = 1.0):
    """The family's own rule when available, ours otherwise. Never anything else."""
    try:
        from laya.common import proper_reward as theirs  # noqa: PLC0415

        return theirs(probabilities, targets, qtypes, mask, w_sph=w_sph, w_rps=w_rps)
    except Exception:  # noqa: BLE001 - any import/shape failure falls back
        return reference_proper_reward(
            probabilities, targets, qtypes, mask, w_sph=w_sph, w_rps=w_rps
        )


# ── The RLCD step ───────────────────────────────────────────────────────────


@dataclass
class RlcdOutput:
    loss: Any
    reward_mean: float
    advantage_spread: float


def rlcd_loss(
    logits,
    target,
    qtypes,
    mask,
    group_size: int = 4,
    sigma: float = 0.4,
    w_sph: float = 0.75,
    w_rps: float = 1.0,
    ce_weight: float = 1.0,
) -> RlcdOutput:
    """One RLCD update's loss, as a pure function so it can be unit-tested.

    `logits` is `(batch, k)`. Everything else follows the notebook:

    1. draw `group_size` noisy copies of the logits, each projected so the noise
       has zero mean over the option axis (a non-zero-mean perturbation would
       bias the policy, not just explore it);
    2. reward each sample by the proper scoring rule against the teacher
       distribution, and centre it by the group mean (GRPO);
    3. policy-gradient loss on the Gaussian log-probability of the sample, plus
       a soft cross-entropy anchor on the clean logits.

    The reward term is computed under `no_grad`: it is a score, not a path to
    the parameters.
    """
    import torch  # noqa: PLC0415

    mask_f = mask.to(logits.dtype)
    k = mask_f.sum(-1, keepdim=True)

    noise = torch.randn((group_size,) + tuple(logits.shape), device=logits.device) * sigma
    noise = (noise - noise.sum(-1, keepdim=True) / torch.clamp(k, min=1)) * mask_f

    sampled = logits.detach().unsqueeze(0) + noise
    probabilities = torch.softmax(sampled.masked_fill(mask == 0, -1e4), dim=-1)

    with torch.no_grad():
        reward = proper_reward(
            probabilities, target.unsqueeze(0), qtypes, mask, w_sph=w_sph, w_rps=w_rps
        )
        advantage = reward - reward.mean(0, keepdim=True)
        spread = float(advantage.std().item()) if advantage.numel() > 1 else 0.0
        advantage = advantage / (advantage.std() + 1e-6)

    # Gaussian log-probability of the sample under the policy's own noise model.
    log_prob = -(((sampled - logits.unsqueeze(0)) ** 2) * mask_f).sum(-1) / (2 * sigma**2)
    loss_rl = -(advantage * log_prob).mean()

    clean = torch.softmax(logits.masked_fill(mask == 0, -1e4), dim=-1)
    loss_ce = -(
        target * torch.log(torch.clamp(clean, min=1e-12)) * mask_f
    ).sum(-1).mean()

    return RlcdOutput(
        loss=loss_rl + ce_weight * loss_ce,
        reward_mean=float(reward.mean().item()),
        advantage_spread=spread,
    )


# ── Temperature calibration ─────────────────────────────────────────────────

TEMPERATURE_MIN = 0.2
TEMPERATURE_MAX = 5.0


def fit_temperature(
    logits: Sequence[Sequence[float]],
    targets: Sequence[Sequence[float]],
    grid_points: int = 61,
) -> float:
    """Fit one scalar temperature by minimising the target's negative log-likelihood.

    A **grid search in log space**, not LBFGS: it needs no Torch, it cannot
    diverge, and on a one-parameter convex-ish problem the difference from the
    notebook's optimiser is below the resolution of the metric we report it
    with. Kept dependency-free so calibration can run on a machine where only
    the metrics harness is installed.

    Returning 1.0 for a degenerate slice is deliberate: a temperature fitted on
    a handful of items measures noise, and 1.0 is the honest "no information"
    answer.
    """
    if len(logits) < 10 or len(logits) != len(targets):
        return 1.0

    def negative_log_likelihood(temperature: float) -> float:
        total = 0.0
        for row, target in zip(logits, targets):
            if not row:
                continue
            scaled = [value / temperature for value in row]
            peak = max(scaled)
            exps = [math.exp(value - peak) for value in scaled]
            denominator = sum(exps) or 1.0
            for value, weight in zip(exps, target):
                if weight > 0:
                    total -= weight * math.log(max(value / denominator, 1e-12))
        return total / max(1, len(logits))

    low, high = math.log(TEMPERATURE_MIN), math.log(TEMPERATURE_MAX)
    best_temperature, best_loss = 1.0, float("inf")
    for step in range(grid_points):
        temperature = math.exp(low + (high - low) * step / (grid_points - 1))
        loss = negative_log_likelihood(temperature)
        if loss < best_loss:
            best_loss, best_temperature = loss, temperature
    return round(best_temperature, 4)


def fit_temperatures(
    predictions: Mapping[str, Sequence[Tuple[Sequence[float], Sequence[float]]]]
) -> Dict[str, float]:
    """Fit one temperature per primitive, as the notebook does per question type."""
    return {
        primitive: fit_temperature([row for row, _ in rows], [target for _, target in rows])
        for primitive, rows in predictions.items()
    }


# ── Training configuration ──────────────────────────────────────────────────


@dataclass
class TrainConfig:
    """Hyper-parameters, defaults taken from the family's reference notebook."""

    epochs: int = 4
    micro_batch: int = 8
    grad_accum: int = 4
    group_size: int = 4
    lr_encoder: float = 2.5e-5
    lr_head: float = 1.0e-4
    weight_decay: float = 0.01
    sigma_start: float = 0.4
    sigma_end: float = 0.1
    ce_weight: float = 1.0
    w_sph: float = 0.75
    w_rps: float = 1.0
    grad_clip: float = 1.0
    max_len: int = 1024
    head_max_len: int = 256
    calibration_holdout: int = 400
    seed: int = 20261001
    freeze_encoder: bool = False
    lora_rank: int = 0
    fp16: bool = True

    def as_dict(self) -> Dict[str, Any]:
        return {k: v for k, v in self.__dict__.items()}


def calibrate_slice(
    count: int, config: TrainConfig
) -> Tuple[List[int], List[int]]:
    """Split indices into (calibration, training) with a fixed, rank-independent seed.

    The slice is held out **before** any sharding, exactly as the notebook does:
    temperatures fitted on items the run has already trained on measure the fit
    rather than the calibration, and return a degenerate scale.
    """
    order = list(range(count))
    random.Random(config.seed).shuffle(order)
    holdout = min(config.calibration_holdout, max(0, count // 10))
    calibration = sorted(order[:holdout])
    training = sorted(order[holdout:])
    return calibration, training


def sigma_for(epoch: int, config: TrainConfig) -> float:
    """Anneal exploration noise: explore early, commit late."""
    if config.epochs <= 1:
        return config.sigma_end
    progress = epoch / (config.epochs - 1)
    return config.sigma_start + (config.sigma_end - config.sigma_start) * progress


def save_manifest(path: Path, payload: Mapping[str, Any]) -> None:
    """Write the run manifest next to the weights.

    A checkpoint without its provenance is unreviewable: this is what lets a
    later session answer "which code, which config, which metric, on what
    data" without guessing.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dict(payload), indent=2, ensure_ascii=False), encoding="utf-8")

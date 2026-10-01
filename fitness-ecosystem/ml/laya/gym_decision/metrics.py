"""Metrics for typed decisions, and the before/after comparator.

These are the numbers the family publishes so a run here is comparable to a run
there: accuracy (argmax), soft accuracy (probability mass on the truth),
Brier, expected calibration error, score MAE and within-1-level for ordinal
questions.

Two things this file insists on.

**Calibration is reported next to accuracy, never instead of it.** A model that
is right 80% of the time and always says 99% is worse in production than one
that is right 76% and says 76% — the second one can be gated. This model family
ships over-confident, which is why ECE is a first-class metric here.

**The comparison is against our own floor.** The published baseline that
matters is not a proprietary API, it is `deterministicScores` in `schema.py`:
if the learned model cannot beat "the caller's ordering, no model at all", it
has not earned the right to make the decision. `compare_reports` enforces that
framing by taking the floor's report as its reference.

@module gym_decision.metrics
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Any, Dict, List, Mapping, Optional, Sequence, Tuple

PRIMITIVES = ("choice", "score", "noul")


def ece_score(
    confidences: Sequence[float], corrects: Sequence[float], bins: int = 10
) -> float:
    """Expected calibration error: the confidence/accuracy gap, averaged.

    Equal-width bins over 0..1, weighted by bin population. This is the
    standard formula the family reports; a model whose confidence means
    nothing cannot be gated, and gating is the whole reason to have a
    calibrated number at all.
    """
    if len(confidences) != len(corrects):
        raise ValueError("confidences and corrects must have the same length")
    if not confidences:
        return 0.0
    total = len(confidences)
    error = 0.0
    for index in range(bins):
        low, high = index / bins, (index + 1) / bins
        members = [
            (c, k)
            for c, k in zip(confidences, corrects)
            if (low < c <= high) or (index == 0 and c == 0.0)
        ]
        if not members:
            continue
        mean_conf = sum(c for c, _ in members) / len(members)
        mean_acc = sum(k for _, k in members) / len(members)
        error += (len(members) / total) * abs(mean_acc - mean_conf)
    return error


def _normalise(distribution: Mapping[str, float], keys: Sequence[str]) -> List[float]:
    raw = [max(0.0, float(distribution.get(key, 0.0))) for key in keys]
    total = sum(raw)
    if total <= 0:
        return [1.0 / len(keys)] * len(keys) if keys else []
    return [value / total for value in raw]


def _tv(first: Sequence[float], second: Sequence[float]) -> float:
    return 0.5 * sum(abs(a - b) for a, b in zip(first, second))


def _kl(gold: Sequence[float], pred: Sequence[float]) -> float:
    total = 0.0
    for g, p in zip(gold, pred):
        if g > 0:
            total += g * math.log(max(g, 1e-12) / max(p, 1e-12))
    return total


@dataclass
class MetricAccumulator:
    correct: List[float] = field(default_factory=list)
    confidence: List[float] = field(default_factory=list)
    soft: List[float] = field(default_factory=list)
    brier: List[float] = field(default_factory=list)
    tv: List[float] = field(default_factory=list)
    kl: List[float] = field(default_factory=list)
    score_error: List[float] = field(default_factory=list)
    within_one: List[float] = field(default_factory=list)
    per_primitive: Dict[str, List[float]] = field(default_factory=dict)

    def add(self, primitive: str, correct: float) -> None:
        self.correct.append(correct)
        self.per_primitive.setdefault(primitive, []).append(correct)

    def summary(self) -> Dict[str, Any]:
        mean = lambda values: (sum(values) / len(values)) if values else 0.0  # noqa: E731
        return {
            "n_decisions": len(self.correct),
            "accuracy": round(mean(self.correct), 4),
            "soft_accuracy": round(mean(self.soft), 4),
            "brier": round(mean(self.brier), 4),
            "ece": round(ece_score(self.confidence, self.correct), 4),
            "score_mae": round(mean(self.score_error), 4),
            "within_1_level": round(mean(self.within_one), 4),
            "tv_distance": round(mean(self.tv), 4),
            "kl_divergence": round(mean(self.kl), 4),
            "mean_confidence": round(mean(self.confidence), 4),
            "per_primitive": {
                primitive: {
                    "n": len(values),
                    "accuracy": round(mean(values), 4),
                }
                for primitive, values in sorted(self.per_primitive.items())
            },
        }


def score_prediction(
    question: Mapping[str, Any],
    prediction: Mapping[str, Any],
    gold: Mapping[str, Any],
    accumulator: MetricAccumulator,
) -> None:
    """Fold one answered question into the accumulator."""
    kind = question.get("type")

    if kind == "choice":
        keys = list((question.get("criteria") or {}).keys())
        gold_label = str(gold.get("label"))
        predicted = str(prediction.get("choice"))
        correct = float(predicted == gold_label)
        accumulator.add("choice", correct)

        probabilities = prediction.get("probabilities") or {}
        gold_probabilities = gold.get("probabilities") or {}
        if keys:
            pred_dist = _normalise(probabilities, keys)
            gold_dist = _normalise(gold_probabilities, keys)
            accumulator.soft.append(sum(p * g for p, g in zip(pred_dist, gold_dist)))
            accumulator.brier.append(sum((p - g) ** 2 for p, g in zip(pred_dist, gold_dist)))
            accumulator.tv.append(_tv(pred_dist, gold_dist))
            accumulator.kl.append(_kl(gold_dist, pred_dist))
            reported = prediction.get("answer_confidence")
            accumulator.confidence.append(
                float(reported) if isinstance(reported, (int, float)) else max(pred_dist, default=0.0)
            )

    elif kind == "noul":
        predicted_true = float(prediction.get("noul", 0.5))
        gold_label = str(gold.get("label", "true")).lower()
        predicted_label = "true" if predicted_true >= 0.5 else "false"
        accumulator.add("noul", float(predicted_label == gold_label))
        accumulator.confidence.append(max(predicted_true, 1 - predicted_true))

        pred_dist = [1 - predicted_true, predicted_true]
        gold_true = gold.get("noul")
        if not isinstance(gold_true, (int, float)):
            probabilities = gold.get("probabilities") or {}
            gold_true = probabilities.get("true", 0.5)
        gold_dist = [1 - float(gold_true), float(gold_true)]
        accumulator.soft.append(sum(p * g for p, g in zip(pred_dist, gold_dist)))
        accumulator.brier.append(sum((p - g) ** 2 for p, g in zip(pred_dist, gold_dist)))
        accumulator.tv.append(_tv(pred_dist, gold_dist))
        accumulator.kl.append(_kl(gold_dist, pred_dist))

    elif kind == "score":
        predicted_score = float(prediction.get("score", 0.0))
        gold_score = gold.get("score")
        if not isinstance(gold_score, (int, float)):
            gold_score = gold.get("label", 0)
        error = abs(predicted_score - float(gold_score))
        accumulator.score_error.append(error)
        accumulator.within_one.append(float(error <= 1.0))

        levels = question.get("criteria") or []
        probabilities = prediction.get("probabilities") or {}
        if levels:
            pred_dist = _normalise(probabilities, [str(i) for i in range(len(levels))])
            predicted_level = max(range(len(pred_dist)), key=lambda i: pred_dist[i])
            gold_level = int(gold.get("label", round(float(gold_score))))
            accumulator.add("score", float(predicted_level == gold_level))
            accumulator.confidence.append(max(pred_dist))


def evaluate(
    cases: Sequence[Mapping[str, Any]],
    predict: Any,
) -> Dict[str, Any]:
    """Run `predict(case) -> {"answers": {...}}` over cases and score it.

    `predict` is injected so the same harness measures the deterministic floor,
    the base checkpoint and the fine-tuned model — the "before" and the "after"
    have to be the same measurement, or the comparison means nothing.
    """
    accumulator = MetricAccumulator()
    for case in cases:
        state = case["state"] if not isinstance(case["state"], str) else None
        questions = (
            case["questions"] if isinstance(case["questions"], Mapping) else None
        )
        gold = case["gold"] if isinstance(case["gold"], Mapping) else None
        if state is None:
            import json

            state = json.loads(case["state"])
            questions = json.loads(case["questions"])
            gold = json.loads(case["gold"])
        result = predict(case, state, questions) or {}
        answers = result.get("answers") or {}
        for question_id, question in questions.items():
            if question_id not in gold:
                continue
            prediction = answers.get(question_id)
            if prediction is None:
                # No answer counts as wrong, not as absent: an abstention on a
                # decision the model was built to make is a failure.
                if question.get("type") == "choice":
                    keys = list((question.get("criteria") or {}).keys())
                    keys = keys or ["__none__"]
                    prediction = {
                        "type": "choice",
                        "choice": "__abstained__",
                        "probabilities": {key: 1.0 / len(keys) for key in keys},
                    }
                elif question.get("type") == "noul":
                    prediction = {"type": "noul", "noul": 0.5}
                else:
                    prediction = {"type": "score", "score": 0.0, "probabilities": {}}
            score_prediction(question, prediction, gold[question_id], accumulator)
    return accumulator.summary()


def compare_reports(before: Mapping[str, Any], after: Mapping[str, Any]) -> Dict[str, Any]:
    """Delta report with the floor as the reference, not a vendor's number.

    Lower is better for `brier`, `ece`, `score_mae`, `tv_distance` and
    `kl_divergence`; higher is better for the rest.
    """
    lower_is_better = {"brier", "ece", "score_mae", "tv_distance", "kl_divergence"}
    deltas: Dict[str, Any] = {}
    for key in ("accuracy", "soft_accuracy", "brier", "ece", "score_mae", "within_1_level"):
        if key not in before or key not in after:
            continue
        delta = float(after[key]) - float(before[key])
        improved = (-delta if key in lower_is_better else delta) > 0
        deltas[key] = {
            "before": before[key],
            "after": after[key],
            "delta": round(delta, 4),
            "improved": improved,
        }
    accuracy_delta = deltas.get("accuracy", {}).get("delta", 0.0)
    return {
        "before": dict(before),
        "after": dict(after),
        "deltas": deltas,
        "verdict": (
            "improved"
            if accuracy_delta > 0
            else "regressed"
            if accuracy_delta < 0
            else "flat"
        ),
        "note": (
            "Reference is our own deterministic floor (no model). A learned model "
            "must beat it on accuracy AND not regress ECE to be worth shipping."
        ),
    }

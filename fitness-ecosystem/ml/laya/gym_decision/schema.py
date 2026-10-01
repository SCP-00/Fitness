"""Python mirror of the app's typed-decision contract.

This module is a **port of `bodylab/core/training/src/laya.ts`**, not a
reimplementation: it renders the same state document, builds the same question
set and applies the same scoring rule. Both sides are locked to
`tests/golden_state.json`.

Why it has to exist at all. Training data is built by rendering sessions
through this code. If the renderer here drifts from the one in the app, the
model is trained on text it will never see at inference — the classic silent
train/serve skew. A golden fixture plus a parity test in both languages is the
cheap insurance (see `tests/test_schema.py` and the TypeScript suite).

No third-party imports: this module must run on a bare Python so the dataset
builder and the metrics harness work before Torch is installed.

@module gym_decision.schema
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

# ── Limits — mirror of LAYA_MAX_OPTIONS / LAYA_MAX_STATE_CHARS / LAYA_MIN_CONFIDENCE ──

LAYAS_MAX_OPTIONS = 20
LAYAS_MAX_STATE_CHARS = 1800
LAYAS_MIN_CONFIDENCE = 0.45

FAMILY_ORDER: Tuple[str, ...] = (
    "chest",
    "shoulders",
    "triceps",
    "biceps",
    "forearms",
    "lats",
    "traps",
    "rhomboids",
    "core",
    "glutes",
    "quadriceps",
    "hamstrings",
    "calves",
)

QUESTION_FOCUS = "focus"
QUESTION_VOLUME = "volume"
QUESTION_DELOAD = "deload"
EXERCISE_PREFIX = "ex_"


def exercise_question_id(family: str) -> str:
    return f"{EXERCISE_PREFIX}{family}"


def round1(value: float) -> float:
    """One decimal, rounding halves **up** like JavaScript's `Math.round`.

    Python's built-in `round` is banker's rounding (round(0.5) == 0,
    round(2.5) == 2), so using it here would make the Python renderer disagree
    with TypeScript on exact halves and break the golden fixture. The floor
    form reproduces `Math.round` for the non-negative values this module sees.
    """
    return math.floor(value * 10 + 0.5) / 10


def num(value: float) -> str:
    """Render a number the way JavaScript's `String(number)` does.

    A whole float prints without a trailing `.0` (`78`, not `78.0`). Python
    would print the latter, which would break the golden fixture on every
    integral value — and the fixture is the only thing stopping the trainer
    from drifting away from the app.
    """
    rounded = round1(value)
    if rounded == int(rounded):
        return str(int(rounded))
    return str(rounded)


# ── State ───────────────────────────────────────────────────────────────────


@dataclass
class State:
    text: str
    truncated: bool
    families: List[str] = field(default_factory=list)


def build_state(context: Mapping[str, Any], max_chars: int = LAYAS_MAX_STATE_CHARS) -> State:
    """Render a session context as the compact document the model reads."""
    lines: List[str] = []

    lines.append(
        f"goal: {context['goal']} | level: {context['level']}"
    )
    lines.append(f"minutes: {max(0, int(round(float(context['timeBudgetMin']))))}")

    readiness = context["readiness"]
    lines.append(
        "readiness: energy={} motivation={} soreness={} (1=bad 5=great; soreness 5=fresh)".format(
            num(float(readiness["energy"])),
            num(float(readiness["motivation"])),
            num(float(readiness["soreness"])),
        )
    )

    conditioning = context.get("conditioningScore")
    if conditioning is not None and math.isfinite(float(conditioning)):
        lines.append(f"conditioning: {num(float(conditioning))}/100")

    gear = context.get("gear") or []
    if gear:
        lines.append(f"gear: {','.join(sorted(gear))}")

    weakness = context.get("weakness") or {}
    known = [
        (family, float(weakness[family]))
        for family in FAMILY_ORDER
        if isinstance(weakness.get(family), (int, float))
        and math.isfinite(float(weakness[family]))
    ]
    if known:
        known.sort(key=lambda item: (item[1], item[0]))
        summary = " ".join(f"{family}={num(value)}" for family, value in known[:5])
        lines.append(f"weakest: {summary} (0-100, lower=weaker)")
    else:
        lines.append("weakest: unknown (no anthropometric map)")

    weekly = context.get("weeklyVolume") or {}
    volume = [
        family
        for family in FAMILY_ORDER
        if isinstance(weekly.get(family), (int, float)) and float(weekly[family]) != 0
    ]
    if volume:
        lines.append(
            "sets_7d: "
            + " ".join(f"{family}={num(float(weekly[family]))}" for family in volume)
        )

    fatigued = [f for f in (context.get("fatiguedFamilies") or []) if f in FAMILY_ORDER]
    if fatigued:
        lines.append(f"fatigued: {','.join(fatigued)}")

    note = (context.get("note") or "").strip()
    if note:
        lines.append(f"note: {' '.join(note.split())}")

    text = "\n".join(lines)
    truncated = False
    if len(text) > max_chars:
        truncated = True
        kept: List[str] = []
        used = 0
        for line in lines:
            if used + len(line) + 1 > max_chars:
                break
            kept.append(line)
            used += len(line) + 1
        text = "\n".join(kept)

    families = [f for f in FAMILY_ORDER if re.search(rf"\b{f}\b", text)]
    return State(text=text, truncated=truncated, families=families)


# ── Questions ───────────────────────────────────────────────────────────────


def _family_description(context: Mapping[str, Any], family: str) -> str:
    bits: List[str] = []
    weakness = (context.get("weakness") or {}).get(family)
    if isinstance(weakness, (int, float)) and math.isfinite(float(weakness)):
        if weakness < 40:
            bits.append("a measured weakness")
        elif weakness < 60:
            bits.append("mid-range strength")
        else:
            bits.append("already strong")
    done = (context.get("weeklyVolume") or {}).get(family)
    if isinstance(done, (int, float)):
        if done == 0:
            bits.append("nothing trained this week")
        else:
            bits.append(f"{round1(float(done))} sets in the last 7 days")
    if family in (context.get("fatiguedFamilies") or []):
        bits.append("still sore today")
    return ", ".join(bits) if bits else "no data"


def build_questions(
    context: Mapping[str, Any],
    focus_families: Sequence[str],
    by_family: Mapping[str, Sequence[Mapping[str, Any]]],
) -> Dict[str, Dict[str, Any]]:
    """Build the typed question set. Mirrors `buildLayaQuestions`."""
    questions: Dict[str, Dict[str, Any]] = {}
    focus = list(focus_families)[:LAYAS_MAX_OPTIONS]

    if focus:
        questions[QUESTION_FOCUS] = {
            "type": "choice",
            "instructions": (
                "Which muscle family should today's session train first, given "
                "the time available and how the athlete feels?"
            ),
            "criteria": {family: _family_description(context, family) for family in focus},
        }

    questions[QUESTION_DELOAD] = {
        "type": "choice",
        "instructions": (
            "Should today's session be reduced (fewer sets, easier effort) "
            "because the athlete is not recovered?"
        ),
        "criteria": {"A": "yes, reduce the session", "B": "no, train as planned"},
    }

    questions[QUESTION_VOLUME] = {
        "type": "score",
        "instructions": (
            "How many working sets should the priority family get in today's session?"
        ),
        "criteria": ["0 to 1 sets", "2 sets", "3 sets", "4 sets", "5 or more sets"],
    }

    for family in focus:
        candidates = list(by_family.get(family, []))[:LAYAS_MAX_OPTIONS]
        if not candidates:
            continue
        criteria: Dict[str, str] = {}
        for option in candidates:
            bits = [
                str(option["label"]),
                str(option["pattern"]).replace("_", " "),
                str(option["loadType"]),
            ]
            setup = option.get("setupMin")
            if setup and float(setup) >= 2:
                bits.append(f"setup {int(setup)} min")
            criteria[str(option["id"])] = ", ".join(bits)
        questions[exercise_question_id(family)] = {
            "type": "choice",
            "instructions": (
                "Which exercise best fits the athlete's gear, the effort "
                "available today and this family?"
            ),
            "criteria": criteria,
        }

    return questions


# ── Answers → scores ────────────────────────────────────────────────────────


def deterministic_scores(
    focus_families: Sequence[str],
    by_family: Mapping[str, Sequence[Mapping[str, Any]]],
) -> Dict[str, float]:
    """The floor: the caller's own ordering, no model. Mirrors the TypeScript."""
    scores: Dict[str, float] = {}
    for family in focus_families:
        candidates = list(by_family.get(family, []))
        n = len(candidates)
        if n == 0:
            continue
        for index, option in enumerate(candidates):
            scores[str(option["id"])] = 1.0 if n == 1 else round1((n - 1 - index) / (n - 1))
    return scores


def _confidence(answer: Optional[Mapping[str, Any]]) -> float:
    if not answer:
        return 0.0
    reported = answer.get("answer_confidence")
    if isinstance(reported, (int, float)) and math.isfinite(float(reported)):
        return float(reported)
    if answer.get("type") in ("choice", "score"):
        probs = [
            float(p)
            for p in (answer.get("probabilities") or {}).values()
            if isinstance(p, (int, float)) and math.isfinite(float(p))
        ]
        return max(probs) if probs else 0.0
    value = answer.get("noul")
    return max(float(value), 1 - float(value)) if isinstance(value, (int, float)) else 0.0


def _well_formed(answer: Mapping[str, Any], offered: Sequence[str]) -> bool:
    if answer.get("type") == "choice":
        return isinstance(answer.get("choice"), str) and answer["choice"] in offered
    if answer.get("type") == "score":
        value = answer.get("score")
        return isinstance(value, (int, float)) and math.isfinite(float(value))
    value = answer.get("noul")
    return isinstance(value, (int, float)) and math.isfinite(float(value))


@dataclass
class Scores:
    scores: Dict[str, float]
    source: str
    confidences: Dict[str, float]
    fallback_reason: Optional[str]
    unanswered_families: List[str]
    deload_families: List[str]


def scores_from_result(
    focus_families: Sequence[str],
    by_family: Mapping[str, Sequence[Mapping[str, Any]]],
    result: Optional[Mapping[str, Any]],
    confidence_threshold: float = LAYAS_MIN_CONFIDENCE,
) -> Scores:
    """Turn a model result into `modelScores`. Mirrors `scoresFromLaya`."""
    floor = deterministic_scores(focus_families, by_family)
    answers = (result or {}).get("answers") or {}
    if not answers:
        return Scores(
            scores=dict(floor),
            source="fallback",
            confidences={},
            fallback_reason="no_model",
            unanswered_families=list(focus_families),
            deload_families=[],
        )

    focus_keys = list(focus_families)[:LAYAS_MAX_OPTIONS]
    focus_answer = answers.get(QUESTION_FOCUS)
    if not focus_answer or not _well_formed(focus_answer, focus_keys):
        return Scores(
            scores=dict(floor),
            source="fallback",
            confidences={},
            fallback_reason="malformed" if focus_answer else "no_model",
            unanswered_families=list(focus_families),
            deload_families=[],
        )

    confidences = {
        question_id: round(float(_confidence(answer)) * 1000) / 1000
        for question_id, answer in answers.items()
    }

    if _confidence(focus_answer) < confidence_threshold:
        return Scores(
            scores=dict(floor),
            source="fallback",
            confidences=confidences,
            fallback_reason="low_confidence",
            unanswered_families=list(focus_families),
            deload_families=[],
        )

    scores: Dict[str, float] = {}
    unanswered: List[str] = []
    for family in focus_families:
        candidates = list(by_family.get(family, []))
        if not candidates:
            continue
        n = len(candidates)
        ids = [str(c["id"]) for c in candidates]
        answer = answers.get(exercise_question_id(family))
        if not answer or not _well_formed(answer, ids) or _confidence(answer) < confidence_threshold:
            unanswered.append(family)
            for option in candidates:
                scores[str(option["id"])] = floor.get(str(option["id"]), 0.0)
            continue
        picked = answer["choice"] if answer.get("type") == "choice" else ids[0]
        for index, option in enumerate(candidates):
            sibling = 0.7 if n == 1 else 0.3 + 0.4 * ((n - 1 - index) / (n - 1))
            scores[str(option["id"])] = (
                1.0 if str(option["id"]) == picked else round1(sibling)
            )

    priority = focus_answer.get("choice") if focus_answer.get("type") == "choice" else None
    deload_answer = answers.get(QUESTION_DELOAD)
    deload = bool(
        deload_answer
        and deload_answer.get("type") == "choice"
        and deload_answer.get("choice") == "A"
        and _confidence(deload_answer) >= confidence_threshold
    )

    return Scores(
        scores=scores,
        source="model",
        confidences=confidences,
        fallback_reason=None,
        unanswered_families=unanswered,
        deload_families=[priority] if (deload and priority in FAMILY_ORDER) else [],
    )


def state_document(context: Mapping[str, Any]) -> str:
    """Convenience: the state text alone, which is what the dataset stores."""
    return build_state(context).text

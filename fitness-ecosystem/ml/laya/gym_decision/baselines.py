"""The baseline the learned model has to beat: our own deterministic floor.

This is `deterministicScores` from `schema.py` answering the same questions, in
the same harness, as the model will. It is the reference for every "before /
after" number the pipeline reports.

**Read its ECE with the right question in mind.** The floor answers with a
degenerate distribution — probability 1.0 on its single choice, because a
deterministic rule has no uncertainty to express. Its ECE is therefore
systematically `1 - accuracy` by construction, and that is a fact about the
baseline worth showing rather than hiding: it is exactly why a calibrated model
is worth training. It is not a number to compare the model against.

@module gym_decision.baselines
"""

from __future__ import annotations

from typing import Any, Dict, List, Mapping, Sequence

from . import schema
from .schema import QUESTION_DELOAD, QUESTION_FOCUS, QUESTION_VOLUME

#: The volume rubric bucket the floor picks, i.e. "three working sets".
FLOOR_VOLUME_INDEX = 2


def floor_answers(
    questions: Mapping[str, Mapping[str, Any]],
    priority_family: str,
) -> Dict[str, Dict[str, Any]]:
    """The floor's answer to an already-built question set.

    `priority_family` is the family the caller's own ordering prefers — for the
    floor there is nothing else to consult, and pretending otherwise (a coin
    flip, a uniform prior) would be a worse baseline, not a fairer one.
    """
    answers: Dict[str, Dict[str, Any]] = {}

    focus = questions.get(QUESTION_FOCUS)
    if focus and focus.get("type") == "choice":
        keys = list((focus.get("criteria") or {}).keys())
        chosen = priority_family if priority_family in keys else (keys[0] if keys else "")
        if chosen:
            answers[QUESTION_FOCUS] = {
                "type": "choice",
                "choice": chosen,
                "probabilities": {chosen: 1.0},
            }

    for question_id, question in questions.items():
        if question.get("type") != "choice" or not question_id.startswith(schema.EXERCISE_PREFIX):
            continue
        keys = list((question.get("criteria") or {}).keys())
        if keys:
            # The caller's ordering is the shortlist order, so the first key is
            # the floor's pick inside every family.
            answers[question_id] = {
                "type": "choice",
                "choice": keys[0],
                "probabilities": {keys[0]: 1.0},
            }

    volume = questions.get(QUESTION_VOLUME)
    if volume and volume.get("type") == "score":
        levels = volume.get("criteria") or []
        index = min(FLOOR_VOLUME_INDEX, max(0, len(levels) - 1))
        answers[QUESTION_VOLUME] = {
            "type": "score",
            "score": float(index),
            "probabilities": {str(index): 1.0},
        }

    deload = questions.get(QUESTION_DELOAD)
    if deload and deload.get("type") == "choice":
        answers[QUESTION_DELOAD] = {
            "type": "choice",
            "choice": "B",
            "probabilities": {"B": 1.0},
        }

    return answers


class FloorPredictor:
    """`predict(case, state, questions) -> {"answers": ...}` for `metrics.evaluate`."""

    def __init__(self, priority_families: Sequence[str] = ()) -> None:
        self.priority_families = list(priority_families)

    def _priority(self, questions: Mapping[str, Mapping[str, Any]]) -> str:
        focus = questions.get(QUESTION_FOCUS)
        if focus and focus.get("type") == "choice":
            keys = list((focus.get("criteria") or {}).keys())
            for family in self.priority_families:
                if family in keys:
                    return family
            if keys:
                return keys[0]
        return ""

    def __call__(self, case: Mapping[str, Any], state: Any, questions: Mapping[str, Any]):
        priority = self._priority(questions)
        return {"answers": floor_answers(questions, priority)}

"""Build typed-decision training cases from TrainingLab's own logs.

The training set for our model is the app's set log, rendered through exactly
the code the app runs (`schema.py` ↔ `laya.ts`). Nothing here reaches the
network and nothing here learns: it is a deterministic, reviewable transform.

**Labelling is the whole problem, and this module is opinionated about it.**
The log records only the choices the athlete *made*, so "train on what they
did" teaches the model to reproduce current habits — including the habits the
plan exists to fix. An undertrained weak family is undertrained *because* it
keeps getting skipped; a behaviour-cloned policy would keep skipping it and
call it personalisation. So the two primitives are labelled from different
sources, on purpose:

===============  ==========================================================
question         label source
===============  ==========================================================
``focus``        the **deterministic coach** (the rules `session.ts` encodes:
                 weakest first, respect fatigue, respect the weekly gap).
                 Behaviour is deliberately not used here — it is the field we
                 are trying to improve, not to imitate.
``volume``       the coach's rubric, clipped by what the athlete actually
                 completed (a plan nobody can finish is not a target).
``ex_<family>``  **behaviour**: inside the family the coach picked, which
                 movement the athlete actually reached for. This is real
                 preference evidence and it does not fight the plan.
``deload``       behaviour, via a transparent proxy: total working sets at or
                 below ``deload_ratio`` of the athlete's median session.
===============  ==========================================================

Targets are **distributions**, not one-hot labels. The family's training rule
is a strictly proper scoring rule over the full distribution, and one-hot
targets make it optimise a classification margin instead of honest
probabilities — which is the one thing this model class is for.

@module gym_decision.dataset
"""

from __future__ import annotations

import csv
import io
import json
import math
import random
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, Iterable, List, Mapping, Optional, Sequence, Tuple

from . import schema
from .schema import FAMILY_ORDER, QUESTION_DELOAD, QUESTION_FOCUS, QUESTION_VOLUME

# ── The app's CSV contract ──────────────────────────────────────────────────

SETS_CSV_COLUMNS = (
    "set_id",
    "timestamp",
    "date",
    "time",
    "exercise_id",
    "exercise_name_es",
    "exercise_name_en",
    "primary_family",
    "pattern",
    "equipment",
    "set_index",
    "warmup",
    "weight_kg",
    "weight_display",
    "unit",
    "reps",
    "rpe",
    "volume_kg",
    "notes",
)


def parse_number(raw: Any) -> Optional[float]:
    """Read a cell from the CSV.

    The export writes `;` as the delimiter and a **decimal comma** for Excel in
    a Spanish locale, and it writes an empty string for "no data" so that a
    missing value stays distinguishable from a real zero. A naive
    ``float(cell)`` would raise on ``"75,5"`` and a naive ``replace(",", ".")``
    would corrupt any thousands separator, so both are handled explicitly.
    """
    if raw is None:
        return None
    text = str(raw).strip()
    if text == "":
        return None
    # Thousands separators first, then the decimal comma.
    text = text.replace("\u00a0", "")
    if "," in text and "." in text:
        text = text.replace(".", "").replace(",", ".")
    else:
        text = text.replace(",", ".")
    try:
        value = float(text)
    except ValueError:
        return None
    return value if math.isfinite(value) else None


@dataclass(frozen=True)
class LoggedSet:
    set_id: str
    date: str
    time: str
    exercise_id: str
    family: str
    pattern: str
    equipment: str
    warmup: bool
    weight_kg: Optional[float]
    reps: Optional[float]
    rpe: Optional[float]
    name_en: str


def read_sets_csv(text: str) -> List[LoggedSet]:
    """Parse the app's sets export. Tolerates the BOM, CRLF and RFC 4180 quoting."""
    if text.startswith("\ufeff"):
        text = text[1:]
    reader = csv.reader(io.StringIO(text), delimiter=";")
    try:
        header = next(reader)
    except StopIteration:
        return []
    header = [h.strip().lstrip("\ufeff") for h in header]
    index = {name: position for position, name in enumerate(header)}
    missing = [c for c in ("date", "exercise_id", "primary_family") if c not in index]
    if missing:
        raise ValueError(f"CSV is missing required columns: {', '.join(missing)}")

    def cell(row: Sequence[str], name: str) -> str:
        position = index.get(name)
        if position is None or position >= len(row):
            return ""
        return row[position].strip()

    out: List[LoggedSet] = []
    for row in reader:
        if not row or all(cell_value == "" for cell_value in row):
            continue
        out.append(
            LoggedSet(
                set_id=cell(row, "set_id"),
                date=cell(row, "date"),
                time=cell(row, "time"),
                exercise_id=cell(row, "exercise_id"),
                family=cell(row, "primary_family"),
                pattern=cell(row, "pattern"),
                equipment=cell(row, "equipment"),
                warmup=cell(row, "warmup") in ("1", "true", "True"),
                weight_kg=parse_number(cell(row, "weight_kg")),
                reps=parse_number(cell(row, "reps")),
                rpe=parse_number(cell(row, "rpe")),
                name_en=cell(row, "exercise_name_en"),
            )
        )
    return out


# ── Sessions ────────────────────────────────────────────────────────────────


@dataclass
class LoggedSession:
    date: str
    sets: List[LoggedSet] = field(default_factory=list)

    @property
    def working(self) -> List[LoggedSet]:
        return [s for s in self.sets if not s.warmup]

    def sets_per_family(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for entry in self.working:
            if entry.family in FAMILY_ORDER:
                counts[entry.family] = counts.get(entry.family, 0) + 1
        return counts

    def sets_per_exercise(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for entry in self.working:
            counts[entry.exercise_id] = counts.get(entry.exercise_id, 0) + 1
        return counts

    def exercises_by_family(self) -> Dict[str, List[str]]:
        grouped: Dict[str, List[str]] = {}
        for entry in sorted(self.working, key=lambda s: (s.time, s.set_id)):
            if entry.family not in FAMILY_ORDER:
                continue
            bucket = grouped.setdefault(entry.family, [])
            if entry.exercise_id not in bucket:
                bucket.append(entry.exercise_id)
        return grouped

    def label(self, exercise_id: str) -> str:
        for entry in self.working:
            if entry.exercise_id == exercise_id:
                names = entry.name_en or entry.exercise_id
                return names
        return exercise_id

    def pattern_of(self, exercise_id: str) -> str:
        for entry in self.working:
            if entry.exercise_id == exercise_id:
                return entry.pattern or "unknown"
        return "unknown"

    def equipment_of(self, exercise_id: str) -> str:
        for entry in self.working:
            if entry.exercise_id == exercise_id:
                return entry.equipment or "unknown"
        return "unknown"


def sessions_from_sets(sets: Iterable[LoggedSet]) -> List[LoggedSession]:
    """Group sets by calendar day, chronological."""
    by_date: Dict[str, LoggedSession] = {}
    for entry in sets:
        if not entry.date:
            continue
        by_date.setdefault(entry.date, LoggedSession(date=entry.date)).sets.append(entry)
    ordered = [by_date[key] for key in sorted(by_date)]
    for session in ordered:
        session.sets.sort(key=lambda s: (s.time, s.set_id))
    return ordered


# ── The weak labeler ────────────────────────────────────────────────────────


@dataclass
class Labeller:
    """Deterministic teacher. No model, no randomness, no network.

    ``weakness`` is injected rather than inferred from the log on purpose: a
    weakness score came from BodyLab's anthropometry, and reading it back out
    of the training log would make the label depend on the very behaviour the
    plan is trying to correct.
    """

    weakness: Mapping[str, Optional[float]] = field(default_factory=dict)
    level: str = "intermediate"
    goal: str = "hypertrophy"
    weekly_window: int = 16
    deload_ratio: float = 0.6
    volume_rubric: Tuple[float, float, float, float, float] = (1.0, 2.0, 3.0, 4.0, 5.0)

    def coach_focus_ranking(
        self,
        candidates: Sequence[str],
        sets_done: Mapping[str, int],
        fatigued: Sequence[str] = (),
    ) -> List[str]:
        """Rank candidate families the way the deterministic builder does.

        Lower coaching score first: a measured weakness, then the weekly gap,
        then a nudge away from a family that is still sore. This is the same
        intent as `decision.ts`' prior, expressed on families instead of
        exercises — the floor the model has to beat, and the source of the
        ``focus`` label.
        """
        scored: List[Tuple[float, str]] = []
        for family in candidates:
            weak = self.weakness.get(family)
            # No anthropometric data = neutral 50, same convention as the app.
            weak_score = 50.0 if weak is None else float(weak)
            done = float(sets_done.get(family, 0))
            gap = max(0.0, (self.weekly_window - done) / self.weekly_window)
            penalty = 25.0 if family in fatigued else 0.0
            scored.append((weak_score * 0.6 - gap * 100 * 0.4 + penalty, family))
        scored.sort(key=lambda item: (item[0], FAMILY_ORDER.index(item[1])))
        return [family for _, family in scored]

    def focus_distribution(
        self, candidates: Sequence[str], sets_done: Mapping[str, int], fatigued: Sequence[str] = ()
    ) -> Dict[str, float]:
        """Soft target over the focus question, from the coaching ranking.

        Soft, not one-hot: RLCD rewards a calibrated distribution, and a
        one-hot target would tell the model that the second-best family is
        simply wrong when it is usually a reasonable session too.
        """
        ranking = self.coach_focus_ranking(candidates, sets_done, fatigued)
        if not ranking:
            return {}
        # Gaps of one rank are common and genuinely close; temperature 3 keeps
        # the target honest about that instead of collapsing to a spike.
        weights = {family: math.exp(-index / 3.0) for index, family in enumerate(ranking)}
        total = sum(weights.values())
        return {family: value / total for family, value in weights.items()}

    def volume_distribution(self, sets: int, prescribed_cap: Optional[int] = None) -> Dict[str, float]:
        """Distribution over the 0..4 volume rubric, peaked at the right bucket.

        When the athlete demonstrably could not finish the prescribed work, the
        target is clipped: a plan nobody can complete is not a training target,
        it is a bug report.
        """
        cap = prescribed_cap if prescribed_cap is not None else max(self.volume_rubric)
        observed = min(float(sets), float(cap), self.volume_rubric[-1])
        distance = [abs(observed - level) for level in self.volume_rubric]
        weights = [math.exp(-d) for d in distance]
        total = sum(weights)
        return {str(index): weight / total for index, weight in enumerate(weights)}

    def deload_label(self, total_sets: int, median_sets: float) -> Tuple[str, float]:
        """Behavioural proxy: a visibly short session reads as a reduced one."""
        if median_sets <= 0:
            return "B", 0.5
        reduced = total_sets <= median_sets * self.deload_ratio
        # Confidence follows the distance from the threshold, so a session
        # right at the boundary does not train the model to be certain.
        ratio = total_sets / median_sets
        margin = min(1.0, abs(ratio - self.deload_ratio) / 0.3)
        confidence = 0.5 + 0.45 * margin
        return ("A" if reduced else "B"), round(confidence, 3)


# ── Cases ───────────────────────────────────────────────────────────────────


@dataclass
class Case:
    """One training case: the app's own state document + typed questions + gold."""

    id: str
    state: Dict[str, Any]
    questions: Dict[str, Dict[str, Any]]
    gold: Dict[str, Any]

    def to_json(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "state": json.dumps(self.state, ensure_ascii=False),
            "questions": json.dumps(self.questions, ensure_ascii=False),
            "gold": json.dumps(self.gold, ensure_ascii=False),
        }


def _gear_tokens(session: LoggedSession) -> List[str]:
    tokens = {s.equipment for s in session.working if s.equipment}
    return sorted(token for token in tokens if token and token != "unknown")


def case_from_session(
    session: LoggedSession,
    labeller: Labeller,
    history: Mapping[str, int],
    median_sets: float,
    context_extras: Optional[Mapping[str, Any]] = None,
) -> Optional[Case]:
    """Turn one logged session into a case, or ``None`` when it cannot teach anything.

    A session with no working sets is skipped: there is no decision in it.
    """
    working = session.working
    if not working:
        return None

    sets_per_family = session.sets_per_family()
    if not sets_per_family:
        return None

    focus_candidates = [f for f in FAMILY_ORDER if f in sets_per_family]
    if not focus_candidates:
        return None

    focus_target = labeller.focus_distribution(focus_candidates, history)
    focus_label = max(focus_target, key=lambda key: focus_target[key])

    fatigued = sorted(
        family
        for family, done in history.items()
        if family in FAMILY_ORDER and done >= labeller.weekly_window and family != focus_label
    )

    context: Dict[str, Any] = {
        "level": labeller.level,
        "goal": labeller.goal,
        "timeBudgetMin": float(
            len(working) * 3.5
        ),  # N sets at ~3.5 min each incl. rest: a floor estimate, not a guess dressed as data
        "readiness": {"energy": 3, "motivation": 3, "soreness": 3},
        "weakness": {f: labeller.weakness[f] for f in focus_candidates if labeller.weakness.get(f) is not None},
        "weeklyVolume": {f: history[f] for f in focus_candidates if history.get(f)},
        "fatiguedFamilies": fatigued,
        "gear": _gear_tokens(session),
    }
    if context_extras:
        context.update({k: v for k, v in context_extras.items() if v is not None})

    state = schema.build_state(context)

    by_family: Dict[str, List[Dict[str, Any]]] = {}
    gold: Dict[str, Any] = {
        QUESTION_FOCUS: {
            "type": "choice",
            "label": focus_label,
            "probabilities": focus_target,
        },
        QUESTION_VOLUME: {
            "type": "score",
            "label": int(
                max(
                    range(len(labeller.volume_rubric)),
                    key=lambda i: labeller.volume_distribution(sets_per_family[focus_label])[str(i)],
                )
            ),
            "probabilities": labeller.volume_distribution(sets_per_family[focus_label]),
            "score": min(
                float(sets_per_family[focus_label]), labeller.volume_rubric[-1]
            ),
        },
    }

    deload_choice, deload_confidence = labeller.deload_label(len(working), median_sets)
    gold[QUESTION_DELOAD] = {
        "type": "choice",
        "label": deload_choice,
        "probabilities": (
            {"A": deload_confidence, "B": 1 - deload_confidence}
            if deload_choice == "A"
            else {"A": 1 - deload_confidence, "B": deload_confidence}
        ),
    }

    exercises_by_family = session.exercises_by_family()
    for family in focus_candidates:
        observed = exercises_by_family.get(family, [])
        if not observed:
            continue
        # Every observed movement of that day is a candidate; the athlete's own
        # set counts become a soft preference distribution over them.
        counts = session.sets_per_exercise()
        total = sum(counts.get(exercise, 0) for exercise in observed) or 1
        labels = []
        for exercise in observed:
            labels.append(
                {
                    "id": exercise,
                    "label": session.label(exercise),
                    "family": family,
                    "pattern": session.pattern_of(exercise),
                    "loadType": session.equipment_of(exercise),
                }
            )
            by_family.setdefault(family, []).append(labels[-1])
        probabilities = {exercise: (counts.get(exercise, 0) or 0.5) / total for exercise in observed}
        shift = sum(probabilities.values()) or 1
        probabilities = {k: v / shift for k, v in probabilities.items()}
        gold[schema.exercise_question_id(family)] = {
            "type": "choice",
            "label": max(probabilities, key=lambda key: probabilities[key]),
            "probabilities": probabilities,
        }

    questions = schema.build_questions(context, focus_candidates, by_family)
    if QUESTION_FOCUS not in questions:
        return None

    return Case(
        id=f"{session.date}",
        state={"text": state.text, "truncated": state.truncated},
        questions=questions,
        gold=gold,
    )


def build_cases(
    sessions: Sequence[LoggedSession],
    labeller: Labeller,
    window_days: int = 7,
) -> Tuple[List[Case], List[str]]:
    """Build cases chronologically with a rolling weekly ledger.

    Returns the cases and the list of skipped reasons, so a thin dataset is
    visible instead of silently small.
    """
    cases: List[Case] = []
    skipped: List[str] = []
    ledger: Dict[str, Dict[str, int]] = {}
    per_session_totals: List[float] = []

    for session in sessions:
        history: Dict[str, int] = {}
        for day, counts in ledger.items():
            for family, count in counts.items():
                history[family] = history.get(family, 0) + count
        median = (
            sorted(per_session_totals)[len(per_session_totals) // 2]
            if per_session_totals
            else float(len(session.working))
        )
        case = case_from_session(session, labeller, history, median)
        if case is None:
            skipped.append(f"{session.date}: no usable decision")
        else:
            cases.append(case)

        counts = session.sets_per_family()
        if counts:
            ledger[session.date] = counts
            per_session_totals.append(float(sum(counts.values())))
        # Keep the ledger to the rolling window.
        for day in sorted(ledger):
            if day < session.date and _days_between(day, session.date) > window_days:
                del ledger[day]

    return cases, skipped


def _days_between(a: str, b: str) -> int:
    from datetime import date

    try:
        first = date.fromisoformat(a)
        second = date.fromisoformat(b)
    except ValueError:
        return 0
    return abs((second - first).days)


def write_jsonl(cases: Sequence[Case], path: Path) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for case in cases:
            handle.write(json.dumps(case.to_json(), ensure_ascii=False) + "\n")
    return len(cases)


def read_jsonl(path: Path) -> List[Dict[str, Any]]:
    rows: List[Dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


# ── Synthetic corpus ────────────────────────────────────────────────────────

#: A small, plausible movement vocabulary. Only for exercising the pipeline.
#: A shipped model is trained on the real catalog and the real log.
SYNTH_MOVEMENTS: Dict[str, List[Tuple[str, str, str]]] = {
    "chest": [("db_press", "horizontal_push", "dumbbell"), ("push_up", "horizontal_push", "bodyweight"), ("cable_fly", "horizontal_push", "cable")],
    "shoulders": [("db_press_oh", "vertical_push", "dumbbell"), ("lateral_raise", "shoulder_abduction", "dumbbell")],
    "triceps": [("rope_pushdown", "elbow_extension", "cable"), ("dip", "elbow_extension", "bodyweight")],
    "biceps": [("db_curl", "elbow_flexion", "dumbbell"), ("chin_up", "vertical_pull", "bodyweight")],
    "forearms": [("wrist_curl", "forearm_flexion", "dumbbell")],
    "lats": [("lat_pulldown", "vertical_pull", "machine"), ("db_row", "horizontal_pull", "dumbbell"), ("pull_up", "vertical_pull", "bodyweight")],
    "traps": [("shrug", "carry", "dumbbell")],
    "rhomboids": [("face_pull", "horizontal_pull", "cable")],
    "core": [("plank", "core_anti_extension", "bodyweight"), ("cable_crunch", "core_flexion", "cable")],
    "glutes": [("hip_thrust", "hip_extension", "barbell"), ("glute_bridge", "hip_extension", "bodyweight")],
    "quadriceps": [("squat", "squat", "barbell"), ("leg_press", "knee_extension", "machine")],
    "hamstrings": [("rdl", "hinge", "barbell"), ("leg_curl", "knee_flexion", "machine")],
    "calves": [("calf_raise", "plantar_flexion", "machine")],
}


def synth_sessions(count: int = 240, seed: int = 7) -> List[LoggedSession]:
    """Deterministic synthetic log, shaped like the real export.

    Its purpose is to prove the pipeline, the metrics and the training loop run
    end to end on a machine that has no personal data and no GPU. It is **not**
    a substitute for the real log: a model trained on this is a smoke test, and
    the ``train`` command refuses to call its output shippable for that reason.
    """
    rng = random.Random(seed)
    sessions: List[LoggedSession] = []
    # A stable, per-run weakness profile, so the coach has something to react to.
    weakness = {family: float(rng.uniform(25, 85)) for family in FAMILY_ORDER}
    from datetime import date, timedelta

    day = date(2026, 1, 5)
    for index in range(count):
        # ~4 sessions a week.
        gap = rng.choice([1, 2, 2, 3])
        day = day + timedelta(days=gap)
        focus = min(weakness, key=lambda f: weakness[f])
        # The athlete alternates between the weakness and whatever they enjoy,
        # which is exactly the bias the labeller is designed to survive.
        families = [focus] if rng.random() < 0.55 else [focus, rng.choice(FAMILY_ORDER)]
        sets: List[LoggedSet] = []
        for family in dict.fromkeys(families):
            movements = SYNTH_MOVEMENTS.get(family, [])
            if not movements:
                continue
            chosen = rng.choice(movements)
            for set_index in range(1, rng.randint(2, 5)):
                movement = chosen if rng.random() < 0.75 else rng.choice(movements)
                sets.append(
                    LoggedSet(
                        set_id=f"s{index}-{family}-{set_index}-{movement[0]}",
                        date=day.isoformat(),
                        time=f"{18 + (set_index // 4):02d}:{(set_index * 7) % 60:02d}",
                        exercise_id=movement[0],
                        family=family,
                        pattern=movement[1],
                        equipment=movement[2],
                        warmup=False,
                        weight_kg=float(rng.choice([20, 25, 30, 40, 60])),
                        reps=float(rng.choice([8, 10, 12, 15])),
                        rpe=float(rng.choice([6, 7, 8, 9])),
                        name_en=movement[0].replace("_", " ").title(),
                    )
                )
        sessions.append(LoggedSession(date=day.isoformat(), sets=sets))
    return sessions


def labeller_from_synth(sessions: Sequence[LoggedSession]) -> Labeller:
    """A deterministic weakness profile for the synthetic corpus."""
    rng = random.Random(7)
    return Labeller(weakness={family: float(rng.uniform(25, 85)) for family in FAMILY_ORDER})

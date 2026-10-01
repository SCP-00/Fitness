"""Tests for the typed-decision pipeline.

The two that matter most, and why:

* ``test_golden_state_parity`` — the Python renderer must produce the **exact
  bytes** the TypeScript renderer produces. Training data built by a renderer
  that drifts from the app is train/serve skew, and it is silent.
* ``test_labels_reject_the_athletes_own_bias`` — the ``focus`` label must come
  from the coach, not from what the athlete happened to do. A model cloned from
  behaviour would keep skipping the weak family that the plan exists to fix,
  and it would look like personalisation.

The Torch tests are skipped on a machine without it; the rest run anywhere.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import pytest

from gym_decision import baselines, dataset, metrics, schema, train

FIXTURE = json.loads(
    (Path(__file__).resolve().parent / "golden_state.json").read_text(encoding="utf-8")
)


# ── Cross-language contract ─────────────────────────────────────────────────


@pytest.mark.parametrize("name", sorted(FIXTURE["cases"]))
def test_golden_state_parity(name: str) -> None:
    case = FIXTURE["cases"][name]
    state = schema.build_state(case["context"])
    assert state.text == case["text"], (
        f"Python renderer drifted from the app for {name!r}. The TypeScript "
        "implementation in bodylab/core/training/src/laya.ts is the source of truth."
    )
    assert state.truncated == case["truncated"]


def test_state_is_bounded_and_says_so() -> None:
    context = dict(FIXTURE["cases"]["full"]["context"])
    context["note"] = "a" * 5000
    state = schema.build_state(context)
    assert state.truncated is True
    assert len(state.text) <= schema.LAYAS_MAX_STATE_CHARS
    for line in state.text.split("\n"):
        assert line[: line.index(":")].replace("_", "").isalnum()
    assert "minutes: 45" in state.text
    assert "note:" not in state.text


def test_round1_matches_javascript_rounding() -> None:
    # JS Math.round is half-up; Python's built-in round is half-to-even.
    assert schema.round1(55.55) == 55.6
    assert schema.round1(0.25) == 0.3
    assert schema.round1(78.0) == 78.0


def test_questions_never_exceed_the_option_ceiling() -> None:
    many = [
        {"id": f"ex_{i}", "label": f"Ex {i}", "family": "chest", "pattern": "squat", "loadType": "dumbbell"}
        for i in range(40)
    ]
    questions = schema.build_questions({"readiness": {}, "weakness": {}}, ["chest"], {"chest": many})
    for question_id, question in questions.items():
        count = (
            len(question["criteria"])
            if question["type"] == "choice"
            else len(question["criteria"])
            if question["type"] == "score"
            else 1
        )
        assert count <= schema.LAYAS_MAX_OPTIONS, question_id


def test_deload_question_uses_neutral_keys_not_noul() -> None:
    questions = schema.build_questions({}, ["chest"], {})
    deload = questions[schema.QUESTION_DELOAD]
    assert deload["type"] == "choice"
    assert list(deload["criteria"]) == ["A", "B"]


def test_scores_are_monotone_in_the_callers_order() -> None:
    by_family = {
        "chest": [
            {"id": "first", "label": "First", "family": "chest", "pattern": "push", "loadType": "x"},
            {"id": "second", "label": "Second", "family": "chest", "pattern": "push", "loadType": "x"},
        ]
    }
    scores = schema.deterministic_scores(["chest"], by_family)
    assert scores == {"first": 1.0, "second": 0.0}


def test_low_confidence_answer_is_discarded() -> None:
    by_family = {
        "chest": [{"id": "a", "label": "A", "family": "chest", "pattern": "push", "loadType": "x"}]
    }
    result = {
        "answers": {
            schema.QUESTION_FOCUS: {
                "type": "choice",
                "choice": "chest",
                "probabilities": {"chest": 0.5},
                "answer_confidence": 0.5,
            }
        }
    }
    scores = schema.scores_from_result(["chest"], by_family, result, confidence_threshold=0.9)
    assert scores.source == "fallback"
    assert scores.fallback_reason == "low_confidence"


# ── The app's CSV contract ──────────────────────────────────────────────────

CSV_SAMPLE = (
    "\ufeff"
    "set_id;timestamp;date;time;exercise_id;exercise_name_es;exercise_name_en;primary_family;"
    "pattern;equipment;set_index;warmup;weight_kg;weight_display;unit;reps;rpe;volume_kg;notes\r\n"
    "s1;2026-01-05T18:00:00Z;2026-01-05;18:00;db_press;Press;Dumbbell Press;chest;horizontal_push;"
    "dumbbell;1;0;75,5;75,5;kg;10;8;755,0;\r\n"
    "s2;2026-01-05T18:05:00Z;2026-01-05;18:05;db_press;Press;Dumbbell Press;chest;horizontal_push;"
    "dumbbell;2;0;;;kg;;;;\r\n"
    "s3;2026-01-05T18:02:00Z;2026-01-05;18:02;db_press;Press;Dumbbell Press;chest;horizontal_push;"
    "dumbbell;0;1;40;40;kg;12;5;;\"entrada, con coma\"\r\n"
    "s4;2026-01-07T18:00:00Z;2026-01-07;18:00;rdl;Peso muerto rumano;Romanian Deadlift;hamstrings;"
    "hinge;barbell;1;0;100;100;kg;8;7;800;\r\n"
)


def test_csv_parsing_handles_bom_delimiter_and_decimal_comma() -> None:
    rows = dataset.read_sets_csv(CSV_SAMPLE)
    assert len(rows) == 4
    assert rows[0].weight_kg == 75.5
    assert rows[0].reps == 10
    assert rows[0].family == "chest"
    # An empty cell is "no data", never zero: a missing weight must not read as 0 kg.
    assert rows[1].weight_kg is None
    assert rows[1].reps is None
    assert rows[2].warmup is True
    assert rows[3].family == "hamstrings"


def test_parse_number_rejects_nonsense() -> None:
    assert dataset.parse_number("") is None
    assert dataset.parse_number(None) is None
    assert dataset.parse_number("abc") is None
    assert dataset.parse_number("1.234,5") == 1234.5
    assert dataset.parse_number("75,5") == 75.5


def test_sessions_group_by_day_and_exclude_warmups() -> None:
    sessions = dataset.sessions_from_sets(dataset.read_sets_csv(CSV_SAMPLE))
    assert [s.date for s in sessions] == ["2026-01-05", "2026-01-07"]
    first = sessions[0]
    assert len(first.sets) == 3
    assert len(first.working) == 2
    assert first.sets_per_family() == {"chest": 2}
    assert first.sets_per_exercise() == {"db_press": 2}


def test_csv_missing_a_required_column_is_an_error() -> None:
    with pytest.raises(ValueError):
        dataset.read_sets_csv("set_id;date\ns1;2026-01-05\n")


# ── Labelling ───────────────────────────────────────────────────────────────


def _session(date: str, entries) -> dataset.LoggedSession:
    sets = []
    for index, (exercise, family, sets_count) in enumerate(entries):
        for set_index in range(sets_count):
            sets.append(
                dataset.LoggedSet(
                    set_id=f"{date}-{index}-{set_index}",
                    date=date,
                    time=f"18:{index:02d}",
                    exercise_id=exercise,
                    family=family,
                    pattern="squat",
                    equipment="barbell",
                    warmup=False,
                    weight_kg=50.0,
                    reps=10.0,
                    rpe=7.0,
                    name_en=exercise,
                )
            )
    return dataset.LoggedSession(date=date, sets=sets)


def test_labels_reject_the_athletes_own_bias() -> None:
    """The athlete trains the family they enjoy; the label must still say weakness.

    This is the single most important property of the labeller. Chest is weak
    (25) and lats are already strong (80). The athlete logged three chest sets
    and six lat sets — behaviour alone would make lats the focus. The coach's
    ranking must win, because the model is being trained to improve the
    programme, not to imitate the habit that keeps chest weak.
    """
    labeller = dataset.Labeller(weakness={"chest": 25.0, "lats": 80.0})
    session = _session("2026-01-05", [("db_press", "chest", 3), ("db_row", "lats", 6)])
    case = dataset.case_from_session(session, labeller, history={}, median_sets=9.0)
    assert case is not None
    assert case.gold[schema.QUESTION_FOCUS]["label"] == "chest"
    # And the target is a distribution, not a one-hot: the strong family stays
    # on the table, it is just not the first choice.
    probabilities = case.gold[schema.QUESTION_FOCUS]["probabilities"]
    assert prob_sums_to_one(probabilities)
    assert probabilities["lats"] > 0


def test_exercise_label_follows_what_the_athlete_actually_chose() -> None:
    labeller = dataset.Labeller(weakness={"chest": 25.0})
    session = _session("2026-01-05", [("db_press", "chest", 2), ("push_up", "chest", 4)])
    case = dataset.case_from_session(session, labeller, history={}, median_sets=6.0)
    assert case is not None
    choice = case.gold[schema.exercise_question_id("chest")]
    assert choice["label"] == "push_up"
    assert choice["probabilities"]["push_up"] > choice["probabilities"]["db_press"]


def test_deload_label_uses_a_transparent_short_session_proxy() -> None:
    labeller = dataset.Labeller()
    assert labeller.deload_label(3, 10.0)[0] == "A"
    assert labeller.deload_label(12, 10.0)[0] == "B"
    # A session at the boundary must not produce a confident label.
    assert labeller.deload_label(6, 10.0)[1] < 0.75


def test_case_shapes_and_question_coverage() -> None:
    labeller = dataset.Labeller(weakness={"chest": 30.0, "lats": 70.0})
    session = _session("2026-01-05", [("db_press", "chest", 3), ("db_row", "lats", 3)])
    case = dataset.case_from_session(session, labeller, history={}, median_sets=6.0)
    assert case is not None
    payload = case.to_json()
    for key in ("id", "state", "questions", "gold"):
        assert key in payload
    questions = json.loads(payload["questions"])
    assert schema.QUESTION_FOCUS in questions
    assert schema.QUESTION_VOLUME in questions
    assert schema.QUESTION_DELOAD in questions
    assert schema.exercise_question_id("chest") in questions
    assert schema.exercise_question_id("lats") in questions
    gold = json.loads(payload["gold"])
    for question_id, entry in gold.items():
        if entry["type"] == "choice":
            assert prob_sums_to_one(entry["probabilities"]), question_id


def prob_sums_to_one(distribution) -> bool:
    return abs(sum(distribution.values()) - 1.0) < 1e-6


def test_empty_session_teaches_nothing_and_is_skipped() -> None:
    labeller = dataset.Labeller()
    empty = dataset.LoggedSession(date="2026-01-05", sets=[])
    assert dataset.case_from_session(empty, labeller, history={}, median_sets=0.0) is None


def test_build_cases_keeps_a_rolling_ledger() -> None:
    labeller = dataset.Labeller(weakness={"chest": 25.0, "lats": 80.0})
    sessions = [
        _session("2026-01-05", [("db_press", "chest", 3)]),
        _session("2026-01-06", [("db_press", "chest", 2), ("db_row", "lats", 3)]),
    ]
    cases, skipped = dataset.build_cases(sessions, labeller)
    assert len(cases) == 2
    assert skipped == []
    # The second day's state must carry the first day's chest sets. Only the
    # families that are candidates today appear: the state shows the weekly gap
    # the *decision* needs, not a dump of every family (it is a token budget).
    second = json.loads(cases[1].to_json()["state"])["text"]
    assert "sets_7d: chest=3" in second


def test_synthetic_corpus_is_deterministic() -> None:
    first = dataset.synth_sessions(count=12, seed=3)
    second = dataset.synth_sessions(count=12, seed=3)
    assert [(s.date, len(s.sets)) for s in first] == [(s.date, len(s.sets)) for s in second]


# ── Metrics ─────────────────────────────────────────────────────────────────


def test_ece_is_zero_for_a_perfectly_calibrated_model() -> None:
    # 10 items at confidence 0.7, 7 of them right.
    confidences = [0.7] * 10
    correct = [1.0] * 7 + [0.0] * 3
    assert metrics.ece_score(confidences, correct) == pytest.approx(0.0, abs=1e-9)


def test_ece_catches_overconfidence() -> None:
    confidences = [0.99] * 10
    correct = [1.0] * 5 + [0.0] * 5
    assert metrics.ece_score(confidences, correct) == pytest.approx(0.49, abs=1e-6)


def test_metric_accumulator_on_a_perfect_choice() -> None:
    accumulator = metrics.MetricAccumulator()
    question = {"type": "choice", "criteria": {"a": "x", "b": "y"}}
    metrics.score_prediction(
        question,
        {"type": "choice", "choice": "a", "probabilities": {"a": 1.0}},
        {"type": "choice", "label": "a", "probabilities": {"a": 1.0}},
        accumulator,
    )
    summary = accumulator.summary()
    assert summary["accuracy"] == 1.0
    assert summary["soft_accuracy"] == 1.0
    assert summary["brier"] == 0.0
    assert summary["n_decisions"] == 1


def test_ordinal_score_metrics() -> None:
    accumulator = metrics.MetricAccumulator()
    question = {"type": "score", "criteria": ["0", "1", "2", "3"]}
    metrics.score_prediction(
        question,
        {"type": "score", "score": 2.0, "probabilities": {"2": 1.0}},
        {"type": "score", "label": 3, "score": 3.0},
        accumulator,
    )
    summary = accumulator.summary()
    assert summary["score_mae"] == 1.0
    assert summary["within_1_level"] == 1.0
    assert summary["accuracy"] == 0.0


def test_compare_reports_flags_regression_and_improvement() -> None:
    before = {"accuracy": 0.5, "ece": 0.2, "brier": 0.3, "soft_accuracy": 0.5, "score_mae": 0.4, "within_1_level": 0.8}
    improved = dict(before, accuracy=0.6, ece=0.1)
    report = metrics.compare_reports(before, improved)
    assert report["verdict"] == "improved"
    assert report["deltas"]["ece"]["improved"] is True
    assert report["deltas"]["accuracy"]["improved"] is True

    worse = dict(before, accuracy=0.4)
    assert metrics.compare_reports(before, worse)["verdict"] == "regressed"


# ── The baseline the model must beat ────────────────────────────────────────


def test_floor_answers_only_offer_what_was_asked() -> None:
    by_family = {
        "chest": [
            {"id": "a", "label": "A", "family": "chest", "pattern": "push", "loadType": "x"},
            {"id": "b", "label": "B", "family": "chest", "pattern": "push", "loadType": "x"},
        ]
    }
    questions = schema.build_questions({}, ["chest"], by_family)
    answers = baselines.floor_answers(questions, "chest")
    for question_id, answer in answers.items():
        if answer["type"] != "choice":
            continue
        offered = list(questions[question_id]["criteria"])
        assert answer["choice"] in offered


def test_evaluate_harness_runs_the_floor_end_to_end() -> None:
    labeller = dataset.Labeller(weakness={"chest": 25.0, "lats": 80.0})
    sessions = dataset.synth_sessions(count=40, seed=11)
    cases, _ = dataset.build_cases(sessions, labeller)
    assert cases, "the synthetic corpus produced no cases"
    rows = [case.to_json() for case in cases]
    report = metrics.evaluate(rows, baselines.FloorPredictor())
    assert report["n_decisions"] > 0
    assert 0.0 <= report["accuracy"] <= 1.0
    # The floor is deterministic: it answers with probability 1.0, so its ECE is
    # 1 - accuracy by construction. Asserted so nobody mistakes it for a result.
    assert report["ece"] == pytest.approx(1.0 - report["accuracy"], abs=0.02)


def test_calibration_slice_is_held_out_and_rank_independent() -> None:
    config = train.TrainConfig(calibration_holdout=400)
    calibration, training = train.calibrate_slice(1000, config)
    assert len(calibration) == 100  # capped at count // 10
    assert set(calibration).isdisjoint(training)
    assert sorted(calibration + training) == list(range(1000))
    assert train.calibrate_slice(1000, config) == (calibration, training)


def test_sigma_anneals_from_explore_to_commit() -> None:
    config = train.TrainConfig(epochs=4, sigma_start=0.4, sigma_end=0.1)
    assert train.sigma_for(0, config) == pytest.approx(0.4)
    assert train.sigma_for(3, config) == pytest.approx(0.1)
    assert train.sigma_for(1, config) > train.sigma_for(2, config)


def test_temperature_grid_beats_no_temperature_on_overconfident_logits() -> None:
    """A model that always says 0.99 needs T > 1, and fitting it must help."""
    logits = [[4.6, 0.0] for _ in range(40)]
    targets = [[0.7, 0.3] for _ in range(40)]
    temperature = train.fit_temperature(logits, targets)
    assert temperature > 1.0

    def nll(temperature: float) -> float:
        total = 0.0
        for row, target in zip(logits, targets):
            scaled = [value / temperature for value in row]
            peak = max(scaled)
            exps = [math.exp(value - peak) for value in scaled]
            denominator = sum(exps)
            for value, weight in zip(exps, target):
                total -= weight * math.log(max(value / denominator, 1e-12))
        return total / len(logits)

    assert nll(temperature) < nll(1.0)


def test_temperature_refuses_to_fit_a_tiny_slice() -> None:
    assert train.fit_temperature([[1.0, 0.0]] * 3, [[1.0, 0.0]] * 3) == 1.0


def test_device_policy_names_vulkan_as_unsupported() -> None:
    assert "vulkan" in train.DEVICE_NOTES
    assert "Not supported" in train.DEVICE_NOTES["vulkan"]
    assert "DirectML" in train.DEVICE_NOTES["dml"]
    assert train.device_candidates() == ["cuda", "xpu", "mps", "cpu"]


# ── Torch-only: the update rule itself ──────────────────────────────────────

# Torch is an optional extra, so it is imported softly: `importorskip` at module
# scope would skip the whole file, and the point of the suite above is that it
# runs on a bare Python (that is what lets CI measure the baseline).
try:  # noqa: SIM105 - an explicit flag reads better than a bare except
    import torch
    HAS_TORCH = True
except ImportError:  # pragma: no cover - the bare-Python path is the default here
    torch = None  # type: ignore[assignment]
    HAS_TORCH = False

requires_torch = pytest.mark.skipif(
    not HAS_TORCH, reason="torch is an optional extra (pip install -e '.[train]')"
)


@requires_torch
def test_reference_proper_reward_is_strictly_proper() -> None:
    """Reporting the truth must score higher than any perturbation of it.

    This is the property the whole RLCD objective rests on: if lying paid
    better, the training loop would teach the model to lie confidently.
    """
    truth = torch.tensor([[0.6, 0.3, 0.1], [0.2, 0.5, 0.3]])
    mask = torch.ones_like(truth)
    qtypes = torch.tensor([0, 0])
    honest = train.reference_proper_reward(truth, truth, qtypes, mask).mean().item()
    for perturbation in (0.05, 0.15, 0.3):
        shifted = torch.clamp(truth + torch.tensor([[perturbation, -perturbation, 0.0]]), min=0.0)
        shifted = shifted / shifted.sum(-1, keepdim=True)
        assert train.reference_proper_reward(shifted, truth, qtypes, mask).mean().item() < honest


@requires_torch
def test_rlcd_step_produces_gradients_and_a_finite_loss() -> None:
    torch.manual_seed(0)
    head = torch.nn.Linear(4, 3)
    features = torch.randn(6, 4)
    target = torch.tensor([[0.6, 0.3, 0.1]] * 6)
    qtypes = torch.zeros(6, dtype=torch.long)
    mask = torch.ones(6, 3)

    logits = head(features)
    out = train.rlcd_loss(logits, target, qtypes, mask, group_size=4, sigma=0.4)
    assert torch.isfinite(out.loss)
    out.loss.backward()
    assert head.weight.grad is not None
    assert float(head.weight.grad.abs().sum()) > 0


@requires_torch
def test_rlcd_training_reduces_the_loss_on_a_learnable_signal() -> None:
    torch.manual_seed(1)
    head = torch.nn.Linear(4, 3)
    features = torch.randn(48, 4)
    # A learnable mapping: the option index is a function of the features.
    target = torch.zeros(48, 3)
    target[features[:, 0] > 0, 0] = 0.7
    target[features[:, 0] > 0, 1] = 0.3
    target[features[:, 0] <= 0, 1] = 0.6
    target[features[:, 0] <= 0, 2] = 0.4
    target = target / target.sum(-1, keepdim=True)

    mask = torch.ones(48, 3)
    qtypes = torch.zeros(48, dtype=torch.long)
    optimizer = torch.optim.AdamW(head.parameters(), lr=0.05)

    first = None
    last = None
    for step in range(30):
        optimizer.zero_grad()
        out = train.rlcd_loss(head(features), target, qtypes, mask, group_size=4, sigma=0.3)
        out.loss.backward()
        optimizer.step()
        if step == 0:
            first = float(out.loss.detach())
        last = float(out.loss.detach())

    assert last is not None and first is not None
    assert last < first, f"loss did not fall: {first:.4f} -> {last:.4f}"


@requires_torch
def test_exploration_strictly_costs_reward() -> None:
    """Noise must lower the *expected* reward, or the group advantage is wrong.

    The target is set to the model's own clean distribution, so the clean answer
    is the Bayes-optimal report. A strictly proper rule is then uniquely
    maximised there, which means adding exploration noise can only lose reward
    on average. If it did not, the group-mean advantage would pay the policy for
    being jittery and RLCD would train the opposite of calibration.
    """
    torch.manual_seed(2)
    logits = torch.tensor([[2.0, 1.0, 0.5]])
    mask = torch.ones(1, 3)
    qtypes = torch.zeros(1, dtype=torch.long)
    with torch.no_grad():
        clean_distribution = torch.softmax(logits, -1)
        clean = train.reference_proper_reward(
            clean_distribution, clean_distribution, qtypes, mask
        ).mean().item()

        sigma = 0.4
        k = mask.sum(-1, keepdim=True)
        total = 0.0
        draws = 300
        for _ in range(draws):
            noise = torch.randn((1, 1, 3)) * sigma
            noise = (noise - noise.sum(-1, keepdim=True) / k) * mask
            noisy = torch.softmax(logits + noise, -1)
            total += train.reference_proper_reward(
                noisy, clean_distribution, qtypes, mask
            ).mean().item()
        mean_noisy = total / draws

    assert mean_noisy < clean, f"noise paid: clean {clean:.4f} vs noisy {mean_noisy:.4f}"


def test_encode_items_uses_the_injected_qtype_mapping() -> None:
    """The qtype code decides which primitive gets the ordinal reward term.

    A wrong mapping applies the ranked probability score to the wrong head and
    quietly distorts the objective, so the trainer injects `laya.common.QTYPES`
    rather than trusting a hardcoded copy. This locks that injection.
    """

    class FakeTokenizer:
        pad_token_id = 0

    def fake_build_sequence(tokenizer, text, question, max_len, head_max_len):
        return [1, 2], [0]

    def fake_render_options(question):
        return [{"t": question["t"]}]

    from gym_decision import cli

    rows = [
        {
            "id": "x",
            "state": json.dumps({"text": "goal: hypertrophy"}),
            "questions": json.dumps(
                {
                    "volume": {"type": "score", "instructions": "i", "criteria": ["a", "b"]},
                    "focus": {"type": "choice", "instructions": "i", "criteria": {"a": "x"}},
                }
            ),
            "gold": json.dumps(
                {
                    "volume": {"type": "score", "label": 1, "probabilities": {"0": 0.4, "1": 0.6}},
                    "focus": {"type": "choice", "label": "a", "probabilities": {"a": 1.0}},
                }
            ),
        }
    ]
    # An inverted mapping: if the trainer hardcoded its own codes, score would
    # come out as 0 here and this test would fail.
    items, dropped = cli.encode_items(
        rows,
        FakeTokenizer(),
        {"max_len": 512, "head_max_len": 192},
        fake_build_sequence,
        fake_render_options,
        qtypes={"choice": 9, "score": 3, "noul": 7},
    )
    assert dropped == 0
    codes = {item["qtype"] for item in items}
    assert codes == {9, 3}


def test_encode_items_drops_sequences_whose_option_count_disagrees() -> None:
    """A silently mis-counted option block would train on the wrong target."""

    class FakeTokenizer:
        pad_token_id = 0

    def fake_build_sequence(tokenizer, text, question, max_len, head_max_len):
        return [1, 2, 3], [0, 0]  # only two markers

    def fake_render_options(question):
        if question["t"] == "choice":
            return [{"t": "choice"}] * 3  # three options
        return [{"t": question["t"]}]

    from gym_decision import cli

    rows = [
        {
            "id": "x",
            "state": json.dumps({"text": "goal: hypertrophy"}),
            "questions": json.dumps(
                {
                    "focus": {
                        "type": "choice",
                        "instructions": "i",
                        "criteria": {"a": "x", "b": "y", "c": "z"},
                    }
                }
            ),
            "gold": json.dumps(
                {"focus": {"type": "choice", "label": "a", "probabilities": {"a": 1.0}}}
            ),
        }
    ]
    items, dropped = cli.encode_items(
        rows, FakeTokenizer(), {"max_len": 512, "head_max_len": 192}, fake_build_sequence, fake_render_options
    )
    assert items == []
    assert dropped == 1

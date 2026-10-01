"""Training and evaluation tooling for TrainingLab's typed-decision model.

This package is **offline tooling**. Nothing in it ships to the app, and the app
never imports it: the runtime contract lives in TypeScript
(`bodylab/core/training/src/laya.ts`) and the two sides are locked together by
`tests/golden_state.json` plus a parity test in both languages.

Layout:

* ``schema``   — the Python mirror of the app's typed-decision contract.
* ``dataset``  — build training cases from the app's own CSV export, plus a
  synthetic corpus for testing the pipeline without personal data.
* ``metrics``  — the published metrics and the before/after comparator.
* ``baselines``— the deterministic floor, i.e. the thing the model must beat.
* ``train``    — RLCD fine-tuning, temperature calibration, device policy.

See ``ml/laya/README.md`` for the workflow and ``docs/LAYAS_MODELO_DECISION.md``
for why any of this is shaped the way it is.
"""

from . import baselines, dataset, metrics, schema, train  # noqa: F401

__all__ = ["baselines", "dataset", "metrics", "schema", "train"]

__version__ = "0.1.0"

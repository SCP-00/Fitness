#!/usr/bin/env python3
"""Entry point: `python cli.py <command>`. See gym_decision/cli.py and README.md."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from gym_decision.cli import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())

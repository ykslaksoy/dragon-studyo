#!/usr/bin/env python3
"""
Secondary: fal.ai BiRefNet + Flux scene generation for every studio package frame.
Requires FAL_KEY. Exits with clear message when missing.

Usage:
  export FAL_KEY=...
  python scripts/run_fal_all_scenarios.py [image_id ...]
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = ROOT / "sources" / "manifest.json"
OUT = Path("/opt/cursor/artifacts/provider-test/fal-scenarios")


def main() -> int:
    key = os.environ.get("FAL_KEY") or os.environ.get("FAL_AI_API_KEY")
    if not key:
        print(
            "WAITING ON FAL_KEY: set FAL_KEY (or FAL_AI_API_KEY) to run fal BiRefNet + Flux for all studio frames.",
            file=sys.stderr,
        )
        print(
            "Free pipeline outputs are under /opt/cursor/artifacts/provider-test/app-scenarios/",
            file=sys.stderr,
        )
        return 2

    # Placeholder for future implementation — keep contract stable for CI/docs.
    print("FAL_KEY is set, but automated fal grid generation is not wired in this research branch yet.")
    print("Implement: upload source -> fal-ai/birefnet/v2 -> fal flux/edit per frame prompt from studio_catalog.")
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "README.txt").write_text(
        "Re-run after implementing API calls in run_fal_all_scenarios.py\n"
    )
    with MANIFEST.open() as f:
        ids = [e["id"] for e in json.load(f)]
    if len(sys.argv) > 1:
        ids = [i for i in sys.argv[1:] if i in ids]
    print("Would process images:", ", ".join(ids))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

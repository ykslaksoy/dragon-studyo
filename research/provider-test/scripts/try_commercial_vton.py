#!/usr/bin/env python3
"""Probe commercial-safe VTON options; exits 0 with notes (no GPU weights downloaded)."""

from __future__ import annotations

import json
from pathlib import Path

NOTES = {
    "ootdiffusion_hf_space": {
        "license": "CC BY-NC-SA 4.0 (non-commercial)",
        "commercial_ok": False,
        "note": "Skipped for delivery artifacts.",
    },
    "idm_vton_weights": {
        "license": "Research / verify model card before prod",
        "commercial_ok": False,
        "note": "Requires GPU + torch; not run in this CPU benchmark VM.",
    },
    "fal_try_on": {
        "license": "Paid API — commercial per fal ToS",
        "commercial_ok": True,
        "note": "scripts/run_fal_all_scenarios.py exits without FAL_KEY.",
    },
    "local_pipeline": {
        "license": "Unsplash stock + occlusion warp (this repo)",
        "commercial_ok": True,
        "note": "scripts/run_worn_products.py — fallback when no VTON API.",
    },
}


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "vton_availability.json"
    out.write_text(json.dumps(NOTES, indent=2))
    print(json.dumps(NOTES, indent=2))


if __name__ == "__main__":
    main()

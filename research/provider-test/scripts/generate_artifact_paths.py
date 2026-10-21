#!/usr/bin/env python3
"""Emit ARTIFACT_PATHS.md listing every delivery path under /opt/cursor/artifacts/provider-test/."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ART = Path("/opt/cursor/artifacts/provider-test")
IDS = [
    "easy-01-red-sneaker",
    "easy-02-watch-plain",
    "normal-01-skincare-tile",
    "normal-02-shoes-fabric",
    "hard-01-perfume-glass",
    "hard-02-white-sneaker-white",
    "veryhard-01-lace-dress",
    "veryhard-02-cat-fur",
]
PACKS = [
    ("marketplace", "full-listing"),
    ("marketplace", "minimal-5"),
    ("live", "live-full"),
    ("creator", "creator-full"),
    ("artistic", "art-full"),
]


def lines_section(title: str, paths: list[str]) -> str:
    out = [f"### {title}", ""]
    for p in paths:
        out.append(f"- `{p}`")
    out.append("")
    return "\n".join(out)


def main() -> None:
    parts = [
        "# Artifact path index (delivery)",
        "",
        "All paths below are mirrored in `research/provider-test/images/` with the same relative path after `provider-test/`.",
        "",
    ]

    scene_grids = [str(ART / "grids" / f"{i}__scene_comparison.jpg") for i in IDS]
    parts.append(lines_section("Scene comparison grids (8)", scene_grids))

    live = [str(ART / "scenes" / f"{i}__dragon_canvas_live.jpg") for i in IDS]
    parts.append(lines_section("Dragon canvas — live (8)", live))

    artistic = [str(ART / "scenes" / f"{i}__dragon_canvas_artistic.jpg") for i in IDS]
    parts.append(lines_section("Dragon canvas — artistic (8)", artistic))

    app_grids = [
        str(ART / "app-scenarios" / "grids" / f"{i}__{pur}__{pack}.jpg")
        for i in IDS
        for pur, pack in PACKS
    ]
    parts.append(
        lines_section(
            f"Studio package grids — all frames × all 5 angles ({len(app_grids)})",
            app_grids,
        )
    )

    mannequin_grids = [str(ART / "app-scenarios" / "mannequin" / "grids" / f"{i}__mannequin_grid.jpg") for i in IDS]
    parts.append(lines_section("Mannequin / on-model summary grids (8)", mannequin_grids))

    mannequin_tiles: list[str] = []
    man_path = ROOT / "mannequin_scenarios_index.json"
    if man_path.exists():
        for row in json.loads(man_path.read_text()):
            if row.get("scenario_id") != "_grid":
                mannequin_tiles.append(row["artifact_path"])
    parts.append(
        lines_section(
            f"Mannequin / on-model individual composites ({len(mannequin_tiles)})",
            sorted(mannequin_tiles),
        )
    )

    dekupe_grids = [str(ART / "grids" / f"{i}__dekupe_comparison.png") for i in IDS]
    parts.append(lines_section("Dekupe comparison grids (8)", dekupe_grids))

    text = "\n".join(parts)
    out = ROOT / "ARTIFACT_PATHS.md"
    out.write_text(text)
    (ART / "ARTIFACT_PATHS.md").write_text(text)
    print("Wrote", out, "and", ART / "ARTIFACT_PATHS.md")


if __name__ == "__main__":
    main()

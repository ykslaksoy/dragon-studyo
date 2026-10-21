"""Studio frame catalog — mirrors app/studio/page.tsx (PACKAGES + ANGLES + outputList)."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

Purpose = Literal["marketplace", "live", "creator", "artistic"]

ANGLES: list[tuple[str, str]] = [
    ("front", "Ön"),
    ("three-quarter", "3/4"),
    ("top", "Üst"),
    ("macro", "Makro"),
    ("low", "Düşük açı"),
]

PACKAGES: dict[Purpose, list[dict]] = {
    "marketplace": [
        {
            "id": "full-listing",
            "title": "Tam listing seti (rakip üstü)",
            "frames": [
                "Hero",
                "45°",
                "Detay / makro",
                "Ölçek",
                "Lifestyle",
                "Elde",
                "Flat lay",
                "Paket / unboxing",
                "Özellik / içerik",
                "Mobil crop",
                "A+ strip",
                "Varyant yan yana",
            ],
        },
        {
            "id": "minimal-5",
            "title": "Hızlı 5’li vitrin",
            "frames": ["Hero", "45°", "Detay", "Lifestyle", "Elde"],
        },
    ],
    "live": [
        {
            "id": "live-full",
            "title": "Live satış seti",
            "frames": [
                "Thumbnail",
                "Vitrin hero",
                "Elde gösterim",
                "Yakın detay",
                "CTA boşluklu",
                "Sepete ekle anı",
                "Varyant karşılaştırma",
                "Stok hissi",
                "Multi-angle quick",
            ],
        },
    ],
    "creator": [
        {
            "id": "creator-full",
            "title": "İçerik seti",
            "frames": [
                "Hook kare",
                "Ürün reveal",
                "UGC hisli",
                "B-roll still",
                "Before / after",
                "Talking-head backdrop",
                "Caption-safe",
                "End card",
            ],
        },
    ],
    "artistic": [
        {
            "id": "art-full",
            "title": "Sanatsal set",
            "frames": [
                "Mood",
                "Cinematic wide",
                "Fine-art still",
                "Abstract crop",
                "Dramatic light",
                "Editorial portrait",
                "Negative space",
                "Texture makro",
            ],
        },
    ],
}


def build_output_list(frames: list[str], angle_labels: list[str]) -> list[str]:
    """Same algorithm as StudioPage summary outputList."""
    out: list[str] = []
    for frame in frames:
        out.append(frame)
        for a in angle_labels:
            out.append(f"{frame} · {a}")
    return out


def all_angle_labels() -> list[str]:
    return [label for _, label in ANGLES]


@dataclass
class FrameSpec:
    label: str
    base_frame: str
    angle_label: str | None
    realism: str  # canvas_ok | canvas_sim | needs_gen_ai


def parse_frame_label(label: str) -> tuple[str, str | None]:
    if " · " in label:
        base, angle = label.split(" · ", 1)
        return base.strip(), angle.strip()
    return label.strip(), None


# Substrings that cannot be produced faithfully from a single product photo + canvas.
NEEDS_GEN_AI_MARKERS: tuple[str, ...] = (
    "Elde",
    "Elde gösterim",
    "UGC",
    "Talking-head",
    "Before / after",
    "Sepete ekle",
    "Paket / unboxing",
    "Lifestyle",
    "Stok hissi",
)

# True new viewpoint / human context — we approximate with crop/rotate only.
SIMULATED_MARKERS: tuple[str, ...] = (
    "45°",
    "Flat lay",
    "Multi-angle",
    "Varyant",
    "Ölçek",
    "Ön",
    "3/4",
    "Üst",
    "Makro",
    "Düşük açı",
    "Abstract crop",
    "Cinematic wide",
    "Editorial portrait",
)


def classify_realism(label: str) -> str:
    base, angle = parse_frame_label(label)
    text = f"{base} {angle or ''}"
    for m in NEEDS_GEN_AI_MARKERS:
        if m.lower() in text.lower():
            return "needs_gen_ai"
    for m in SIMULATED_MARKERS:
        if m.lower() in text.lower():
            return "canvas_sim"
    return "canvas_ok"


def frame_spec(label: str) -> FrameSpec:
    base, angle = parse_frame_label(label)
    return FrameSpec(
        label=label,
        base_frame=base,
        angle_label=angle,
        realism=classify_realism(label),
    )


def iter_all_packages():
    for purpose, packs in PACKAGES.items():
        for pack in packs:
            yield purpose, pack["id"], pack["title"], pack["frames"]

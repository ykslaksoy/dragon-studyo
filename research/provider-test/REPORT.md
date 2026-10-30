# Dragon Studio — background removal & scene provider benchmark

**Branch:** `cursor/provider-test-ab04`  
**Date:** 2026-10-19  
**Scope:** Research only (no app code changes). Eight commercially licensed product photos, four difficulty tiers. Compared **Dragon live (today)**, **self-hostable Dragon pipelines**, and **commercial APIs** (where keys were available).

## Delivery artifact paths (explicit)

All paths below are under **`/opt/cursor/artifacts/provider-test/`** (mirrored in the repo at `research/provider-test/images/`). Every file listed is **JPG**, verified **under 15 MB** in this delivery (largest package grid ≈ 1.2 MB).

### Mannequin summary grids (8)

- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/easy-01-red-sneaker__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/easy-02-watch-plain__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/normal-01-skincare-tile__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/normal-02-shoes-fabric__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/hard-01-perfume-glass__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/hard-02-white-sneaker-white__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/veryhard-01-lace-dress__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/veryhard-02-cat-fur__mannequin_grid.jpg`

### Dragon canvas artistic tiles (8)

- `/opt/cursor/artifacts/provider-test/scenes/easy-01-red-sneaker__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/easy-02-watch-plain__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/normal-01-skincare-tile__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/normal-02-shoes-fabric__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/hard-01-perfume-glass__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/hard-02-white-sneaker-white__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/veryhard-01-lace-dress__dragon_canvas_artistic.jpg`
- `/opt/cursor/artifacts/provider-test/scenes/veryhard-02-cat-fur__dragon_canvas_artistic.jpg`

### Studio package grids — `__marketplace__full-listing` (8)

- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/easy-01-red-sneaker__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/easy-02-watch-plain__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/normal-01-skincare-tile__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/normal-02-shoes-fabric__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/hard-01-perfume-glass__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/hard-02-white-sneaker-white__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/veryhard-01-lace-dress__marketplace__full-listing.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/veryhard-02-cat-fur__marketplace__full-listing.jpg`

### Studio package grids — `__live__live-full` (8)

- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/easy-01-red-sneaker__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/easy-02-watch-plain__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/normal-01-skincare-tile__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/normal-02-shoes-fabric__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/hard-01-perfume-glass__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/hard-02-white-sneaker-white__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/veryhard-01-lace-dress__live__live-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/veryhard-02-cat-fur__live__live-full.jpg`

### Studio package grids — `__artistic__art-full` (8)

- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/easy-01-red-sneaker__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/easy-02-watch-plain__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/normal-01-skincare-tile__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/normal-02-shoes-fabric__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/hard-01-perfume-glass__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/hard-02-white-sneaker-white__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/veryhard-01-lace-dress__artistic__art-full.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/grids/veryhard-02-cat-fur__artistic__art-full.jpg`

**Delivery total for this section:** 40 JPG artifact paths (8 + 8 + 8 + 8 + 8).

## Worn / in-use mannequin shots (v3 — occlusion warp)

**VTON denemesi:** Bu ortamda GPU / `HF_TOKEN` / `FAL_KEY` yok. **OOTDiffusion** (HF Space) lisansı **CC BY-NC-SA** → ticari çıktı için kullanılmadı. `scripts/try_commercial_vton.py` → `vton_availability.json` özetler (fal try-on ticari olabilir; anahtar yok).

**Üretim:** `python scripts/run_worn_products.py` — `wear_engine.py` v3: ayakkabı için stok üzerinde **beyaz ayakkabı bölgesi tespiti** (önceki otomatik quad zemine kayıyordu), perspektif warp, LAB renk eşleme, bacak/manşet **occlusion** maskeleri, çoklu ürünlü cutout’larda tek bileşen kırpımı. Stoklar: ayakkabı/saat `fitness_worn_gear`, el ürünleri `hand_beauty`, elbise `fashion_model_studio`.

**Kalite sınırı:** Bu hâlâ **gerçek VTON/inpaint değil**; ayakkabı ayağa oturur ama doku/aydınlatma fotoğrafik değildir. Elbise ve karmaşık cutout’lar üretken model veya Photoroom/fal try-on ister.

| Test ürün | Dosya (artifact) |
|-----------|------------------|
| easy-01 ayakkabı | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/easy-01-red-sneaker__shoe_on_feet.jpg` |
| normal-02 ayakkabı | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/normal-02-shoes-fabric__shoe_on_feet.jpg` |
| hard-02 ayakkabı | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/hard-02-white-sneaker-white__shoe_on_feet.jpg` |
| easy-02 saat | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/easy-02-watch-plain__watch_on_wrist.jpg` |
| normal-01 cilt bakım | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/normal-01-skincare-tile__product_in_hand.jpg` |
| hard-01 parfüm | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/hard-01-perfume-glass__perfume_in_hand.jpg` |
| veryhard-01 elbise | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/veryhard-01-lace-dress__dress_on_model.jpg` |

**Güncellenmiş manken grid’leri (aynı yollar):**

- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/easy-01-red-sneaker__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/easy-02-watch-plain__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/normal-01-skincare-tile__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/normal-02-shoes-fabric__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/hard-01-perfume-glass__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/hard-02-white-sneaker-white__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/veryhard-01-lace-dress__mannequin_grid.jpg`
- `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/veryhard-02-cat-fur__mannequin_grid.jpg`

Index: `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/worn_products_index.json`

## Görsel kalite notu (TR)

İlk manken denemeleri **stok foto üzerine düz PNG yapıştırma** gibi görünüyordu; bu, ücretsiz pipeline’ın fiziksel try-on/ghost mannequin yapamamasından kaynaklanıyor. Güncelleme:

- **Manken/on-model:** `composite_utils.py` — kenar yumuşatma, renk uyumu, çift gölge, vignette; **model üstüne yapıştırma** yerine çoğu sahnede **bulanık arka plan + stüdyo pedestal vitrin** (`mode: pedestal`).
- **Ayakkabı / saat:** `fitness_worn_gear` stokunda **ayak ve bilek wear-zone** ile hizalanır (`mode: wear`) — tam VTON değil, ama ürün artık ayağa/kola konumlandırılır.
- **El / elbise / gerçek ghost mannequin:** hâlâ **üretken AI (VTON)** gerektirir.
- **Paket sahneleri:** zemin düzlemi + hafif vignette (hâlâ gerçek lifestyle değil; `[GEN]` kareler AI ister).

Yeniden üretim: `python scripts/run_mannequin_scenarios.py`

## Methodology

| Item | Detail |
|------|--------|
| Inference | `rembg` ONNX on CPU in this cloud VM; long edge capped at **768px** then mask upscaled to full resolution (VRAM/RAM limit). Production should use GPU or a dedicated inference service. |
| Models | `birefnet-general` (MIT, commercial-safe), `isnet-general-use`. **u2net not used.** BRIA RMBG-2.0 skipped (non-commercial training). |
| Dragon post-process | Matting-lite (edge-band refine), BiRefNet∪ISNet hybrid mask, morphological hole-fill on BiRefNet mask. |
| Dragon live (today) | Matches [studio](https://dragon-studyo.vercel.app/studio): **no background removal**; square tile with `object-cover` center crop (see `app/studio/page.tsx` — same upload preview on every frame label). |
| Scenes | Best cutout = **Dragon BiRefNet default**; canvas compositions (marketplace / live / artistic) + placeholders for fal Flux, Replicate, Photoroom AI BG. |
| Competitors | **No API keys** in this environment (`FAL_KEY`, Photoroom, remove.bg, Clipdrop, Claid, Pixelcut). Grids show explicit **untested** tiles — no invented scores. |

Reproduce:

```bash
cd research/provider-test
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
for id in $(python3 -c "import json;print(' '.join(x['id'] for x in json.load(open('sources/manifest.json'))))"); do
  .venv/bin/python scripts/run_benchmark.py "$id"
done
.venv/bin/python scripts/build_scene_grids.py
```

---

## Test images (licenses)

| ID | Difficulty | Subject | License |
|----|------------|---------|---------|
| `easy-01-red-sneaker` | easy | Red sneaker, plain red bg | [Unsplash License](https://unsplash.com/license) — Paul Cuoco |
| `easy-02-watch-plain` | easy | Watch on gray studio | Unsplash — Luke Chesser |
| `normal-01-skincare-tile` | normal | Bottle on tile | Unsplash — Mathilde Langevin |
| `normal-02-shoes-fabric` | normal | Sneakers on fabric | Unsplash — Taylor Grote |
| `hard-01-perfume-glass` | hard | Glass bottle + flowers | Unsplash — Charisse Kenion |
| `hard-02-white-sneaker-white` | hard | White/orange sneaker on white | Unsplash — Taylor Smith |
| `veryhard-01-lace-dress` | very hard | Backlit wedding lace / couple | Unsplash — (see `sources/manifest.json`) |
| `veryhard-02-cat-fur` | very hard | Cat fur + whiskers on green | Unsplash — Feroz Khan |

Full attribution URLs: `research/provider-test/sources/manifest.json`.

---

## Visual artifacts (delivered + committed)

Each row has a **dekupe comparison grid** (all providers + Dragon columns) and a **scene comparison grid**.  
**Delivery path:** `/opt/cursor/artifacts/provider-test/…`  
**Repo path:** `research/provider-test/images/…` (same filenames).

### Dekupe comparison grids (checkerboard for cutouts)

| Image | Artifact path |
|-------|----------------|
| easy-01-red-sneaker | `/opt/cursor/artifacts/provider-test/grids/easy-01-red-sneaker__dekupe_comparison.png` |
| easy-02-watch-plain | `/opt/cursor/artifacts/provider-test/grids/easy-02-watch-plain__dekupe_comparison.png` |
| normal-01-skincare-tile | `/opt/cursor/artifacts/provider-test/grids/normal-01-skincare-tile__dekupe_comparison.png` |
| normal-02-shoes-fabric | `/opt/cursor/artifacts/provider-test/grids/normal-02-shoes-fabric__dekupe_comparison.png` |
| hard-01-perfume-glass | `/opt/cursor/artifacts/provider-test/grids/hard-01-perfume-glass__dekupe_comparison.png` |
| hard-02-white-sneaker-white | `/opt/cursor/artifacts/provider-test/grids/hard-02-white-sneaker-white__dekupe_comparison.png` |
| veryhard-01-lace-dress | `/opt/cursor/artifacts/provider-test/grids/veryhard-01-lace-dress__dekupe_comparison.png` |
| veryhard-02-cat-fur | `/opt/cursor/artifacts/provider-test/grids/veryhard-02-cat-fur__dekupe_comparison.png` |

### Scene comparison grids

| Image | Artifact path |
|-------|----------------|
| easy-01-red-sneaker | `/opt/cursor/artifacts/provider-test/grids/easy-01-red-sneaker__scene_comparison.jpg` |
| easy-02-watch-plain | `/opt/cursor/artifacts/provider-test/grids/easy-02-watch-plain__scene_comparison.jpg` |
| normal-01-skincare-tile | `/opt/cursor/artifacts/provider-test/grids/normal-01-skincare-tile__scene_comparison.jpg` |
| normal-02-shoes-fabric | `/opt/cursor/artifacts/provider-test/grids/normal-02-shoes-fabric__scene_comparison.jpg` |
| hard-01-perfume-glass | `/opt/cursor/artifacts/provider-test/grids/hard-01-perfume-glass__scene_comparison.jpg` |
| hard-02-white-sneaker-white | `/opt/cursor/artifacts/provider-test/grids/hard-02-white-sneaker-white__scene_comparison.jpg` |
| veryhard-01-lace-dress | `/opt/cursor/artifacts/provider-test/grids/veryhard-01-lace-dress__scene_comparison.jpg` |
| veryhard-02-cat-fur | `/opt/cursor/artifacts/provider-test/grids/veryhard-02-cat-fur__scene_comparison.jpg` |

### Dragon canvas — **live** (8 images)

| Image | Artifact path |
|-------|----------------|
| easy-01-red-sneaker | `/opt/cursor/artifacts/provider-test/scenes/easy-01-red-sneaker__dragon_canvas_live.jpg` |
| easy-02-watch-plain | `/opt/cursor/artifacts/provider-test/scenes/easy-02-watch-plain__dragon_canvas_live.jpg` |
| normal-01-skincare-tile | `/opt/cursor/artifacts/provider-test/scenes/normal-01-skincare-tile__dragon_canvas_live.jpg` |
| normal-02-shoes-fabric | `/opt/cursor/artifacts/provider-test/scenes/normal-02-shoes-fabric__dragon_canvas_live.jpg` |
| hard-01-perfume-glass | `/opt/cursor/artifacts/provider-test/scenes/hard-01-perfume-glass__dragon_canvas_live.jpg` |
| hard-02-white-sneaker-white | `/opt/cursor/artifacts/provider-test/scenes/hard-02-white-sneaker-white__dragon_canvas_live.jpg` |
| veryhard-01-lace-dress | `/opt/cursor/artifacts/provider-test/scenes/veryhard-01-lace-dress__dragon_canvas_live.jpg` |
| veryhard-02-cat-fur | `/opt/cursor/artifacts/provider-test/scenes/veryhard-02-cat-fur__dragon_canvas_live.jpg` |

### Dragon canvas — **artistic** (8 images)

| Image | Artifact path |
|-------|----------------|
| easy-01-red-sneaker | `/opt/cursor/artifacts/provider-test/scenes/easy-01-red-sneaker__dragon_canvas_artistic.jpg` |
| easy-02-watch-plain | `/opt/cursor/artifacts/provider-test/scenes/easy-02-watch-plain__dragon_canvas_artistic.jpg` |
| normal-01-skincare-tile | `/opt/cursor/artifacts/provider-test/scenes/normal-01-skincare-tile__dragon_canvas_artistic.jpg` |
| normal-02-shoes-fabric | `/opt/cursor/artifacts/provider-test/scenes/normal-02-shoes-fabric__dragon_canvas_artistic.jpg` |
| hard-01-perfume-glass | `/opt/cursor/artifacts/provider-test/scenes/hard-01-perfume-glass__dragon_canvas_artistic.jpg` |
| hard-02-white-sneaker-white | `/opt/cursor/artifacts/provider-test/scenes/hard-02-white-sneaker-white__dragon_canvas_artistic.jpg` |
| veryhard-01-lace-dress | `/opt/cursor/artifacts/provider-test/scenes/veryhard-01-lace-dress__dragon_canvas_artistic.jpg` |
| veryhard-02-cat-fur | `/opt/cursor/artifacts/provider-test/scenes/veryhard-02-cat-fur__dragon_canvas_artistic.jpg` |

### Full studio package grids (BiRefNet + canvas per frame)

Mirrors `app/studio/page.tsx`: every **package** × **base frame** × **all five optional angles** (`Ön`, `3/4`, `Üst`, `Makro`, `Düşük açı`).  
Example: marketplace `full-listing` = **72** tiles (12 frames × 6 variants).

**Run:** `python scripts/run_app_scenarios.py`  
**Index:** `research/provider-test/app_scenarios_index.json`

| Image | Package grid artifact paths |
|-------|----------------------------|
| each of 8 IDs | `/opt/cursor/artifacts/provider-test/app-scenarios/grids/{ID}__marketplace__full-listing.jpg` |
| | `/opt/cursor/artifacts/provider-test/app-scenarios/grids/{ID}__marketplace__minimal-5.jpg` |
| | `/opt/cursor/artifacts/provider-test/app-scenarios/grids/{ID}__live__live-full.jpg` |
| | `/opt/cursor/artifacts/provider-test/app-scenarios/grids/{ID}__creator__creator-full.jpg` |
| | `/opt/cursor/artifacts/provider-test/app-scenarios/grids/{ID}__artistic__art-full.jpg` |

Tile badges: **`[OK]`** canvas-realistic, **`[SIM]`** simulated angle/layout, **`[GEN]`** needs generative AI (see `scripts/studio_catalog.py`).

### Mannequin / on-model composites (stock + cutout + shadow)

**Run:** `python scripts/run_mannequin_scenarios.py`  
Stock licenses: `sources/mannequin_stock.json`  
**Index:** `research/provider-test/mannequin_scenarios_index.json`

| Image | Summary grid |
|-------|----------------|
| easy-01-red-sneaker | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/easy-01-red-sneaker__mannequin_grid.jpg` |
| easy-02-watch-plain | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/easy-02-watch-plain__mannequin_grid.jpg` |
| normal-01-skincare-tile | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/normal-01-skincare-tile__mannequin_grid.jpg` |
| normal-02-shoes-fabric | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/normal-02-shoes-fabric__mannequin_grid.jpg` |
| hard-01-perfume-glass | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/hard-01-perfume-glass__mannequin_grid.jpg` |
| hard-02-white-sneaker-white | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/hard-02-white-sneaker-white__mannequin_grid.jpg` |
| veryhard-01-lace-dress | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/veryhard-01-lace-dress__mannequin_grid.jpg` |
| veryhard-02-cat-fur | `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/grids/veryhard-02-cat-fur__mannequin_grid.jpg` |

Individual composites: `/opt/cursor/artifacts/provider-test/app-scenarios/mannequin/{IMAGE_ID}__{scenario_id}.jpg` (listed in `mannequin_scenarios_index.json`).

**Free pipeline limit:** flat compositing cannot warp garments to body, wrap straps, or hollow-neck ghost mannequin — those tiles are labeled **NEEDS GENERATIVE AI / VTON**.

### Virtual try-on landscape (licenses — not executed here)

| Option | Commercial use | Notes |
|--------|----------------|-------|
| **OOTDiffusion** ([GitHub](https://github.com/levihsu/OOTDiffusion)) | **Apache-2.0** | Open weights; self-host GPU; garment+model image required |
| **IDM-VTON** (academic) | Typically **non-commercial** / research-only — verify paper + weights card before prod | Strong quality in papers |
| **Kolors / other HF try-on** | Per-model license — check each repo | Quality varies |
| **fal.ai** try-on / Photoroom **Ghost mannequin** / **Virtual try-on** APIs | Paid per call | [Photoroom API](https://www.photoroom.com/api/pricing) documents ghost mannequin on Plus; fal hosts multiple try-on endpoints |
| **Dragon flat composite** (this PR) | Unsplash + MIT BiRefNet | Marketing placeholders only |

### fal.ai studio runner (secondary)

`scripts/run_fal_all_scenarios.py` — **WAITING ON `FAL_KEY`** in this environment (exit code 2). When set, intended to run fal BiRefNet + Flux per studio frame; not wired to API yet.

### Complete path list

**Every delivery path** (scene grids, live, artistic, 40 package grids, mannequin tiles):  
[`ARTIFACT_PATHS.md`](ARTIFACT_PATHS.md) and `/opt/cursor/artifacts/provider-test/ARTIFACT_PATHS.md`

Individual dekupe tiles: `/opt/cursor/artifacts/provider-test/dekupe/{IMAGE_ID}__{provider_key}.png`  
Machine-readable index: `/opt/cursor/artifacts/provider-test/artifact_index.json` and `research/provider-test/artifact_index.json`.

---

## Quality summary (tested columns only)

Legend: **Edges** (halos/fringe), **Holes** (background inside product), **Over-cut** (missing product pixels).

| Difficulty | Dragon live (today) | BiRefNet / Dragon default | + matting | ISNet | Hybrid | Hole-fill | vs. paid APIs (this run) |
|------------|---------------------|---------------------------|-----------|-------|--------|-----------|---------------------------|
| **Easy** | No dekupe; bg remains | Clean edges, full sole | Slightly softer fringe | Similar; tiny lace noise on mesh | Same as BiRefNet | Fills micro-holes in mesh | **Untested** — expect parity with fal BiRefNet v2 (same family) |
| **Normal** | No dekupe | Good product mask; tile pattern mostly gone | Cleaner shoe/tile boundary | Good on fabric; can erode thin parts | Slight over-union on fuzzy edges | Helps speckle on patterned bg | **Untested** |
| **Hard (glass)** | No dekupe | **Strong** — glass + stems kept, transparency reasonable | Softer petal edges | Comparable glass; busier rose edges | Minor halo on glass | Little change | Photoroom/remove.bg often stronger on glass — **not verified here** |
| **Hard (white-on-white)** | No dekupe | **Over-cut** — white sole/upper merged into bg | Same core failure | **Worse** — large missing regions on white rubber | Mixed | Does not fix low-contrast segmentation | Commercial “product” APIs usually win here — **untested** |
| **Very hard (lace)** | No dekupe | Decent dress; **flare/backlight** causes thick edge | Best **Dragon** variant on lace/feathers | **Failed** (missed subjects) | **Bad holes** in groom suit | Hybrid damage reduced; edges still hard | Specialist matting APIs likely ahead — **untested** |
| **Very hard (fur)** | No dekupe | Body OK; **green spill** in whiskers | Slight fringe reduction | Jagged fur, green in whiskers | More whisker retained, still green | Minimal | remove.bg / Clipdrop often better on hair — **untested** |

### Where we **match** (on tested stack)

- Easy / normal **catalog products** with clear subject: self-hosted **BiRefNet** is production-viable; **ISNet** is a faster fallback when edges are simple.
- **Hard glass** (perfume): BiRefNet + matting-lite is surprisingly good for a free MIT stack.
- **Scenes**: Canvas marketplace/live/artistic compositions are **free, instant, commercial-safe** — good baseline for marketplace/live packs before generative backgrounds.

### Where we **lose**

| Gap | Evidence | What it takes to close |
|-----|----------|-------------------------|
| No dekupe in live app | Studio reuses upload with `object-cover` | Wire cutout step before frame templates; keep canvas composer for packs |
| White-on-white / low contrast | `hard-02-white-sneaker-white` over-cut | Trimap matting, “product mode” API (Photoroom/remove.bg), or user-assisted bg color + chroma key |
| Hair / lace / backlight | `veryhard-*` fringing, ISNet failure on lace | Hybrid **only when ISNet is confident**; spill suppression; optional paid matting API for “hero” tier |
| Generative lifestyle scenes | fal/Replicate/Photoroom tiles untested | `FAL_KEY` + Flux product scene prompts, or Photoroom Plus AI backgrounds; keep Dragon canvas as cheap tier |
| Speed on CPU | BiRefNet ~**20s**/image @768px (this VM) | GPU inference, smaller variant, or fal/Replicate hosted BiRefNet (~compute-second billing) |
| Competitor benchmarks | No keys | Add secrets to CI research job; re-run same `scripts/run_benchmark.py` |

---

## Speed (this environment, 768px long edge, CPU)

| Pipeline | Mean time (8 images) | Notes |
|----------|----------------------|-------|
| Dragon live (today) | ~0.02 s | Crop only |
| ISNet (local) | ~1.2 s | Fastest ML option tested |
| BiRefNet (local) | ~**20.4 s** | Dominated by ONNX on CPU |
| Dragon post-steps | &lt;0.05 s | Matting / hybrid / hole-fill on existing mask |

---

## Cost & license (official pages — per-image where stated)

| Service | Tested? | Cost (as published) | Commercial use | Pricing link |
|---------|---------|---------------------|----------------|--------------|
| **Dragon BiRefNet (self-host)** | Yes | **$0** marginal (+ your compute) | **MIT** (BiRefNet weights via rembg) | [rembg](https://github.com/danielgatis/rembg) |
| **Dragon ISNet (self-host)** | Yes | **$0** marginal (+ compute) | Check rembg model card | rembg |
| **Dragon canvas scenes** | Yes | **$0** | Your composition | — |
| **fal.ai BiRefNet v2** | No | **Not flat per image** — billed per **compute second** (fal pricing table listed **$0** on model page at fetch time; fal learn article cites **$0.0008/s** — verify live) | Model-dependent | [fal BiRefNet v2](https://fal.ai/models/fal-ai/birefnet/v2), [fal pricing](https://fal.ai/pricing) |
| **fal.ai Flux / image gen** | No | e.g. FLUX.1 [schnell] **$0.003/MP** on [fal pricing](https://fal.ai/pricing) | Per model ToS | fal pricing |
| **Replicate** | No | Model-specific — **untested** | Per model | [replicate.com/pricing](https://replicate.com/pricing) |
| **Photoroom API** | No | Remove BG **$0.02/image** (Basic); Image Editing (AI BG, etc.) **$0.10/image** (Plus) per [API pricing FAQ](https://www.photoroom.com/api/pricing); **10 free** production remove-BG calls + **1000/mo** sandbox (watermarked) | API ToS | [photoroom.com/api/pricing](https://www.photoroom.com/api/pricing) |
| **remove.bg** | No | **50 free API calls/month**; paid tiers on pricing page — **per-credit $ not extracted in this run** | [remove.bg terms](https://www.remove.bg/terms) | [remove.bg/pricing](https://www.remove.bg/pricing), [API](https://www.remove.bg/api) |
| **Clipdrop** | No | API key required — **untested** | [Clipdrop ToS](https://clipdrop.co/terms) | [clipdrop.co/apis](https://clipdrop.co/apis) |
| **Claid.ai** | No | API key required — **untested** | Claid ToS | [claid.ai/pricing](https://claid.ai/pricing) |
| **Pixelcut** | No | fal lists Pixelcut BG **~$0.016/image** (third-party listing) — **not run here** | Per provider | [Pixelcut](https://www.pixelcut.ai/), [fal explore](https://fal.ai/explore/background-remover-apis) |

---

## Recommended stack (for Dragon Studio)

### Tier 0 — Ship now (free / commercial-safe)

1. **Dekupe:** `birefnet-general` on GPU (or fal BiRefNet v2 if you prefer managed compute).
2. **Post:** matting-lite on edges + hole-fill; **disable ISNet hybrid** unless ISNet mask area is within ~90–110% of BiRefNet (lace image showed catastrophic hybrid).
3. **Fast path:** `isnet-general-use` for easy/normal previews; BiRefNet for final export.
4. **Scenes:** Dragon **canvas** composer (marketplace gray + shadow, live gradient + CTA, artistic gradient) — already competitive for **listing** and **live** packs at $0.

### Tier 1 — Paid APIs (validate with keys)

- **remove.bg** or **Photoroom Basic** for batch dekupe when self-host ops cost &gt; ~$0.02/image or for **white-on-white** SKUs.
- **Photoroom Plus** or **fal Flux** for **generative lifestyle** when canvas templates are not enough.

### Tier 2 — Not recommended

- **BRIA RMBG-2.0** for this product (non-commercial training).
- **u2net** (explicitly excluded by product requirements).

### Live app gap

Studio today is **wizard + placeholder grid** without dekupe or per-frame geometry. Minimum product step: **BiRefNet cutout → existing pack/frame names → canvas scene templates**; keep generative scenes as an upgrade path.

---

## Files in this PR

- `research/provider-test/REPORT.md` (this file)
- `research/provider-test/ARTIFACT_PATHS.md` — exhaustive artifact path list
- `research/provider-test/images/**` — all PNG/JPG outputs (mirrors artifacts)
- `research/provider-test/scripts/run_benchmark.py`, `build_scene_grids.py`, `run_app_scenarios.py`, `run_mannequin_scenarios.py`, `run_fal_all_scenarios.py`, `studio_catalog.py`, `generate_artifact_paths.py`
- `research/provider-test/results.json`, `artifact_index.json`, `app_scenarios_index.json`, `mannequin_scenarios_index.json`, `sources/manifest.json`, `sources/mannequin_stock.json`

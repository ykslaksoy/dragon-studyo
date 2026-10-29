# Research PR #10 — uygulama entegrasyonu

Kaynak draft: [PR #10](https://github.com/ykslaksoy/dragon-studyo/pull/10) (`cursor/provider-test-ab04`).

## Uygulamaya taşınanlar
- Canvas scene composer → `app/studio/lib/sceneComposer.ts` (PR #13)
- Occlusion warp v3 (mannequin / worn) → `app/studio/lib/wear/*` + `public/mannequin/*`
- Katalog / `[GEN]` etiketleri → `app/studio/lib/catalog.ts`
- Rapor özeti → `research/provider-test/REPORT.md`
- VTON ticari sınırlar → `research/provider-test/vton_availability.json`

## Bilinçli sınır
Occlusion warp **fotoreal VTON değildir**. Üretken / try-on için `FAL_KEY` (fal.ai) gerekir.

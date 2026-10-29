# Dragon Studio — Denetim (branch `audit-perfect`)

Temel: PR #14 (`cursor/studio-audit-perfection-7716`) üstüne kuruldu; PR #13 main'de birleşik, PR #2 logo/favicon main'de (`/icon.png`, `/apple-icon.png` build çıktısında). Kurallar: u2net ve BRIA RMBG-2.0 kodda yok (yalnız yasak notu), son kesim BiRefNet, önizleme ISNet.

Doğrulama: `npx tsc --noEmit` temiz, `npm run build` başarılı (`screens/build.log`), `npm run lint` 0 hata (`screens/lint.log`; önceden 6 hata).
Sınır: Kutudaki güvenlik denetimi yerel sunucu başlatmayı ve headless tarayıcıyla ekran görüntüsü almayı engelledi, bu yüzden `/studio` için piksel ekran görüntüsü yok. Kanıt build çıktısı ve kod incelemesi.

## Kusursuz çalışan
| Madde | Durum | Kanıt |
|---|---|---|
| Senaryo bazlı kare hazırlığı (pazaryeri tam/minimal-5, live, içerik, sanatsal, çoklu açı) | Build'de doğrulandı | `app/studio/lib/catalog.ts`, `produceQueue.ts`, `/studio` statik derlendi (`screens/build.log`) |
| Uygulama içi dekupe: ISNet önizleme + BiRefNet son (u2net/RMBG yok) | Kodda doğrulandı | `app/studio/lib/dekupe/index.ts` |
| Canvas sahne birleştirici | Build'de doğrulandı | `app/studio/lib/sceneComposer.ts` |
| Logo/favicon (PR #2) | Build'de doğrulandı | `/icon.png`, `/apple-icon.png` route'ları (`screens/build.log`) |

## Eksikti, tamamlandı
| Madde | Durum | Kanıt |
|---|---|---|
| Manken/giyili kareler: oklüzyon warp v3 (PR #10) uygulamaya taşındı | Tamamlandı (PR #14 işi dahil edildi) | `app/studio/lib/wear/engine.ts`, `placements.ts`, `public/mannequin/*` |
| GEN kareleri (elde, lifestyle, UGC): fal.ai Flux kuyruğu uçtan uca | Yalnız `FAL_KEY` bekliyor; anahtar yoksa önce manken warp, sonra canvas kullanılıyor | `app/api/gen/route.ts`, `produceQueue.ts` |
| Zor ürünler için ücretli dekupe yedeği (Photoroom) | Yalnız `PHOTOROOM_API_KEY` bekliyor | `app/api/dekupe/paid/route.ts` |
| PR #10 araştırma raporu ve yerleşim verileri repoya alındı | Tamamlandı | `research/provider-test/REPORT.md`, `vton_availability.json` |

## Hatalıydı, düzeltildi
| Madde | Durum | Kanıt |
|---|---|---|
| Beyazda beyaz ayakkabı (taban deliği / burun kesilmesi) | Düzeltildi: delik doldurma + düşük kontrastlı kenar güçlendirme (PR #14) | `app/studio/lib/dekupe/postprocess.ts` |
| Dantel/tül: delik doldurma ağ dokusunu kapatıyordu | Düzeltildi: dantel/tülde delik doldurma devre dışı (PR #14) | `postprocess.ts` (`guardedHybrid`, `morphHoleFill`) |
| Saç/tüyde yeşil leke | Düzeltildi: yeşil yansıma bastırma (PR #14) | `postprocess.ts` (`suppressGreenSpill`) |
| Lint 6 hata (effect içinde setState, memo bağımlılığı, prefer-const) | Düzeltildi, lint 0 hata | `app/studio/page.tsx`, `app/components/DragonTopLogo.tsx`, `dekupe/index.ts`, `wear/engine.ts`; `screens/lint.log` |

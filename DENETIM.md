# Dragon Studio — Denetim (branch `audit-perfect`)

Temel: PR #14 (`cursor/studio-audit-perfection-7716`) üstüne kuruldu; PR #13 main'de birleşik, PR #2 logo/favicon main'de (`/icon.png`, `/apple-icon.png` build çıktısında). Kurallar: u2net ve BRIA RMBG-2.0 kodda yok (yalnız yasak notu), son kesim BiRefNet, önizleme ISNet.

Doğrulama: `npx tsc --noEmit` temiz, `npm run build` başarılı (`screens/build.log`), `npm run lint` 0 hata (`screens/lint.log`; önceden 6 hata).
Gerçek çalıştırma (30 Ekim 2026): `next start` yerelde açıldı, headless Chrome ile tam akış (amaç → platform → paket → seçim → görsel yükleme → dekupe → üretim) 3 zor görselle (beyaz zeminde beyaz ayakkabı, dantel gelinlik, cam parfüm) koşuldu: `screens/local-<sneaker|lace|perfume>-01..06*.png`. Canlı site: `screens/live-01..04*.png`. Ek kesim testi (isnet/BiRefNet, u2net yok): `screens/cutout-*.png`.

Anahtarsız davranış (doğrulandı): `GET /api/gen` → `configured:false, blockedEnv:FAL_KEY`; `POST /api/gen` → 503 `MISSING_ENV` ve kuyruk manken warp/tuval yedeğine düşüyor (12/12 kare yine üretildi). `GET /api/dekupe/paid` → `configured:false, blockedEnv:PHOTOROOM_API_KEY`, BiRefNet yolu aktif.

## Hâlâ hatalı (düzeltilmedi)
| Madde | Durum | Kanıt |
|---|---|---|
| Dantel/gelinlik kesimi | Hatalı: uygulama içi kesim insanı ve buketi blok halinde bırakıyor, isnet ise elbiseyi neredeyse tamamen siliyor | `screens/local-lace-06-uretilen.png`, `screens/cutout-veryhard-01-lace-dress-isnet-general-use.png` |
| Ürün dışı objeler (parfümde güller) | Hatalı: ürün seçme yok; dekor da ürünle birlikte kesiliyor | `screens/local-perfume-06-uretilen.png` |
| GEN Lifestyle (anahtarsız warp yedeği) | Hatalı: stok fotoğraf geliyor, ürün görünmüyor | `screens/local-*-06-uretilen.png` (Lifestyle karesi) |
| GEN Elde (warp v3) | Zayıf: ürün ele kaba yapışıyor, gerçekçi değil | aynı ekranlar (Elde karesi) |
| Alt bilgi çubuğu | Sabit footer içerik ızgarasının üstüne biniyor | aynı ekranlar |

## Kusursuz çalışan
| Madde | Durum | Kanıt |
|---|---|---|
| Senaryo bazlı kare hazırlığı (pazaryeri tam/minimal-5, live, içerik, sanatsal, çoklu açı) | Çalıştırıldı: Amazon tam set 12/12 kare, her kare farklı crop/zoom/açı/zemin | `screens/local-sneaker-03-paket.png`, `local-sneaker-06-uretilen.png` |
| Uygulama içi dekupe: ISNet önizleme + BiRefNet son (u2net/RMBG yok) | Tarayıcıda çalıştırıldı (ayakkabıda temiz) | `screens/local-sneaker-05-dekupe.png`, `-06-uretilen.png` |
| Canlı /studio açılıyor, sihirbaz çalışıyor | Doğrulandı | `screens/live-01-open.png` … `live-04-ozet.png` |
| Canvas sahne birleştirici | Çalıştırıldı: zemin + gölge + kompozisyon | `screens/local-sneaker-06-uretilen.png` |
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
| Beyazda beyaz ayakkabı (taban deliği / burun kesilmesi) | Düzeltildi ve gerçek akışta doğrulandı: taban/burun tam | `screens/local-sneaker-06-uretilen.png`, `screens/cutout-hard-02-white-sneaker-white-*.png` |
| Dantel/tül: delik doldurma ağ dokusunu kapatıyordu | Kodda düzeltildi (PR #14), ama gerçek testte kesim hâlâ kötü (aşağıdaki tabloya bakın) | `postprocess.ts` |
| Saç/tüyde yeşil leke | Düzeltildi: yeşil yansıma bastırma (PR #14) | `postprocess.ts` (`suppressGreenSpill`) |
| Lint 6 hata (effect içinde setState, memo bağımlılığı, prefer-const) | Düzeltildi, lint 0 hata | `app/studio/page.tsx`, `app/components/DragonTopLogo.tsx`, `dekupe/index.ts`, `wear/engine.ts`; `screens/lint.log` |

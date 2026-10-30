# Dragon Studio — Denetim (branch `audit-perfect`)

Temel: PR #14 (`cursor/studio-audit-perfection-7716`) üstüne kuruldu; PR #13 main'de birleşik, PR #2 logo/favicon main'de (`/icon.png`, `/apple-icon.png` build çıktısında). Kurallar: u2net ve BRIA RMBG-2.0 kodda yok (yalnız yasak notu), son kesim BiRefNet, önizleme ISNet.

Doğrulama: `npx tsc --noEmit` temiz, `npm run build` başarılı (`screens/build.log`), `npm run lint` 0 hata (`screens/lint.log`; önceden 6 hata).
Gerçek çalıştırma (30 Ekim 2026): `next start` yerelde açıldı, headless Chrome ile tam akış (amaç → platform → paket → seçim → görsel yükleme → dekupe → üretim) 3 zor görselle (beyaz zeminde beyaz ayakkabı, dantel gelinlik, cam parfüm) koşuldu: `screens/local-<sneaker|lace|perfume>-01..06*.png`. Canlı site: `screens/live-01..04*.png`. Ek kesim testi (isnet/BiRefNet, u2net yok): `screens/cutout-*.png`.

Anahtarsız davranış (doğrulandı): `GET /api/gen` → `configured:false, blockedEnv:FAL_KEY`; `POST /api/gen` → 503 `MISSING_ENV` ve kuyruk manken warp/tuval yedeğine düşüyor (12/12 kare yine üretildi). `GET /api/dekupe/paid` → `configured:false, blockedEnv:PHOTOROOM_API_KEY`, BiRefNet yolu aktif.

## Hâlâ hatalı / sınırlı
| Madde | Durum | Kanıt |
|---|---|---|
| Dantel/gelinlik (buket ve damat elbisenin önünde) | **Hâlâ satılabilir değil, kaynak fotoğraf yüzünden.** Tur 4'te eklendi: ROI kutusu, "Boşalt", sihirli değnek ("Değnek: Ekle / Çıkar", tolerans ayarlı, kutu sınırlı, kenar yumuşatma). Değnekle buketsiz etek temiz seçiliyor ve üretime giriyor, ama elbisenin üst kısmı ve ortası buketin arkasında; korsaj güneş parlamasında arka planla aynı renkte, değnek arka plana taşıyor (offline test). Sonuç: yalnız görünen etek parçası, ortada buket sapının bıraktığı boşlukla. Ücretsiz yol bu fotoğraftan tam elbise çıkaramaz; elbisenin olmayan kısmı ancak üretken inpaint ile (`FAL_KEY`) uydurulabilir, Photoroom (`PHOTOROOM_API_KEY`) de yine buketi ürün sayacaktır. Gerçek çözüm temiz ürün fotoğrafı | önce: `screens/local-lace-06-uretilen.png`, `screens/after-lace-04-uretilen.png`; sonra: `screens/after2-lace-01-secim.png`, `-03-degnek.png`, `-04-uretilen.png` |
| GEN Elde, ayakkabı gibi ele uygun olmayan ürünler | Ürün her zaman görünüyor, ama el pozu şişe tutuşuna göre; ayakkabıda yapay duruyor. Gerçekçi sonuç `FAL_KEY` ister | `screens/after-sneaker-04-uretilen.png` |

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
| Sihirli değnek (renkle bölge seçimi) + Boşalt + boş kesim kaydını engelleme | Tamamlandı (tur 4): model yanlış nesneyi seçtiğinde ürün tıklayarak toplanıyor; boş kesim kaydedilmiyor | `app/studio/lib/dekupe/wand.ts`, `CutoutEditor.tsx`; `screens/after2-lace-03-degnek.png` |
| Ürün seçme (kutu) + fırça rötuşu (Sil / Geri getir / Geri al / Kaydet) | Tamamlandı: `CutoutEditor`; BiRefNet yalnız seçilen kutuda çalışıyor, sonra tam boya geri yapıştırılıyor; ayrık küçük parçalar filtreleniyor (`keepMainComponents`) | `app/studio/components/CutoutEditor.tsx`, `dekupe/index.ts`; `screens/after-perfume-01-secim.png`, `-02-kesim.png` |
| Manken/giyili kareler: oklüzyon warp v3 (PR #10) uygulamaya taşındı | Tamamlandı (PR #14 işi dahil edildi) | `app/studio/lib/wear/engine.ts`, `placements.ts`, `public/mannequin/*` |
| GEN kareleri (elde, lifestyle, UGC): fal.ai Flux kuyruğu uçtan uca | Yalnız `FAL_KEY` bekliyor; anahtar yoksa önce manken warp, sonra canvas kullanılıyor | `app/api/gen/route.ts`, `produceQueue.ts` |
| Zor ürünler için ücretli dekupe yedeği (Photoroom) | Yalnız `PHOTOROOM_API_KEY` bekliyor | `app/api/dekupe/paid/route.ts` |
| PR #10 araştırma raporu ve yerleşim verileri repoya alındı | Tamamlandı | `research/provider-test/REPORT.md`, `vton_availability.json` |

## Hatalıydı, düzeltildi
| Madde | Durum | Kanıt |
|---|---|---|
| Parfümde güller şişeyle birlikte kesiliyordu | Düzeltildi: kutu seçimiyle yalnız şişe çıkıyor, 12/12 karede gül yok | önce `screens/local-perfume-06-uretilen.png` → sonra `screens/after-perfume-04-uretilen.png` |
| GEN Lifestyle anahtarsızken ürünsüz stok foto | Düzeltildi: ürün her zaman sahneye yerleştiriliyor (zemin, yansıma, gölge, renk eşleme); hata olursa canvas sahnesi; boş kesim asla geçmiyor | `lifestyleFallback.ts`; `screens/after-{perfume,sneaker}-04-uretilen.png` |
| GEN Elde kaba yapıştırma | Düzeltildi: stoktaki eski şişe silinip ürün eğik, gölgeli, ışık eşlemeli konuyor; parmaklar ürünün önüne yeniden çiziliyor (ele tutulmuş görünüm) | `screens/after-perfume-04-uretilen.png` (Elde karesi) |
| Fırça/değnekle düzeltilmiş kesim sahnede köşeye kayıyordu | Düzeltildi: tuval sahnesi kesimin şeffaf kenarlarını kırpıp ürünü ortalıyor | `sceneComposer.ts`; önce `after2` ilk deneme, sonra `screens/after2-lace-04-uretilen.png` |
| Sabit footer sonuç ızgarasını örtüyordu | Düzeltildi: footer yalnız ana sayfada sabit, /studio'da akışta | `SiteFooter.tsx`; `screens/after-*-05-viewport-bottom.png` |
| Beyazda beyaz ayakkabı (taban deliği / burun kesilmesi) | Düzeltildi ve gerçek akışta doğrulandı: taban/burun tam | `screens/local-sneaker-06-uretilen.png`, `screens/cutout-hard-02-white-sneaker-white-*.png` |
| Dantel/tül: delik doldurma ağ dokusunu kapatıyordu | Kodda düzeltildi (PR #14), ama gerçek testte kesim hâlâ kötü (aşağıdaki tabloya bakın) | `postprocess.ts` |
| Saç/tüyde yeşil leke | Düzeltildi: yeşil yansıma bastırma (PR #14) | `postprocess.ts` (`suppressGreenSpill`) |
| Lint 6 hata (effect içinde setState, memo bağımlılığı, prefer-const) | Düzeltildi, lint 0 hata | `app/studio/page.tsx`, `app/components/DragonTopLogo.tsx`, `dekupe/index.ts`, `wear/engine.ts`; `screens/lint.log` |

## Tur 5 — Giyili/elde kareler: çizim mankenler kaldırıldı, foto-kompozit

- `forms.ts` (çizim formlar) **silindi**. `app/studio/lib/wear/photoreal.ts`: gerçek stok foto + BiRefNet kesimi + oklüzyon + perspektif + ton eşleme + temas gölgesi. FAL_KEY gerekmez.
- **Ayakkabı** (Unsplash vUryUa-R32g): çoraplı gerçek ayakta giyili; çorap ağzı ürünün önünde. Giyili ✔. Kusur: yaka sağında küçük beyaz kalıntı (bu turda dokunulmadı).
- **Saat** (Unsplash SE7gaKWKw2k), 5c: kasa bilek ölçeğine küçültüldü (caseD 150), bilek siluet poligonu fotoğraftan yeniden çizildi; kayış bileğin üst kenarında arkaya dönüyor, kasa kenardan taşabiliyor. Giyili ✔ (yarı-iyi): kayış ucu/toka bilek alt kenarından biraz taşıyor ve altında eski saat silme izi (açık leke) hafif görünüyor.
- **Parfüm/cilt bakımı** (el stoğu hand_beauty), 5c: cam kesiminde yumuşak alfa kutusu `hardenAlpha` ile kaldırıldı; şişe stok tutuşa göre −120° döndürüldü; başparmak/parmaklar şişenin önünde; eski şişe silme yaması yumuşatıldı; "source-atop" kaynaklı koyu dörtgen hatası düzeltildi; stok şişe etiketi ("OTERRA") parmak arasından kesildi. Etiket: "Elde — gerçek el fotoğrafı + ürün kompoziti (stok: Unsplash)", yöntem `worn_photo`. Elde ✔.
- **Elbise**: ücretsiz yolla dürüst giyili/askıda foto yapılamadı (kaynak gelinlik modelde, ürün tam ayrılamıyor; uygun lisanslı hayalet-manken stoğu eklenmedi) → `null`, stüdyo karesi. Sahte try-on üretilmedi; gerçek giyim için VTON (FAL_KEY) gerekli.
- Ekranlar: `screens/AFTER-photoreal-{sneaker,watch,perfume}.jpg`.
- Kalan engeller: sabit stok pozları, saat stok temizliğinde iz, elbise için VTON/FAL_KEY veya Photoroom.

### Tur 5d — temizlik (AFTER2 ekranları)
- **Saat**: bilek alt kenarı poligonu fotoğraftaki kenara sıkılaştırıldı → kayış ucu/toka artık bilek dışına taşmıyor, kenarda kesilip arkaya dönüyor. `wrist_scene.jpg` yeniden temizlendi (önkoldan Poisson klon + kenar çentikleri inpaint) → kasa altındaki açık iz giderildi. Giyili ✔.
- **Ayakkabı**: `foot_scene.jpg` çorap altındaki beyaz kalıntı/bulanık bant, çorap alfası korunarak koyu fon gradyanıyla dolduruldu → topuk/çorap birleşiminde leke yok. Giyili ✔.
- **Parfüm**: cam alfa eşiği 140→185 (kenar saçağı azaldı). Şişe alt köşesinde çok küçük amber nokta kalabiliyor. Elde ✔.
- **Elbise**: değişmedi — ücretsiz dürüst yol yok, VTON/FAL_KEY gerekir.
- Ekranlar: `screens/AFTER2-photoreal-{watch,sneaker,perfume}.jpg`.

### Tur 5e — saat sarılma + parfüm leke (AFTER3 ekranları)
- **Saat**: kayış artık düz katman değil; `wrapCylinder` kayışı bilek silindirine izdüşürüyor (kasa dışında d′ = c + R·sin((d−c)/R), R=125): bilek kenarına yaklaştıkça sıkışıyor, yüzey normaline göre koyulaşıyor ve eğik bakışa uygun hafif yay çiziyor; 90°'yi geçen kısım (bileğin arkası) çizilmiyor + siluete kırpılıyor. Kayış sağındaki açık deri lekesi Poisson klonla giderildi. Sınır: tek stok poz, kayış ucu siluette yine net bir kenarla bitiyor (gerçek arka kayış görünmüyor).
- **Parfüm**: cam kesiminde ana gövdeden kopuk küçük parçalar (%2 altı) atılıyor + stok şişe yaması büyütüldü → şişe–avuç köşesindeki amber nokta yok. Parmaklar önde.
- **Ayakkabı**: değişmedi (AFTER2 kopyası).
- Ekranlar: `screens/AFTER3-photoreal-{watch,perfume,sneaker}.jpg`.

### Tur 5f — saat kayışı arka yüz/kalınlık (AFTER4 ekranları)
- **Saat**: kayış artık siluette düz kesilmiyor: maske kayış kalınlığı kadar (T=9px) silüetin dışına uzatıldı, bu bant koyu ve yumuşak (blur) bir "dönen kenar" olarak boyanıyor; silindir izdüşümü R=138 ile kenarı biraz aşıyor → kayış bileğin altına dönüyormuş gibi okunuyor. Alt bilek kenarındaki küçük koyu çentik inpaint ile temizlendi. Sınır: bileğin arka tarafındaki kayış parçası ayrı bir segment olarak görünmüyor (bu stok açıda zaten görünmez); kasa üst kenarında hafif koyu kenar çizgisi var. Uzak yüz görünen gerçek bir bilek stoğu bulunamadı (Unsplash aramada uygun lisanslı çıplak/saatli alternatif yok).
- **Parfüm / Ayakkabı**: değişmedi (yeniden dışa aktarıldı).
- Ekranlar: `screens/AFTER4-photoreal-{watch,perfume,sneaker}.jpg`.

### Tur 5g — saat: yeni bilek stoğu, kayış bileğin arkasına dolanıyor
- Yeni stok: Pexels 8092768 (Kaboompics, Pexels Lisansı, ticari kullanım serbest) → `public/wear/wrist2_scene.jpg`. Önkol yukarıdan görünüyor, sade duvar; kayış bileği enine kesiyor ve **her iki** siluette silindir sarımı (`wrapCylinder`, flatC 45 / R 80) + kenar koyulaşmasıyla bileğin arkasına dönerek kayboluyor.
- Hata düzeltmesi: tutma maskesinde poligon + daire tek path/nonzero ile çiziliyordu; ters sarım kasa bölgesini deliyordu → ayrı `fill` çağrıları.
- Etiket: "stok: Pexels".
- Parfüm ve sneaker değişmedi (AFTER4 ile görsel olarak aynı).
- Ekranlar: `screens/AFTER5-photoreal-{watch,perfume,sneaker}.jpg`.
- Kalan sınırlama: stokta görünen iç bilek (avuç tarafı); saat kadranı iç bilekte duruyor. Kasa düz kompozit, bilekte gerçek temas deformasyonu yok. Gerçek insan modelde deneme için hâlâ VTON gerekir (bu turda engel değil).

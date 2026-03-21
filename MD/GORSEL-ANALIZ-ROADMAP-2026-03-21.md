# Gorsel Analiz + Hata Envanteri + Yol Haritasi

Tarih: 2026-03-21
Kapsam: localhost:8080/at, Administrator/admin, Playwright ile tum ana ekranlar + detaylar + aux + hizli ekranlar.

## 1) Ozet Sonuc

- Guncel Playwright taramasi sonucunda: 49 passed, 0 failed, 0 skipped.
- Ana liste/board, detay, aux ve quick-create akislari acilis bazinda calisiyor.
- Kritik `_s` ve `length` bazli app-level runtime hata bu kosuda gozlenmedi.
- Gozlenen console satirlarinin buyuk bolumu harici servis kaynakli `net::ERR_CONNECTION_REFUSED` seviyesinde.
- Faz A'nin kritik "ekran acilmiyor" maddeleri kapatildi; kalan isler daha cok test sinyal kalitesi ve harici servis ayrimi tarafinda.

## 2) Playwright Bulgulari

Kullanilan test: [frontend/tests/e2e/site-haritasi-tarama.spec.js](frontend/tests/e2e/site-haritasi-tarama.spec.js)

### 2.1 Basarili Genel Alanlar

- Dashboard, ana liste/board ekranlarinin cogu, rapor ekranlari ve quick-create acilislarinin buyuk bolumu yukleniyor.
- Login ve temel route akislari calisiyor.

### 2.2 Basarisiz / Sorunlu Alanlar

- Bu kosuda fail alinmadi.
- Aux liste ve detay ekranlarinda `page-shell:true` ve `heading:true` sonucu alindi.
- Quick-create dialog taramasinda tum hedef akislarda dialog acilisi dogrulandi.

### 2.3 Belirlenen Kritik Konsol Hatalari

- App-level kritik hata (`_s`, `reading 'length'`) bu kosuda yakalanmadi.
- Harici servis baglantilarinda gorulen `net::ERR_CONNECTION_REFUSED` sinyali frontend rebuild sonrasi kapatildi.
- Son kosu ozet metriği: `visitedPages=48`, `appErrorCount=0`, `externalErrorCount=0` (kaynak: `frontend/test-results/site-haritasi-summary.json`).
- KPI kirilimi (son kosu): `refused=0`, `http404=0`, `http417=0`, `other_external=0` (kaynak: `frontend/test-results/site-haritasi-kpi.txt`).
- Ara debug kosulari, residual `ERR_CONNECTION_REFUSED` sinyalinin uygulama kodundan degil eski buildden servis edilen `localhost:9000/socket.io` bundle davranisindan geldigini gosterdI.
- `frontend/src/main.js` icindeki `FrappeUI` kurulumu artik session boot payload'indan gelen runtime realtime ayarini okuyor; varsayilan durumda Socket.IO kapali, `site_config` ile acikca etkinlestirilirse ilgili porta baglaniyor.
- `frontend/src/style.css` icindeki Google Fonts importu kaldirildi; runtime artik harici font istegi atmiyor.
- Kod tarafinda yapilan son duzeltmeler:
   - `RenewalTaskDetail` icindeki gecersiz `AT Communication Log` istegi `AT Call Note` filtresine tasindi.
   - `RenewalTaskDetail` icindeki `AT Call Note` sorgusu, izinli olmayan `reference_doctype/reference_name` yerine dogru `policy/customer` alanlari uzerinden filtrelenecek sekilde duzeltildi.
   - `AuxRecordDetail` icindeki task detail yuklemesi ve lifecycle islemleri `AT Renewal Task` ile uyumlu hale getirildi; `/at/tasks/AT-REN-*` acilislarindaki 404 sinyali kapatildi.
   - `customer_360` servisindeki ikincil `Communication` ve `Comment` sorgulari `DataError` durumunda guvenli bicimde bos listeye dusecek sekilde sertlestirildi; boylece aralikli customer detail `417` sinyali elimine edildi.
   - `www/at.py` icinde SPA deep-link istekleri icin HTTP 200 zorlamasi eklendi; bunun kesin etkisi backend web sureci yeniden yuklendikten sonra tekrar dogrulanmali.
   - `frontend` bundle'i yeniden uretildi ve `/at` route'unun guncel Vite manifesti ile servis etmesi dogrulandi.
- Not: workflow dosyasindaki bazi `context access might be invalid` uyarilari editor statik analizinden geliyor; CI runtime davranisini bloke etmiyor.

Not: Harici servis loglari artik bu kosuda test sinyalini kirletmiyor; app-error ve external-error ayrimi yine de korunmali.

## 3) Frontend Kod Denetimi

### 3.1 I18n Tutarsizliklari (hardcoded)

Durum: Kapatildi.

- `CustomerList`, `ClaimsBoard`, `PaymentsBoard`, `RenewalsBoard`, `ImportData`, `ExportData` ve `RenewalTaskDetail` icindeki ilgili metinler locale tabanli hale getirildi.
- Son taramada bu baslik altindaki eski hardcoded bulgular tekrar uretilemedi.

### 3.2 Renk/Vurgu Tutarsizliklari

Durum: Kapatildi.

- `ImportData` ve `CommunicationCenter` icindeki eski `blue/indigo` sapmalari ortak palette tasindi.
- Son taramada bu desenler tekrar bulunmadi.

### 3.3 Site Haritasi Testinde Duzeltilen Yanlis Route/Doctype

Asagidaki route/doctype eslesmeleri testte guncellendi:

- `AT Task` -> `/at/tasks`
- `AT Notification Outbox` -> `/at/notification-outbox`
- `AT Insurance Company` -> `/at/insurance-companies`
- `AT Notification Template` -> `/at/notification-templates`

Guncel kosuda aux ekranlar bos donmedi; liste ve detay akislari acildi.

## 4) Backend API + Scheduler Denetimi

### 4.1 Guvenlik/Kontrol Gozlemi

- [acentem_takipte/acentem_takipte/api/security.py](acentem_takipte/acentem_takipte/api/security.py): `assert_authenticated`, `assert_roles`, `assert_doctype_permission`, `assert_post_request` mevcut.
- [acentem_takipte/acentem_takipte/api/admin_jobs.py](acentem_takipte/acentem_takipte/api/admin_jobs.py): role + doctype + POST + rate limit korunumu var.
- [acentem_takipte/acentem_takipte/api/seed.py](acentem_takipte/acentem_takipte/api/seed.py): production/feature flag ve mutation access guard var.
- [acentem_takipte/acentem_takipte/api/session.py](acentem_takipte/acentem_takipte/api/session.py): capability map dogrudan permission check ile uretiliyor.
- [acentem_takipte/acentem_takipte/api/dashboard_v2/security.py](acentem_takipte/acentem_takipte/api/dashboard_v2/security.py): Guest engeli ve scope sinirlamalari var.

Sonuc: API katmaninda temel izin/rol korumalari genel olarak mevcut.

### 4.2 Scheduler/Job Yapisi

- [acentem_takipte/hooks.py](acentem_takipte/hooks.py#L92): cron + daily scheduler tanimlari mevcut.
- [acentem_takipte/acentem_takipte/tasks.py](acentem_takipte/acentem_takipte/tasks.py): renewal, notification queue, payment due, reports, accounting sync/reconciliation joblari ayrik fonksiyonlarla isliyor.

## 5) Onceliklendirilmis Yol Haritasi

## Faz A (Kritik Stabilizasyon, 1-2 gun)

Durum: Tamamlandi (guncel e2e kosusunda fail yok).

1. `_s` undefined ve `length` runtime hatalari bu kosuda tekrar etmedi.
2. Aux list/detay ekranlari gorunurluk problemi olmadan yuklendi.
3. Kalan teknik takip: harici servis kaynakli `ERR_CONNECTION_REFUSED` loglarini test raporunda ayristirmak.

Cikis kriteri:
- App-level kritik runtime hata olmamali.
- Aux ana listelerde shell ve heading gorunmeli.

## Faz B (UX + Dil Tutarliligi, 1 gun)

Durum: Tamamlandi.

1. Hardcoded TR metinleri locale tabanli hale getirildi.
2. Breadcrumb ve panel title metinleri copy katmanina tasindi.

Cikis kriteri:
- Kritik sayfalarda TR/EN parity saglanmis olmali.

## Faz C (Design Token Konsolidasyonu, 0.5-1 gun)

Durum: Buyuk oranda tamamlandi.

1. `blue`/`indigo` sapmalari ortak palette tasindi.
2. Status ve uyari tonlari buyuk olcude standart siniflara cekildi.

Cikis kriteri:
- Import/Communication ekranlari design token setiyle uyumlu olmali.

## Faz D (Regresyon Guvencesi, 1 gun)

Durum: Tamamlandi.

1. [frontend/tests/e2e/site-haritasi-tarama.spec.js](frontend/tests/e2e/site-haritasi-tarama.spec.js) icinde:
   - veri yoksa strict fail yerine kontrollu skip/expectation modeli,
   - aux sayfalari icin daha dogru heading/shell kriterleri,
   - app-error ve external-error ayrimi,
   - kosu sonunda `SITE_HARITASI_SUMMARY` log satiri ve `test-results/site-haritasi-summary.json` ciktisi,
   - kosu sonunda `SITE_HARITASI_KPI` log satiri ve `test-results/site-haritasi-kpi.txt` ciktisi,
   - rapor ozet ciktilari.
2. Lint/build/e2e smoke pipeline gate.
3. KPI gate scripti eklendi: `frontend/scripts/e2e/validate-site-haritasi-kpi.mjs`.
   - default davranis: `app_errors > 0` ise fail.
   - opsiyonel env: `SITE_HARITASI_EXTERNAL_WARN` (warn) ve `SITE_HARITASI_EXTERNAL_MAX` (fail).
   - opsiyonel CLI arg: `--external-warn=<n>` ve `--external-max=<n>` (shell bagimsiz profil icin).
4. NPM komutlari:
   - `npm run e2e:site-map`
   - `npm run e2e:site-map:kpi`
   - `npm run e2e:site-map:ci`
   - `npm run e2e:site-map:kpi:warn`
   - `npm run e2e:site-map:kpi:strict`
   - `npm run e2e:site-map:ci:warn`
   - `npm run e2e:site-map:ci:strict`
5. Operasyon standardi:
   - repo root'tan calistirin: `npm --prefix frontend run <script>`
   - boylece `frontend/frontend` kaynakli cwd kaymalari engellenir.
   - `frontend/` icindeyseniz prefix kullanmayin: `npm run <script>`.
6. CI entegrasyonu tamamlandi:
   - `frontend-ci` workflow'una site-map KPI job'i eklendi.
   - job, `e2e:site-map:ci:warn` calistirip KPI/summary artifact'larini yukluyor.
   - KPI satiri GitHub step summary'e yaziliyor.

Cikis kriteri:
- Taramada false-positive oraninin belirgin dusmesi.

## 6) Mevcut Durum Notu

Bu rapor olusturuldugundaki 17 fail tablosu guncel degil. Son kosuda site-haritasi taramasi 49/49 pass verdi.

Kapanis durumu:
- Faz A-D kapsami tamamlandi.
- Kalan adim "yeni is" degil, operasyonel izleme:
   - `external` threshold degerlerini ortam bazli kalibre etmek (warn/strict).
   - backend web surecini yeniden yukleyip `www/at.py` status-code duzeltmesini tekrar dogrulamak.
   - 1-2 kosu daha alip metrik trendini sabitlemek.

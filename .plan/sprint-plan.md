# Haftalik Sprint Plani

## Planlama Cercevesi

- **Baslangic:** 9 Mar 2026
- **Bitis:** 7 Agu 2026
- **Toplam:** 22 hafta
- **Toplam efor:** 476 saat
- **Gunluk kapasite:** 4-6 saat

## Mevcut Konum

- **Su an:** Dalga 7 tamamlandi; odak tekrar Dalga 1'e cekildi.
- **Oncelik:** Faz 3.2.1 Pinia facade migration dilimleri.
- **Bugunku odagimiz:** `Dashboard.vue` ve `Reports.vue` sonrasinda `RenewalsBoard.vue` migration adimini almak.

## Dalga Plani ve Kapanis

| Hafta | Tarih Araligi | Dalga | Ana Hedef | Durum |
|---|---|---|---|---|
| 1 | 09-13 Mar | Dalga 1 | Ortam, yonlendirme, session role dogrulamasi | Tamamlandi |
| 2 | 16-20 Mar | Dalga 1 | Guvenlik ve auth sozlesmesi cekirdegi | Tamamlandi |
| 3 | 23-27 Mar | Dalga 1 | Permission ve rol bazli koruma ilkeleri | Tamamlandi |
| 4 | 30-03 Nis | Dalga 1 | KVKK/API hardening kapanisi | Tamamlandi |
| 5 | 06-10 Nis | Dalga 2 | Hizmet katmani ve model cekirdegi | Tamamlandi |
| 6 | 13-17 Nis | Dalga 2 | Dokumantasyon ve test kapanisi | Tamamlandi |
| 7 | 20-24 Nis | Dalga 3 | Store/bootstrap ve frontend cekirdek state | Tamamlandi |
| 8 | 27-01 May | Dalga 3 | UX/erisim iyilestirme, mobil baslangic | Tamamlandi |
| 9 | 04-08 May | Dalga 4 | Customer 360 ve urun modelleme baslatma | Tamamlandi |
| 10 | 11-15 May | Dalga 4 | Productized policy temel akislar | Tamamlandi |
| 11 | 18-22 May | Dalga 5 | Yenileme servisi ve gorev motoru | Tamamlandi |
| 12 | 25-29 May | Dalga 5 | Mali/odeme alt akislar | Tamamlandi |
| 13 | 01-05 Haz | Dalga 5 | Tahsilat/komisyon model genisleme | Tamamlandi |
| 14 | 08-12 Haz | Dalga 5 | Kapanis ve kalite kontrol | Tamamlandi |
| 15 | 15-19 Haz | Dalga 6 | Claim/communication/task genislemesi | Tamamlandi |
| 16 | 22-26 Haz | Dalga 6 | Kampanya/task/notification temel | Tamamlandi |
| 17 | 29-03 Tem | Dalga 6 | Ileri operasyon modelleme | Tamamlandi |
| 18 | 06-10 Tem | Dalga 6 | Kapanis ve test gecisi | Tamamlandi |
| 19 | 13-17 Tem | Dalga 7 | Raporlama backend export cekirdegi | Tamamlandi |
| 20 | 20-24 Tem | Dalga 7 | Export ve karsilastirmali rapor iskeleti | Tamamlandi |
| 21 | 27-31 Tem | Dalga 7 | Scheduled reports, raporlama genisleme, regression hardening | Tamamlandi |
| 22 | 03-07 Agu | Dalga 1 (re-open) | Guvenlik kapanisi ve dashboard sorgu sagligi baslangici | Devam |

## Aktif Calisma Dilimi

| Gun | Gorev | Dosya | Sure |
|---|---|---|---|
| Pzt | Faz 1.3 kapanisini isle | `.plan/dalga-1.md` | 1 sa |
| Sal | Dashboard sorgu envanterini cikar | `acentem_takipte/acentem_takipte/api/dashboard.py` | 2 sa |
| Car | Ilk request-scope cache optimizasyonunu uygula | `acentem_takipte/acentem_takipte/api/dashboard.py` | 2 sa |
| Per | KPI ve tab payload SQL adaylarini notla | `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`, `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py` | 3 sa |
| Cum | Ilk index patch'i plan kayitlarina isle | `acentem_takipte/acentem_takipte/patches/v2026_03_09_add_dashboard_hot_path_indexes.py` | 1 sa |

**Hafta sonu buffer:** review + test + commit

## Aktif Dilim Bitis Kriteri

- [x] Dalga 7 tamamlandi olarak isaretlendi
- [x] Dalga 1 Gorev 1.1 checklist'i tamamlandi
- [x] `api/security.py` inventory cikti
- [x] `reports.py`, `quick_create.py`, `admin_jobs.py` ilk auth matrisi cikti
- [x] `quick_create.py` icin ilk standardizasyon refaktoru cikti
- [x] `communication.py` ve `accounting.py` auth kontrati hizalandi
- [x] `seed.py` ve `smoke.py` admin/demo kontrati hizalandi
- [x] read endpoint helper karari kod seviyesinde uygulandi
- [x] Gorev 1.2 icin endpoint auth matrisi hazir
- [x] Faz 1.3 icin merkezi redacted error helper eklendi
- [x] `reports.py`, `communication.py`, `scheduled_reports.py`, `accounting.py` error path'leri helper'a tasindi
- [x] notification/controller/provider hata zinciri redacted helper'a tasindi
- [x] dashboard ve customer access log hata basliklari redacted helper'a tasindi
- [x] Faz 1.3 plan seviyesinde kapatildi
- [x] Faz 2.1 icin ilk request-scope cache optimizasyonu uygulandi
- [x] Faz 2.1 icin aggregate request-cache optimizasyonu uygulandi
- [x] Faz 2.1 icin ilk dashboard hot-path index patch'i olusturuldu
- [x] Faz 2.1 icin dashboard v2 where/value cache sadeleştirmesi uygulandi
- [x] Faz 2.1 icin ikinci dashboard index patch'i olusturuldu
- [x] Faz 2.1 plan seviyesinde kapatildi
- [x] Faz 2.2 scheduled report outbox dispatch fan-out refaktoru alindi
- [x] Faz 2.2 accounting doc-event debounce refaktoru alindi
- [x] Faz 2.2 plan seviyesinde kapatildi
- [x] Faz 2.3 icin Dashboard.vue debounce uygulamasi alindi
- [x] Faz 2.3 icin Reports.vue debounce uygulamasi alindi
- [x] Faz 3.1 icin quick_create service katmani ilk dilimi alindi
- [x] Faz 3.1 icin quick_create service katmani ikinci dilimi alindi
- [x] Faz 3.1 icin quick_create persistence helper toplulastirmasi alindi
- [x] Faz 3.1 ara karar ve extraction aday listesi yazildi
- [x] Faz 3.1 icin reports runtime extraction dilimi alindi
- [x] Faz 3.1 icin admin_jobs dispatch extraction dilimi alindi
- [x] Faz 3.1 icin accounting runtime extraction dilimi alindi
- [x] Faz 3.1 plan seviyesinde kapatildi
- [x] Faz 3.2 icin reports endpoint helper tekillestirmesi alindi
- [x] Faz 3.2 icin mutation access helper tekillestirmesi alindi
- [x] Faz 3.2 plan seviyesinde kapatildi
- [x] Faz 3.3 icin finans dogrulama helper tekillestirmesi alindi
- [x] Faz 3.3 icin `commission_amount` kanonik alan karari ve Python legacy helper katmani alindi
- [x] Faz 3.3 icin sicak SQL `commission` fallback ifadeleri ortak helper'a tasindi
- [x] Faz 3.3 icin seed/smoke payload ve endorsement aynalama karari uygulandi
- [x] Faz 3.3 icin quick create literal status setleri merkezi enum sabitlerine baglandi
- [x] Faz 3.3 icin notes normalization helper alindi
- [x] Faz 3.3 plan seviyesinde kapatildi
- [x] Faz 3.4 icin renewal service/pipeline/telemetry iskeleti alindi
- [x] Faz 3.4 icin stale remediation ve renewal status guard alindi
- [x] Faz 3.4 icin renewal outcome veri modeli iskeleti alindi

## Sonraki Hamle

- Faz 3.3 veri modeli tekrarlarini hedefle
- lost reason / competitor alanlarini renewal outcome akislariyla besle
- legacy test yuzeyleri icin ikinci gecis planini yaz

## Faz 3.4 Aktif Dilim

- [x] Renewal outcome veri modeli iskeleti
- [x] Lost reason / competitor backend sozlesmesi
- [x] Renewal reporting payload'ina outcome alanlari
- [x] Dashboard renewal retention backend metri?i
- [ ] Renewal board / quick action yuzeyine lost reason formu
- [ ] Retention ozetinin dashboard UI'a baglanmasi

- [x] Renewal board quick create ve liste gorunurlugu lost reason / competitor bilgisiyle genisletildi
- [ ] Dashboard renewal retention karti gorunurlugu

- [x] Dashboard renewal retention karti gorunurlugu
- [ ] Faz 3.4 kapanis notu

## Yeni Aktif Odak

- [x] Faz 3.4 renewal outcome ve retention zinciri tamamlandi
- [ ] Faz 3.2.1 Pinia store mimarisi inventory ve migration plani


- [x] Pinia facade store temeli (uth, ui) olusturuldu
- [ ] Dashboard.vue icin ilk store migration dilimi


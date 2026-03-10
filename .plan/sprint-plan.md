# Haftalik Sprint Plani

## 2026-03-09 Guncel Sprint Durumu

- **Aktif dalga:** 1
- **Aktif faz:** 9
- **Son tamamlanan faz:** 8
- **Son tamamlanan teslimler:**
  - snapshot admin UI tetikleme butonu
  - snapshot liste/detail okunabilirligi
  - snapshot liste taranabilirligi
  - snapshot operasyon ozet kartlari
  - segment snapshot trend gorunurlugu
  - segment snapshot export gorunurlugu
- **Siradaki adim:** Faz 9 ilk veri katmani
- **Not:** Asagidaki haftalik plan baseline niteligindedir; guncel operasyon durumu bu bloktan okunur.


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


## Guncel Sprint Durumu (2026-03-09)
- Aktif Dalga: 1
- Aktif Faz: 5
- Son tamamlanan adim: ReconciliationWorkbench ekstre ice aktarma preview dialog kontrati sayfa testine eklendi.
- Sonraki adim: statement import preview satirlarini persistence katmanina baglamak.
- Not: Dalga 4 tamamlandi, Dalga 5 aktif olarak ilerliyor.

- 2026-03-09 aktif teslim: Faz 5 statement import preview -> persistence zinciri tamamlandi; siradaki mantikli adim import edilen satirlar icin toplu resolve/ignore yardimcilari veya Faz 5 kapanis notu.

- 2026-03-09 aktif teslim: Faz 5 statement import persistence ve toplu reconciliation aksiyonlari tamamlandi; sonraki mantikli adim Faz 5 kapanis notu veya backend bulk mutation testleri.

- 2026-03-09 aktif teslim: Faz 5 bulk reconciliation backend kontrati sabitlendi; Faz 5 kapanis notuna gecilebilir.

- 2026-03-09 aktif durum: Faz 5 plan seviyesinde kapatildi. Sonraki sprint kesiti Faz 6 - hasar ve iletisim merkezi derinlestirme.

- 2026-03-09 guncelleme: Faz 6 ilk kesitinde claim lifecycle alanlari ve backend guard/test zemini eklendi. Sonraki adim ClaimsBoard gorunurlugu.

- 2026-03-09 Faz 6 ikinci kesit: ClaimsBoard lifecycle gorunurlugu eklendi. Sonraki adim claim status aksiyonlari ve musteri notification gorunurlugu.

- 2026-03-09 Faz 6 ucuncu kesit: ClaimsBoard hizli status aksiyonlari ve notification template ipucu eklendi. Sonraki adim rejected/appeal ve outbox gorunurlugu.

- 2026-03-09 Faz 6 dorduncu kesit: ClaimsBoard notification draft/outbox gorunurlugu ve rejected aksiyonu eklendi. Sonraki adim claim outbox aksiyonlari veya iletişim merkezi genislemesi.

- 2026-03-09 Faz 6 besinci kesit: AT Call Note veri modeli, quick create ve Communication Center hizli giris yuzeyi eklendi. Sonraki adim test kapsami ve kampanya/segment modeli.

- 2026-03-09 Faz 6 altinci kesit: call note backend/UI ilk test turu tamamlandi. Sonraki adim kampanya/segment veri modeli.
## Guncel OdaK

- **Aktif dalga:** 1
- **Aktif faz:** 6
- **Son teslim:** `AT Campaign` execution servisi ve endpoint'i eklendi
- **Bu sprintin yeni hedefi:** campaign execution akisini `CommunicationCenter.vue` icinden tetiklenebilir hale getirmek

- 2026-03-09: CommunicationCenter campaign execution akisi icin secici ve test sertlestirmesi tamamlandi.

- 2026-03-09: Campaign execution summary alanlari campaign list/detail yuzeyinde gorunur olacak sekilde eklendi.

- 2026-03-09: Due campaign worker ve gunluk scheduler entegrasyonu tamamlandi.

- 2026-03-09: Campaign detail related cards ile draft/outbox delivery trace eklendi.

## Faz 6 Kapanis
- Claim ve Communication Center derinlestirme tamamlandi.
- Sonraki sprint odagi: Faz 7.


- 2026-03-09: Reports icinde communication operations raporu eklendi; sonraki adim test ve export kontrati.

- 2026-03-09: Communication operations report icin backend ve frontend test kontratlari eklendi.

- 2026-03-09: Reconciliation operations raporu ve test kontratlari tamamlandi.

- Tamamlandi: Hasar operasyonlari yonetim raporu (claims_operations) backend/frontend kontratlariyla eklendi. Sonraki mantikli hedef: Faz 7 icinde period-comparison veya ucuncu yonetsel dashboard kartlari.

- Tamamlandi: Reports ekranina client-side previous-period comparison kartlari eklendi ve sayfa testi ile sabitlendi. Sonraki hedef: Faz 7 icinde scheduled/export operatorlugu veya yeni yonetsel kartlar.

- Tamamlandi: Scheduled report yonetimi operasyon raporlarina genisletildi. Sonraki hedef: Faz 7 icinde yeni yonetsel kart veya Faz 7 kapanis notu.

## Faz 7 Kapanis Notu
- Tamamlandi: yonetsel operasyon raporlari + previous-period comparison + scheduled operatorluk.
- Yeni aktif hedef: Faz 8 ilk kesiti.

- Tamamlandi: Faz 8 ilk kesiti olarak customer segment snapshot veri modeli ve customer_360 entegrasyonu eklendi. Sonraki hedef: snapshot toplu yenileme veya snapshot gorunurlugu.
# Guncel Sprint Notu
- Faz 8
- Tamamlandi: snapshot veri omurgasi
- Tamamlandi: batch refresh job ve daily scheduler
- Tamamlandi: CustomerDetail snapshot metadata gorunurlugu
- Tamamlandi: snapshot batch refresh icin admin tetikleme ve liste gorunurlugu
- Tamamlandi: snapshot admin UI tetikleme butonu
- Tamamlandi: snapshot liste/detail okunabilirligini artirma
- Tamamlandi: snapshot liste taranabilirligini artirma
- Tamamlandi: snapshot operasyon ozet kartlarini acma
- Tamamlandi: segment snapshot trend gorunurlugu
- Tamamlandi: segment snapshot export gorunurlugu
- Tamamlandi: Faz 8 kapanis ve sonraki veri katmani
- Siradaki adim: Faz 9 ilk veri katmani


## Faz 9 Guncel Sprint Notu
- Aktif Faz: 9
- Tamamlandi:
  - `AT Ownership Assignment` veri modeli
  - ownership assignment quick create / aux edit-delete
  - Customer 360 ve Policy 360 assignment payload gorunurlugu
  - CustomerDetail inline assignment create/edit/delete
  - ClaimsBoard claim kaynakli assignment prefill
  - CustomerDetail ownership assignment sayfa testi
- Siradaki adim: assignment gorunurlugunu claim ve policy operasyon yuzeylerinde derinlestirmek
- 2026-03-09: Faz 9 ikinci kesit: ClaimsBoard ownership assignment gorunurlugu eklendi. Sonraki adim PolicyDetail ve aux detail yuzeyinde assignment operasyonlarini derinlestirmek.
- 2026-03-09: Faz 9 ucuncu kesit: PolicyDetail inline ownership assignment create/edit akisi tamamlandi. Sonraki adim aux/detail operasyonlarini derinlestirmek ve Faz 9 kapanisini hazirlamak.
- 2026-03-09: Faz 9 dorduncu kesit: ownership assignment aux/detail okunabilirligi eklendi.
- Faz 9 kapanis karari: ownership katmani veri modeli, ana operasyon yuzeyleri ve ilk test seviyesiyle tamamlandi.
- Sonraki adim: lokal build + docker restart + smoke ardindan GitHub gonderimi.

- 2026-03-09: Faz 10 ilk slice tamamlandi; detay shell mobil aksiyon ve sekme deneyimi iyilestirildi. Sonraki hedef CustomerDetail/PolicyDetail mobil veri yogunlugu.

- 2026-03-09: Faz 10 ikinci slice tamamlandi; CustomerDetail ve PolicyDetail mobil hizli aksiyon yuzeyleri acildi.

- 2026-03-09: Faz 10 ucuncu slice tamamlandi; detail ekranlarda mobil preview listeleri kisitlanarak okunabilirlik artirildi.

- 2026-03-09: Faz 10 dorduncu slice tamamlandi; CustomerList ve PolicyList mobil summary ergonomisi guclendirildi.

- 2026-03-09: Faz 10 mobil liste summary sozlesmesi CustomerList ve PolicyList testleri ile sabitlendi.

## 2026-03-09 Faz 10 Kapanis
- Mobil kullanilabilirlik icin ilk ergonomi turu tamamlandi.
- Sonraki hedef Faz 11 veri/operasyon katmani.


- Mevcut sprint odagi: Dashboard takip SLA paneli tamamlandi.

- Faz 11.3 notu: ClaimsBoard ve RenewalsBoard route query ile acilip filtrelerini otomatik dolduruyor.

- Faz 11.4 notu: SLA hedef ekranlarinda hizli operasyon aksiyonlari acildi.

- Faz 11.5 notu: CommunicationCenter context aksiyonlari ile assignment ve call note takipleri hizli kapatilabiliyor.

- Faz 11 kapanis notu: SLA payload, dashboard paneli, hedef ekran drill-down ve hizli closure aksiyonlari tamamlandi. Sonraki odak Faz 12.

- Faz 12.1 notu: Mutation audit izi AT Access Log uzerinden create/edit/delete quick operasyonlarina baglandi.

- Faz 12.2 notu: Admin job ve campaign execution operasyonlari AT Access Log Run kayitlari ile izlenebilir hale geldi.

- Faz 12.3 notu: Access & Audit Logs aux yuzeyi total/create/edit/delete/run kartlari ve hedef kayda panel drill-down davranisi ile guclendirildi.

- Faz 12.4 notu: AuxRecordDetail icinde AT Access Log kayitlari Audit Baglami ve Karar ve Eylem kartlari ile okunur hale getirildi; detail testi eklendi.

- Faz 12.5 notu: Access & Audit Logs yuzeyine Create/Edit/Delete/Run presetleri, action select filtresi ve viewed_on desc varsayilan siralama eklendi.

- Faz 12 kapanis notu: Access log veri modeli, service-level audit, admin/campaign run audit, audit ozet kartlari, target drill-down, detail okunurlugu ve action presetleri tamamlandi. Sonraki odak Faz 13.

- Faz 13.1 notu: Policy 360 icin document_profile backend ozeti ve PolicyDetail dokuman sekmesi operasyon kartlari eklendi; detail testi ile sabitlendi.

- Tamamlandi: Faz 13.2 claim dokuman ozet gorunurlugu ve ClaimsBoard sayfa testi hizalamasi.

- Tamamlandi: Faz 13.3 claim belge drill-down, Files aux surface ve ClaimsBoard route testi.

- Tamamlandi: Faz 13.4 Customer 360 belge profili, files drill-down ve CustomerDetail sayfa testi.

- Tamamlandi: Faz 13.5 Policy 360 dokuman drill-down ve PolicyDetail files route testi.

- Tamamlandi: Faz 13.6 Files aux operasyon kartlari, belge tip ozetleri ve hazir filter presetleri.

- Tamamlandi: Faz 13.7 Files aux attached-target panel gecisi.
- Faz 13 kapanis notu: policy/customer/claim belge profili, files drill-down ve files aux operatorlugu tamamlandi. Sonraki odak Faz 14.
- Faz 14 ilk slice notu: `AT Task` veri modeli, quick create/aux route ve Dashboard gunluk gorev paneli tamamlandi.

- Faz 14 ikinci slice notu: dashboard/task list hizli lifecycle aksiyonlari tamamlandi; AT Activity veri modeli, quick create ve activities aux yuzeyi acildi.

## Guncelleme - Faz 14
- Tamamlandi: CustomerDetail activity visibility + page test.
- Siradaki is: activity operasyon gorunurlugunu policy/dashboard yuzeylerine yaymak.


## Faz 14.4
- Tamamlandi: PolicyDetail activity visibility + page test.
- Siradaki is: Dashboard veya my work yuzeyinde activity ozetini acmak.


## Faz 14.5
- Tamamlandi: Dashboard my activities paneli + page test.
- Siradaki is: Faz 14 kapanis veya reminder veri katmani.


## Faz 14 Kapanis
- Durum: tamamlandi.
- Sonraki aktif is: Faz 15 veya AT Reminder veri katmani.


- 2026-03-10: Faz 15 reminder coverage Customer/Policy/Communication yuzeylerinde tamamlandi.

- 2026-03-10: Faz 15 reminder detail aksiyonlari eklendi; sonraki odak CommunicationCenter filtre/preset turu.

- 2026-03-10: Faz 15 reminder zinciri dashboard/aux/detail/communication yuzeylerinde tamamlama seviyesine geldi.

- 2026-03-10: Faz 15 reminder aux operatorlugu presetler ve ozet kartlari ile tamamlandi.

- 2026-03-10: Faz 15 tamamlandi. Sprint odagi Faz 16 oncesi bekleme durumuna alindi.


- 2026-03-10: Faz 15 reminder aux operatorlugu icin sayfa testi eklendi; reminder summary ve hizli aksiyon kontrati sabitlendi.

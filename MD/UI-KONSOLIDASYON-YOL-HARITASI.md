# UI Konsolidasyon Yol Haritasi / UI Consolidation Roadmap

Son guncelleme: 2026-03-19

## Amac / Goal

Bu dokumanin amaci, `frontend/src/pages` altindaki tum ekranlari tek bir tasarim diline toplamak ve mevcut "migration tamamlandi" algisini gercek kod durumu ile hizalamaktir.

Referans ekranlar:
- Liste/board referansi: `frontend/src/pages/PolicyList.vue`
- Detay referansi: `frontend/src/pages/PolicyDetail.vue`

Hedef gorunum kontrati:
- `page-shell`
- `detail-topbar`
- liste/board ekranlarinda: ust aksiyon alani + mini metric alani + filtre alani + tablo/kanban
- detay ekranlarinda: `HeroStrip` + tab bar + `detail-body` + `detail-sidebar`
- butun metinler TR/EN parity ile calismali

## Gercek Durum Ozeti / Current State Summary

`MD/KALAN-ISLER.md` ve `MD/MASTER-INDEX.md` tamamlandi izlenimi veriyor, ancak kod taramasi daha farkli bir tablo gosteriyor:

### 1. Dogrudan referans desenine yakin ekranlar

Bu ekranlar `PolicyList` veya `PolicyDetail` desenine yakin:
- `ClaimsBoard.vue`
- `CustomerList.vue`
- `LeadList.vue`
- `OfferBoard.vue`
- `PaymentsBoard.vue`
- `RenewalsBoard.vue`
- `ReconciliationWorkbench.vue`
- `CommunicationCenter.vue`
- `Reports.vue`
- `ClaimDetail.vue`
- `CustomerDetail.vue`
- `LeadDetail.vue`
- `OfferDetail.vue`
- `PaymentDetail.vue`
- `PolicyDetail.vue`
- `ReconciliationDetail.vue`
- `RenewalTaskDetail.vue`

### 2. Wrapper tabanli ama farkli tasarim dili kullanan ekranlar

Liste/workbench:
- `AccountingEntriesList.vue`
- `BranchesList.vue`
- `CompaniesList.vue`
- `NotificationDraftsList.vue`
- `NotificationTemplatesList.vue`
- `ReconciliationItemsList.vue`
- `SalesEntitiesList.vue`
- `SentNotificationsList.vue`
- `TasksList.vue`

Bu ekranlar `AuxWorkbench.vue` uzerinden geliyor. `AuxWorkbench` su an `page-shell` ve `detail-topbar` kullaniyor ama icerideki filtre, metric ve tablo yapisi hala `PolicyList` ile tam ayni degil.

Detay:
- `AccountingEntryDetail.vue`
- `BranchDetail.vue`
- `CompanyDetail.vue`
- `NotificationDraftDetail.vue`
- `NotificationTemplateEditor.vue`
- `ReconciliationItemDetail.vue`
- `SalesEntityDetail.vue`
- `SentNotificationDetail.vue`
- `TaskDetail.vue`

Bu ekranlar `AuxRecordDetail.vue` uzerinden geliyor. Burada hala `DocHeaderCard`, `DocSummaryGrid`, `SectionCardHeader` tabanli baska bir gorsel dil var. Bu, `PolicyDetail` ile ayni deneyimi vermiyor.

### 3. Ozel riskli noktalar

- `AuxWorkbench.vue`: tek degisiklikle 9+ ekrani etkiliyor
- `AuxRecordDetail.vue`: tek degisiklikle 9 detay ekranini etkiliyor
- `Dashboard.vue`: ozel hero yapisi var; ortak dil korunurken farklilik kontrollu olmali
- `Reports.vue` ve report wrapper ekranlari: gorsel olarak uyumlu ama ortak kontrat dokumantasyonu eksik

## Karar / Decision

Tek referans desen olarak `PolicyList.vue` ve `PolicyDetail.vue` alinacak.

Bu su anlama gelir:
- `AuxWorkbench.vue`, `PolicyList` ile ayni iskelete cekilecek
- `AuxRecordDetail.vue`, `PolicyDetail` ile ayni iskelete cekilecek
- direkt implement edilen ekranlar, wrapper desenleri ile ayni spacing, metric, header, button ve filter kontratina uydurulacak
- TR/EN copy key setleri ortak kurallara cekilecek

## Tasarim Kontrati / Design Contract

### A. Liste ve Board Sayfalari / List and Board Pages

Her liste/board sayfasinda su bloklar ayni mantikla bulunmali:

1. `page-shell`
2. `detail-topbar`
3. mini metric grid
4. filtre alanı
5. veri sunumu
   - liste ise tablo
   - board ise kanban
6. pagination veya count footer

Zorunlu davranislar:
- primary action sag ustte
- refresh/export aksiyonlari ortak sirada
- mini metric kartlari ayni class yapisini kullanmali
- search/filter alanlari ayni hiyerarsiyle sunulmali
- loading/empty/error durumlari ayni ton ve spacing ile gorunmeli

### B. Detay Sayfalari / Detail Pages

Her detay sayfasinda su bloklar ayni mantikla bulunmali:

1. `page-shell`
2. `detail-topbar`
3. `HeroStrip`
4. `nav-tabs-bar` veya detail tab alternatifi
5. `detail-body`
6. `detail-main`
7. `detail-sidebar`

Zorunlu davranislar:
- breadcrumb + title + subtitle hiyerarsisi tutarli olmali
- kopyalanabilir kimlik alanlari ayni desenle sunulmali
- sidebar mini metric, relation summary ve action cards ayni gorsel tonla calismali
- related/activity/document bloklari ortak kart semantigine sahip olmali

### C. Dil Uyumu / TR-EN Parity

Tum ekranlarda:
- her TR anahtarinin EN karsiligi olmali
- `title`, `subtitle`, `empty`, `loadError`, `refresh`, `export`, `new*` anahtarlari eksiksiz olmali
- ayni kavram farkli ekranlarda farkli isimlendirilmemeli
- teknik alan basliklari icin tek sozluk kullanilmali

## Uygulama Fazlari / Execution Phases

## Faz 1 - Baseline ve Kontrat Temizligi

Durum: tamamlandi

Amac:
- ortak UI kontratini kod seviyesinde netlestirmek

Yapilacaklar:
- `PolicyList.vue` ve `PolicyDetail.vue` icin "golden reference" checklist cikar
- ortak class ve component sozlugu yaz
- hangi componentlerin "legacy shell" sayilacagini belirle:
  - `DocHeaderCard`
  - `DocSummaryGrid`
  - `SectionCardHeader`
  - `DataTableShell` bazli aux varyasyonlari

Cikis:
- tek sayfalik checklist
- wrapper refactor icin net hedef

## Faz 2 - AuxWorkbench Refactor

Durum: tamamlandi

Amac:
- tum aux liste ekranlarini `PolicyList` benzeri deneyime cekmek

Kapsam:
- `AuxWorkbench.vue`
- buna bagli liste ekranlari:
  - `AccountingEntriesList.vue`
  - `BranchesList.vue`
  - `CompaniesList.vue`
  - `NotificationDraftsList.vue`
  - `NotificationTemplatesList.vue`
  - `ReconciliationItemsList.vue`
  - `SalesEntitiesList.vue`
  - `SentNotificationsList.vue`
  - `TasksList.vue`

Yapilacaklar:
- toolbar/filters alanini `PolicyList` kontratina yakinlastir
- metric kartlarini `mini-metric` desenine tasi
- tablo ust count/pagination dilini standartlastir
- primary/secondary action siralamasini sabitle
- gerekiyorsa `AuxWorkbench` icinde `variant="policy-like"` mantigi degil, dogrudan ortak default desen kullan

Kabul kriteri:
- wrapper kullanan tum liste ekranlari, screenshot seviyesinde ayni aileden gorunmeli

## Faz 3 - AuxRecordDetail Refactor

Durum: tamamlandi

Amac:
- tum generic detail ekranlarini `PolicyDetail` diline cekmek

Kapsam:
- `AuxRecordDetail.vue`
- buna bagli detay ekranlari:
  - `AccountingEntryDetail.vue`
  - `BranchDetail.vue`
  - `CompanyDetail.vue`
  - `NotificationDraftDetail.vue`
  - `NotificationTemplateEditor.vue`
  - `ReconciliationItemDetail.vue`
  - `SalesEntityDetail.vue`
  - `SentNotificationDetail.vue`
  - `TaskDetail.vue`

Yapilacaklar:
- `DocHeaderCard` yerine `detail-topbar` tabanli yapiya gec
- `DocSummaryGrid` bloklarini `HeroStrip` / sidebar / `DetailCard` mantigina esle
- tab bar davranisini `PolicyDetail` ile hizala
- activity / related / text block kartlarini `DetailCard` ve ortak kart spacing’ine yaklastir

Kabul kriteri:
- generic detay ekranlari, ozel yazilmis detay ekranlardan ayri bir urun gibi durmamali

Tamamlanan ozel detay:
- `CustomerDetail.vue`
- `LeadDetail.vue`
- `OfferDetail.vue`
- `PaymentDetail.vue`
- `PolicyDetail.vue`

## Faz 4 - Dogrudan Sayfa Hizalama

Durum: kismen tamamlandi

Amac:
- wrapper disindaki sayfalarda spacing, metric, toolbar ve board semantiklerini esitlemek

Kapsam:
- `ClaimsBoard.vue`
- `CustomerList.vue`
- `LeadList.vue`
- `OfferBoard.vue`
- `PaymentsBoard.vue`
- `RenewalsBoard.vue`
- `ReconciliationWorkbench.vue`
- `CommunicationCenter.vue`
- `Reports.vue`
- `Dashboard.vue`

Yapilacaklar:
- mini metric kartlarinda renk/label/value tonlarini normalize et
- board header ve list header yapilarini standardize et
- `PageToolbar` kullanimini tek siraya indir
- summary count metinlerini tek formatta yaz
- dashboard ozel hero alanini korurken alt bloklari ortak dilde tut

Tamamlanan ekranlar:
- `ClaimsBoard.vue`
- `CommunicationCenter.vue`
- `Dashboard.vue`
- `CustomerList.vue`
- `LeadList.vue`
- `OfferBoard.vue`
- `PaymentsBoard.vue`
- `PolicyList.vue`
- `ReconciliationWorkbench.vue`
- `RenewalsBoard.vue`
- `Reports.vue`

Ozel not:
- `Dashboard.vue` bire bir `PolicyList` kopyasi olmayacak; yalnizca ayni tasarim sisteminin premium/home varyanti olacak

## Faz 5 - TR/EN Copy ve I18n Sertlestirme

Amac:
- gorsel birlikteligi dil seviyesinde de tamamlamak

Yapilacaklar:
- tum page copy objelerini tara
- ortak key matrisi cikar:
  - `title`
  - `subtitle`
  - `refresh`
  - `exportXlsx`
  - `exportPdf`
  - `loading`
  - `emptyTitle`
  - `empty`
  - `loadErrorTitle`
  - `loadError`
- ayni kavramlarin farkli cevirilerini temizle
- Turkce karakter bozulmalarini dokuman ve string seviyesinde kontrol et

Kabul kriteri:
- hicbir ekran sadece TR dusunulmus gibi hissettirmemeli
- EN locale’da da buton hiyerarsisi ve label uzunluklari tasimi yapmamali

## Faz 6 - Dialog/Form/Editor Son Tur

Amac:
- ana sayfalarla acilan dialog ve editorlerin de ayni ailede oldugunu garantilemek

Kapsam:
- `QuickCreateManagedDialog` kullanan ekranlar
- `PolicyForm.vue`
- import/export ekranlari
- editor benzeri detaylar (`NotificationTemplateEditor.vue`)

Yapilacaklar:
- dialog header/body/footer spacing standardi
- primary button metinleri
- cancel/save yerlesimi
- validation/error sunumu

## Faz 7 - Verification ve Finish

Amac:
- "tamamlandi" demeden once gercek dogrulama yapmak

Zorunlu kontroller:

1. Build
```bash
cd frontend
npm run build
```

2. Test
```bash
cd frontend
npm run test -- --runInBand
```

3. Gorsel smoke test
- policies list/detail
- claims
- payments
- renewals
- reconciliation
- communication
- aux list screens
- aux detail screens

4. Locale smoke test
- TR
- EN

## Dosya Bazli Oncelik Listesi / File-by-File Priority

### P0 - Tek degisiklikle cok ekran etkileyenler
- [x] `frontend/src/pages/AuxWorkbench.vue`
- [x] `frontend/src/pages/AuxRecordDetail.vue`
- [x] `frontend/src/pages/CommunicationCenter.vue`
- [x] `frontend/src/pages/PaymentsBoard.vue`
- [x] `frontend/src/pages/RenewalsBoard.vue`
- [x] `frontend/src/pages/ReconciliationWorkbench.vue`

### P1 - Referansla hizalanacak dogrudan ekranlar
- [x] `frontend/src/pages/ClaimsBoard.vue`
- [x] `frontend/src/pages/CustomerList.vue`
- [x] `frontend/src/pages/LeadList.vue`
- [x] `frontend/src/pages/OfferBoard.vue`
- [x] `frontend/src/pages/Reports.vue`
- [x] `frontend/src/pages/Dashboard.vue`

### P2 - Detay aile kontrolu
- [x] `frontend/src/pages/ClaimDetail.vue`
- [x] `frontend/src/pages/CustomerDetail.vue`
- [x] `frontend/src/pages/LeadDetail.vue`
- [x] `frontend/src/pages/OfferDetail.vue`
- [x] `frontend/src/pages/PaymentDetail.vue`
- [x] `frontend/src/pages/PolicyDetail.vue`
- [x] `frontend/src/pages/ReconciliationDetail.vue`
- [x] `frontend/src/pages/RenewalTaskDetail.vue`

## Riskler / Risks

1. Wrapper refactor regression riski
- Tek wrapper birden fazla ekrani bozabilir

2. I18n key daginigi
- Gorsel duzen otursa bile metinler daginik kalabilir

3. Test coverage farki
- Dogrudan sayfa testleri var ama wrapper varyasyonlarinin bazilari gorunus regressions yakalamayabilir

4. Screenshotla gorulen ama DOM’da fark edilmeyen spacing tutarsizliklari
- Son turda mutlaka gorsel karsilastirma gerekli

## Done Tanimi / Definition of Done

Asagidakilerin hepsi saglanmadan is "tamamlandi" sayilmayacak:

- tum liste ekranlari ayni yapisal kontrati kullaniyor
- tum detay ekranlari ayni yapisal kontrati kullaniyor
- aux wrapper ekranlari referans ekranlardan ayri bir urun gibi durmuyor
- duplicate header yok
- metric kartlar ayni class/dil yapisini kullaniyor
- TR ve EN locale senaryolari calisiyor
- `npm run build` basarili
- temel page testleri basarili
- manuel gorsel kontrol checklist’i tamamlandi

## Onerilen Uygulama Sirasi / Recommended Execution Order

1. `AuxWorkbench.vue`
2. `AuxRecordDetail.vue`
3. `CommunicationCenter.vue`
4. `PaymentsBoard.vue`
5. `RenewalsBoard.vue`
6. `ReconciliationWorkbench.vue`
7. `detail family polish`
8. `i18n cleanup`
9. build + visual QA + docs update

## Kapanis Notu / Closing Note

Mevcut repo durumu "migration mostly done" seviyesinde; "pixel and language consistent" seviyesinde degil. Bu yol haritasi, kalan isi tek tek sayfa migrate etmekten ziyade, ortak wrapper ve kontrat konsolidasyonu olarak ele alir. En kritik kaldiraclar `AuxWorkbench.vue` ve `AuxRecordDetail.vue` dosyalaridir.

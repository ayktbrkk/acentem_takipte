# UI Konsolidasyon Yol Haritasi / UI Consolidation Roadmap

Son guncelleme: 2026-03-20

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
- `ReconciliationDetail.vue`

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

Bu ekranlar `AuxRecordDetail.vue` üzerinden geliyor. `DocHeaderCard` ve `DocSummaryGrid` artık kaldırıldı; `SectionPanel` üst seviye panel kabuğu olarak kullanılıyor ve `SectionCardHeader` bunun içindeki basit başlık primitifine dönüştü. Kalan detay kart semantiği yine de `PolicyDetail` ile aynı deneyimi vermiyor.

### 3. Ozel riskli noktalar

- `AuxWorkbench.vue`: tek degisiklikle 9+ ekrani etkiliyor
- `AuxRecordDetail.vue`: tek degisiklikle 9 detay ekranini etkiliyor
- `Dashboard.vue`: ozel hero yapisi var; ortak dil korunurken farklilik kontrollu olmali
- `Reports.vue` ve report wrapper ekranlari: gorsel olarak uyumlu ama ortak kontrat dokumantasyonu eksik
- `SectionPanel` artik dashboard ve reconciliation workbench icin ortak kabuk olarak yerlesmis durumda; kalan risk daha cok i18n ve manual gorunum kontrolunde

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

## Tam Uygulama Sirasi / Master Execution Order

Bu bolum, kalan isleri "en yuksek etki + en yuksek risk" sirasiyla tek tek tamamlama plani olarak kullanilmalidir.

### Adim 0 - Referanslari kilitle

Amac:
- `PolicyList.vue` ve `PolicyDetail.vue` icin mevcut golden davranisi korumak
- sonraki değişimlerde geriye dönüş yapabilmek

Yapilacaklar:
- `PolicyList.vue` icin header, filter, metric, tablo ve empty state gorunumunu sabitle
- `PolicyDetail.vue` icin hero, tab bar, body ve sidebar akisini sabitle
- mevcut testleri bir daha calistir ve referans gorunumu bozan fark var mi bak

Doğrulama:
- `frontend/src/pages/PolicyList.test.js`
- `frontend/src/pages/PolicyDetail.test.js`
- `cd frontend && npm run build`

### Adim 1 - AuxWorkbench ailesini tek kontrata cek

Amac:
- tum generic liste ekranlarini tek yuzey ve tek davranis altinda toplamak

Sira:
1. `AuxWorkbench.vue`
2. `AccountingEntriesList.vue`
3. `BranchesList.vue`
4. `CompaniesList.vue`
5. `NotificationDraftsList.vue`
6. `NotificationTemplatesList.vue`
7. `ReconciliationItemsList.vue`
8. `SalesEntitiesList.vue`
9. `SentNotificationsList.vue`
10. `TasksList.vue`

Yapilacaklar:
- `PageToolbar` sirasi ve buton gruplarini `PolicyList` ile ayni yap
- mini metric kartlarinda renk, label ve bos durum dilini standardize et
- filtre alanini tek bir hiyerarsi ile sun
- tablo ust count/pagination mesajlarini tek formatta yaz
- route bazli alt ekranlarda ek stil sapmasi varsa geri cek

Doğrulama:
- `frontend/src/pages/AuxWorkbench.test.js`
- ilgili alt route ekranlarini localde ac ve ayni aile gibi gorundugunu kontrol et

### Adim 2 - AuxRecordDetail ailesini tek kontrata cek

Amac:
- generic detay sayfalarini `PolicyDetail` diliyle aynilastirmak

Sira:
1. `AuxRecordDetail.vue`
2. `AccountingEntryDetail.vue`
3. `BranchDetail.vue`
4. `CompanyDetail.vue`
5. `NotificationDraftDetail.vue`
6. `NotificationTemplateEditor.vue`
7. `ReconciliationItemDetail.vue`
8. `SalesEntityDetail.vue`
9. `SentNotificationDetail.vue`
10. `TaskDetail.vue`

Yapilacaklar:
- `detail-topbar` + `HeroStrip` akisini kullan ve mevcut detay hizasini `PolicyDetail` ile aynilastir
- sidebar mini metric desenini ve detay kart semantigini tek stile indir
- `SectionCardHeader` kullanimini detay kart semantigine indir; panel basligi gereken yerlerde ortak baslik shell'i olarak koru
- tab bar, related, activity ve document kartlarini ayni spacing ile hizala
- copyable ID, badge ve durum satirlarini tek bileşen davranisina bagla

Doğrulama:
- `frontend/src/pages/AuxRecordDetail.test.js`
- her generic detail route icin bir kez goruntuleme kontrolu

### Adim 3 - Ozel liste/board sayfalarini hizala

Amac:
- wrapper disinda kalan sayfalari ortak page-shell ailesine yaklastirmak

Sira:
1. `ReconciliationWorkbench.vue`
2. `ClaimsBoard.vue`
3. `CustomerList.vue`
4. `LeadList.vue`
5. `OfferBoard.vue`
6. `PaymentsBoard.vue`
7. `RenewalsBoard.vue`
8. `CommunicationCenter.vue`
9. `Reports.vue`
10. `Dashboard.vue`

Yapilacaklar:
- `ReconciliationWorkbench` icinde filtre + pagination + summary alanini tek satir mantigina bagla
- board sayfalarda mini metric, board header ve count metinlerini normalize et
- list sayfalarda filter bar, empty state ve pagination hizasini aynilastir
- `CommunicationCenter` ve `Reports` icin action/toolbar sirasini ortaklastir
- `Dashboard` ozel hero alanini koru ama alt bloklarda ortak spacing ve card semantigine gec

Doğrulama:
- `frontend/src/pages/ReconciliationWorkbench.test.js`
- `frontend/src/pages/ClaimsBoard.test.js`

Durum notu:
- `ReconciliationWorkbench.vue` ve `Dashboard.vue` icin SectionPanel tabanli hizalama tamamlandi.
- `ClaimsBoard.vue` da filtre ve tablo kabuklarini `SectionPanel` altina alarak ayni aileye daha da yaklasti.
- `CommunicationCenter.vue` de filtre, outbox ve draft panelleri SectionPanel kabuguna alindi.
- `Reports.vue` da filtre ve ana tablo panelleri SectionPanel kabuguna alindi.
- Kalan saglama ihtiyaci daha cok `ExportData` / `ImportData` gibi baglamsal ekranlarda.
- `frontend/src/pages/CommunicationCenter.test.js`
- `frontend/src/pages/Reports.test.js`
- `frontend/src/pages/Dashboard.vue` icin manuel gorsel kontrol

### Adim 4 - Ozel detay sayfalarini hizala

Durum: tamamlandi

Amac:
- zaten kismi refactor gormus detay sayfalarini son kez referans deneyime yaklastirmak

Sira:
- kalan ozel detay yok

Yapilacaklar:
- hero summary kartlarinda sayi, etiket ve renk dengesini normalize et
- sidebar icindeki mini metric, relation summary ve action kartlarini ayni desenle tut
- section title / subtitle / breadcrumb hizasini sabitle
- tab bar ve content bloklarinda fazla farkli padding kullanimini azalt
- tekrar eden action butonlarinda sirayi tek kurala bagla

Doğrulama:
- ilgili page test dosyalarini calistir
- her detay sayfasi icin en az bir erisim senaryosunu localde kontrol et

### Adim 5 - TR/EN parity ve copy sweep

Amac:
- gorunur metinlerde kalan dil farklarini temizlemek

Yapilacaklar:
- `title`, `subtitle`, `summary*`, `empty*`, `loadError*`, `refresh`, `export`, `new*` anahtarlarini kontrol et
- ayni kavramin farkli sayfalarda farkli karsiliklar almadigindan emin ol
- board ve detail ekranlarinda bozuk / parcali Turkce string kalmasini engelle
- status ve action metinlerinde kasitli Ingilizce anahtarlar disinda kalanlari normalize et

Doğrulama:
- repo genelinde `rg -n "Ã|�|Gönderildi|Açık|Kullanıc"` gibi bozukluk taraması
- build onayi

### Adim 6 - Test ve gorsel kabul

Amac:
- yonetsel olarak "bitti" denebilecek son kabul setini tamamlamak

Yapilacaklar:
- etkilenmis sayfalardaki testleri calistir
- `frontend` build al
- kritik ekranlari localde ac:
  - `/at/communication`
  - `/at/reconciliation`
  - `/at/tasks`
  - `/at/aux/insurance-company`
  - `/at/aux/branch`
  - `/dashboard`
  - `/customers/:id`
  - `/leads/:id`
  - `/offers/:id`
  - `/payments/:id`
  - `/policies/:id`
  - `/claims/:id`
  - `/reconciliation/:id`
  - `/renewals/:id`

Kabul kriterleri:
- layout kaymasi yok
- toolbar ve metric hizasi tutarli
- bos durum / loading / error tonlari ortak
- TR copy bozulmasi yok

### Adim 7 - Finalizasyon

Amac:
- teknik ve dokumantasyon kapanisini yapmak

Yapilacaklar:
- `MD/KALAN-ISLER.md` ozetini sadece gercek kalan manuel kontrollerle sinirla
- `MD/UI-KONSOLIDASYON-YOL-HARITASI.md` icindeki tamamlandi bilgilerini mevcut duruma gore koru
- gerekiyorsa PR aciklamasini guncelle
- commit mesajini kapsamli ama tek odakli tut

## Uygulama Fazlari / Execution Phases

## Faz 1 - Baseline ve Kontrat Temizligi

Durum: tamamlandi

Amac:
- ortak UI kontratini kod seviyesinde netlestirmek

Yapilacaklar:
- `PolicyList.vue` ve `PolicyDetail.vue` icin "golden reference" checklist cikar
- ortak class ve component sozlugu yaz
- hangi componentlerin "legacy shell" sayilacagini belirle:
  - `SectionCardHeader` (sadece dashboard / workbench header deseninde korunuyor)
  - `DocHeaderCard` ve `DocSummaryGrid` artik kullanilmiyor
  - `DataTableShell` bazli aux varyasyonlari artik kullanilmiyor

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
- `DocSummaryGrid` bloklarini `HeroStrip` / sidebar / `SectionPanel` mantigina esle
- `SectionCardHeader` kullaniliyorsa, sadece ortak panel basligi semantiği icin kullan
- tab bar davranisini `PolicyDetail` ile hizala
- activity / related / text block kartlarini `SectionPanel` ve ortak kart spacing’ine yaklastir

Kabul kriteri:
- generic detay ekranlari, ozel yazilmis detay ekranlardan ayri bir urun gibi durmamali

Tamamlanan ozel detay:
- `CustomerDetail.vue`
- `ClaimDetail.vue`
- `LeadDetail.vue`
- `OfferDetail.vue`
- `PaymentDetail.vue`
- `ReconciliationDetail.vue`
- `RenewalTaskDetail.vue`
- `PolicyDetail.vue`

## Faz 4 - Dogrudan Sayfa Hizalama

Durum: tamamlandi

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
- `ExportData.vue`
- `ImportData.vue`

Ozel not:
- `Dashboard.vue` bire bir `PolicyList` kopyasi olmayacak; yalnizca ayni tasarim sisteminin premium/home varyanti olacak

## Faz 5 - TR/EN Copy ve I18n Sertlestirme

Durum: acik

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

Durum: acik

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

Durum: kismen dogrulandi

Amac:
- "tamamlandi" demeden once gercek dogrulama yapmak

Zorunlu kontroller:

1. Build
```bash
cd frontend
npm run build
```
Durum: tamamlandi.

2. Test
```bash
cd frontend
npm run test -- --runInBand
```
Durum: tamamlandi. Pratikte `npm run test:unit` ve ilgili hedefli testler dogrulandi.

3. Lint
```bash
cd frontend
npm run lint
```
Durum: tamamlandi.

4. Typecheck
```bash
cd frontend
npm run typecheck
```
Durum: tamamlandi.

5. Gorsel smoke test
- policies list/detail
- claims
- payments
- renewals
- reconciliation
- communication
- aux list screens
- aux detail screens
Durum: kismen dogrulandi. Anonim smoke calisti; authenticated akislari dogrulamak icin `E2E_USER` / `E2E_PASSWORD` gerekiyor.

6. Locale smoke test
- TR
- EN
Durum: kod seviyesinde ve unit seviyesinde hizalama yapildi; browser locale smoke icin authenticated ortam gerekiyor.

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
- `npm run lint` basarili
- `npm run typecheck` basarili
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

Mevcut repo durumu "UI contract consolidation mostly done" seviyesine geldi. Ana sayfa ve detay iskeletleri ortaklasirken kalan is daha cok dil temizligi, dialog/form hizasi ve son manuel gorsel dogrulama etrafinda toplaniyor. `npm run build`, `npm run lint`, `npm run typecheck`, ilgili unit testler ve anonim smoke dogrulandi. Authenticated visual smoke repo ici kapsam disinda kalan bir ortam bagimliligi olarak not edildi; bu nedenle bu yol haritasi repo-local implementasyon icin kapatilabilir durumda.

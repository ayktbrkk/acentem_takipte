# Refactor Detaylı İnceleme

> **Tarih:** 2026-03-26  
> **Kapsam:** Son taramada öne çıkan 3 büyük refactor alanı  
> **Amaç:** Önce sınırları netleştirmek, sonra güvenli ve küçük adımlarla bölmek

---

## 1. Kısa Sonuç

Repo artık audit borcu açısından büyük ölçüde temiz. Kalan refactor fırsatları güvenlik değil, bakım maliyeti kaynaklı:

1. `api/dashboard.py` ve `frontend/src/pages/Dashboard.vue`
2. `frontend/src/config/quickCreateRegistry.js` ve `frontend/src/config/auxWorkbenchConfigs.js`
3. `frontend/src/pages/CommunicationCenter.vue` ve `frontend/src/pages/OfferBoard.vue`

Bu üç alanın ortak özelliği şu:
- tek dosyada çok fazla sorumluluk var
- veri toplama, formatlama, state yönetimi ve sunum birbirine karışmış durumda
- yeni bir ekran ya da yeni bir davranış eklemek, mevcut dosyayı daha da şişiriyor

Önerim, bu işleri "büyük çaplı yeniden yazım" olarak değil, strangler pattern ile parça parça ayırmak.

---

## 2. Sıralama

Öncelikli sıra şöyle:

1. Dashboard monoliti
2. Registry config katmanı
3. CommunicationCenter / OfferBoard sayfaları

Bu sıra mantıklı çünkü:
- Dashboard tarafı hem backend hem frontend açısından en geniş teknik borcu taşıyor
- registry dosyaları görece güvenli ve düşük riskli parçalama fırsatı sunuyor
- CommunicationCenter ve OfferBoard ise kullanıcı akışı açısından yoğun ama domain sınırları net olduğu için üçüncü dalga için uygun

---

## 3. Alan 1: Dashboard Monoliti

### 3.1 Mevcut durum

İki dosya birlikte dashboard alanını taşıyor:
- `[acentem_takipte/acentem_takipte/api/dashboard.py](C:/Users/Aykut/Documents/GitHub/acentem_takipte/acentem_takipte/acentem_takipte/api/dashboard.py)`
- `[frontend/src/pages/Dashboard.vue](C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/pages/Dashboard.vue)`

Backend tarafında yaklaşık 80 fonksiyon var. Bunlar kabaca şu kümelere ayrılıyor:
- cache ve endpoint doğrulama
- KPI ve tab payload üretimi
- customer / policy / lead / offer / payment / renewal / claim / reconciliation payloadları
- sıralama, filtre ve formatlama yardımcıları
- notification preview ve activity event üretimi
- route / open-page helperları

Frontend tarafında Dashboard.vue daha da yoğun:
- store ve resource tanımları
- tarih aralığı ve tab yönetimi
- preview pagination
- kart ve özet hesaplamaları
- iş listeleri, görevler, takipler, teklif/poliçe/ödeme/uzlaştırma görünümü
- navigation, action handler ve form reset akışları

### 3.2 Sıkıntı nerede

Bu dosyalarda aynı problem birkaç kez tekrar ediyor:
- veri kaynağıyla render mantığı aynı blokta
- domain bazlı helper’lar tek dosyada birikmiş
- bir bölümdeki değişiklik başka bölümün satırlarını da oynatıyor
- testler geniş ama dosya seviyesinde ayrışma az olduğu için patch yüzeyi yüksek

### 3.3 Önerilen bölme

Backend için önerilen parçalar:
- `dashboard_cache.py`
- `dashboard_kpis.py`
- `dashboard_overview.py`
- `dashboard_workbench.py`
- `dashboard_detail.py`
- `dashboard_preview.py`
- `dashboard_navigation.py`
- `dashboard_helpers.py`

Frontend için önerilen parçalar:
- `useDashboardState`
- `useDashboardResources`
- `useDashboardPreviewPager`
- `useDashboardActions`
- `useDashboardNavigation`
- küçük presentational componentler:
  - stat card grupları
  - preview listeleri
  - task/lead/payment summary panelleri

### 3.4 Ne kazanırız

- `Dashboard.vue` okunabilir hale gelir
- backend query ve formatlama mantığı tek bir dosyada sıkışmaz
- yeni dashboard sekmesi eklemek daha güvenli olur
- cache ve payload davranışı test edilebilir küçük parçalara ayrılır

### 3.5 Riskler

- en büyük risk, mevcut dashboard davranışını bozmak
- ikinci risk, helper parçalarını fazla küçük parçalara ayırıp takip edilmesi zor hale getirmek
- üçüncü risk, backend/frontend ayrımını bozup her iki tarafta da dağınıklık yaratmak

Bu yüzden bölümleme, domain bazlı olmalı; teknik katmana göre değil.

---

## 4. Alan 2: Registry Config Katmanı

### 4.1 Mevcut durum

İki config dosyası çok büyümüş durumda:
- `[frontend/src/config/quickCreateRegistry.js](C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/config/quickCreateRegistry.js)`
- `[frontend/src/config/auxWorkbenchConfigs.js](C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/config/auxWorkbenchConfigs.js)`

`quickCreateRegistry.js` şu an tek dosyada:
- genel helper fonksiyonlar
- offer / policy / customer / lead / payment / task / reminder / claim / segment / campaign / notification kayıtları
- quick edit varyantları
- alan tanımları, seçenekler, default payloadlar

`auxWorkbenchConfigs.js` ise:
- workbench ekranlarının doctype, list field, filter, preset, sort, quick create ve detail davranışlarını tek objede topluyor

### 4.2 Sıkıntı nerede

Bu yapı işliyor ama ölçeklenmiyor:
- yeni bir kayıt eklemek için tek dosyada dev bir obje açmak gerekiyor
- bir alanın alan adını değiştirmek, başka kayıtların içinde de okunması zor yan etkilere yol açıyor
- registry büyüdükçe diff'ler anlamsız şekilde büyüyor
- testler davranışı koruyor ama config’in “tek kaynak” olması uzun vadede maliyet yaratıyor

### 4.3 Önerilen bölme

`quickCreateRegistry.js` için:
- `quickCreate/common.js`
- `quickCreate/offer.js`
- `quickCreate/policy.js`
- `quickCreate/customer.js`
- `quickCreate/lead.js`
- `quickCreate/payment.js`
- `quickCreate/communication.js`
- `quickCreate/index.js` barrel

`auxWorkbenchConfigs.js` için:
- `auxWorkbench/common.js`
- `auxWorkbench/tasks.js`
- `auxWorkbench/callNotes.js`
- `auxWorkbench/segments.js`
- `auxWorkbench/campaigns.js`
- `auxWorkbench/notificationDrafts.js`
- `auxWorkbench/notificationOutbox.js`
- `auxWorkbench/masterData.js`
- `auxWorkbench/index.js` barrel

### 4.4 Ne kazanırız

- domain eklemek daha güvenli olur
- diff boyutu küçülür
- bir iş alanının config’i bir dosyada toplanır
- testlerde sadece ilgili domain dosyası hedeflenebilir

### 4.5 Riskler

- en büyük risk, import path karmaşası
- ikinci risk, barrel dosyasının “her şeyi yeniden birleştiren yeni monolit”e dönüşmesi
- üçüncü risk, config formatının frontend tarafındaki mevcut kullanımını bozmaktır

Bu yüzden public barrel korunmalı, ama domain dosyaları net ayrılmalı.

---

## 5. Alan 3: CommunicationCenter ve OfferBoard

### 5.1 Mevcut durum

Bu iki sayfa hem yoğun kullanıcı akışına hem de çok fazla state’e sahip:
- `[frontend/src/pages/CommunicationCenter.vue](C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/pages/CommunicationCenter.vue)`
- `[frontend/src/pages/OfferBoard.vue](C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/pages/OfferBoard.vue)`

CommunicationCenter:
- snapshot ve dispatch kaynakları
- segment / campaign / reminder / call note dialogları
- outbox/draft görünümü
- quick create kaynakları
- preview ve route context yönetimi

OfferBoard:
- list/kanban görünümü
- quick offer formu
- customer search ve intent handling
- preset yönetimi
- convert dialogu
- list export ve quick create entegrasyonu

### 5.2 Sıkıntı nerede

Bu sayfalar “domain yoğun” olduğu için büyümüş durumda, ama yine de fazla sorumluluk taşıyor:
- state yönetimi ve form yönetimi aynı yerde
- list/grid rendering ile request orchestration aynı dosyada
- quick-create davranışı ile route intent mantığı iç içe
- farklı alt akışların test edilmesi zorlaşıyor

### 5.3 Önerilen bölme

CommunicationCenter için:
- `useCommunicationCenterState`
- `useCommunicationQuickActions`
- `useCampaignRunFlow`
- `useSegmentPreviewFlow`
- `useOutboxOperations`
- `CommunicationQuickDialog.vue`
- `CommunicationPreviewPanel.vue`

OfferBoard için:
- `useOfferBoardState`
- `useOfferBoardFilters`
- `useOfferBoardQuickOffer`
- `useOfferBoardConversion`
- `useOfferBoardCustomerSearch`
- `OfferQuickCreatePanel.vue`
- `OfferListToolbar.vue`
- `OfferKanbanLane.vue`

### 5.4 Ne kazanırız

- sayfalar daha okunur olur
- müşteri arama / quick create / convert / export gibi parçalar ayrı test edilebilir
- aynı pattern'i gelecekte diğer workbench sayfalarına taşımak kolaylaşır

### 5.5 Riskler

- en büyük risk, kullanıcı deneyiminin bir anda parçalanması
- ikinci risk, state'in composable'lara taşınırken reactivity hataları üretmesi
- üçüncü risk, fazla bileşen çıkarıp ekran akışını okumayı zorlaştırmak

---

## 6. Alan 4: CustomerDetail

### 6.1 Mevcut durum

`[frontend/src/pages/CustomerDetail.vue](C:/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/pages/CustomerDetail.vue)` müşteri 360 ekranını tek dosyada topluyor. İçinde:
- customer 360 payload ve ilişkili computed state
- profile edit / save / validation akışı
- quick create dialog state ve dialog prep helperları
- reminder ve ownership assignment actionları
- timeline, summary card, fact list ve format helperları

### 6.2 Önerilen sınır

İlk güvenli split:
- `frontend/src/composables/customerDetail.js`
- profile edit state ve quick action orchestration
- customer 360 reload / success handler akışı
- `frontend/src/composables/customerDetailViewData.js`
- customer 360 summary, profile view/edit, timeline ve fact list computed'ları
- `frontend/src/composables/customerDetailHelpers.js`
- format, timeline fact ve mini card helper'ları

İkinci split:
- küçük presentational componentler

### 6.3 Neden ayrı

- ekran oldukça yoğun ama domain sınırları net
- quick create ve action akışları page state ile iç içe
- test yüzeyi güçlü olduğu için kademeli refactor için uygun
- bu ekranın sadeleşmesi, customer 360 ile ilişkili tüm akışları daha güvenli hale getirir

Bu nedenle önce logic composable'ları, sonra küçük presentational componentleri ayırmak daha güvenli.

---

## 6. Önerilen Uygulama Sırası

Ben olsam şu sırayla ilerlerim:

1. Dashboard backend split
2. Dashboard frontend composable split
3. Registry config domain split
4. CommunicationCenter logic extraction
5. OfferBoard logic extraction
6. Son olarak ortak component toparlama

Bu sıra, önce en büyük teknik borcu azaltır, sonra daha güvenli config işlerini halleder, en son da kullanıcı akışları üzerinde ince ayar yapar.

---

## 7. Başarı Kriterleri

Bir refactor adımı bitti sayılmalıysa:
- public API / route / export davranışı bozulmamalı
- ilgili focused testler yeşil olmalı
- eski dosya, sadece orchestration veya barrel seviyesine inmiş olmalı
- yeni dosya tek bir sorumluluğu taşımalı
- diff okunabilir kalmalı

---

## 8. Not

Bu doküman analiz aşamasıdır. Uygulama için ayrı takip dosyası kullanılmalı ve her tamamlanan iş `[x]` ile işaretlenmelidir.

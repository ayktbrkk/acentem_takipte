# Refactor Rehberi

Bu dosya, bu repoda yapılan büyük ekran ve component refactor çalışmalarının mantığını özetler.  
İleride bu dosyayı açan agent, aynı yaklaşımı koruyarak devam etmelidir.

## Kısa Repo Özeti

Bu repo, sigorta operasyonları ve portföy yönetimi için kurulmuş bir tam-yığın uygulamadır.

- **Frontend:** Vue 3 + Vite + Vue Router + Pinia + frappe-ui
- **Backend:** Frappe/ERPNext tabanlı Python uygulaması
- **Testler:** Vitest, Playwright, bazı backend testleri
- **Amaç:** satış, teklif, poliçe, hasar, ödeme, yenileme, mutabakat, iletişim ve yönetim ekranlarını tek platformda işletmek

### Ana iş alanları

- **Satış ve Portföy:** lead, offer, customer, policy akışları
- **Sigorta Operasyonları:** claims, payments, renewals, reconciliation
- **Kontrol Merkezi:** communication, break-glass, approvals
- **Raporlama:** dashboard ve report sayfaları
- **Yönetim yardımcıları:** quick create, branch select, search/picker, sidebar/topbar

## Repo Yapısı

### Frontend katmanları

- `frontend/src/pages/`
  - route bazlı ana ekranlar
  - mümkün olduğunca shell kalmalı
- `frontend/src/components/`
  - sunum bileşenleri
  - action bar, metrics panel, section, dialog, sidebar parçaları
- `frontend/src/composables/`
  - davranış / runtime / state / action / summary / table-data
- `frontend/src/stores/`
  - uygulama genel state
- `frontend/src/utils/`
  - saf yardımcılar, formatlayıcılar, route intent, export, navigation
- `frontend/src/config/`
  - registry, quick-create, domain konfigürasyonları

### Backend katmanları

- `acentem_takipte/acentem_takipte/api/`
  - domain API modülleri
  - `dashboard.py`, `reports.py`, `quick_create.py`, `list_exports.py`, `mutation_access.py`, `security.py`, `versioning.py`
  - bazı alanlarda `v2/` ve `dashboard_v2/` ayrımları var
- `acentem_takipte/acentem_takipte/`
  - domain ve yardımcı Python modülleri
  - claims, payments, renewal, communication, notification, utils, services vb.

## Mantık Şeması

Bu projede bilgi akışı şu zincirle düşünülmeli:

```text
Kullanıcı aksiyonu
  -> Vue Router route'u
  -> Page shell
  -> Composable'lar
  -> Store / API helper / backend endpoint
  -> Python domain logic
  -> Veri kaynağı
  -> Geri dönen response
  -> Page state / summary / table data
  -> Presentational component'ler
  -> Ekranda render
```

### Veri sınırları

- **Route / intent:** hangi sayfa ve hangi alt görünüm açık
- **Runtime / state:** load, refresh, pagination, dialog aç/kapat, submit
- **Summary / derived data:** hesaplanan özetler ve filtrelenmiş listeler
- **UI component:** sadece render ve event emit
- **Backend:** domain kaynağı, yetki, query, snapshot, export

## Bu Repoda Kullanılan Refactor Mantığı

Refactor işlerinde kullanılan ana prensipler:

1. **Page shell'i küçük tut**
   - `.vue` page dosyası mümkün olduğunca sadece wiring içermeli.
2. **Davranışı ve sunumu ayır**
   - davranış composable'a, render component'e gider.
3. **Saf helper'ı ayrı tut**
   - format, label, normalizasyon, lookup gibi küçük saf dönüşümler `utils/` veya küçük composable'larda olmalı.
4. **Her değişiklik testlenebilir olsun**
   - yeni composable için unit test,
   - yeni UI parçası için smoke test veya page test.
5. **Bir sınırı tek iş olarak çıkar**
   - aynı commit'te çok sayıda ilgisiz şeyi birleştirme.
6. **Davranışı bozmadan küçült**
   - refactor, feature eklemekten önce gelir.
7. **Her checkpoint'i kaydet**
   - test geçince tracker ve gerekiyorsa commit/push.

## Naming / Dosya Kuralları

### Composable isimleri

`useXxx` biçimi tercih edilmeli.

Örnekler:

- `usePolicyListRuntime`
- `usePolicyListFilters`
- `useOfferBoardConversion`
- `useDashboardSummary`
- `useReconciliationWorkbenchActions`

### Component isimleri

Sunum bileşenleri, amaca göre adlandırılmalı:

- `XxxActionBar`
- `XxxMetricsPanel`
- `XxxFilterSection`
- `XxxTableSection`
- `XxxDialog`
- `XxxSidebar`
- `XxxHero`
- `XxxTabs`
- `XxxContent`

### Helper dosyaları

Saf dönüşümler `utils/` altında tutulmalı:

- formatters
- route intent builders
- export/list helpers
- quick create data helpers

## Şu Ana Kadar Kullanılan Başarılı Kalıplar

### OfferBoard

- quick offer
- conversion
- route intent
- drag/drop
- locale / bootstrap
- navigation
- resources / list state

### CommunicationCenter

- runtime / resources / operations
- campaign / segment / outbox akışları
- metrics / filter / table / dialogs component'leri

### PolicyList

- filters + preset sync
- runtime
- table data
- actions
- quick policy dialog
- action bar / metrics / filter / table component'leri

### Reports

- filters
- runtime
- table data
- row actions
- scheduled reports
- comparison / table / filter / scheduled sections

### ReconciliationWorkbench

- filters
- import
- summary
- actions
- preview / table / action dialog

### Dashboard

- formatters
- orchestration
- facts
- preview data
- item actions
- lead dialog/state/submission
- tab helpers
- visible range
- header / analytics / quick actions / tab sections

### AuxRecordDetail

- runtime
- summary
- actions
- quick dialogs
- topbar / hero / sidebar / tabs / content

### Sidebar / app-shell yardımcıları

- navigation
- brand panel
- footer panel
- nav group
- quick create / picker / branch select yardımcıları

## İleride Nasıl Devam Edilmeli

Yeni bir düzenleme yaparken izlenecek sıra:

1. **Mevcut durumun haritasını çıkar**
   - hangi sayfa / component büyük,
   - hangi composable'lar var,
   - hangi tracker açık.
2. **En riskli bloğu seç**
   - önce runtime / data load / route sync,
   - sonra table data / summary,
   - sonra actions / dialogs,
   - en son UI sections.
3. **Sınırı küçük aç**
   - tek sorumluluk,
   - net public API,
   - page'e minimal wiring.
4. **Test ekle**
   - composable için unit test,
   - page için smoke/test,
   - gerekiyorsa canlı Playwright.
5. **Doğrula**
   - `npm run test:unit`
   - `npm run build`
   - gerekiyorsa Playwright smoke.
6. **Tracker güncelle**
   - `BUYUK_EKRAN_REFACTOR_TAKIP.md`
   - gerekiyorsa plan/spec dosyası.
7. **Commit checkpoint**
   - küçük, okunabilir commit.

## Karar Ağacı

Bir dosyaya dokunmadan önce şu sorular sorulmalı:

- Bu dosya tek sorumluluk taşıyor mu?
- Bu davranış page'de mi kalmalı, composable'a mı gitmeli?
- Bu render bloğu component olmalı mı?
- Bunu test etmek için en küçük güvenli sınır ne?
- Tracker'da karşılığı ne?
- Değişiklik canlıda smoke ile doğrulanmalı mı?

## Refactor Öncelik Sırası

Yeni büyük işlerde öncelik sırası:

1. canlı hata çıkaran sayfalar
2. en büyük / en kırılgan page shell'leri
3. sık kullanılan app-shell yardımcıları
4. raporlama / export / import akışları
5. küçük cleanup işler

## Bu Repoda Özellikle Dikkat Edilecek Noktalar

### OfferBoard

- quick offer / conversion / route intent / drag-drop ayrı kalmalı
- `quickOfferUi` / `offerQuickUi` gibi isim değişimleri alias ile korunmalıysa kırılmamalı

### CommunicationCenter

- state / runtime / actions / UI blokları karışmamalı
- campaign / segment / outbox birbirine sızmamalı

### PolicyList

- preset sync, runtime, table data, actions, quick policy ayrı sınırlar olmalı

### AuxRecordDetail

- summary, actions ve quick dialogs ayrışmış kalmalı

### Reports

- filters, runtime, table data, row actions, scheduled reports ayrı tutulmalı

### ReconciliationWorkbench

- import / preview / actions / summary / filters / table ayrı tutulmalı

### PaymentsBoard

- quick payment ve summary/actions ayrı tutulmalı

### Sidebar ve app-shell parçaları

- navigation config, render paneli ve helper logic ayrılmalı

## Test ve Doğrulama Standardı

Her büyük değişiklikte hedef:

- ilgili unit testler
- page testleri
- `npm run build`
- gerekiyorsa Playwright smoke

Canlı bug fix sonrası:

- console error yok
- page error yok
- veri dolu ekran render ediliyor

## Tracker Kullanım Kuralı

Bu repo için iki tracker var:

- `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- `TEKNIK_DENETIM_TAKIP.md`

Kurallar:

- Bir iş tamamlandıysa tracker'da da tamamlanmalı.
- Bir iş `Devam Ediyor` ise bir sonraki somut chunk belirtilmeli.
- Yeni büyük ekran başladığında tracker'a önce plan, sonra ilerleme yazılmalı.

## Geçmiş Çalışmaların Özeti

Bu repoda daha önce şu tür işler yapıldı:

- büyük sayfalar composable/component sınırlarına bölündü,
- dashboard ve raporlama akışları ayrıştırıldı,
- quick create / quick picker / branch select yardımcıları küçültüldü,
- policy/offer/detail ekranları shell seviyesine indirildi,
- canlı sistemde görünen birkaç hata debug edilip düzeltildi,
- takip dosyaları güncellendi,
- build ve test ile doğrulama alışkanlığı korundu.

## Bir Sonraki Agent İçin Kısa Talimat

Bu dosyayı açan agent:

1. önce tracker'ı okuyup açık kalan tek işi seçmeli,
2. page shell mi, composable mı, component mi karar vermeli,
3. küçük ve testlenebilir parçalar halinde ilerlemeli,
4. build/test/playwright doğrulamasını atlamamalı,
5. tamamlanan işi tracker'a yazmalı,
6. gerekiyorsa commit/push/checkpoint oluşturmalı.

---

Bu dosya yaşayan bir rehberdir.  
Yeni büyük refactor işleri eklendikçe burada yeni örnekler, kurallar ve karar notları tutulmalıdır.
## Amaç

Bu projedeki ana hedef, tek bir `.vue` sayfasında biriken karmaşık iş mantığını:

- küçük composable'lara,
- küçük presentational component'lere,
- ortak helper dosyalarına,
- ve net tracker dokümanlarına

ayırmaktır.

Hedef, davranışı değiştirmeden bakım maliyetini düşürmek ve hata ayıklamayı kolaylaştırmaktır.

## Temel Yaklaşım

1. Önce gerçek davranışı koru.
2. Önce en büyük ve en kırılgan dosyayı bul.
3. Logic ile UI'ı ayrı sınırlar halinde düşün.
4. Her yeni sınır için küçük test yaz.
5. Build ve mümkünse canlı smoke ile doğrula.
6. İş tamamlanınca tracker dosyasını güncelle.
7. Gerekirse commit/push ile checkpoint oluştur.

## Uygulanan Mimari İlke

### 1. Page shell ince kalmalı

`.vue` page dosyaları sadece:

- state wiring,
- composable çağrıları,
- component composition,
- event forwarding

yapmalı.

### 2. Davranış ve sunum ayrılmalı

Şu tür iş mantıkları ayrı composable'lara taşınmalı:

- load / refresh
- route sync
- preset yönetimi
- export / download
- row action / navigation
- dialog state / submit flow
- summary / computed data
- data normalization / helper logic

Şu tür yüzeyler ayrı component'lere taşınmalı:

- action bar
- metrics / summary panel
- filter section
- table / list section
- dialog shell
- sidebar / hero / tabs / section group

### 3. Tek sorumluluk kuralı

Bir dosya mümkün olduğunca tek iş yapmalı.

- composable = davranış
- component = render
- helper = küçük saf dönüşümler

### 4. Küçük ve testlenebilir parçalar

Kırılan büyük bloklar, birbirinden bağımsız küçük parçalar haline getirilmeli.  
Bu sayede hem unit test yazmak kolaylaşır hem de regressions daralır.

## Bu Repoda Kullanılan Refactor Deseni

Bu repoda tekrar eden desen şu oldu:

1. Büyük ekranı belirle.
2. En riskli davranışları ayır.
3. Önce runtime / state composable'ı çıkar.
4. Sonra summary / table-data / action helper'ları ayır.
5. Ardından UI bloklarını component'lere böl.
6. Shell'i sadeleştir.
7. Test et.
8. Build et.
9. Canlı smoke ile kontrol et.
10. Tracker'ı güncelle.

## Başarı Kriterleri

Bir refactor işi ancak şu şartlar sağlanınca tamamlanmış sayılmalı:

- Sayfa halen doğru veri gösteriyor.
- Console error oluşmuyor.
- Unit testler geçiyor.
- Build geçiyor.
- Gerekliyse Playwright smoke geçiyor.
- Tracker dosyası güncel.
- Gerekliyse commit yapılmış.

## İleride Nasıl Devam Edilmeli

Yeni bir düzenleme eklerken şu sırayı takip et:

### A. Önce mevcut durumu oku

- İlgili sayfayı aç.
- Çalışan composable/component sınırlarını bul.
- Tracker dosyasını kontrol et.
- Gerekirse son commit history'ye bak.

### B. En büyük riskli bloğu seç

Tercih sırası:

1. runtime / data load / route sync
2. table-data / summary / computed
3. action handlers / dialog flows
4. UI sections
5. küçük helper'lar

### C. Küçük bir sınır aç

- Yeni dosya oluştur.
- Tek bir sorumluluk ver.
- Page'den o parçayı çıkar.
- Geriye kalan API'yi bozma.

### D. Test yaz

Yeni sınır için:

- en az bir unit test
- mümkünse page smoke testi

### E. Doğrula

- `npm run test:unit`
- `npm run build`
- gerekiyorsa Playwright smoke

### F. Tracker güncelle

Her tamamlanan sınır için:

- `BUYUK_EKRAN_REFACTOR_TAKIP.md`
- gerekiyorsa ilgili plan/spec dosyası

güncellenmeli.

## Bu Repoda Özellikle Dikkat Edilecek Noktalar

### OfferBoard

- quick offer / conversion / route intent / drag-drop / bootstrap sınırları ayrı tutulmalı.
- quick offer UI bozulursa önce composable alias'larına bak.

### CommunicationCenter

- state / runtime / actions / UI blokları ayrı tutulmalı.
- campaign / segment / outbox akışları tek dosyada birleştirilmemeli.

### PolicyList

- preset sync, runtime, table data, actions, quick policy akışları ayrı tutulmalı.
- UI component’ler shell’den prop almalı.

### AuxRecordDetail

- summary, actions ve quick-dialog akışları birbirine karışmamalı.
- topbar / hero / sidebar / tabs ayrı tutulmalı.

### Reports

- filters, runtime, table data, row actions ve scheduled reports ayrı düşünülmeli.
- snapshot / report payload akışları page içinde birikmemeli.

### ReconciliationWorkbench

- import / preview / actions / summary / filters / table bölümleri ayrı tutulmalı.

### PaymentsBoard

- quick payment ve summary/actions ayrı sınırlar halinde kalmalı.

### Sidebar ve app-shell parçaları

- navigation config, render paneli ve helper logic ayrı tutulmalı.
- shared shell bileşenleri page logic'i taşımamalı.

## Geçmiş Çalışmaların Özeti

Bu repoda daha önce şu tür işler yapıldı:

- büyük sayfalar composable/component sınırlarına bölündü,
- dashboard ve raporlama akışları ayrıştırıldı,
- quick create / quick picker / branch select yardımcıları küçük birimlere indirildi,
- policy/offer/detail ekranları shell seviyesine indirildi,
- canlı sistemde görünen birkaç hata debug edilip düzeltildi,
- takip dosyaları güncellendi,
- build ve test ile doğrulama alışkanlığı korundu.

Bu yüzden ileride yapılacak işlerin ana hedefi artık yeni bir davranış eklemekten çok, mevcut davranışı bozmadan sınırları daha da temizlemek olmalı.

## Önerilen Çalışma Tarzı

İleride bu dosyayı açan agent için önerilen çalışma tarzı:

- Büyük değişiklikte önce kapsamı daralt.
- Aynı anda çok fazla bağımsız şey değiştirme.
- Page shell'i uzun süre kirletme.
- Kırılan davranışı asla tracker dışında bırakma.
- Her checkpoint sonrası repo durumunu temizle.

## Kısa Kural

Eğer bir dosya:

- 300+ satır olduyse,
- birden fazla sorumluluk taşıyorsa,
- test etmek zorlaşıyorsa,

onu bölmek için adaydır.

Ama bölme yaparken:

- önce davranışı koru,
- sonra sınırı çıkar,
- sonra testi geçir,
- sonra tracker'ı güncelle.

---

Bu dosya yaşayan bir rehberdir.  
Yeni büyük refactor işleri eklendikçe buraya yeni örnekler ve kurallar eklenmelidir.

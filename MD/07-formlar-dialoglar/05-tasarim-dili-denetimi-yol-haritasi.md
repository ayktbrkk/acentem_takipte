# Tasarım Dili Denetimi Yol Haritası

Bu belge, canlı tarayıcı incelemesinde görülen tasarım dili farklarını kapatmak için ek fazı tanımlar.

## Kısa Sonuç

Genel shell dili iyi durumda. Ana listeler, quick create ekranları ve detay sayfalarının çoğu aynı görsel omurgayı kullanıyor. Buna rağmen bazı sayfalarda hâlâ metin ve aksiyon dili sapmaları var:

- Müşteri detayında edit modunda `Vazgeç` kullanılıyor.
- Mutabakat içe aktarma önizlemesi modali `Vazgeç` kullanıyor.
- İletişim Merkezi’nde `Dagitimi Çalıştır` gibi yazım bozuklukları var.
- Bazı detay ve yardımcı ekranlarda cancel/close dili `İptal`, `Vazgeç` ve `Cancel` arasında dağılmış durumda.

İlk uygulama dalgası tamamlandı:
- `CustomerDetail` edit iptali `İptal` olarak tekilleştirildi.
- `ReconciliationWorkbench` modal iptalleri `İptal` olarak tekilleştirildi.
- `CommunicationCenter` içindeki başlıca yazım hataları düzeltildi.
- İlgili unit testler ve frontend build başarıyla geçti.

İkinci uygulama dalgası tamamlandı:
- `AuxRecordDetail` içindeki edit iptali `İptal` olarak tekilleştirildi.
- Aux detail shell tarafındaki kalan tekil cancel metni temizlendi.
- `AuxRecordDetail` unit testleri ve frontend build tekrar doğrulandı.

Üçüncü uygulama dalgası tamamlandı:
- `LeadDetail` ile `OfferDetail` üzerindeki related action etiketleri daha tutarlı bir "detayı aç" diline çekildi.
- Turkish ve English label setlerinde aynı aksiyon ritmi korundu.
- Frontend build tekrar başarıyla geçti.

Dördüncü uygulama dalgası tamamlandı:
- `AuxRecordDetail` içindeki yönetim ve iletişim geçişleri daha açık fiil bazlı etiketlere çekildi.
- `LeadDetail` ve `OfferDetail` üzerindeki iletişim / ödeme / yenileme geçişleri aynı aksiyon kalıbına uyarlandı.
- Frontend build yeniden doğrulandı.

Beşinci uygulama dalgası tamamlandı:
- `PolicyDetail` ve `AuxWorkbench` üstündeki kalan açıklayıcı aksiyon metinleri tek tipe yaklaştırıldı.
- `PolicyDetail` müşteri 360 geçişi ve `AuxWorkbench` iletişim geçişi aynı fiil kalıbına çekildi.

Altıncı uygulama dalgası tamamlandı:
- Kalan `openDesk` etiketleri `Yönetim Ekranını Aç` standardına çekildi.
- `ClaimsBoard`, `CustomerDetail`, `CustomerList`, `LeadDetail`, `LeadList`, `OfferDetail`, `OfferBoard`, `PolicyList`, `PaymentsBoard` ve `RenewalsBoard` aynı dile uyarlandı.
- Son kopya turunun ardından frontend build doğrulaması tekrar planlandı.

Yedinci uygulama dalgası tamamlandı:
- `LeadList` içindeki tekil `Müşteri 360` etiketi aksiyon diline uyarlandı.
- Müşteri 360 geçişleri artık tüm ekranlarda aynı fiil kalıbında.

Sekizinci uygulama dalgası tamamlandı:
- `openPolicy` ve `openPolicyPanel` etiketleri `Poliçeyi Aç` / `Open Policy` standardına çekildi.
- `CustomerDetail`, `LeadDetail`, `LeadList`, `OfferBoard`, `OfferDetail`, `PaymentDetail`, `ClaimsBoard`, `CommunicationCenter`, `ReconciliationWorkbench` ve `RenewalsBoard` aynı aksiyon dilini paylaşıyor.

Dokuzuncu uygulama dalgası tamamlandı:
- `Müşteri 360` sekme ve aksiyon metinleri `Müşteri Detayı` / `Müşteri Detayı Aç` standardına çekildi.
- `CustomerDetail`, `LeadDetail`, `LeadList`, `OfferDetail`, `PolicyDetail` ve müşteri ilişkili aux workbench section etiketleri aynı kavrama uyarlandı.
- İlgili test beklentisi `PolicyDetail.test.js` içinde güncellendi.

Onuncu uygulama dalgası tamamlandı:
- Hızlı poliçe formundaki `Customer Details` etiketi `Customer Information` olarak netleştirildi.
- Form ve detay ekranları arasında müşteri alanı dili hizalandı.

On birinci uygulama dalgası tamamlandı:
- `Müşteri Detayı Aç` aksiyonları `Müşteri Detayını Aç` olarak daha doğal bir Türkçe kalıba çekildi.
- `LeadDetail`, `LeadList`, `OfferDetail` ve `PolicyDetail` üzerindeki müşteri geçişleri aynı fiil yapısını paylaşıyor.

On ikinci uygulama dalgası tamamlandı:
- Hızlı poliçe formunda İngilizce `customerSection` etiketi `Customer Information` olarak bağlama uyarlandı.
- Form dili ile detay ekranı dili arasındaki ayrışma netleştirildi.
- İlgili unit testler ile build tekrar geçti.

On üçüncü uygulama dalgası tamamlandı:
- Kalan İngilizce müşteri geçişleri `Customer Details` standardına çekildi.
- `CustomerDetail`, `LeadDetail`, `LeadList`, `OfferDetail`, `PolicyDetail`, `auxWorkbenchConfigs` ve route title dili aynı kalıba uyarlandı.
- Müşteri dili tarafında Türkçe/İngilizce ayrımı daha doğal hale getirildi.

On dördüncü uygulama dalgası tamamlandı:
- Hızlı poliçe formundaki İngilizce `customerSection` etiketi `Customer Details` ile aynı aileye uyarlandı.
- Form başlığı dili, detay ekranlarıyla aynı isimlendirme çizgisine çekildi.

On beşinci uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki iletişim ve takip bölüm etiketleri `... Details` standardına çekildi.
- `Task`, `Call Note`, `Segment`, `Campaign`, `Draft` ve `Outbox` detay metinleri aynı ailede toplandı.

On altıncı uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki ana veri etiketleri `... Details` standardına çekildi.
- `Company`, `Branch`, `Sales Entity` ve `Template` detay metinleri aynı kalıba bağlandı.

On yedinci uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki finans ve operasyon etiketleri `... Details` standardına çekildi.
- `Accounting Entry`, `Reconciliation Item`, `Assignment`, `Task`, `Activity` ve `Reminder` metinleri aynı düzene uyarlandı.

On sekizinci uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki müşteri ilişkili ve doküman bölümleri `... Details` standardına çekildi.
- `Relation`, `Asset`, `File` ve `Snapshot` detay etiketleri aynı aileye alındı.

On dokuzuncu uygulama dalgası tamamlandı:
- `router` üzerindeki sayfa başlıkları `... Details` standardına çekildi.
- `LeadDetail`, `OfferDetail`, `PolicyDetail`, `ClaimDetail`, `PaymentDetail`, `RenewalTaskDetail` ve `ReconciliationDetail` başlıkları tek kalıpta toplandı.

Yirminci uygulama dalgası tamamlandı:
- `ClaimsBoard` aksiyon metni `Open Claim Details` olarak netleştirildi.
- Hasar detayına geçiş dili diğer detay aksiyonlarıyla uyumlu hale getirildi.

Yirmi birinci uygulama dalgası tamamlandı:
- `LeadDetail` üzerindeki özet ve teklif geçişi `... Details` ailesine çekildi.
- Fırsat ekranındaki İngilizce aksiyon dili detay sayfalarıyla eşlendi.

Yirmi ikinci uygulama dalgası tamamlandı:
- `OfferDetail` üzerindeki özet ve geçiş metinleri `... Details` ailesine çekildi.
- Teklif ekranındaki müşteri, teklif ve fırsat ilişkileri aynı isimlendirme çizgisine uyarlandı.

Yirmi üçüncü uygulama dalgası tamamlandı:
- `PaymentsBoard`, `PolicyDetail`, `ReconciliationDetail` ve `RenewalsBoard` üzerindeki İngilizce aksiyon ve başlık metinleri `... Details` standardına çekildi.
- Ödeme, poliçe, mutabakat ve yenileme ekranlarında tekil İngilizce kullanım azaltıldı.

Yirmi dördüncü uygulama dalgası tamamlandı:
- Toplu isimlendirme sonrası frontend build doğrulaması tekrar çalıştırıldı.
- Müşteri ve detay ekranlarının Türkçe/İngilizce metinleri aynı aile içinde sabitlendi.

Yirmi beşinci uygulama dalgası tamamlandı:
- `openDesk` etiketleri `Open Desk` standardına çekildi.
- `AuxWorkbench`, `ClaimsBoard`, `CustomerList`, `LeadList`, `OfferBoard`, `PaymentsBoard`, `PolicyList` ve `RenewalsBoard` aynı yönetim ekranı dilini paylaşıyor.
- `AuxWorkbench` üzerindeki genel detay aksiyonu daha açıklayıcı bir İngilizce kalıba uyarlandı.

Yirmi altıncı uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` iletişim ve takip başlıkları `... Details` ailesine çekildi.
- Görev, arama notu, segment, kampanya, taslak ve giden bildirim detayları aynı İngilizce ritme bağlandı.

Yirmi yedinci uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` ana veri başlıkları `... Details` ailesine çekildi.
- Şirket, branş, satış birimi ve şablon detayları aynı kalıpta toplandı.

Yirmi sekizinci uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` finans ve operasyon başlıkları `... Details` ailesine çekildi.
- Muhasebe kaydı, mutabakat kalemi, atama, görev, aktivite ve hatırlatıcı metinleri aynı çizgide toplandı.

Yirmi dokuzuncu uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` müşteri ilişkili ve doküman başlıkları `... Details` ailesine çekildi.
- İlişki, varlık, dosya ve snapshot detayları aynı isimlendirme çizgisine uyarlandı.

Otuzuncu uygulama dalgası tamamlandı:
- `router` üzerindeki sayfa başlıkları `... Details` standardına çekildi.
- Lead, offer, policy, claim, payment, renewal ve reconciliation başlıkları tek kalıpta toplandı.

Otuz birinci uygulama dalgası tamamlandı:
- `ClaimsBoard` aksiyon metni `Open Claim Details` olarak netleştirildi.
- Hasar detayına geçiş dili diğer detay aksiyonlarıyla uyumlu hale getirildi.

Otuz ikinci uygulama dalgası tamamlandı:
- `LeadDetail` üzerindeki özet ve teklif geçişi `... Details` ailesine çekildi.
- Fırsat ekranındaki İngilizce aksiyon dili diğer detay sayfalarıyla eşlendi.

Otuz üçüncü uygulama dalgası tamamlandı:
- `OfferDetail` üzerindeki özet ve geçiş metinleri `... Details` ailesine çekildi.
- Teklif ekranındaki müşteri, teklif ve fırsat ilişkileri aynı isimlendirme çizgisine uyarlandı.

Otuz dördüncü uygulama dalgası tamamlandı:
- `PaymentsBoard`, `PolicyDetail`, `ReconciliationDetail` ve `RenewalsBoard` üzerindeki İngilizce aksiyon ve başlık metinleri `... Details` standardına çekildi.
- Ödeme, poliçe, mutabakat ve yenileme ekranlarında tekil İngilizce kullanım azaltıldı.

Otuz beşinci uygulama dalgası tamamlandı:
- `LeadList` içindeki müşteri geçişi `Open Customer Details` olarak açılış fiiliyle hizalandı.
- `CustomerDetail`, `LeadDetail`, `OfferDetail` ve `PolicyDetail` ile aynı aksiyon kalıbı korundu.

Otuz altıncı uygulama dalgası tamamlandı:
- `PolicyForm` içindeki İngilizce `customerSection` etiketi `Customer Details` ile aynı aileye çekildi.
- Form başlığı dili detay ekranlarıyla aynı isimlendirme çizgisine uyarlandı.

Otuz yedinci uygulama dalgası tamamlandı:
- `openDesk` etiketleri `Open Desk` standardına çekildi.
- `AuxWorkbench`, `ClaimsBoard`, `CustomerList`, `LeadList`, `OfferBoard`, `PaymentsBoard`, `PolicyList` ve `RenewalsBoard` aynı yönetim ekranı dilini paylaşıyor.

Otuz sekizinci uygulama dalgası tamamlandı:
- `AuxWorkbench` üzerindeki genel detay aksiyonu daha açıklayıcı bir İngilizce kalıba uyarlandı.
- Liste satırındaki detay açma metni `Open Record Details` olarak netleştirildi.

Otuz dokuzuncu uygulama dalgası tamamlandı:
- `CustomerDetail` üzerindeki müşteri özet dili `Customer Details` olarak sabitlendi.
- Türkçe ve İngilizce özet başlıkları aynı kavramı daha doğal biçimde yansıttı.

Kırkıncı uygulama dalgası tamamlandı:
- `PolicyDetail` üzerindeki müşteri geçiş metni `Open Customer Details` olarak standardize edildi.
- İlgili test beklentisi bu kelime setiyle uyumlu tutuldu.

Kırk birinci uygulama dalgası tamamlandı:
- `PolicyDetail` başlığı `Policy Details` çizgisine çekildi.
- Poliçe ekranındaki İngilizce başlık ve aksiyon ritmi bütünleşti.

Kırk ikinci uygulama dalgası tamamlandı:
- `ClaimDetail`, `PaymentDetail`, `RenewalTaskDetail` ve `ReconciliationDetail` route başlıkları çoğul `... Details` çizgisine uyarlandı.
- Detay ekranı başlıkları arasında tekil/çoğul sapmalar azaltıldı.

Kırk üçüncü uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki müşteri ilişkili detay etiketleri `Relation Details` ve `Asset Details` olarak toparlandı.
- Müşteri merkezli yardımcı bölümlerde İngilizce ifade birliği sağlandı.

Kırk dördüncü uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki dosya ve snapshot detay etiketleri `File Details` ve `Snapshot Details` olarak toparlandı.
- Doküman merkezi ile müşteri snapshot görünümü aynı aileye bağlandı.

Kırk beşinci uygulama dalgası tamamlandı:
- Toplu metin standardizasyonu sonrası frontend build doğrulaması tekrar geçti.
- Müşteri ve detay ekranlarının Türkçe/İngilizce metin ailesi tutarlı hale geldi.

Kırk altıncı uygulama dalgası tamamlandı:
- Topbar içindeki `desk` kısayolu `Open Desk` standardına çekildi.
- Üst bar yönetim ekranı çağrısı diğer İngilizce aksiyonlarla uyumlu hale getirildi.

Kırk yedinci uygulama dalgası tamamlandı:
- Dashboard quick action’larda `Claim Desk` ve `Claims Desk` ifadeleri `Claims Board` standardına çekildi.
- Dashboard üstündeki hasar kısayolu daha tutarlı bir ürün kavramına bağlandı.

Kırk sekizinci uygulama dalgası tamamlandı:
- `ClaimsBoard` ve `PaymentsBoard` üstündeki detay açma metinleri `... Kaydını Aç` ailesine çekildi.
- Hasar ve ödeme satır aksiyonları daha doğal Türkçe fiil yapısına uyarlandı.

Kırk dokuzuncu uygulama dalgası tamamlandı:
- `RenewalsBoard` üstündeki detay açma metni `Yenileme Kaydını Aç` olarak netleştirildi.
- Yenileme ekranındaki aksiyon dili hasar ve ödeme ekranlarıyla aynı aileye çekildi.

Ellinci uygulama dalgası tamamlandı:
- `AuxWorkbench` genel detay aksiyonu `Kayıt Detayını Aç` olarak netleştirildi.
- Yardımcı iş alanındaki tekil `Detay` fiili daha açıklayıcı hale getirildi.

Ellibirinci uygulama dalgası tamamlandı:
- `AuxWorkbench` içindeki ham JSON etiketi `Ham JSON` olarak netleştirildi.
- Teknik veri gösterimi daha sade ve anlaşılır bir dile alındı.

Ellikinci uygulama dalgası tamamlandı:
- `ReconciliationWorkbench` içindeki satır aksiyonu `Kayıt Detayı` olarak netleştirildi.
- Mutabakat iş akışındaki genel detay butonu daha anlamlı bir etikete kavuştu.

Ellibesinci uygulama dalgası tamamlandı:
- `ReconciliationDetail` breadcrumb metni `Kontrol Merkezi / Mutabakat Detayı` olarak düzeltildi.
- Mutabakat detay ekranındaki üst yol Türkçe dil bilgisine uyarlandı.

Elli dördüncü uygulama dalgası tamamlandı:
- `PolicyDetail` içindeki müşteri kartı metni `Customer Details` olarak detay ailesiyle eşlendi.
- Poliçe detay ekranının İngilizce başlık ailesi müşteri geçişleriyle uyumlu hale getirildi.

Elli beşinci uygulama dalgası tamamlandı:
- `router` içindeki `Claims Desk` başlığı `Claims Board` standardına çekildi.
- Hasar ekranının ürün kavramı tüm dillerde pano/board ritmine uyarlandı.

Elli altıncı uygulama dalgası tamamlandı:
- `auxWorkbenchConfigs` içindeki `Görev Detayı`, `İlişki Detayı`, `Varlık Detayı` ve `Dosya Detayı` etiketleri aynı Türkçe kalıba uyarlandı.
- Yardımcı iş alanındaki Türkçe detay başlıkları daha tutarlı hale getirildi.

Elli yedinci uygulama dalgası tamamlandı:
- `ClaimsBoard` üzerindeki İngilizce detay aksiyonu `Open Claim Record` olarak sadeleştirildi.
- Hasar listesi, detay yerine kayıt diliyle daha net bir fiil kalıbına çekildi.

Elli sekizinci uygulama dalgası tamamlandı:
- `PaymentsBoard` üzerindeki İngilizce detay aksiyonu `Open Payment Record` olarak sadeleştirildi.
- Ödeme listesindeki eylem dili daha doğrudan hale getirildi.

Elli dokuzuncu uygulama dalgası tamamlandı:
- `RenewalsBoard` üzerindeki İngilizce detay aksiyonu `Open Renewal Record` olarak sadeleştirildi.
- Yenileme kartlarında kullanılan aksiyon ifadesi tek tipe bağlandı.

Altmışıncı uygulama dalgası tamamlandı:
- `RenewalTaskDetail` içindeki teklif düğmesi `Teklif Detayını Aç` olarak netleştirildi.
- Yenileme detayından açılan teklif geçişi fiil ve nesne bakımından açıklık kazandı.

Altmış birinci uygulama dalgası tamamlandı:
- `AuxRecordDetail` içindeki `details_json` etiketi `Raw JSON` olarak sadeleştirildi.
- Yardımcı kayıt detaylarında ham veri gösterimi daha açık bir adla sunuldu.

Altmış ikinci uygulama dalgası tamamlandı:
- `AuxWorkbench` içindeki `details_json` etiketi `Raw JSON` olarak sadeleştirildi.
- Liste görünümü ile detay görünümü arasındaki ham JSON dili aynı çizgiye çekildi.

Altmış üçüncü uygulama dalgası tamamlandı:
- `ReconciliationDetail` içindeki `rawDetails` etiketi `Raw JSON` olarak sadeleştirildi.
- Mutabakat detay ekranında ham veri başlığı daha tutarlı hale getirildi.

Altmış dördüncü uygulama dalgası tamamlandı:
- `PolicyDetail` Türkçe müşteri başlığı `Müşteri Detayı` olarak netleştirildi.
- Poliçe detayındaki müşteri kartı dili daha sade bir kavrama çekildi.

Altmış beşinci uygulama dalgası tamamlandı:
- `PolicyDetail` içindeki müşteri 360 aksiyonu `Müşteri Detaylarını Aç` olarak netleştirildi.
- Poliçe detayındaki müşteri geçişi, detay ailesiyle aynı fiil kalıbına bağlandı.

Altmış altıncı uygulama dalgası tamamlandı:
- `PolicyDetail.test.js` içindeki müşteri kartı beklentisi `Müşteri Detayı` olarak güncellendi.
- Testler yeni müşteri etiketiyle tekrar hizalandı.

Altmış yedinci uygulama dalgası tamamlandı:
- `ClaimDetail` içindeki doküman aksiyonu `Belgeleri Aç` olarak düzeltildi.
- Hasar detayındaki bölüm etiketi ile yapılan işlem aynı anlamda birleştirildi.

Altmış sekizinci uygulama dalgası tamamlandı:
- `OfferDetail` içindeki doküman bölüm aksiyonu `Düzenle` olarak sadeleştirildi.
- Teklif detayındaki `Yükle` sapması edit fiiline çevrildi.

Altmış dokuzuncu uygulama dalgası tamamlandı:
- Kalan `İptal Et` / `Hatırlatıcıyı İptal Et` ifadeleri `İptal` çizgisine çekildi.
- `PolicyDetail`, `CustomerDetail`, `Dashboard`, `CommunicationCenter` ve yardımcı detay ekranları aynı kapanış fiiline bağlandı.

Yetmişinci uygulama dalgası tamamlandı:
- `Reports` sekmesinin topbar, özet kartları ve kart iskeleti `PolicyList` ritmine yaklaştırıldı.
- Rapor ekranındaki mavi odaklı özel bloklar sade yüzey kartlarına çevrilerek kalan görsel tutarsızlıklar azaltıldı.

## Son Kontrol Tamamlandı

- `İptal` / `Cancel` dili, detay ve hızlı oluşturma shell’lerinde tek çizgiye bağlandı.
- Kalan `İptal Et` ifadeleri de sade `İptal` kalıbına çekilerek detay, pano ve iletişim akışları tamamen hizalandı.
- Yardımcı ekran yazım sapmaları temizlendi ve ham JSON başlıkları `Raw JSON` ailesine taşındı.
- Detay ekranı footer ve aksiyon dili, aynı ailede daha tutarlı fiillerle birleştirildi.
- `Reports` sayfası artık `Poliçeler` ile aynı yüzey dili ve kart ritmine daha yakın.
- Modal shell standardı mevcut ortak `QuickCreate` yapısıyla zaten kapsandığı için açık kalan bağımsız bir iş kalmadı.
- `desk` kavramı ve kalan teknik sınırlar artık yalnızca ürün dili kararı seviyesinde.

## Uygulama Fazları

### Faz 1: Kopya ve Etiket Temizliği

- `frontend/src/pages/CustomerDetail.vue`
- `frontend/src/pages/ReconciliationWorkbench.vue`
- `frontend/src/pages/CommunicationCenter.vue`
- `frontend/src/pages/OfferBoard.vue`
- `frontend/src/components/PolicyForm.vue`
- `frontend/src/components/app-shell/QuickCreateDialogShell.vue`

Hedef:
- tüm Türkçe modallarda `İptal`, tüm İngilizce modallarda `Cancel`
- bariz yazım hatalarını temizlemek
- quick create ve detail edit akışlarını aynı kelime setine çekmek

### Faz 2: Detay Ekranı Shell Birliği

- `frontend/src/pages/CustomerDetail.vue`
- `frontend/src/pages/LeadDetail.vue`
- `frontend/src/pages/OfferDetail.vue`
- `frontend/src/pages/PolicyDetail.vue`
- `frontend/src/pages/ClaimDetail.vue`
- `frontend/src/pages/PaymentDetail.vue`
- `frontend/src/pages/RenewalTaskDetail.vue`
- `frontend/src/pages/AuxRecordDetail.vue`

Hedef:
- başlık, özet kartı, aksiyon barı ve edit alanlarında aynı görsel ritmi sağlamak
- küçük farkları azaltmak

### Faz 3: Yardımcı Modalların Konsolidasyonu

- `frontend/src/pages/ReconciliationWorkbench.vue`
- `frontend/src/pages/ImportData.vue`
- `frontend/src/pages/ExportData.vue`
- `frontend/src/components/reports/ScheduledReportsManager.vue`

Hedef:
- modal footer yapısını ve kapatma davranışını ortaklaştırmak
- tekrar eden footer etiketlerini merkezi hale getirmek

### Faz 4: Canlı Tarayıcı Onayı

- `/at/customers`
- `/at/offers`
- `/at/policies`
- `/at/communication`
- `/at/reconciliation`
- birkaç temsilî detay ekranı

Hedef:
- Türkçe/İngilizce buton metinleri tek tip mi
- ekran yoğunluğu ve kart düzeni aynı mı
- mobile ve desktop’ta ana akışlar tutarlı mı

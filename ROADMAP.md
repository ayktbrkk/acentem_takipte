# Acentem Takipte - Yol Haritası (v1)

**Referans:** 26 Mayıs 2026 tarihinde yapılan kalite ve güvenlik incelemesi çıktılarına göre hazırlanmıştır.

## Amaç
Repoyu endüstri standartlarında güvenli, ölçeklenebilir ve sürdürülebilir hale getirmek; önce güvenlik ve bütünlük risklerini kapatmak, ardından mimari/performans/deneyim iyileştirmeleri yapmak.

## Yol Haritası (Öncelik Sırasına Göre)

### Faz 1 — Güvenlik ve Yetkilendirme İstikrarı

#### 1.1 API yetkilendirme sözleşmesini tekilleştir
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 12 saat
- **Kapsam:**
  - `acentem_takipte/api/security.py`
  - `acentem_takipte/api/session.py`
  - `acentem_takipte/api/communication.py`
  - `acentem_takipte/api/quick_create.py`
- **Amaç:** Tüm whitelisted endpoint'lerde
  - Kimlik doğrulama (`Guest` reddi)
  - Rol/izin kontrolü (`doctype` + `permtype`)
  - Metot kısıtlaması (write-only için POST)
  - Tutarlı hata/silindir/yanıt formatı
  uygulamak.
- **Kabul Kriterleri:**
  - `allow_guest=True` olmayan endpoint sayısı doğrulanır.
  - Her mutasyon endpointinde en az bir action-level izin kontrolü olur.
  - “Sadece oturum açık” kontrolü ile “doğru izne sahip” kontrolü net ayrılır.

#### 1.2 `ignore_permissions=True` kullanımını güvenli hale getir
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/api/seed.py`
  - `acentem_takipte/api/smoke.py`
  - `acentem_takipte/doctype/*`
- **Amaç:** `ignore_permissions=True` yalnızca kontrollü, teknik zorunluluklı ve denetimli noktalarda kalmalı.
- **Kabul Kriterleri:**
  - Her `ignore_permissions=True` satırı için iş gerekçesi ve güvenlik kontrolü belgelenecek.
  - Gereksiz kullanım kaldırılır veya sistem izni ile değiştirilir.
  - Denetim notları ve kod yorumlarıyla izlenebilirlik sağlanır.

#### 1.3 Loglama redaksiyonunu zorunlu hale getir
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/api/security.py`
  - backend servis loglama katmanı
- **Amaç:** TC kimlik no, poliçe no gibi hassas alanların loglara yazılmaması.
- **Kabul Kriterleri:**
  - `tc_kimlik_no`, `policy_no`, `iban`, `telefon`, `email` alanları maskelenir.
  - Uygulanan redaksiyon için test ve örnek log kontrolü eklenir.

---

### Faz 2 — Performans ve Sorgu Sağlığı

#### 2.1 Dashboard ve yoğun sorguların profilini çıkar ve optimize et
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 16 saat
- **Kapsam:**
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
- **Amaç:** `frappe.db.sql` kullanılan kritik noktalarda
  - Filtre indeksleri
  - Sorgu tekrarını azaltma
  - Önbellek stratejisi
  ile performans kazanımı sağlamak.
- **Kabul Kriterleri:**
  - En az 5 kritik dashboard endpointi için sorgu sayısı düşürülür.
  - Büyük rapor sorguları için limit/offset ve index uyumu eklenir.
  - İlgili alanlar için index listesi dokümante edilir.

#### 2.2 Arkaplan işlerini kuyruk stratejisine oturt
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/tasks.py`
  - `hooks.py` scheduler
- **Amaç:** Uzun süren işlemler için senkron işleme yerine enqueue standardını artırmak.
- **Kabul Kriterleri:**
  - 2 sn’den uzun süren işlemlerden en az biri queue’ya alınır.
  - Job başına idempotent davranış ve hata logu eklenir.

#### 2.3 Frontend veri çağrılarını debounced hale getir
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `frontend/src` içinde list filtreleme akışları
- **Amaç:** Arama, filtre ve otomatik yenileme call’larını throttle/debounce etmek.
- **Kabul Kriterleri:**
  - UI'da arama inputuna her yazımda request patlaması olmaz.
  - 300ms debounce ile en az bir örnekte ölçülebilir istek azalışı.

---

### Faz 3 — Mimari ve Kod Kalitesi

#### 3.1 Servis katmanı ve izin katmanını ayır
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/doctype/*`
  - Yeni: `acentem_takipte/services/*`
- **Amaç:** API handler’ını “HTTP + doğrulama” ile sınırlayıp iş mantığını servislere taşımak.
- **Kabul Kriterleri:**
  - En az 3 endpoint iş mantığı service katmanına taşınır.
  - Service fonksiyonları test edilebilir ve bağımsız hale gelir.

#### 3.2 DRY ve güvenli yardımcı katman
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/api/*` (auth/helper tekrarları)
  - Yeni: `acentem_takipte/utils/permissions.py`
- **Amaç:** Yetki, validasyon ve audit yardımcılarını tekilleştirerek tekrarları azaltmak.
- **Kabul Kriterleri:**
  - En az 5 endpoint’in ortak güvenlik akışı standart fonksiyona alınır.
  - Tekilleştirme sonrası kod okunabilirliği artar, duplicate kontrolü azalır.

#### 3.2.1 Frontend Pinia store mimarisini yeniden tasarla
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 12 saat
- **Kapsam:**
  - `frontend/src/stores`
  - `frontend/src/composables`
  - `frontend/src/api`
  - `frontend/src/views` / `frontend/src/components`
- **Amaç:** Component odaklı dağınık state yönetimini domain bazlı, test edilebilir ve merkezi Pinia mimarisine taşımak.
- **Kabul Kriterleri:**
  - Store katmanları `domain` ayrımında yeniden gruplandırılır:
    - `auth`, `dashboard`, `policy`, `claim`, `communication`, `accounting`
  - API yan etkileri yalnızca store action’larından yürütülür; component içinde doğrudan `fetch`/raw axios kullanımını minimize eder.
  - Liste/sayfa state’leri için tek bir `loading/error/loaded` pattern’i standardize edilir.
  - `getters` ile türetilmiş hesaplamalar (kümülatif sayılar, filtrelenmiş listeler) store içinde toplanır.
  - `Pinia plugin` ile route veya toast gibi dış etkilerden izole test edilebilir bir mimari oluşturulur.
  - Mevcut kritik 3 frontend akışı için (en az bir dashboard, one form, bir modal/queue flow) store akış diyagramı ve migration planı tamamlanır.

#### 3.3 DocType şema normalizasyonu (veri modeli)
- **Durum:** Devam Ediyor
- **Uygulama Durumu:** 1. ve 2. alt maddeler için uygulama tamamlandı
- **Öncelik:** Yüksek
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/doctype/at_offer/at_offer.json` (satır 1-122)
  - `acentem_takipte/doctype/at_policy/at_policy.json` (satır 1-194)
  - `acentem_takipte/doctype/at_claim/at_claim.json` (satır 1-108)
  - `acentem_takipte/doctype/at_payment/at_payment.json` (satır 1-134)
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.json` (satır 1-84)
  - `acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.json` (satır 1-124)
  - `acentem_takipte/doctype/at_policy_snapshot/at_policy_snapshot.json` (satır 1-100)
  - `acentem_takipte/doctype/at_customer/at_customer.json` (satır 1-129)
  - `acentem_takipte/doctype/at_lead/at_lead.json` (satır 1-128)
  - `acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json` (satır 1-152)
  - `acentem_takipte/doctype/at_reconciliation_item/at_reconciliation_item.json` (satır 1-110)
  - `acentem_takipte/doctype/at_access_log/at_access_log.json` (satır 1-78)
  - `acentem_takipte/api/security.py` ve ilgili servisler
- **Amaç:** Ortak alanları standardize etmek ve teknik borç alanlarını azaltmak.
- **Bulgular:**
  - `status` alanı 9+ DocType’ta tekrar ediyor; değerler heterojen olduğu için adım 1 ile merkezi enum’a taşındı.
  - `notes` alanında kullanıcı/sistem ayrımı eksikti; adım 2 ile kullanıcı notları etiketlendi, sistem notu örneği `AT Policy Snapshot` içinde ayrıştırıldı.
  - Finans alanları (`net_premium`, `tax_amount`, `commission_amount`, `gross_premium`) tekrarlanıyor; hesaplama mantığı ayrıca controller’da çoğunlukla aynı.
  - `AT Policy` içinde `commission` alanı legacy olarak saklanıyor (`at_policy.json` satır 147-153) ve kullanımda fallback ile birlikte işliyor (`at_policy.py` satır 55, 92, 202).
  - `AT Claim` ve `AT Payment` içinde `customer` alanı belge kaynağından türetilebilirken ayrıca saklanmış durumda (`at_claim.json` satır 29-40, `at_payment.json` satır 45-48).
- **Kabul Kriterleri:**
  - Adım 1: `status` karşılaştırmaları kontrol merkezine taşınarak string tekrarları azaltıldı (`acentem_takipte/utils/statuses.py`).
  - Adım 2: `notes` alanları için anlamlandırma standartları eklendi; sistem notu örneği `AT Policy Snapshot` içinde `Sistem Notu` olarak ayrıştırıldı.
  - Finans hesaplama ve validasyon mantığına tek bir yardımcı eklenir ve `AT Offer`/`AT Policy`/`AT Policy Endorsement` aynı doğrulama kuralını kullanır.
  - `commission` alanı için migration planı çıkarılır; yeni kayıtlar için tek kaynağa geçiş doğrulanır.
  - `customer` türetilebilir alanları için normalizasyon/performans değerlendirmesi tamamlanır.

#### 3.3.1 DocType gereksiz alan ön inceleme (analiz)
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 2 saat
- **Kapsam:**
  - `at_policy.json` (`commission`, `customer`)
  - `at_claim.json` (`customer`)
  - `at_payment.json` (`customer`)
- **Amaç:** Bu alanların kalıcılık gerekliliğini ve veri bütünlüğü etkisini belgelemek.
- **Kabul Kriterleri:**
  - Belirlenen her alanda:
    - Üretim raporu (kullanım sıklığı)
    - Türetim maliyetine etkisi
    - Migration veya geriye dönük uyumluluk riski
  - envanteri çıkarılır.

#### 3.4 Poliçe yenileme akışını baştan yaz (yeniden mimari)
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
  - `public/js/at_renewal_task.js`
  - `acentem_takipte/api/quick_create.py`
  - `acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/api/dashboard.py`
  - `public/frontend/assets` içinde yenileme ekranlarını besleyen bileşen/state uçları
- **Amaç:** Mevcut “deadline tabanlı görevlendirme + manuel müdahale” modelini; durum makinesi + servis katmanı + idempotent kuyruk tetikleyicisi ile tekrar kullanılabilir hale getirmek.
- **Önerilen Mimari:**
  - **Teknik katman ayrımı:**
    - `renewal/service.py`: politika seçimi, pencere (due/renewal hesaplama), aday üretimi, iş kuralları (eski-güncel eşzamanlılık/tekrar üretebilirlik).
    - `renewal/pipeline.py`: adım bazlı akış (detect -> create_task -> notify -> track -> close/error).
    - `renewal/telemetry.py`: metrik + event logları (ne zaman, hangi policy, hangi filtre seti ile tetiklendi).
  - **Durum makinesi:**
    - `OPEN -> IN_PROGRESS -> DONE / CANCELLED`
    - Durum geçişleri merkezileştirilir (tek geçiş fonksiyonu + guard).
  - **Aynı işi birden fazla kaynakta tekrar etme:**
    - `unique_key` ile idempotent üretim,
    - policy bazlı dedupe (`open task` kontrolü + `locked` pencere).
  - **Task lifecycle yönetimi:**
    - Eskisi kalan/yenilenen görevler için otomatik kapanış kuralı,
    - Eski tarihli tamamlanmamış görevlerde "stale task remediation" job’u.
  - **API güvenliği:**
    - `api/admin_jobs.py` üzerinden sadece job-level erişim,
    - action-level izin + doc permission birlikte.
  - **UI akışı:**
    - Form, liste ve detay akışını tek store event akışına bağlayan store actionları,
    - statü dönüşümleri tek kaynakta okunur.
- **Kabul Kriterleri:**
  - Yenileme akışında görev üretimi, bildirim ve tamamlanma adımları tek servis fonksiyonunda izlenebilir.
  - Aynı `policy + due_date` için çift görev üretimi olmuyor.
  - `Done`/`Completed` statü uyumsuzluğu kaldırılıyor; frontend/backend tek bir renewal durum modeli kullanıyor.
  - Yenileme batch job’u için idempotent ve retry-safe test senaryosu ekleniyor (unit/integration).
  - Başarı/başarısız/atlanan görev için metrikler dashboard’a yansıtılıyor.

---

### Faz 4 — Test Güçlendirmesi

#### 4.1 Backend kritik iş akışı integration testleri
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/tests/test_api_*.py`
  - `acentem_takipte/doctype/*/test_*.py`
- **Amaç:** Poliçe oluşturma, teklif->poliçe dönüşümü, yenileme, claim bildirim akışlarını uçtan uca doğrulamak.
- **Kabul Kriterleri:**
  - Kritik 3 akış için en az 2 senaryo (yetki + başarılı akış) eklenir.
  - CI’de bu testler fail etmeden geçmek zorunlu olur.

#### 4.2 Frontend test kapsamını aç
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 12 saat
- **Kapsam:**
  - `frontend/tests`
  - `frontend/src/components`
- **Amaç:** Sayfa/component bazında unit test, form validasyon ve API state testi eklemek.
- **Kabul Kriterleri:**
  - En az 10 yeni Vue unit/ component testi.
  - E2E senaryolarında en az iki kritik kullanıcı yolunda regresyon koruması.

#### 4.3 Test verisi ve CI kapısını netleştir
- **Durum:** Plan
- **Öncelik:** Düşük
- **Efor:** 6 saat
- **Kapsam:**
  - `.github/workflows/backend-ci.yml`
  - `.github/workflows/frontend-ci.yml`
  - `.github/workflows/desk-free-smoke.yml`
- **Amaç:** Test koşulları deterministik olsun, fail-fast ve quality gate eklenmesi.

---

### Faz 5 — CI/CD ve Operasyonel Güvenlik

#### 5.1 Bağımlılık yönetimini sıkılaştır
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 4 saat
- **Kapsam:**
  - `requirements.txt`
  - `pyproject.toml`
  - `setup.py`
- **Amaç:** Versiyon pinning ve geri dönüşümlü kurulum güvenliğini arttırmak.
- **Kabul Kriterleri:**
  - Bağımlılıklar pinlenir veya benzer izlenebilir strateji belirlenir.
  - `pip check`/güvenlik tarama adımı eklenir.

#### 5.2 CI güvenlik kontrollerini ekle
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `.github/workflows/backend-ci.yml`
  - `.github/workflows/frontend-ci.yml`
- **Amaç:** Secret leakage, dependency audit ve temel SAST adımları eklemek.
- **Kabul Kriterleri:**
  - CI'da en az bir güvenlik taraftarı tarama adımı zorunlu.
  - Hatalı secret pattern’leri için otomatik fail.

---

### Faz 6 — UX ve Erişilebilirlik

#### 6.1 Erişilebilirlik standardını yükselt
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `frontend/src/components`
  - `frontend/src/views`
- **Amaç:** `aria-*`, klavye navigation, `aria-busy`, odak yönetimi standartlarını getirmek.
- **Kabul Kriterleri:**
  - Form ve tablo aksiyonlarında en az 1:1 klavye erişilebilirliği.
  - Kritik kontrol bileşenlerinde ekran okuyucu dostu etiketleme.

#### 6.2 Boş durum / yükleme durumu pattern'ini standardize et
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 6 saat
- **Kapsam:**
  - `frontend/src/components/EmptyState.vue`
  - Sayfa bazlı listeler
- **Amaç:** Boş liste, bekleme ve hata durumlarında tutarlı kullanıcı geri bildirimi.
- **Kabul Kriterleri:**
  - 8 kritik sayfanın tümünde empty/loading/error state var.
  - Mobil breakpoint testleri eklenir.

---

### Faz 7 — Gözlemlenebilirlik, Uyum ve Entegrasyon Stratejisi

#### 7.1 Observability altyapısı (structured logging, metrics)
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 12 saat
- **Kapsam:**
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/acentem_takipte/api/security.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/api/accounting.py`
  - `acentem_takipte/acentem_takipte/api/communication.py`
  - `acentem_takipte/acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/acentem_takipte/api/quick_create.py`
  - `acentem_takipte/acentem_takipte/communication.py`
  - `acentem_takipte/acentem_takipte/tests/test_api_hardening_contracts.py`
  - `acentem_takipte/acentem_takipte/doctype/at_access_log/at_access_log.json`
  - `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`
- **Amaç:** Tüm kritik API/job/event akışlarında yapılandırılmış log, standart metrik ve hata/aşama kodu standardını oluşturmak.
- **Kabul Kriterleri:**
  - Her API çağrısına request-id / doctype / user / action alanlarını taşıyan yapılandırılmış log formatı eklenir.
  - Admin/job endpoint’leri için `queue`, `job_id`, `duration_ms`, `retry_count`, `result` metrikleri standart hale getirilir.
  - Notification/accounting job’ları için sent/success/fail/error oranları toplanır.
  - `AT Access Log` ve `AT Notification Outbox` alanları üzerinden izlenebilirlik ana akışları doğrulanır.

#### 7.2 KVKK / veri yaşam döngüsü uyumu
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 14 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/serializers.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/security.py`
  - `acentem_takipte/acentem_takipte/api/security.py`
  - `acentem_takipte/acentem_takipte/communication.py`
  - `acentem_takipte/acentem_takipte/doctype/at_access_log/at_access_log.json`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
- **Amaç:** TC kimlik no, telefon, e-posta, poliçe ve işlem kimlikleri için amaç sınırlaması, maskelenme, saklama süresi ve silme hakkını tek akışta ele alan bir KVKK modelini uygulamak.
- **Kabul Kriterleri:**
  - Duyarlı alanlar için response tarafında maskeli görünüm zorunlu olan endpointler tanımlanır.
  - `tax_id`, `policy_no`, müşteri referansları için `retention_class` ve silinme süreci dokümante edilir.
  - KVKK audit çıktısı: silme/anonimleştirme işlemleri için admin onay kayıtları eklenir.
  - PII içeren log ve payload örnekleri log redaction fonksiyonuna alınır.

#### 7.3 API versiyonlama stratejisi
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/*.py`
  - `acentem_takipte/acentem_takipte/api/quick_create.py`
  - `acentem_takipte/acentem_takipte/api/accounting.py`
  - `acentem_takipte/acentem_takipte/api/communication.py`
  - `acentem_takipte/acentem_takipte/api/admin_jobs.py`
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/acentem_takipte/tests/test_api_hardening_contracts.py`
  - `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
- **Amaç:** Mevcut dashboard v2 yaklaşımını genişletip v1/v2 API kontratını netleştirmek; geriye uyumluluk kırmadan client ve server tarafını ayrıştırmak.
- **Kabul Kriterleri:**
  - `v1`-`v2` ayrımıyla rota/isimlendirme standartları belgelenir.
  - Deprecated endpointler için taşınma ve deprecation uyarı politikası çıkarılır.
  - Versiyon geçişini zorlayan ve koruyan en az 2 entegrasyon test senaryosu eklenir.
  - Hata formatı, sayfalama ve filtre kontratları her iki versiyonda da net kontrat dokümanı ve test ile doğrulanır.

#### 7.4 Dış sistem entegrasyon sözleşmeleri
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 16 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
  - `acentem_takipte/acentem_takipte/accounting.py`
  - `acentem_takipte/acentem_takipte/communication.py`
  - `acentem_takipte/acentem_takipte/api/accounting.py`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.py`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
  - `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.py`
  - `acentem_takipte/acentem_takipte/doctype/at_notification_template/at_notification_template.py`
  - `acentem_takipte/acentem_takipte/tests/test_notification_dispatcher.py`
  - `acentem_takipte/acentem_takipte/tests/test_dashboard_contract_smoke.py`
  - `acentem_takipte/hooks.py`
- **Amaç:** Her harici sistem çağrısı için timeout, retry, hata/başarısızlık eşikleri, kimlik doğrulama, payload şeması ve idempotency varsayımlarıyla bir sözleşme katmanı kurmak.
- **Kabul Kriterleri:**
  - TCMB, WhatsApp provider ve hesaplama/senkronizasyon akışları için ayrı adapter contract dosyaları oluşturulur.
  - Site config anahtarları (`at_whatsapp_api_url`, `at_whatsapp_api_token`, vb.) için kullanım ve fail-fast/fail-safe davranışları yazılır.
  - `AT Accounting Entry` için `external_ref`, `integration_hash`, `payload_json` alanları kullanım rehberi ve doğrulama testi eklenir.
  - Integration testleri timeout, rate-limit, bozuk payload ve response-parsing senaryolarını kapsar.

---

## Eksik Modül ve Özellik Analizi (v2)

### ALAN 1 — Müşteri Yönetimi (360° Müşteri Görünümü)

**Mevcut Durum:** `AT Customer` kimlik, iletişim, atanan acente, KVKK onayı ve klasör yolunu tutuyor; fakat ilişkisel müşteri 360 modeli oluşturmuyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`: `links` boş, household/yakınlar/araçlar/ek varlıklar için ilişki alanı yok.
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`: müşteri segmenti, skor, portföy değeri, risk iştahı, çapraz satış potansiyeli alanları yok.
- `frontend/src/pages/CustomerDetail.vue`: aktif poliçe, açık teklif, lead/comment/Communication gösteriyor; ödeme, hasar, yenileme, overdue prim ve müşteri skoru yok.
- `frontend/src/pages/CustomerDetail.vue`: iletişim geçmişi Frappe `Communication` ve yorumlardan toplanıyor; SMS/WhatsApp/outbox/call note birleşik görünmüyor.
- `acentem_takipte/acentem_takipte/api/dashboard.py`: müşteri workbench endpointleri var, fakat tek çağrıda tam 360 payload dönen customer detail API yok.

**Önerilen Eklentiler:**
- Yeni `AT Customer Relation` DocType: eş, çocuk, referans, ticari bağlantı.
- Yeni `AT Customer Asset` DocType: araç, konut, işyeri, sağlık grubu, tekne, tarım ekipmanı.
- Yeni `AT Customer Segment Snapshot` DocType: müşteri skoru, tahmini gelir, çapraz satış fırsatı, churn riski.
- Yeni endpoint: `acentem_takipte/acentem_takipte/api/customer_360.py -> get_customer_360(name, window_days=90)`.
- Yeni UI: müşteri detayında `Portfolio`, `Collections`, `Claims`, `Communications`, `Renewals`, `Assets & Family`, `Insights` sekmeleri.

**Yol Haritasına Entegrasyon:** Yeni `Faz 8 — Customer 360 ve CRM Graph` olarak eklenmeli.

**Öncelik:** Kritik

**Tahmini Efor:** 32 saat

---

### ALAN 2 — Poliçe Yönetimi (Tam Yaşam Döngüsü)

**Mevcut Durum:** `AT Policy` genel müşteri/şirket/branş/tarih/prim yapısına sahip. Poliçe PDF iliştirme ve snapshot mevcut, ancak ürün bazlı poliçe modellemesi yok.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`: araç plaka/motor/şasi, konut adres/metrekare, sağlık sigortalıları, BES sözleşme bilgileri gibi ürün tipine özgü alanlar yok.
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`: status yalnızca `IPT`, `KYT`, `Active`; tekliften yenilemeye uzanan gerçek yaşam döngüsü eksik.
- `acentem_takipte/acentem_takipte/doctype/at_policy_endorsement/at_policy_endorsement.py`: `ALLOWED_ENDORSEMENT_FIELDS` sadece çekirdek finans/tarih alanlarını kapsıyor; risk nesnesi değişimi desteklenmiyor.
- `frontend/src/pages/PolicyDetail.vue`: endorsement, snapshot, payment, file ve notification listeleri var; ürün/risk/teminat detay kartları yok.
- `acentem_takipte/acentem_takipte/doctype/at_offer/at_offer.py`: tekliften poliçeye dönüşüm var, fakat ürün tipine göre prefill ve doğrulama yok.

**Önerilen Eklentiler:**
- Yeni üst model: `AT Policy Product Profile`.
- Child tablolar: `AT Vehicle Risk`, `AT Property Risk`, `AT Health Insured Person`, `AT Coverage Line`, `AT Policy Insured Object`.
- Poliçe durum makinesi: `Teklif Bekliyor -> Aktiflestirme Bekliyor -> Aktif -> Yenileme Havuzu -> Iptal / Tamamlandi`.
- Zeyilname için typed endorsement payload ve alan bazlı diff/snapshot ekranı.
- Sigorta şirketi ve ürün kombinasyonu bazlı şablon/preset yapısı.

**Yol Haritasına Entegrasyon:** Yeni `Faz 9 — Productized Policy Lifecycle`, mevcut `3.3` ve `3.4` ile bağlantılı.

**Öncelik:** Kritik

**Tahmini Efor:** 44 saat

---

### ALAN 3 — Yenileme Takibi (Gelir Koruma Motoru)

**Mevcut Durum:** Yenileme görevi otomatik üretiliyor, ama pencere sadece 30 gün. Statü modeli operasyonel takip yerine görev tamamlandı mantığında.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/tasks.py`: `RENEWAL_LOOKAHEAD_DAYS = 30`; 90/60/15/7/1 gün kademeleri yok.
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`: `status` yalnızca `Open`, `In Progress`, `Done`, `Cancelled`.
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`: notification draft üretiyor ama yenileme teklif üretmiyor.
- `acentem_takipte/acentem_takipte/api/dashboard.py`: renewal bucket ve pending count var; retention rate, lost renewal reason, competitor loss analitiği yok.
- `frontend/src/pages/RenewalsBoard.vue`: filtrelenebilir liste var; müzakere, kaybedildi, rakibe gitti, sebep seçimi ve teklif ilişkisi yok.

**Önerilen Eklentiler:**
- Yeni `AT Renewal Opportunity` DocType: satış aşamaları, teklif ilişkisi, renewal owner.
- Yeni `AT Renewal Outcome Reason` DocType: fiyat, hizmet, rakip, müşteri vazgeçti, kapsam uyumsuzluğu.
- Önceki poliçeden otomatik renewal offer prefill servisi.
- KPI: `retention_rate`, `renewal_pipeline_value`, `lost_renewal_count`, `competitor_loss_rate`.

**Yol Haritasına Entegrasyon:** Mevcut `3.4` genişletilmeli ve yeni `Faz 10 — Revenue Retention Engine` açılmalı.

**Öncelik:** Kritik

**Tahmini Efor:** 36 saat

---

### ALAN 4 — Tahsilat ve Mali Takip

**Mevcut Durum:** Tekil ödeme kaydı, muhasebe entry ve reconciliation yapısı mevcut. Temel collection/payout ve mutabakat izlenebiliyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`: taksit planı, taksit no, plan toplamı, kalan bakiye alanları yok.
- `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.py`: `due_date` doğrulanıyor ama taksit bazlı vade zinciri, gecikme faizi, hatırlatma seviyesi yok.
- `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`: KDV, BSMV, gider vergisi, komisyon tahakkuk/ödeme ayrımı yok.
- `acentem_takipte/acentem_takipte/api/accounting.py`: workbench ve run/resolve operasyonları var; Excel/CSV ekstre import endpoint'i yok.
- `frontend/src/pages/PaymentsBoard.vue` ve `frontend/src/pages/ReconciliationWorkbench.vue`: operasyon ekranı var, fakat kasa raporu, şirket ekstre yükleme ve muhasebe dışa aktarma yok.

**Önerilen Eklentiler:**
- Yeni `AT Installment Plan`, `AT Installment Item`, `AT Commission Accrual`, `AT Cash Ledger`, `AT Statement Import Batch`.
- Ekstre import parser katmanı: CSV/Excel -> staging -> eşleştirme -> reconciliation önerileri.
- Vergi kırılım alanları ve muhasebe export adapter'ı.
- Gecikmiş prim uyarı servisi ve müşteri/agent görev üretimi.

**Yol Haritasına Entegrasyon:** Yeni `Faz 11 — Collections and Finance Ops`.

**Öncelik:** Kritik

**Tahmini Efor:** 40 saat

---

### ALAN 5 — Hasar Yönetimi

**Mevcut Durum:** `AT Claim` temel claim kaydı ve ödeme bağlantısı sağlıyor. Liste ekranında claim durum ve ödeme/approval tutarları görülebiliyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`: eksper, dosya sorumlusu, red sebebi, itiraz durumu, belge/fotoğraf alanları yok.
- `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.py`: claim ödeme toplamını hesaplıyor; dosya yaşam döngüsü, SLA ve atama kuralı yok.
- `frontend/src/pages/ClaimsBoard.vue`: liste var, ama claim detail/case management ekranı yok.
- `acentem_takipte/acentem_takipte/communication.py`: claim status değişimlerinde müşteri bildirimi için özel akış görünmüyor.
- Repo genelinde claim attachment/photo upload/inspection/workflow yapısı bulunmuyor.

**Önerilen Eklentiler:**
- Yeni `AT Claim File`, `AT Claim Document`, `AT Expert Assignment`, `AT Claim Appeal`.
- Claim detail sayfası: olay bilgisi, eksper süreci, ödeme süreci, itiraz sekmesi, belge yükleme.
- Claim status transition + müşteri notification rule set.
- Loss ratio veri martı: müşteri/ürün/şirket bazında claim-to-premium analitiği.

**Yol Haritasına Entegrasyon:** Yeni `Faz 12 — Claims Case Management`.

**Öncelik:** Kritik

**Tahmini Efor:** 30 saat

---

### ALAN 6 — İletişim Merkezi

**Mevcut Durum:** Template, draft, outbox ve dispatcher kuyruğu mevcut. WhatsApp API adapter taslağı ve scheduler dispatch var.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_notification_template/at_notification_template.json`: kanal modeli `SMS`, `Email`, `Both`; WhatsApp first-class channel değil.
- `acentem_takipte/acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`: outbox kanalları `SMS`, `Email`; telefon araması/notu yok.
- `acentem_takipte/acentem_takipte/communication.py`: SMS akışı yorum seviyesinde WhatsApp adapter üzerinden çalışıyor; gerçek SMS provider ayrımı yok.
- `frontend/src/pages/CommunicationCenter.vue`: outbox/draft yönetimi var; müşteri bazlı tüm iletişim geçmişi, kampanya ve segment ekranı yok.
- `acentem_takipte/hooks.py`: queue schedule var; zamanlanmış kampanya veya müşteri segment broadcast job'u yok.

**Önerilen Eklentiler:**
- Yeni `AT Communication Log`, `AT Campaign`, `AT Segment`, `AT Scheduled Message`, `AT Call Note`.
- Channel modeli: `WhatsApp`, `SMS`, `Email`, `Phone Call`.
- Segment bazlı kampanya hedefleme: ör. "30 gün içinde kasko bitenler".
- Planlı gönderim ve approval workflow.

**Yol Haritasına Entegrasyon:** Yeni `Faz 13 — Omnichannel Communication Hub`.

**Öncelik:** Kritik

**Tahmini Efor:** 34 saat

---

### ALAN 7 — Görev ve Aktivite Yönetimi

**Mevcut Durum:** Uygulamada genel görev sistemi yok; görev kavramı fiilen `AT Renewal Task` ile sınırlı.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`: yalnızca renewal odaklı task modeli var.
- `acentem_takipte/acentem_takipte/tasks.py`: admin job ve queue işleri var; kullanıcı görev, reminder, follow-up ve daily task listesi yok.
- `frontend/src/pages/Dashboard.vue`: renewal alerts ve offer queues var; kişisel "bugün yapılacaklar" görünümü yok.
- `frontend/src/router/index.js`: ziyaret planı, aktivite, takım performansı gibi modüller için rota yok.

**Önerilen Eklentiler:**
- Yeni `AT Task`, `AT Activity`, `AT Reminder`, `AT Visit Plan`.
- Domain event'lerden görev üreten rule engine: overdue ödeme, claim follow-up, teklif follow-up, renewal call.
- Ekip performans panosu: poliçe kesim, teklif dönüşüm, tahsilat takibi, görev tamamlama.

**Yol Haritasına Entegrasyon:** Yeni `Faz 14 — Work Management and Team Ops`.

**Öncelik:** Kritik

**Tahmini Efor:** 28 saat

---

### ALAN 8 — Raporlama ve Analitik

**Mevcut Durum:** Dashboard v1/v2 ile GWP, komisyon, poliçe sayısı, renewal bucket, payment ve claim özetleri alınabiliyor. Tarih aralığı ve branch filtreleri çalışıyor.

**Kritik Eksikler:**
- `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`: policy ve lead status özetleri var; müşteri başına gelir, retention, churn, loss ratio yok.
- `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`: offer/payment/renewal özetleri var; çalışan bazlı üretim ve ürün bazlı dağılım yok.
- `frontend/src/pages/Dashboard.vue`: şirket bazlı top companies var; ürün/çalışan/segment/LTV kırılımı yok.
- Repo genelinde Excel/PDF export endpoint ve UI aksiyonu görünmüyor.

**Önerilen Eklentiler:**
- Analitik mart katmanı: `customer_value`, `renewal_retention`, `loss_ratio`, `agent_productivity`.
- Export ve BI katmanı: PDF/Excel export, zamanlanmış rapor, dönem karşılaştırma ve çalışan performans karnesi.
- Yönetici ekranı: günlük operasyon, haftalık kayıp analizi, aylık şirket/ürün/çalışan üretimi, yıllık büyüme trendi.

**Yol Haritasına Entegrasyon:** Yeni `Faz 15 — Executive Analytics and Reporting`.

**Öncelik:** Önemli

**Tahmini Efor:** 44 saat

---

### Faz 15 Güncellenmiş Versiyon

#### 15.1 PDF/Excel Export Altyapısı
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 18 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `acentem_takipte/acentem_takipte/policy_documents.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
  - `acentem_takipte/acentem_takipte/doctype/at_payment/at_payment.json`
  - `acentem_takipte/acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
  - `acentem_takipte/acentem_takipte/doctype/at_claim/at_claim.json`
  - `frontend/src/pages/Dashboard.vue`
  - `frontend/src/pages/PolicyList.vue`
  - `frontend/src/pages/PaymentsBoard.vue`
  - `frontend/src/pages/ClaimsBoard.vue`
- **Teknik Karar (PDF ve Excel için seçilen yaklaşım):**
  - PDF: `Frappe native print/html + Jinja + frappe.utils.pdf.get_pdf`
    - Gerekçe: repo içinde `policy_documents.py` zaten `get_pdf` kullanıyor; Desk uyumu ve kurumsal PDF standardı için mevcut stack ile en uyumlu yaklaşım bu.
    - Uygulama notu: DocType bazlı belgelerde Print Format; BI raporlarında server-side Jinja HTML şablonu + `get_pdf`.
  - Excel: `openpyxl` server-side
    - Gerekçe: 1000+ satır, çok sheet, zamanlanmış üretim ve kurumsal format kontrolü için backend üretim en güvenli yol.
  - Tetikleme modeli: `Her ikisi de`
    - anlık indirme: kullanıcı filtreleyip indirir
    - zamanlanmış üretim: haftalık/aylık job + bildirim
- **Üretilecek Rapor Tipleri:**
  - `Poliçe Listesi Raporu`
    - Kaynak: `AT Policy` + `AT Customer` + `AT Insurance Company` + opsiyonel `AT Sales Entity`
    - Filtreler: tarih aralığı, sigorta şirketi, sigorta branşı, fiziksel şube, durum, çalışan
    - PDF düzeni: logo, rapor başlığı, filtre özeti, tablo, toplam prim/komisyon özet satırı
    - Excel yapısı: `Summary`, `Policies`
  - `Komisyon Tahakkuk Raporu`
    - Kaynak: `AT Policy`, `AT Payment`, `AT Accounting Entry`, `AT Reconciliation Item`
    - Filtreler: dönem, şirket, çalışan, fiziksel şube, tahakkuk durumu
    - PDF düzeni: dönem özeti, şirket bazlı kırılım tablosu, tahakkuk/tahsilat fark özeti
    - Excel yapısı: `Summary`, `By Company`, `Lines`
  - `Yenileme Performans Raporu`
    - Kaynak: `AT Renewal Task`, `AT Renewal Opportunity`, `AT Renewal Outcome`, `AT Offer`, `AT Policy`
    - Filtreler: dönem, çalışan, şirket, branş, fiziksel şube
    - PDF düzeni: retention KPI kartları, stage dağılımı tablosu, kayıp nedenleri özeti
    - Excel yapısı: `Summary`, `Pipeline`, `Lost Reasons`, `Agent Breakdown`
  - `Hasar/Prim Oranı Raporu`
    - Kaynak: `AT Claim`, `AT Payment`, `AT Policy`, `AT Customer`
    - Filtreler: dönem, şirket, ürün/branş, müşteri segmenti, fiziksel şube
    - PDF düzeni: loss ratio özeti, şirket/ürün bazlı tablo, riskli müşteri listesi
    - Excel yapısı: `Summary`, `By Product`, `By Company`, `Risk Customers`
  - `Acente Üretim Karnesi`
    - Kaynak: `AT Policy`, `AT Offer`, `AT Renewal Task`, `AT Renewal Outcome`, `AT Payment`, `AT Task`
    - Filtreler: çalışan, dönem, fiziksel şube
    - PDF düzeni: çalışan başlığı, KPI kartları, hedef-gerçekleşen tablosu, açık görev özeti
    - Excel yapısı: `Summary`, `Agents`, `Open Tasks`, `Conversions`
  - `Tahsilat Durumu Raporu`
    - Kaynak: `AT Payment`, `AT Installment Plan`, `AT Accounting Entry`, `AT Reconciliation Item`
    - Filtreler: dönem, ödeme durumu, vadesi geçenler, şirket, fiziksel şube
    - PDF düzeni: kasa özeti, gecikmiş tahsilat listesi, taksit özeti
    - Excel yapısı: `Summary`, `Overdue`, `Installments`, `Cash`
- **Kabul Kriterleri:**
  - En az 6 rapor tipi için ortak export servis katmanı oluşur.
  - PDF çıktılarında kurumsal başlık, filtre özeti, özet satırı ve sayfa numarası standardı uygulanır.
  - Excel çıktılarında çoklu sheet, başlık stili, sayı/tarih formatı ve filtre satırı bulunur.
  - Uzun süren export işleri queue üzerinden yürür; küçük veri setlerinde anlık indirme desteklenir.
  - Dashboard v2 ve liste ekranları aynı filtre sözleşmesi ile export alır.
- **Desk Uyumluluğu:**
  - Evet. `System Manager` ve `Administrator` Desk üzerinden de rapor alabilmeli.
  - Desk tarafında export action ve rapor parametre formu bulunur; normal kullanıcı aynı raporları `/at` içinden kullanır.

#### 15.2 Karşılaştırmalı Dönem Analizi
- **Durum:** Plan
- **Öncelik:** Yüksek
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/api/dashboard.py`
  - `frontend/src/pages/Dashboard.vue`
- **Kabul Kriterleri:**
  - KPI payload'ına `period_comparison` parametresi eklenir: `none`, `previous_period`, `previous_month`, `previous_year`.
  - Her KPI için `current`, `previous`, `delta_value`, `delta_percent`, `direction` alanları döner.
  - Şu senaryolar desteklenir:
    - bu ay vs geçen ay
    - bu yıl vs geçen yıl
    - seçili dönem vs aynı uzunlukta önceki dönem
  - Dashboard kartları `▲ / ▼` yön göstergesi ve yüzde değişim gösterir.
  - Aynı comparison helper export raporlarında tekrar kullanılabilir şekilde ayrıştırılır.

#### 15.3 Acente Performans Karnesi
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 10 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `frontend/src/pages/Dashboard.vue`
  - `frontend/src/pages/TeamPerformance.vue` (yeni)
  - `acentem_takipte/acentem_takipte/doctype/at_task/*`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/*`
  - `acentem_takipte/acentem_takipte/doctype/at_offer/*`
  - `acentem_takipte/acentem_takipte/doctype/at_payment/*`
- **Kabul Kriterleri:**
  - Çalışan bazlı şu metrikler üretilir:
    - kesilen poliçe sayısı
    - toplam prim
    - teklif dönüşüm oranı
    - yenileme başarı oranı
    - komisyon geliri
    - açık görev sayısı
  - Hem ekran görünümü hem PDF export desteklenir.
  - Fiziksel şube ve çalışan filtresi aynı sözleşme ile çalışır.
  - KPI tanımları Faz 14 görev modeli tamamlandıktan sonra görev bazlı metriklerle genişleyebilir.
- **Bağımlılık:** `Faz 14 — Work Management and Team Ops`

#### 15.4 Müşteri Segmentasyon Raporu
- **Durum:** Plan
- **Öncelik:** Orta
- **Efor:** 8 saat
- **Kapsam:**
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/acentem_takipte/doctype/at_customer/*`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/*`
  - `acentem_takipte/acentem_takipte/doctype/at_claim/*`
  - `frontend/src/pages/CustomerList.vue`
  - `frontend/src/pages/CustomerSegments.vue` (yeni)
- **Kabul Kriterleri:**
  - Temel segmentasyon, `AT Customer Segment Snapshot` olmadan şu kurallarla çalışır:
    - poliçe sayısı: `1`, `2-5`, `5+`
    - toplam prim segmenti
    - yenileme sadakat skoru
    - hasar geçmişi var/yok
  - Müşteri listesi ekranında segment filtreleme + export birlikte çalışır.
  - `AT Customer Segment Snapshot` geldiğinde aynı endpoint sözleşmesi korunarak gelişmiş segmente geçilebilir.
  - Desk'te admin kullanıcı segment raporunu müşteri listesi/export yüzeyi üzerinden alabilir.
- **Bağımlılık:** `Faz 8 — Customer 360 ve CRM Graph` (opsiyonel; temel versiyon bağımsız çalışır)

---

### ALAN 10 — Mobil Kullanım

**Mevcut Durum:** Vue SPA route bazlı lazy-load kullanıyor. Sayfalarda temel responsive sınıflar var; fakat deneyim masaüstü workbench mantığı ağırlıklı.

**Kritik Eksikler:**
- `frontend/src/router/index.js`: mobil sahaya özel field mode veya mini-detail route modeli yok.
- `frontend/src/pages/CustomerDetail.vue`, `PolicyDetail.vue`, `ClaimsBoard.vue`, `PaymentsBoard.vue`: veri yoğun kart ve tablo yapısı mobil kullanım için optimize edilmemiş.
- `frontend/src/state/session.js`: global session state var; Pinia veya offline-friendly domain store yapısı yok.
- `frontend/src/pages/ClaimsBoard.vue`: fotoğraf ekleme, kamera yükleme, sahadan hasar kaydı akışı yok.
- `frontend/src/pages/OfferBoard.vue` ve `PolicyDetail.vue`: hızlı teklif sihirbazı ve müşteri ziyaretinde kullanılacak tek-ekran aksiyon seti yok.

**Önerilen Eklentiler:**
- Yeni mobil-first `Field Mode` navigasyonu.
- Hızlı aksiyon kartları: `Musteri Ara`, `Hizli Teklif`, `Hasar Bildir`, `Tahsilat Notu`, `Fotograf Yukle`.
- Kamera/file capture destekli claim ve belge akışları.
- Pinia tabanlı offline toleranslı domain cache.

**Yol Haritasına Entegrasyon:** Yeni `Faz 16 — Mobile Field Operations`.

**Öncelik:** Önemli

**Tahmini Efor:** 24 saat

---

## Yol Haritası (v2 — Birleştirilmiş ve Bağımlılık Sıralı)

Bu bölüm, yukarıdaki alan analizinden çıkan `Faz 8-16` önerilerini mevcut `Faz 1-7` ile çakışmayacak şekilde birleştirir. Amaç ayrı backlog kümeleri üretmek değil; uygulamaya başlanabilecek tek bir, bağımlılık sıralı icra dizisi oluşturmaktır.

### Dalga 1 — Güvenlik, Uyum ve Sözleşme Temeli
- **Birleşen Fazlar:** `Faz 1`, `Faz 5.2`, `Faz 7.1`, `Faz 7.2`, `Faz 7.3`, `Faz 7.4`
- **Öncelik:** Yüksek
- **Toplam Efor:** 88 saat
- **Odak:**
  - Auth, permission, `ignore_permissions=True`, log redaction ve admin job erişim standardını kapatmak
  - Structured logging, metrics, KVKK yaşam döngüsü ve harici entegrasyon sözleşmelerini sabitlemek
  - API versioning ve CI güvenlik kapısını uygulamak
- **Bu Dalga Tamamlanmadan Başlanmaması Gerekenler:**
  - Omnichannel communication genişlemesi
  - Muhasebe/entegrasyon rollout'u
  - Customer 360 için geniş PII görünürlük yüzeyi

### Dalga 2 — Veri Modeli ve Servis Katmanı Temeli
- **Birleşen Fazlar:** `Faz 3.1`, `Faz 3.2`, `Faz 3.3`, `Faz 3.3.1`
- **Öncelik:** Yüksek
- **Toplam Efor:** 40 saat
- **Odak:**
  - Ortak servis katmanı, permission helper ve domain yardımcılarını oturtmak
  - DocType normalizasyonu, legacy alan temizliği ve ortak finans/status doğrulamasını tekilleştirmek
  - Sonraki dalgalarda eklenecek müşteri ilişki, risk nesnesi, taksit, claim case, communication log ve task modelleri için şema standardı belirlemek
- **Bu Dalga Tamamlanmadan Başlanmaması Gerekenler:**
  - Productized policy lifecycle rollout
  - Collections/installment modeli
  - Claims case management ve unified activity modeli

### Dalga 3 — Frontend State, UX ve Mobil Foundation
- **Birleşen Fazlar:** `Faz 2.3`, `Faz 3.2.1`, `Faz 6.1`, `Faz 6.2`
- **Öncelik:** Yüksek
- **Toplam Efor:** 34 saat
- **Odak:**
  - Pinia tabanlı domain store mimarisine geçmek
  - Loading/error/empty state standardını oturtmak
  - Erişilebilirlik ve responsive davranışı temel seviyede güvenceye almak
  - Mobil saha moduna altyapı hazırlamak
- **Bu Dalga Tamamlanmadan Başlanmaması Gerekenler:**
  - Customer 360 ekranının genişletilmesi
  - Mobile field operations rollout
  - Büyük çok-sekmeli operasyon ekranları

### Dalga 4 — Customer 360 ve Productized Policy Foundation
- **Birleşen Fazlar:** `Faz 8`, `Faz 9` içindeki veri modeli ve çekirdek servis maddeleri
- **Öncelik:** Yüksek
- **Toplam Efor:** 46 saat
- **Odak:**
  - `AT Customer` çevresine household, asset, segment ve skor katmanlarını eklemek
  - `AT Policy` için ürün bazlı risk nesnesi modelini kurmak
  - Gerçek endorsement diff ve product-specific validation altyapısını çıkarmak
- **Bağımlılık:** `Dalga 1`, `Dalga 2`, `Dalga 3`

### Dalga 5 — Gelir Koruma ve Mali Operasyon Motoru
- **Birleşen Fazlar:** `Faz 2.2`, `Faz 3.4`, `Faz 10`, `Faz 11`
- **Öncelik:** Yüksek
- **Toplam Efor:** 92 saat
- **Odak:**
  - Renewal engine'i 90/60/30/15/7/1 kademeli hale getirmek
  - Auto renewal offer, lost reason ve retention KPI'larını eklemek
  - Installment plan, overdue premium, commission accrual ve statement import akışını kurmak
  - Accounting/reconciliation workbench'i finans operasyon merkezine dönüştürmek
- **Bağımlılık:** `Dalga 1`, `Dalga 2`

### Dalga 6 — Claims, İletişim ve Takım Operasyonları
- **Birleşen Fazlar:** `Faz 12`, `Faz 13`, `Faz 14`
- **Öncelik:** Yüksek
- **Toplam Efor:** 92 saat
- **Odak:**
  - Claim case management, eksper, belge/fotoğraf ve itiraz sürecini eklemek
  - WhatsApp, SMS, e-posta ve telefon notunu tek communication timeline altında birleştirmek
  - Segment/kampanya/zamanlanmış gönderim ve genel task/activity/reminder modelini kurmak
  - Çalışan bazlı görev ve performans takibini dashboard ile bağlamak
- **Bağımlılık:** `Dalga 1`, `Dalga 2`, `Dalga 3`

### Dalga 7 — Yönetici Analitiği, Test ve Release Hardening
- **Birleşen Fazlar:** `Faz 4`, `Faz 5.1`, `Faz 15`, `Faz 16`
- **Öncelik:** Orta
- **Toplam Efor:** 84 saat
- **Odak:**
  - Executive KPI setini müşteri değeri, retention, loss ratio ve agent üretkenliği ile genişletmek
  - PDF/Excel export, scheduled reports, dönem karşılaştırma ve performans/segment raporlamasını eklemek
  - Backend/frontend/E2E kritik akış testlerini tamamlamak
  - Mobil saha kullanımını production seviyesine taşımak
- **Bağımlılık:** `Dalga 4`, `Dalga 5`, `Dalga 6`

### Birleştirilmiş v2 Uygulama Sırası
1. `Dalga 1 — Güvenlik, Uyum ve Sözleşme Temeli`
2. `Dalga 2 — Veri Modeli ve Servis Katmanı Temeli`
3. `Dalga 3 — Frontend State, UX ve Mobil Foundation`
4. `Dalga 4 — Customer 360 ve Productized Policy Foundation`
5. `Dalga 5 — Gelir Koruma ve Mali Operasyon Motoru`
6. `Dalga 6 — Claims, İletişim ve Takım Operasyonları`
7. `Dalga 7 — Yönetici Analitiği, Test ve Release Hardening`

### Birleştirilmiş v2 Toplam Efor Özeti
- `Dalga 1`: 88 saat
- `Dalga 2`: 40 saat
- `Dalga 3`: 34 saat
- `Dalga 4`: 46 saat
- `Dalga 5`: 92 saat
- `Dalga 6`: 92 saat
- `Dalga 7`: 84 saat
- **Toplam:** 476 saat

## Karar Kayıtları (Mart 2026 Revizyonu)

Bu bölüm, mevcut v2 yol haritasının uygulanma kararlarını netleştirir. Önceki “Desk kaldırılacak” varsayımı iptal edilmiştir. Yeni hedef model:

- Birincil operasyon yüzeyi: `/at` Vue SPA
- Frappe Desk: yalnızca `System Manager` ve `Administrator`
- Normal kullanıcılar: Desk görmeden doğrudan `/at`
- Tüm domain akışları hem Desk hem SPA ile uyumlu backend sözleşmeleri üzerinden çalışır

### Karar 1 — Frappe Desk Erişimini Rol Bazlı Kilitle
- **Seçilen Yaklaşım:** Desk kaldırılmaz; yalnızca `System Manager` / `Administrator` kullanıcıları Desk'e erişir. Diğer tüm roller için varsayılan giriş yüzeyi `/at` olur ve `/app/*` erişimi yönlendirme/guard ile kesilir.
- **Roadmap Etkisi:** `Dalga 1` ve `Dalga 3`
- **Desk Uyumluluğu:**
  - DocType form/list ayarları korunur.
  - `public/js` client script'ler korunur; çünkü admin/superuser için Desk operasyon ve bakım yüzeyi olarak kalacaktır.
  - API endpoint'leri Desk'ten bağımsız kalır; Desk ve SPA aynı backend iş kurallarını kullanır.
- **Uygulama Notları:**
  - `hooks.py` içinde `home_page` / `role_home_page` kuralı SPA öncelikli olacak şekilde güncellenir.
  - `api/session.py` ve giriş sonrası boot akışında normal kullanıcı için `/at` zorlaması uygulanır.
  - `www/app.py` veya benzeri route guard katmanında `System Manager` dışı kullanıcı için `/app` erişimi `/at`'a çevrilir.
  - Admin/superuser için Desk'te kalacak yüzeyler:
    - DocType ve Custom Field yönetimi
    - User / Role / User Permission yönetimi
    - Error Log, Background Jobs, Scheduler izleme
    - Patch/Migration geçmişi ve sistem teşhisi
  - SPA'ya taşınacak operasyon yüzeyleri:
    - müşteri, teklif, poliçe, yenileme, hasar, tahsilat, dashboard
- **İlgili Dosyalar:**
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/api/session.py`
  - `acentem_takipte/public/js/*.js`
  - `frontend/src/router/index.js`
  - `frontend/src/state/session.js`
- **Tahmini Efor:** 14 saat

### Karar 2 — Çok Şubeli Yapı İçin Veri Modeli
- **Seçilen Yaklaşım:** Fiziksel lokasyon/şube için mevcut sigorta branşı modelinden ayrı bir özel DocType kullanılır. Mevcut `AT Branch` sigorta branşı/ürün branşı anlamında kalır; fiziksel şube için yeni bir model eklenir.
- **Roadmap Etkisi:** `Dalga 1`, `Dalga 2`, `Dalga 4`, `Dalga 5`, `Dalga 6`
- **Desk Uyumluluğu:**
  - Desk form/list görünümünde fiziksel şube alanı standart Link field olarak çalışır.
  - `User Permission` ile Desk filtrelemesi desteklenir; dashboard ve raw SQL tarafında ek custom filter enforcement uygulanır.
- **Seçilen Permission Stratejisi:**
  - Birincil model: `AT Office Branch` + kullanıcıya çoklu şube ataması
  - Desk uyumu için: `User Permission`
  - API ve dashboard sorguları için: merkezi `office_branch` filter helper + permission hook
  - `System Manager`: tüm şubeler
  - Normal kullanıcı: yalnızca atanmış şubeler
- **Öncelikli DocType Sırası:**
  1. `AT Customer`
  2. `AT Lead`
  3. `AT Offer`
  4. `AT Policy`
  5. `AT Renewal Task`
  6. `AT Payment`
  7. `AT Claim`
  8. `AT Accounting Entry`
  9. `AT Reconciliation Item`
- **Migration Notları:**
  - Yeni alan adı: `office_branch`
  - Backfill sırası:
    - müşteri manuel/seed veya kullanıcı varsayılanına göre
    - poliçe teklif/müşteri üzerinden
    - ödeme/hasar/yenileme muhasebe kayıtları poliçe veya müşteri üzerinden
  - Dashboard v2 tarafında `queries_kpis.py` ve `tab_payload.py` içinde `office_branch` paramı zorunlu helper ile işlenir.
- **İlgili Dosyalar:**
  - `acentem_takipte/doctype/at_customer/at_customer.json`
  - `acentem_takipte/doctype/at_policy/at_policy.json`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.json`
  - `acentem_takipte/doctype/at_payment/at_payment.json`
  - `acentem_takipte/doctype/at_claim/at_claim.json`
  - `acentem_takipte/doctype/at_accounting_entry/at_accounting_entry.json`
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/queries_kpis.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
  - `acentem_takipte/api/session.py`
- **Yeni Dosyalar / DocType'lar:**
  - `AT Office Branch`
  - `AT User Branch Access`
  - branch migration patch dosyası
- **Tahmini Efor:** 24 saat

### Karar 3 — WhatsApp Business API Entegrasyonu
- **Seçilen Yaklaşım:** Öncelikli provider olarak `Meta Cloud API` kullanılır. Notification outbox yapısı korunur; üzerine provider adapter katmanı eklenir. Başarısız WhatsApp gönderimi varsayılan olarak otomatik SMS fallback yapmaz; fallback template bazlı, açık iş kuralı ile seçilir.
- **Roadmap Etkisi:** `Dalga 1`, `Dalga 5`, `Dalga 6`
- **Neden:** Türkiye pazarı için doğrudan Meta entegrasyonu uzun vadede daha az bağımlılık, daha açık HSM yönetimi ve daha düşük aracı maliyeti sağlar. SMS sağlayıcısı ile fallback akışı daha sonra ayrı bir sözleşme olarak eklenmelidir; ilk aşamada kanal karışıklığı yaratmamak gerekir.
- **Desk Uyumluluğu:**
  - `AT Notification Template`, `AT Notification Draft`, `AT Notification Outbox` Desk'te yönetilebilir kalır.
  - System Manager WhatsApp template, provider ayarı ve kuyruk durumunu Desk'ten görebilir.
- **Uygulama Notları:**
  - Scheduler akışı korunur: `hooks.py` → queue/disptach job
  - Kanal modeli `SMS/Email/Both` yaklaşımından `WHATSAPP/SMS/EMAIL` bazlı genişletilir.
  - Yeni adapter akışı: `outbox -> dispatcher -> provider router -> whatsapp adapter`
  - Teknik kurallar:
    - timeout: `8s`
    - retry: `max 3`
    - rate-limit: Redis sayaçlı provider limiter
    - dead-letter: mevcut başarısız kuyruk mantığı korunur
  - Öncelikli trigger noktaları:
    1. yenileme hatırlatması: `tasks.py`, `at_renewal_task.py`
    2. ödeme vade uyarısı: yeni scheduler + `AT Payment`
    3. hasar durum güncellemesi: `AT Claim.on_update`
    4. poliçe teslim bildirimi: `AT Policy.after_insert` / belge hazır olayı
- **Template Şema Genişlemesi:**
  - `provider_template_name`
  - `provider_template_language`
  - `provider_template_category`
  - `content_mode`
  - `variables_schema_json`
  - kanal bazlı body/header alanları
- **İlgili Dosyalar:**
  - `acentem_takipte/communication.py`
  - `acentem_takipte/notifications.py`
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_notification_template/at_notification_template.json`
  - `acentem_takipte/doctype/at_notification_draft/at_notification_draft.json`
  - `acentem_takipte/doctype/at_notification_outbox/at_notification_outbox.json`
- **Yeni Dosyalar / DocType'lar:**
  - `acentem_takipte/providers/base.py`
  - `acentem_takipte/providers/router.py`
  - `acentem_takipte/providers/whatsapp_meta.py`
- **Tahmini Efor:** 28 saat

### Karar 4 — Renewal Engine Yeniden Yazımı
- **Seçilen Yaklaşım:** `AT Renewal Task` yalnızca görev/hatırlatma kaydı olarak kalır. Asıl yenileme satış yaşam döngüsü yeni servis katmanı ve ek outcome/opportunity modelleri ile yönetilir.
- **Roadmap Etkisi:** `Dalga 5`
- **Desk Uyumluluğu:**
  - Desk'te `AT Renewal Task`, `AT Renewal Opportunity`, `AT Renewal Outcome` formları yönetilebilir olur.
  - Manual trigger ve exception çözümü admin/manager kullanıcı için hem Desk hem SPA üzerinden mümkün olur.
- **Yeni Mimari:**
  - `renewal/service.py`: aday üretimi, iş kuralları, prefill offer üretimi
  - `renewal/pipeline.py`: `detect -> ensure_opportunity -> ensure_task -> notify -> create_offer -> close_or_lost`
  - `renewal/telemetry.py`: stage sayaçları, dedupe kayıtları, retention metrikleri
- **Kademe Sistemi:**
  - `90/60/30/15/7/1`
  - Template yaklaşımı: tek dinamik template yerine stage bazlı template family
  - Dedupe anahtarı: `policy + stage_code + channel + business_date`
- **Prefill Yenileme Teklifi:**
  - otomatik alanlar:
    - müşteri
    - sigorta şirketi
    - sigorta branşı
    - para birimi
    - önceki prim/komisyon referansları
  - kullanıcı onayı gerektiren alanlar:
    - fiyat değişimi
    - tarih kayması
    - risk nesnesi değişikliği
    - ek teminat / limit farkları
- **Yeni Outcome Şeması:**
  - `renewal_opportunity`
  - `policy`
  - `status`
  - `outcome_reason`
  - `competitor_name`
  - `lost_notes`
  - kategori seti:
    - `fiyat`
    - `rakip`
    - `hizmet`
    - `musteri_vazgecti`
    - `ulasilamadi`
- **Dashboard KPI Eklentileri:**
  - `retention_rate`
  - `renewal_lost_count`
  - `renewal_lost_by_reason`
  - `renewal_stage_aging`
- **İlgili Dosyalar:**
  - `acentem_takipte/tasks.py`
  - `acentem_takipte/doctype/at_renewal_task/at_renewal_task.py`
  - `acentem_takipte/doctype/at_offer/at_offer.py`
  - `acentem_takipte/api/dashboard.py`
  - `acentem_takipte/api/dashboard_v2/tab_payload.py`
- **Yeni Dosyalar / DocType'lar:**
  - `acentem_takipte/renewal/service.py`
  - `acentem_takipte/renewal/pipeline.py`
  - `acentem_takipte/renewal/telemetry.py`
  - `AT Renewal Opportunity`
  - `AT Renewal Outcome`
- **Tahmini Efor:** 34 saat

### Karar 5 — Pinia Store Mimarisi (Domain Bazlı)
- **Seçilen Yaklaşım:** SPA tarafı Pinia setup store mimarisine geçirilir. Backend sözleşmesi Desk uyumlu kalır; frontend yalnızca bu sözleşmenin organize edilmiş istemci katmanı olur.
- **Roadmap Etkisi:** `Dalga 3`, `Dalga 4`, `Dalga 5`, `Dalga 6`
- **Desk Uyumluluğu:**
  - Desk'e özel akışlar etkilenmez.
  - Store'lar yalnızca `/at` yüzeyi için istemci orkestrasyonu sağlar; iş kuralları backend'de kalır.
- **Store Yapısı:**
  - `stores/auth.js`
  - `stores/branch.js`
  - `stores/customer.js`
  - `stores/policy.js`
  - `stores/renewal.js`
  - `stores/claim.js`
  - `stores/payment.js`
  - `stores/communication.js`
  - `stores/accounting.js`
  - `stores/dashboard.js`
- **Standart Store Sözleşmesi:**
  - `state`: `items`, `selected`, `loading`, `error`
  - `actions`: `fetch`, `create`, `update`, `remove`
  - `getters`: `filtered`, `grouped`, `computed_kpis`
- **Branch Filter Stratejisi:**
  - aktif fiziksel şube global store'da tutulur
  - System Manager için `Tum Subeler` seçeneği görünür
  - filtre router query param ile URL'de persist edilir
  - sigorta branşı filtresi ile fiziksel şube filtresi ayrı tutulur
- **Migration Kapsamı:**
  - doğrudan resource/fetch kullanan sayfalar sırasıyla store action'larına taşınır:
    - müşteri ekranları
    - teklif/poliçe ekranları
    - yenileme ekranları
    - hasar/tahsilat/iletişim workbench'leri
    - dashboard
- **İlgili Dosyalar:**
  - `frontend/src/state/session.js`
  - `frontend/src/state/ui.js`
  - `frontend/src/router/index.js`
  - `frontend/src/pages/*.vue`
- **Yeni Dosyalar / DocType'lar:**
  - `frontend/src/stores/*.js`
  - `frontend/src/api/client.js`
- **Tahmini Efor:** 26 saat

### Rol-Arayüz Matrisi
| Rol | Birincil Arayüz | Desk Erişimi | Not |
|---|---|---|---|
| `Administrator` | `/at` + Desk | Var | Sistem yönetimi, patch, log, scheduler |
| `System Manager` | `/at` + Desk | Var | Sistem ve operasyon hibrit kullanım |
| `AT Manager` | `/at` | Yok | Operasyon ve dashboard |
| `AT Agent` | `/at` | Yok | Müşteri, teklif, yenileme, hasar |
| `AT Accountant` | `/at` | Yok | Tahsilat, mutabakat, finans iş akışı |
| Diğer operasyon rolleri | `/at` | Yok | Yetki kapsamı API + SPA ile belirlenir |

### Kararların Dalgalara Dağılımı
1. `Karar 1` → `Dalga 1`, `Dalga 3`
2. `Karar 2` → `Dalga 1`, `Dalga 2`, `Dalga 4`, `Dalga 5`, `Dalga 6`
3. `Karar 3` → `Dalga 1`, `Dalga 5`, `Dalga 6`
4. `Karar 4` → `Dalga 5`
5. `Karar 5` → `Dalga 3`, `Dalga 4`, `Dalga 5`, `Dalga 6`

### Revize Uygulama Bağımlılık Sırası
1. `Karar 1` ve `Karar 2` temel erişim ve veri izolasyonu için önce uygulanır.
2. `Karar 5`, `/at` tarafını yeni branch ve permission sözleşmesine bağlamak için ikinci katmandır.
3. `Karar 3`, notification altyapısını ve WhatsApp provider sözleşmesini sabitler.
4. `Karar 4`, branch-aware renewal verisi ve communication adapter hazır olduktan sonra uygulanır.

### Karar Bazlı Toplam Efor
- `Karar 1`: 14 saat
- `Karar 2`: 24 saat
- `Karar 3`: 28 saat
- `Karar 4`: 34 saat
- `Karar 5`: 26 saat
- **Toplam:** 126 saat

### Planlama Notu
- Bu `126 saat`, mevcut `458 saat` v2 toplamına ek bağımsız bir paket değildir.
- Kararlar, mevcut dalgaların uygulanma biçimini ve teknik yönünü netleştiren mimari karar kayıtlarıdır.
- Sprint planlama yapılırken karar eforu ilgili dalga eforunun içinde değerlendirilmelidir.

## Genel Kabul Kuralları

- Her görev için:
  - Önce teknik not (amaç, kapsam, varsayım), ardından kod değişikliği.
  - İlgili dosya ve fonksiyona referans.
  - Risk/geri adım senaryosu.
- Her commit öncesi:
  - Güvenlik etkisi kontrolü
  - Test etkisi raporu
  - İzin/kullanıcı etkisi değerlendirmesi

## Referans Notu
Bu yol haritası tamamlanmadan doğrudan kod üretimine geçilmeyecektir. Önce her faz, kabul kriteri ve test ile onay alındıktan sonra uygulanacaktır.

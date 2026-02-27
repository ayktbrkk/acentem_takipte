# KVKK/GDPR P1 Uygulama Icindeki Teknik Tasarimlar (Consent / DSR / Export / Anonymize / Retention)

Tarih: 2026-02-26

Not: Bu dokuman teknik tasarimdir; hukuki metin ve saklama sureleri kurum hukuk/uyum ekipleri ile kesinlestirilmelidir.

## 1) `Consent Event` DocType Tasarimi

Amaç:
- Riza degisikliklerini (verildi/geri cekildi/guncellendi) denetlenebilir sekilde kaydetmek
- Hangi metin versiyonu ve hangi kanal ile riza alindigini ispatlayabilmek

### 1.1 Onerilen DocType

Ad: `AT Consent Event`

### 1.2 Onerilen alanlar

Zorunlu:
- `customer` (Link -> `AT Customer`)
- `consent_type` (Select)
  - `Marketing SMS`
  - `Marketing Email`
  - `Operational Notification`
  - `WhatsApp Communication`
  - `Explicit Consent - Special Category` (ihtiyaca gore)
- `event_type` (Select)
  - `Granted`
  - `Withdrawn`
  - `Updated`
- `event_at` (Datetime)
- `channel` (Select: `Web`, `Phone`, `Call Center`, `Branch`, `Email`, `WhatsApp`, `Import`, `Manual`)
- `text_version` (Data) -> riza/aydınlatma metni versiyon etiketi
- `operator_user` (Link -> `User`) -> islemi yapan kullanici (self-service ise current user / system)

Kanit / baglam:
- `proof_type` (Select: `Checkbox`, `Call Recording`, `Document`, `Import Record`, `System Default`, `Other`)
- `proof_reference_doctype` (Dynamic Link pattern / Data+Link)
- `proof_reference_name`
- `source_ip` (Data)
- `user_agent` (Small Text) [istege bagli]
- `notes` (Small Text)

Izlenebilirlik:
- `request_id` (Data) [opsiyonel]
- `payload_snapshot` (Code / Long Text, sanitized JSON) [opsiyonel]

### 1.3 Is kurallari

- `customer + consent_type + event_at` kombinasyonu audit icin degismemeli (append-only mantik)
- Mevcut `AT Customer.consent_status` gibi alanlar varsa bunlar **derived current state** olarak kalmali; kaynak gercek `AT Consent Event` olmalidir
- `Withdrawn` event'i geldiginde operasyonel gonderim akislari ilgili kanalda bloklanabilmelidir (gelecek entegrasyon)

### 1.4 Erisim kontrolu

- Read: `System Manager`, `Manager`, `Compliance/Operations` (rol tanimi gerekiyorsa yeni rol)
- Write:
  - Sistem/self-service akislari (API/service)
  - Manuel giris yalniz yetkili roller
- Delete: tercihen kapali (iptal yerine ters event yazilsin)

## 2) `Data Subject Request` (DSR) Workflow Tasarimi

Amaç:
- KVKK/GDPR kapsamindaki veri sahibi taleplerini takip etmek
- SLA, durum ve ciktiyi denetlenebilir sekilde yonetmek

### 2.1 Onerilen DocType

Ad: `AT Data Subject Request`

### 2.2 Alanlar (minimum)

Kimliklendirme:
- `request_type` (Select)
  - `Access/Export`
  - `Correction`
  - `Deletion/Anonymization`
  - `Restriction/Objection`
  - `Consent Withdrawal`
  - `Other`
- `customer` (Link -> `AT Customer`, opsiyonel ama tercih edilir)
- `requester_name` (Data)
- `requester_contact` (Data)
- `identity_verification_status` (Select: `Pending`, `Verified`, `Rejected`)
- `identity_verification_notes` (Small Text)

Surec:
- `status` (Workflow/Select)
  - `Received`
  - `Verification Pending`
  - `In Review`
  - `Waiting for Customer`
  - `Approved`
  - `Rejected`
  - `Executed`
  - `Closed`
- `received_at` (Datetime)
- `due_at` (Datetime) -> SLA hesapli
- `assigned_to_user` (Link -> `User`)
- `priority` (Select)

Sonuc:
- `decision_summary` (Small Text)
- `execution_notes` (Text)
- `result_reference_doctype` / `result_reference_name` (export package, anonymize batch vb.)
- `closed_at` (Datetime)

Uyum:
- `legal_basis_reference` (Data / Select)
- `request_channel` (Select: `Email`, `Web`, `Phone`, `In Person`, `Other`)

### 2.3 Workflow kurallari (taslak)

- `Received` -> `Verification Pending` otomatik
- Kimlik dogrulama olmadan `Approved/Executed` olmaz
- `Deletion/Anonymization` talepleri retention policy gate'inden gecmeli (hukuki saklama yukumlulugu varsa anonimlestirme/erteleme)
- Tum durum degisiklikleri audit event olusturmali (gelecek `AT Audit Event`)

### 2.4 SLA yaklasimi (taslak)

- Varsayilan `due_at` = `received_at + X gun` (hukuk ekibi belirler)
- `Waiting for Customer` durumunda SLA pause/resume politikasi netlestirilmeli

## 3) Musteri Veri Export Araci Tasarimi (JSON/CSV/PDF Paket)

Amaç:
- DSR `Access/Export` talepleri icin tekrar kullanilabilir bir export mekanizmasi

### 3.1 Onerilen servis arayuzu

Python servis modulu (taslak):
- `acentem_takipte/privacy/export_customer_data.py`

Fonksiyon (taslak):
- `build_customer_export_package(customer_name: str, *, format_set: list[str], include_documents: bool = False) -> dict`

### 3.2 Cikti formati

Paket yapisi (zip):
- `manifest.json` (uretim zamani, operator, customer, kapsam)
- `customer.json`
- `policies.csv`
- `claims.csv`
- `payments.csv`
- `notifications.csv`
- `access_logs.csv` (policy'e bagli)
- `summary.pdf` (opsiyonel, insan okunabilir ozet)
- `documents/` (opsiyonel, retention/permission policy'e bagli)

### 3.3 Teknik kurallar

- Export request ve sonuc `AT Data Subject Request` ile iliskilendirilmeli
- Export olusturma async queue'da calismali (buyuk veri setleri icin)
- Export dosyalari private storage'a yazilmali
- Time-limited download link / tek kullanimlik token onerilir
- Paket icindeki alanlar minimization kurallarina gore whitelist ile secilmeli

## 4) Musteri Anonymize/Silme Araci Tasarimi (Retention'a Bagli)

Amaç:
- DSR deletion taleplerini retention policy ve veri butunlugu bozulmadan yonetmek

### 4.1 Onerilen strateji

Varsayilan yaklasim:
- **Hard delete yerine kademeli anonymize + tombstone** (hukuki zorunluluk yoksa/uygunsa)
- Iliskili finansal/muhasebe kayitlarinda referans butunlugunu koruyacak sekilde PII alanlarini maskele/anonymize et

### 4.2 Onerilen servis arayuzu

Python servis modulu (taslak):
- `acentem_takipte/privacy/anonymize_customer_data.py`

Fonksiyon (taslak):
- `anonymize_customer(customer_name: str, *, dry_run: bool = True, policy: str = "default") -> dict`

### 4.3 Dry-run raporu (zorunlu)

Dry-run sonucu:
- Etkilenecek doctypes
- Kayit sayilari
- Anonimlestirilecek alanlar
- Retention nedeniyle dokunulmayacak kayitlar
- Manuel onay gerektiren istisnalar

### 4.4 Uygulama kurallari

- Islem sadece yetkili roller + audit event ile
- `DSR` kaydina bagli execution trace tutulur
- `AT Customer.consent_status` vb. current-state alanlar da tutarli guncellenir
- Geri alinabilirlik ihtiyaci varsa snapshot/backup politikasi hukuk/ops ile netlesmeli

## 5) Access Log Retention Politikasi (Taslak Tanim)

Kapsam:
- `AT Access Log`
- Gelecekteki `AT Audit Event` (ayri retention sinifi olabilir)

### 5.1 Onerilen retention siniflari (taslak)

- `AT Access Log`:
  - Operasyonel gorunurluk: 90 gun hot
  - Arsiv/denetim: 180-365 gun (kurum politikasi + hukuk teyidi)
  - Sonrasinda purge veya aggregate retain

- `AT Audit Event` (kritik admin aksiyonlari):
  - Daha uzun saklama (ornegin 1-2 yil veya kurum politikasi)
  - PII minimization sartiyla

### 5.2 Teknik uygulama taslagi

- Scheduler job: `daily` retention evaluator
- Dry-run rapor modu (ilk rollout)
- Purge/isaretleme logu uretimi
- Site config flag ile kontrol:
  - `at_access_log_retention_days`
  - `at_audit_event_retention_days`
  - `at_retention_dry_run`

## 6) Bu Dokumanla Kapanan Yol Haritasi Maddeleri

- `Consent Event` DocType tasarimi
- `DSR` workflow tasarimi
- Musteri veri export araci tasarimi
- Musteri anonymize/silme araci tasarimi
- Access log retention politikasi tanimi

Acik kalan (kod implementasyon gerektirir):
- Audit event logger'in kritik endpoint'lere entegre edilmesi


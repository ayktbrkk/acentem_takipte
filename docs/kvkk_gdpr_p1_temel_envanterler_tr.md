# KVKK/GDPR P1 Temel Envanterler ve Admin Audit Standardi (Teknik Hazirlik)

Tarih: 2026-02-26

Not: Bu dokuman **hukuki danismanlik degildir**. Uygulama kod tabani uzerinden teknik/operasyonel hazirlik amaciyla hazirlanmistir.

## 1) Veri Siniflandirma Envanteri (Doctype Bazli)

Kapsam hedefleri:
- `AT Customer`
- `AT Policy`
- `AT Claim`
- `AT Payment`
- `AT Notification*` (`Template`, `Draft`, `Outbox`)

Siniflandirma etiketleri:
- `PII`: kisisel veri
- `FIN`: finansal veri
- `OPS`: operasyonel / is sureci verisi
- `META`: sistem/teknik metadata
- `SPC?`: ozel nitelikli veri olma ihtimali (is surecine bagli)

| Doctype | Veri Tipleri | Ornek Alanlar (temsilî) | Risk Seviyesi | Not |
|---|---|---|---|---|
| `AT Customer` | `PII`, `OPS`, `META` | ad-soyad, telefon, e-posta, TCKN/VKN (`tax_id`), adres, assigned agent | Yuksek | Maskeleme ve `permlevel` kontrolleri mevcut; API response minimization standardi surdurulmeli |
| `AT Policy` | `PII`, `FIN`, `OPS`, `META` | musteri linki, police no, prim/komisyon/vergi, tarih araliklari, branch/company | Yuksek | Finansal + musteri baglantili temel kayit |
| `AT Claim` | `PII`, `FIN`, `OPS`, `META`, `SPC?` | hasar no, policy/customer link, approved/paid amounts, status, aciklama/dokuman linkleri | Yuksek | Dokuman/icerik tarafinda saglik verisi vb. ozel veri riski olabilir |
| `AT Payment` | `PII`, `FIN`, `OPS`, `META` | payment amount/currency, claim/policy/customer link, posting date, direction | Yuksek | Muhasebe ve tahsilat akislariyla iliskili |
| `AT Notification Template` | `OPS`, `META` | event key, channel, template body, language | Orta | Dogrudan PII saklamaz; template iceriginde PII placeholder olabilir |
| `AT Notification Draft` | `PII`, `OPS`, `META` | customer, recipient(phone/email), rendered body, status, context | Yuksek | Gonderim oncesi PII + mesaj icerigi |
| `AT Notification Outbox` | `PII`, `OPS`, `META` | recipient, provider, provider_message_id, response_log, status | Yuksek | Dis saglayici aktarim izi ve delivery metadata |

Ek not:
- `AT Access Log` ve olasi audit event kayitlari da `META` + dolayli `PII` (IP, user) kapsamina girer.

## 2) Isleme Amaci / Hukuki Sebep Envanteri (Taslak)

Bu tablo teknik ekip + hukuk/uyum ekibi ortak dogrulamasina aciktir.

| Veri Grubu | Isleme Amaci | Muhtemel Hukuki Dayanak (KVKK/GDPR) | Saklama Yaklasimi (Taslak) | Sorumlu Alan |
|---|---|---|---|---|
| Musteri kimlik/iletisim (`AT Customer`) | Sigorta teklif/police/hasar operasyonlarini yurütme, iletisim | Sozlesmenin kurulmasi/ifasi, hukuki yukumluluk, mesru menfaat (senaryoya gore) | Aktif iliski + mevzuat/uyusmazlik sureleri | Operasyon + Uyum |
| Police/teklif verileri (`AT Policy`, `AT Offer`, `AT Lead`) | Teklifleme, police uretimi, yenileme takibi | Sozlesme ifasi, mesru menfaat | Islem + raporlama/denetim sureleri | Operasyon / Satis |
| Tahsilat/muhasebe (`AT Payment`, `AT Accounting*`) | Finansal kayit, mutabakat, raporlama | Hukuki yukumluluk + sozlesme ifasi | Vergi/ticari kayit saklama sureleri | Muhasebe |
| Hasar (`AT Claim`) | Hasar sureci takibi ve odeme durumu | Sozlesme ifasi + hukuki yukumluluk | Hasar dosyasi/uyusmazlik saklama sureleri | Operasyon / Hasar |
| Bildirim kayitlari (`AT Notification*`) | Musteri bilgilendirme, operasyonel mesajlasma | Sozlesme ifasi / mesru menfaat / acik riza (kanal ve icerige gore) | Kisa-orta sureli operasyonel log + denetim ihtiyaci | Operasyon / Uyum |
| Erisim / audit log | Guvenlik, izlenebilirlik, suistimal tespiti | Mesru menfaat + hukuki yukumluluk | Kisa/orta sureli log retention | IT / Guvenlik |

Oneri:
- Bu tabloyu daha sonra `VERBIS` / aydinlatma metni / riza metni versiyonlari ile esleyin.

## 3) Dis Saglayici Envanteri (Kod Tabanli Ilk Taslak)

Asagidaki envanter koddan tespit edilebilen entegrasyonlari kapsar. Uretim ortaminda kullanilan tum servisler (backup, monitoring, object storage, email relays, SMS gateways vb.) ops/infra tarafindan tamamlanmalidir.

| Saglayici/Servis | Kullanim Alani | Kod Sinyali | Veri Turu | Ortam Durumu | Not |
|---|---|---|---|---|---|
| Frappe Email (SMTP/Email Queue) | Email bildirim gonderimi | `communication.py` (`Email(Frappe)`) | PII + mesaj icerigi | Config'e bagli | Asil saglayici (SMTP vendor) ayrica envantere islenmeli |
| WhatsApp API (vendor-agnostic) | SMS/mesaj kanali (adapter uzerinden) | `communication.py` (`_send_whatsapp`, `at_whatsapp_api_*`) | PII + mesaj icerigi + metadata | Config'e bagli | URL/token/sender site_config ile geliyor; vendor adi prod config'den teyit edilmeli |
| WhatsApp Sandbox/DryRun | Gelistirme/test kanal simulasyonu | `communication.py` (`WhatsApp(Sandbox)`, `WhatsApp(DryRun)`) | Test verisi | Dev/Test | Uretimde kapali/denetimli olmali |
| TCMB XML endpoint | Kur bilgisi cekme | `doctype/at_policy/at_policy.py`, `at_payment.py` | PII yok (genelde) | Ops | Harici veri kaynagi; transfer riski dusuk (PII tasimiyor) |
| Frappe/ERPNext host + DB + Redis | Uygulama calisma ortami | Tum uygulama | Tüm veri kategorileri | Prod/Dev | Asil hosting/backup saglayicilari infra envanterinden tamamlanmali |

## 4) Yurt Disi Aktarim Riski Isaretleme (Ilk Degerlendirme)

Bu tablo hukuki son karar degildir; risk isaretleme amaclidir.

| Entegrasyon | Yurt Disi Aktarim Riski | Gerekce | Aksiyon |
|---|---|---|---|
| WhatsApp/API saglayicisi | Yuksek / Belirsiz | Telefon no + mesaj icerigi + metadata harici API'ye gidebilir | Vendor ulke/lokasyon, DPA, aktarim mekanizmasi teyit edilmeli |
| Email saglayicisi (SMTP/relay) | Orta / Belirsiz | E-posta adresi + mesaj icerigi relay uzerinden tasinabilir | SMTP vendor ve data residency teyidi gerekli |
| TCMB XML | Dusuk | Kisisel veri gonderimi beklenmez (yalnizca public rate fetch) | Loglarda istem disi PII olmadigi teyit edilmeli |
| Hosting/Backup/Monitoring | Yuksek / Belirsiz | Tum DB/file yedekleri ve loglar tasinabilir | Infra/vendor envanteri + sozlesme + lokasyon teyidi |

## 5) Admin Aksiyon Audit Log Standardi (Belirlendi)

Amaç:
- Kritik admin/operator aksiyonlarini izlenebilir ve denetlenebilir hale getirmek
- Security incident / data integrity / compliance incelemelerinde minimal gerekli kaniti saglamak

### 5.1 Kapsama alinacak aksiyon siniflari (minimum)

- Admin job triggers (`api.admin_jobs.*`)
- Muhasebe mutasyonlari (`api.accounting.resolve_item`, `run_sync`, `run_reconciliation_job`)
- Iletisim mutasyonlari (`send_draft_now`, `retry_outbox_item`, `requeue_outbox_item`, `run_dispatch_cycle`)
- Demo/smoke endpoint cagirilari (zaten audit ediliyor)
- Veri export / anonymize / delete (eklenecek tooling ile)
- Kritik donusumler (`convert_to_offer`, `convert_to_policy`) [opsiyonel ama onerilir]

### 5.2 Minimum audit event payload standardi

Zorunlu alanlar:
- `timestamp` (server-side)
- `action` (ornek: `api.accounting.resolve_item`)
- `user`
- `ip`
- `result` (`started`, `success`, `denied`, `error`) -> su an `audit_admin_action` daha cok event log niteliginde; genisletme onerilir
- `details` (whitelisted key/value)

Opsiyonel ama onerilen:
- `request_id` / correlation id
- `target_doctype`
- `target_name`
- `status_before` / `status_after`
- `error_code` / `error_message` (sanitize edilmis)

### 5.3 Gizlilik / veri minimizasyon kurallari

- `details` icine raw token/parola/API key yazilmaz
- Gereksiz PII (tam mesaj icerigi, full body template) audit log'a yazilmaz
- Dokuman isimleri / ID'ler yazilabilir; icerik dump edilmez
- Hata loglarinda stacktrace ile PII sizmasi gozden gecirilir

### 5.4 Teknik uygulama durumu (bugun)

- Mevcut helper: `acentem_takipte.api.security.audit_admin_action(...)`
- Mevcut kullanimlar: `api/seed.py`, `api/smoke.py`, `api/accounting.py`, `api/communication.py`, `api/admin_jobs.py`
- Sonraki adim: `AT Audit Event` DocType veya structured logger sink (DB/file) tasarimi

## 6) Sonraki Teknik Adimlar (KVKK/GDPR backlog ile bagli)

Bu dokumanla Faz-4 ilk 5 checklist maddesi kapatilir. Sonraki teknik maddeler:
- `Consent Event` DocType tasarimi
- `DSR` workflow tasarimi
- Musteri export/anonymize tooling tasarimi
- Audit event logger entegrasyonunu structured hale getirme
- Access log retention policy tanimlama ve scheduler/purge mekanizmasi


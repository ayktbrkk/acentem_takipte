# Frappe Standart Uyum Remediation Planı

Tarih: 2026-05-04
Kapsam: `acentem_takipte`
Kaynak: 2026-05-04 tarihli workspace denetimi

Bu dosya, denetim bulgularını uygulanabilir ve takip edilebilir maddelere dönüştürür.
Durum alanları:

- `[ ]` Başlanmadı
- `[-]` Devam ediyor
- `[x]` Tamamlandı
- `[!]` Bloklu / karar gerekiyor

## KRİTİK

- [x] `patches.txt` içindeki yanlış dotted path girişlerini düzelt.
  Neden: İlk patch kayıtları gerçek Python modül konumunu göstermiyordu; temiz migrate/install akışında patch import başarısızlığı üretebilir.
  Hedef dosya: `acentem_takipte/patches.txt`
  Doğrulama: Tüm patch satırları gerçek modül yolu olan `acentem_takipte.acentem_takipte.patches.*` biçimini kullanmalı.
  Resmi referans: Frappe Migrations
  https://docs.frappe.io/framework/user/en/guides/deployment/migrations

- [x] Veritabanı mutasyonu yapan whitelisted method'ları POST-only hale getir.
  Neden: `create_request`, `archive_document`, `restore_document`, `permanent_delete_document`, `upload_document` gibi endpoint'ler veri değiştiriyor ama yalnızca genel `@frappe.whitelist()` ile açılmış.
  Hedef dosyalar:
  - `acentem_takipte/acentem_takipte/api/break_glass.py`
  - `acentem_takipte/acentem_takipte/api/documents.py`
  Doğrulama: Mutating endpoint'ler ya `@frappe.whitelist(methods=["POST"])` kullanmalı ya da ortak `assert_post_request()` kontrolü ile korunmalı.
  Resmi referans: Frappe REST API
  https://docs.frappe.io/framework/user/en/api/rest

## YÜKSEK

- [x] Break-glass request oluşturma akışını DocType izin modeliyle hizala.
  Neden: Servis katmanında `ignore_permissions=True` ile kayıt açılıyor; bu bilinçli olabilir ama metadata izin modelini baypas ettiği için operasyonel doğruluk ve denetlenebilirlik zayıflıyor.
  Hedef dosyalar:
  - `acentem_takipte/acentem_takipte/services/break_glass.py`
  - `acentem_takipte/acentem_takipte/doctype/at_break_glass_request/at_break_glass_request.json`
  Doğrulama: Talep oluşturma akışında izin politikası tek yerde tanımlı ve açıklanmış olmalı.
  Resmi referans: Frappe Hooks / Document Permissions
  https://docs.frappe.io/framework/user/en/python-api/hooks

## ORTA

- [x] Deprecated `website_user_home_page` kullanımını güncel hook ile değiştir.
  Neden: Framework dokümantasyonunda deprecated; upgrade davranış farkı riski var.
  Hedef dosya: `acentem_takipte/hooks.py`
  Doğrulama: `home_page` veya `get_website_user_home_page` kullanılmalı.
  Resmi referans: Frappe Hooks
  https://docs.frappe.io/framework/user/en/python-api/hooks

- [x] Router `meta.title` değerlerini çeviri sistemiyle uyumlu hale getir.
  Neden: Literal string başlıklar Frappe translation extraction tarafından otomatik toplanmaz.
  Hedef dosya: `frontend/src/router/index.js`
  Doğrulama: Route başlıkları `__()` veya mevcut uygulama i18n katmanından geçmeli.
  Resmi referans: Frappe Translations
  https://docs.frappe.io/framework/user/en/translations

- [x] Çift `hooks.py` yapısını belgeleyip yanlış düzenleme riskini azalt.
  Neden: Repo kökündeki pointer dosya ile gerçek runtime hook dosyası arasında yanlış dosyanın düzenlenmesi riski var.
  Hedef dosyalar:
  - `README.md`
  - `AGENTS.md`
  - gerekirse `.github` instruction dosyaları
  Doğrulama: Tüm geliştirici giriş noktaları canonical runtime dosyasını açıkça işaret etmeli.
  Resmi referans: Frappe Apps
  https://docs.frappe.io/framework/user/en/guides/basics/apps

## DÜŞÜK

- [x] `hooks.py` metadata'sına `app_version` ekle veya sürüm kaynağını tekilleştir.
  Neden: Paket sürümü ile hook metadata'sı arasında drift oluşuyor.
  Hedef dosyalar:
  - `acentem_takipte/hooks.py`
  - `acentem_takipte/__init__.py`
  Doğrulama: Sürüm bilgisi tek kaynaktan okunuyor veya iki yerde de tutarlı.
  Resmi referans: Frappe Apps
  https://docs.frappe.io/framework/user/en/guides/basics/apps

- [x] `export_python_type_annotations` kullanımını değerlendir.
  Neden: v15+ controller ergonomisi ve refactor güvenliği için yararlı.
  Hedef dosya: `acentem_takipte/hooks.py`
  Doğrulama: Etkinleştirme kararı belgelenmiş olmalı; açılırsa controller blokları generate edilmeli.
  Resmi referans: Frappe Controllers
  https://docs.frappe.io/framework/user/en/basics/doctypes/controllers

## Uygulama Günlüğü

- 2026-05-04: Plan dosyası oluşturuldu.
- 2026-05-04: `patches.txt` içindeki ilk patch dotted path tutarsızlığı düzeltildi.
- 2026-05-04: Break-glass ve doküman mutasyon endpoint'leri POST-only hale getirildi.
- 2026-05-04: Break-glass request oluşturma akışı `ignore_permissions` yerine DocType create iznine bağlandı; istek görünürlüğü requester bazlı permission hook ile sınırlandı.
- 2026-05-04: Deprecated `website_user_home_page` kaldırıldı; home-page routing mevcut session interface çözümleyicisine bağlandı.
- 2026-05-04: Router `meta.title` değerleri route-meta resolver üzerinden uygulama i18n katmanına bağlandı; document.title artık locale-aware güncelleniyor.
- 2026-05-04: README ve AGENTS içinde çift `hooks.py` yapısı netleştirildi; runtime değişiklikler için yalnızca `acentem_takipte/hooks.py` işaretlendi.
- 2026-05-04: `hooks.py` içine `app_version = __version__` eklendi; uygulama metadata sürümü paket sürümüyle tekilleştirildi.
- 2026-05-04: `export_python_type_annotations = True` etkinleştirildi; sonraki DocType sync/güncellemelerinde controller tip blokları üretilecek.
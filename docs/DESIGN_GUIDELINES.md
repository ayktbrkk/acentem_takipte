# 🎨 Acentem Takipte (AT) Tasarım Kılavuzu, UI Standartları & Manifesto

Bu döküman, "Acentem Takipte" uygulamasının UI/UX tutarlılığını korumak ve geliştirme kurallarını tanımlamak için oluşturulmuştur. Yeni geliştirilecek tüm modüllerde bu kurallara uyulması zorunludur.

---

## 0. AT Manifestosu (Kimlik, i18n ve Kod Kalitesi)

### 1. Kimlik ve Mimari (Identity & Architecture)

**Proje Adı:** Acentem Takipte (Kısaltma: **AT**)

**Teknoloji Yığını:** Frappe Framework (Backend/Python), Vue 3 (Frontend/JS), MariaDB.

**İsimlendirme Standardı:** Tüm yeni klasörler, dosyalar, DocType'lar ve metotlar `at_` veya `AT` ön ekiyle başlamalıdır (Örn: `at_policy.py`, `AT Insurance Dashboard`).

### 2. Çok Dillilik (i18n) - KESİN KURAL

**Kaynak Dil:** Tüm kod tabanı, değişkenler ve yorum satırları **İngilizce** olmalıdır.

**UI Dili:** Kullanıcının gördüğü her metin çift dilli (EN/TR) olmalıdır.

**Sarmalama (Wrapping):**
- **Python:** Tüm stringler `_("Metin")` içinde olmalıdır.
- **Javascript/Vue:** Tüm stringler `__("Metin")` veya `this.__("Metin")` içinde olmalıdır.

**Hardcoded Yasak:** Kod bloğu içinde çıplak string (Örn: `msg = "Hata"`) kullanımı doğrudan bir kural ihlalidir.

### 3. Kod Kalitesi ve Güvenlik

**Frappe Standartları:** Database sorgularında her zaman `frappe.db.get_value` veya `frappe.get_doc` gibi yerel metotlar kullanılmalı; raw SQL'den kaçınılmalıdır.

**Validation:** Tüm veri girişleri server-side tarafında `validate()` metodu ile kontrol edilmelidir.

**Hata Yönetimi:** Kullanıcıya dönen hatalar `frappe.throw(_("Error Message"))` ile i18n uyumlu verilmelidir.

### 4. Çıktı Formatı

Bir kod bloğu paylaşıldığında, eğer içinde yeni metinler varsa, en alta bu metinlerin `tr.csv` dosyasına eklenmesi gereken halleri (Key, Translation) tablo veya liste olarak eklenmelidir.

---

## 1. Renk Paleti (Color Tokens)

Uygulamanın ana kimliği **Mavi (Brand Blue)** üzerine kuruludur.

| Token | Değer | Kullanım Amacı |
| :--- | :--- | :--- |
| `brand-600` | `#1B5DB8` | **Ana Marka Rengi.** Primary butonlar, aktif tablar. |
| `brand-500` | `#3B82F6` | Hover durumları ve ikincil vurgular. |
| `brand-50` | `#EBF3FF` | Açık arka planlar, rozet (badge) zeminleri. |
| `slate-900` | `#0F172A` | Ana metin rengi ve başlıklar. |
| `slate-400` | `#94A3B8` | Yardımcı metinler (Labels, Placeholders). |

## 2. Tipografi (Typography)

- **Font Family:** `DM Sans` (SaaS ve Finans uygulamaları için optimize edilmiş modern sans-serif).
- **Font Sizes:**
  - `Base`: 13px (Poliçe ve tablo verileri için ideal yoğunluk).
  - `Label`: 10.5px (Uppercase, 0.05em tracking).
  - `Title`: 18px - 20px (font-semibold).

## 3. Bileşen Kuralları (Component Rules)

### Kartlar & Konteynırlar
- **Radius:** Daima `rounded-xl` (12px).
- **Border:** `0.5px solid #E5E7EB` (Premium görünüm için ince kenarlık).
- **Shadow:** `shadow-sm` (Hafif derinlik).

### Butonlar
- **Primary:** `bg-brand-600` + `text-white`. Mutlaka `active:scale-95` transition içermelidir.
- **Secondary:** `border-slate-300` + `text-slate-700`.
- **Radius:** `rounded-lg` (8px).

### Inputlar
- **Yükseklik:** Sabit 36px.
- **Focus State:** `border-brand-600` + `ring-2 ring-brand-600/20`.

## 4. Spacing (Hiyerarşi)

- **Sayfa Padding:** `p-5` (20px).
- **Kart İçi Padding:** `p-4` (16px) veya `p-5` (20px).
- **Eleman Arası Boşluklar:** `gap-3` (12px) veya `gap-4` (16px).

## 5. UI Kontrol Listesi (Deployment Öncesi)
- [ ] Butonların `hover` ve `active` durumları var mı?
- [ ] Boş liste durumları için `card-empty` sınıfı kullanıldı mı?
- [ ] İkonlar `FeatherIcon` kütüphanesinden mi seçildi?
- [ ] Renkler inline HEX kodu yerine Tailwind `brand-*` sınıflarıyla mı verildi?

---
*Son Güncelleme: 2026-04-24*

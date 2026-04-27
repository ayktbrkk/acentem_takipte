Bu dökümanı, **Acentem Takipte (AT)** projesinin ruhuna uygun, çok dilliliği (i18n) merkezine alan ve profesyonel bir "InsurTech" standartına taşıyan nihai versiyonuyla yeniden hazırladım. 

Bu döküman, hem geliştiriciler hem de Antigravity gibi AI agent'lar için bir **"Anayasa"** niteliğindedir.

---

# 🎨 Acentem Takipte (AT) Tasarım Kılavuzu & Manifesto v2.0

Bu döküman, **AT** ekosistemindeki tüm modüllerin tutarlılığını, çok dilli yapısını ve profesyonel veri mimarisini korumak için yazılmıştır.

---

## 0. AT Manifestosu: İngilizce Kod, Çift Dilli UI

### 1. İsimlendirme ve Mimari (Naming & Architecture)
- **Prefix:** Tüm yeni nesneler (DocType, Method, Class, CSS) `at_` ön ekiyle başlamalıdır.
- **Dil Önceliği:** Kod tabanı (Değişkenler, DB sütunları, yorumlar) **tamamen İngilizce** olmalıdır.
- **UI Kuralı:** Kullanıcıya sunulan her metin **TR/EN** destekli olmalıdır.

### 2. Çok Dillilik (i18n) Standartları
Hardcoded (kod içine gömülü) metin kullanımı kesinlikle yasaktır.
- **Python:** `_("Policy Details")`
- **Javascript/Vue:** `__("Policy Details")` veya `this.__("Policy Details")`
- **CSV Mapping:** Her yeni geliştirme sonunda, eklenen metinler `tr.csv` dosyasına şu formatta eklenmelidir:
  > `"Policy Details","Poliçe Detayları"`

---

## 1. Renk Paleti ve Semantik Anlamlar (Color Tokens)

Sigortacılıkta renkler aksiyon tetikler. Rastgele renk kullanımı yasaktır.

| Kategori | Token | Değer | Kullanım Amacı |
| :--- | :--- | :--- | :--- |
| **Primary** | `brand-600` | `#1B5DB8` | Ana Marka Rengi. Butonlar, aktif sekmeler. |
| **Success** | `at-green` | `#10B981` | Aktif Poliçe, Onaylanmış Tahsilat, Yürürlükte Zeyil. |
| **Warning** | `at-amber` | `#F59E0B` | Yenileme Yaklaşan (30 gün), Teklif Bekleyen Fırsat. |
| **Danger** | `at-red` | `#EF4444` | İptal Poliçe, Gecikmiş Ödeme, Kaybedilmiş Fırsat. |
| **Neutral** | `slate-400` | `#94A3B8` | Etiketler (Labels), Yardımcı metinler. |

---

## 2. Tipografi ve Veri Yoğunluğu (Data Density)

- **Font:** `DM Sans` (Varsayılan).
- **Zıtlık Kuralı:** - **Etiket (Label):** `slate-400`, `font-normal`, `11px`.
    - **Değer (Value):** `slate-900`, `font-semibold`, `13px`.
- **Sayısal Veriler:** Tüm prim ve tutarlar sağa yaslı (`text-right`) ve para birimi sembolüyle (`14.000,00 ₺`) gösterilmelidir.

---

## 3. Bileşen Standartları (Component Rules)

### Kartlar (Cards)
- **Radius:** `rounded-xl` (12px).
- **Style:** `bg-white`, `border-slate-100`, `shadow-sm`.
- **Empty State:** Veri yoksa kart gizlenmez; şık bir ikon ve "Henüz kayıt bulunamadı" (i18n uyumlu) mesajı gösterilir.

### Rozetler (Status Badges)
- **Tasarım:** `rounded-full` (tam oval), `px-2.5`, `py-0.5`, `text-xs`.
- **Renk:** Metin rengi, arka planın 2 ton koyusu olmalıdır (Soft background).

### İnteraktif Alanlar (Inline Edit)
- Kullanıcının girdiği her alan (Poliçe No, TCKN vb.) düzenlenebilir olmalıdır.
- **Hover:** Arka plan `bg-slate-50` olur ve sağda `pencil` ikonu belirir.

---

## 4. Sayfa Yerleşim Standartları (The Master Skeleton)

Tüm detay sayfaları (Poliçe, Teklif, Hasar, Müşteri) **8+4 Grid** yapısını kullanır.

### Sol Kolon (8 Birim) - Teknik & Finansal Detaylar
- **Bölümleme:** Veriler `Poliçe Teknik Detayları`, `Finansal Detaylar` gibi başlıklarla kartlara ayrılır.
- **Hizalama:** Her satır `flex justify-between` olmalı; etiket solda, veri sağda yer almalıdır.
- **Timeline:** Alt kısımda "İşlem Geçmişi" dikey bir akış olarak sunulur.

### Sağ Kolon (4 Birim) - Sosyal & Operasyonel
- **Müşteri Kartı:** TCKN, Doğum Tarihi (Bireysel ise), Meslek ve KVKK durumu burada yer alır.
- **Dosyalar & Görevler:** Döküman yönetimi ve ilgili hatırlatıcılar bu kolondadır.
- **Sticky:** Bu kolon, uzun sayfalarda kullanıcıyla birlikte aşağı kayar.

---

## 5. UI Kontrol Listesi (Deployment Checklist)

- [ ] **i18n Check:** Tüm stringler `__()` içine alındı mı?
- [ ] **TR.CSV:** Yeni eklenen terimler çeviri dosyasına işlendi mi?
- [ ] **Masking:** TCKN ve Telefon numaraları için maske uygulandı mı?
- [ ] **Inline Edit:** Kullanıcı alanları tıkla-düzenle modunda mı?
- [ ] **Consistency:** Buton radius'ları ve boşluklar (gap-4) standartlara uygun mu?
- [ ] **Currency:** Tüm tutarlar acentelik standartlarında (binlik ayraçlı) mı?

---

### 💡 Ek Not:
Bu dökümanı her modül geliştirmesinde referans al. Özellikle "Poliçe Detay" sayfasındaki teknik ve finansal verileri `flex justify-between` düzenine getirirken, verilerin i18n karşılıklarının doğruluğunu denetle.


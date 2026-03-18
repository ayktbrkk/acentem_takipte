# Acentem Takipte - Kapsamlı Design System Migration

Bu paket, Acentem Takipte uygulamasının TÜM modüllerini tutarlı tasarım sistemine geçirmek için hazırlanmış kapsamlı bir yol haritasıdır.

## 📊 Modül Yapısı

### 1️⃣ Genel Görünüm (1 gün)
- Dashboard / Pano

### 2️⃣ Satış ve Portföy (4 gün)
- Fırsatlar (Liste + Detay)
- Teklifler (Liste + Detay) ✅ TAMAMLANDI
- Poliçeler (Liste + Detay) ✅ TAMAMLANDI
- Müşteriler (Liste + Detay) ✅ TAMAMLANDI

### 3️⃣ Operasyonlar (5 gün)
- Hasarlar (Liste + Detay)
- Ödemeler (Liste + Detay)
- Yenilemeler (Liste + Detay + Board)
- Mutabakat (Liste + Detay)
- Raporlar (Çoklu Sayfalar)

### 4️⃣ İletişim ve Takip (4 gün)
- İletişim Merkezi (Dashboard)
- Görevler (Liste + Detay)
- Bildirim Taslakları (Liste + Detay)
- Giden Bildirimler (Liste + Detay)

### 5️⃣ Ana Veriler (4 gün)
- Sigorta Şirketleri (Liste + Detay)
- Branşlar (Liste + Detay)
- Satış Birimleri (Liste + Detay)
- Bildirim Şablonları (Liste + Editor)

### 6️⃣ Finans ve Kontrol (2 gün)
- Muhasebe Kayıtları (Liste + Detay)
- Mutabakat Kalemleri (Liste + Detay)

### 7️⃣ Formlar ve Dialoglar (3 gün)
- Tüm Quick Create Dialog'ları
- Tüm Edit Form'ları
- Import/Export Ekranları

### 8️⃣ Final Cleanup (1 gün)
- Kod temizliği
- Performance optimizasyonu
- Dokümantasyon

## 📁 Dosya Organizasyonu

```
design-system-complete/
├── README.md (bu dosya)
├── 01-genel-gorunum/
│   └── 01-dashboard.md
├── 02-satis-portfoy/
│   ├── 01-firsatlar-list.md
│   ├── 02-firsatlar-detail.md
│   └── (teklifler, poliçeler, müşteriler - zaten yapıldı)
├── 03-operasyonlar/
│   ├── 01-hasarlar-list.md
│   ├── 02-hasarlar-detail.md
│   ├── 03-odemeler-list.md
│   ├── 04-odemeler-detail.md
│   ├── 05-yenilemeler-list.md
│   ├── 06-yenilemeler-detail.md
│   ├── 07-yenilemeler-board.md
│   ├── 08-mutabakat-list.md
│   ├── 09-mutabakat-detail.md
│   └── 10-raporlar.md
├── 04-iletisim-takip/
│   ├── 01-iletisim-merkezi.md
│   ├── 02-gorevler-list.md
│   ├── 03-gorevler-detail.md
│   ├── 04-bildirim-taslaklari-list.md
│   ├── 05-bildirim-taslaklari-detail.md
│   ├── 06-giden-bildirimler-list.md
│   └── 07-giden-bildirimler-detail.md
├── 05-ana-veriler/
│   ├── 01-sigorta-sirketleri-list.md
│   ├── 02-sigorta-sirketleri-detail.md
│   ├── 03-branslar-list.md
│   ├── 04-branslar-detail.md
│   ├── 05-satis-birimleri-list.md
│   ├── 06-satis-birimleri-detail.md
│   ├── 07-bildirim-sablonlari-list.md
│   └── 08-bildirim-sablonlari-editor.md
├── 06-finans-kontrol/
│   ├── 01-muhasebe-kayitlari-list.md
│   ├── 02-muhasebe-kayitlari-detail.md
│   ├── 03-mutabakat-kalemleri-list.md
│   └── 04-mutabakat-kalemleri-detail.md
├── 07-formlar-dialoglar/
│   ├── 01-quick-create-all.md
│   ├── 02-edit-forms-all.md
│   └── 03-import-export.md
└── 08-final-cleanup/
    └── 01-cleanup-optimization.md
```

## 🎯 Öncelik Sırası

### Faz 1: Kritik İşlem Sayfaları (Hafta 1-2)
1. ✅ Dashboard (yapıldı)
2. Fırsatlar (liste + detay)
3. ✅ Teklifler (yapıldı)
4. ✅ Poliçeler (yapıldı)
5. ✅ Müşteriler (yapıldı)
6. Hasarlar (liste + detay)
7. Ödemeler (liste + detay)
8. Yenilemeler (liste + detay + board)

### Faz 2: İletişim ve Takip (Hafta 3)
9. İletişim Merkezi
10. Görevler
11. Bildirim Taslakları
12. Giden Bildirimler

### Faz 3: Ana Veriler ve Ayarlar (Hafta 3-4)
13. Sigorta Şirketleri
14. Branşlar
15. Satış Birimleri
16. Bildirim Şablonları
17. Muhasebe Kayıtları
18. Mutabakat Kalemleri

### Faz 4: Raporlar ve Özel Ekranlar (Hafta 4)
19. Tüm Rapor Sayfaları
20. Mutabakat Ekranları

### Faz 5: Formlar (Hafta 4-5)
21. Quick Create Dialog'ları
22. Edit Form'ları
23. Import/Export

### Faz 6: Final (Hafta 5)
24. Cleanup ve Optimizasyon

## 📋 İlerleme Takibi

### Genel Görünüm
- [x] Dashboard

### Satış ve Portföy
- [x] Fırsatlar - Liste
- [x] Fırsatlar - Detay
- [x] Teklifler - Liste
- [x] Teklifler - Detay
- [x] Poliçeler - Liste
- [x] Poliçeler - Detay
- [x] Müşteriler - Liste
- [x] Müşteriler - Detay

### Operasyonlar
- [x] Hasarlar - Liste
- [x] Hasarlar - Detay
- [x] Ödemeler - Liste
- [x] Ödemeler - Detay
- [x] Yenilemeler - Liste
- [x] Yenilemeler - Detay
- [x] Yenilemeler - Board
- [x] Mutabakat - Liste
- [x] Mutabakat - Detay
- [x] Raporlar

### İletişim ve Takip
- [x] İletişim Merkezi
- [x] Görevler - Liste
- [x] Görevler - Detay
- [x] Bildirim Taslakları - Liste
- [x] Bildirim Taslakları - Detay
- [x] Giden Bildirimler - Liste
- [x] Giden Bildirimler - Detay

### Ana Veriler
- [x] Sigorta Şirketleri - Liste
- [x] Sigorta Şirketleri - Detay
- [x] Branşlar - Liste
- [x] Branşlar - Detay
- [x] Satış Birimleri - Liste
- [x] Satış Birimleri - Detay
- [x] Bildirim Şablonları - Liste
- [x] Bildirim Şablonları - Editor

### Finans ve Kontrol
- [x] Muhasebe Kayıtları - Liste
- [x] Muhasebe Kayıtları - Detay
- [x] Mutabakat Kalemleri - Liste
- [x] Mutabakat Kalemleri - Detay

### Formlar ve Dialoglar
- [x] Quick Create (Tümü)
- [x] Edit Forms (Tümü)
- [x] Import/Export

### Final
- [x] Cleanup & Optimization

## 🚀 Hızlı Başlangıç

1. **Önkoşulları kontrol et** (design system CSS, komponentler)
2. **Modül seç** (yukarıdaki klasörlerden birini)
3. **Prompt'u aç** ve VSCode Agent'a ver
4. **Test et** her değişiklikten sonra
5. **İşaretle** tamamlanan maddeleri
6. **Devam et** sıradaki modüle

## 🛠️ Audit Script

```bash
# Tüm modüllerin durumunu kontrol et
node scripts/audit-design-system-complete.js
```

## 📝 Notlar

- Her modül için ayrı gün/dosya ayrılmıştır
- Liste ve Detay sayfaları ayrı prompt'lardır
- Benzer sayfalar için referans verilmiştir
- Her prompt bağımsız çalışabilir

## ⚡ Hızlandırılmış Versiyon

Eğer hızlı ilerlemek istiyorsan, benzer sayfaları toplu işle:
- Tüm liste sayfaları birlikte (pattern aynı)
- Tüm detay sayfaları birlikte (pattern aynı)
- Tüm quick create dialog'ları birlikte

## 📞 Destek

Her prompt, o sayfaya özel detaylı talimatlar içerir.
Stuck olursan, önceki başarılı sayfaları referans al.

---

**Toplam Tahmini Süre**: 4-5 hafta (günde 2-3 sayfa)
**Zorluk**: Orta (pattern'ler netleştikçe kolaylaşır)
**Etki**: %100 tutarlı UI/UX ✨

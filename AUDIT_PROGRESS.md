# Acentem Takipte — Audit Uygulama Takibi

**Başlangıç:** 22 Nisan 2026  
**Kaynak:** `acentem-audit.html` — Performans & Güvenlik Denetim Planı  
**Yöntem:** Her madde tamamlandığında bu dosya güncellenerek commit atılacak.

---

## 📊 Genel İlerleme

| Kategori    | Tamamlanan | Toplam | Durum |
|-------------|-----------|--------|-------|
| 🚀 Performans | 4 | 11 | ⏳ Devam Ediyor |
| 🛡️ Güvenlik  | 0 | 9  | ⬜ Bekliyor |
| 🗺️ Roadmap   | 0 | 8  | ⬜ Bekliyor |
| **Toplam**  | **4** | **28** | **14%** |

---

## 🚀 Bölüm 1: Performans Optimizasyonları

### 1.1 Frontend — Bundle Size & Lazy Loading

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| P-01 | Component-Level Lazy Loading (`Dashboard.vue`, `CustomerDetail.vue`) | 🔴 Kritik | ~2s | ✅ Tamamlandı | c17ea56 |
| P-02 | Tree-Shaking Kontrolü (`chart.js` & `@iconify-json/lucide`) | 🔴 Kritik | ~1s | ✅ Tamamlandı | e843672 |
| P-03 | Link Prefetching (Router hover prefetch) | 🟡 Orta | ~1s | ✅ Tamamlandı | 430dea5 |
| P-04 | Skeleton Loader (FCP sonrası beyaz ekran gizleme) | 🟡 Orta | ~3s | ✅ Tamamlandı | 71d8446 |

### 1.2 Backend — Redis Cache Stratejileri

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| P-05 | KPI/Metrik Cache'leme (`api/dashboard.py` → Redis TTL) | 🔴 Kritik | ~2s | ⬜ Bekliyor | — |
| P-06 | Akıllı Cache Invalidation (Frappe Hooks ile anahtar bazlı) | 🔴 Kritik | ~2s | ⬜ Bekliyor | — |
| P-07 | Master Data Caching (Şehirler, Poliçe Tipleri → IndexedDB) | 🟢 Düşük | ~1.5s | ⬜ Bekliyor | — |

### 1.3 Veritabanı — Sorgu Verimliliği

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| P-08 | N+1 Sorgu Problemi (döngü içi `frappe.get_doc` → bulk fetch) | 🔴 Kritik | ~3s | ⬜ Bekliyor | — |
| P-09 | Sadece Gerekli Alanları Çek (`fields=` parametresi zorunlu) | 🟡 Orta | ~2s | ⬜ Bekliyor | — |
| P-10 | Veritabanı Index'leri (`end_date`, `customer`, `status`) | 🔴 Kritik | ~1s | ⬜ Bekliyor | — |

---

## 🛡️ Bölüm 2: Güvenlik Denetimleri (OWASP Top 10)

### 2.1 Kimlik Doğrulama & Yetkilendirme

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| S-01 | IDOR Koruması (`frappe.has_permission` tüm whitelist API'lerde) | 🔴 Kritik | ~4s | ⬜ Bekliyor | — |
| S-02 | Oturum Çerezleri (`HttpOnly` & `Secure` & `SameSite=Strict`) | 🔴 Kritik | ~1s | ⬜ Bekliyor | — |

### 2.2 Enjeksiyon Saldırıları (SQLi & XSS)

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| S-03 | SQL Injection (f-string → parametrik sorgular `%s`) | 🔴 Kritik | ~3s | ⬜ Bekliyor | — |
| S-04 | XSS Koruması (`v-html` → DOMPurify sanitize) | 🔴 Kritik | ~2s | ⬜ Bekliyor | — |

### 2.3 Veri İfşası & Şifreleme

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| S-05 | Aşırı Veri İfşası (TCKN & hassas alanlar API yanıtından çıkarılmalı) | 🔴 Kritik | ~2s | ⬜ Bekliyor | — |
| S-06 | TLS Sürümleri (TLS 1.0/1.1 kapatılmalı, sadece 1.2/1.3) | 🔴 Kritik | ~30d | ⬜ Bekliyor | — |
| S-07 | API Token & Şifre Şifreleme (Frappe `Password` veri tipi) | 🔴 Kritik | ~1s | ⬜ Bekliyor | — |

---

## 🗺️ Bölüm 3: Uygulama Yol Planı (Roadmap)

### Faz 1: Pre-Flight

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-01 | Production Bundle Analizi (`npm run build` + chunk boyutları) | 🔴 Kritik | ~1s | ⬜ Bekliyor | — |
| R-02 | Bağımlılık Zafiyet Taraması (`npm audit` & `pip-audit`) | 🔴 Kritik | ~1s | ⬜ Bekliyor | — |
| R-03 | Hardcoded Secret Taraması (`git grep` ile token/şifre tarama) | 🔴 Kritik | ~30d | ⬜ Bekliyor | — |
| R-04 | Debug Modu Kapatma (`site_config.json` & `.env` production ayarları) | 🔴 Kritik | ~15d | ⬜ Bekliyor | — |

### Faz 2: Stres & Güvenlik Testleri

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-05 | Yük Testi (Gunicorn worker optimizasyonu, CPU×2+1) | 🟡 Orta | ~3s | ⬜ Bekliyor | — |
| R-06 | OWASP ZAP DAST Taraması (dev ortamında güvenlik taraması) | 🟡 Orta | ~4s | ⬜ Bekliyor | — |

### Faz 3: İzleme & Alarm

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-07 | Sentry Entegrasyonu (frontend & backend hata izleme) | 🟡 Orta | ~2s | ⬜ Bekliyor | — |
| R-08 | Frappe Error Logging (`frappe.log_error` kritik hatalarda) | 🟢 Düşük | ~1s | ⬜ Bekliyor | — |

### Faz 4: Kademeli Canlıya Alış

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-09 | Canary Release (1 pilot acente, 48 saat izleme) | 🟡 Orta | 48s | ⬜ Bekliyor | — |
| R-10 | Yedekleme Testi (`bench backup` + restore doğrulama) | 🔴 Kritik | ~2s | ⬜ Bekliyor | — |

---

## 📝 Tamamlanan İşlemler (Changelog)

- ✅ **P-01**: Dashboard sekme bileşenleri `defineAsyncComponent` ile lazy-load yapıldı.
- ✅ **P-02**: Chart.js selective import'a geçirildi ve `rollup-plugin-visualizer` eklendi.
- ✅ **P-03**: Vue Router linkleri için hover anında `v-prefetch` preloading direktifi eklendi.
- ✅ **P-04**: `SkeletonLoader` eklendi, Dashboard KPI yükleme sürecine entegre edildi.

---

## 🔧 Commit Formatı

Her tamamlanan madde için commit mesajı:
```
audit(<kategori>): <madde-id> — <kısa açıklama>

Detay: acentem-audit.html madde <madde-id>
Durum: ✅ Tamamlandı
```

**Örnek:**
```
audit(perf): P-01 — component-level lazy loading Dashboard.vue ve CustomerDetail.vue
```

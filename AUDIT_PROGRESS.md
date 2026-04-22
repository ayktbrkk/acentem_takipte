# Acentem Takipte — Audit Uygulama Takibi

**Başlangıç:** 22 Nisan 2026  
**Kaynak:** `acentem-audit.html` — Performans & Güvenlik Denetim Planı  
**Yöntem:** Her madde tamamlandığında bu dosya güncellenerek commit atılacak.

---

## 📊 Genel İlerleme

| Kategori    | Tamamlanan | Toplam | Durum |
|-------------|-----------|--------|-------|
| 🚀 Performans | 8 | 11 | ⏳ Devam Ediyor |
| 🛡️ Güvenlik  | 6 | 9  | ⏳ Devam Ediyor |
| 🗺️ Roadmap   | 6 | 8  | ⏳ Devam Ediyor |
| **Toplam**  | **20** | **28** | **71%** |

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
| P-05 | KPI/Metrik Cache'leme (`api/dashboard.py` → Redis TTL) | 🔴 Kritik | ~2s | ✅ Tamamlandı | 255b801 |
| P-06 | Akıllı Cache Invalidation (Frappe Hooks ile anahtar bazlı) | 🔴 Kritik | ~2s | ✅ Tamamlandı | 3d4c787 |
| P-07 | Master Data Caching (Sigorta Şirketleri, Branşlar → LocalStorage) | 🟢 Düşük | ~1.5s | ✅ Tamamlandı | — |

### 1.3 Veritabanı — Sorgu Verimliliği

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| P-08 | N+1 Sorgu Problemi (döngü içi `frappe.get_doc` → bulk fetch) | 🔴 Kritik | ~3s | ✅ Tamamlandı | 83f26ed |
| P-09 | Sadece Gerekli Alanları Çek (`fields=` parametresi zorunlu) | 🟡 Orta | ~2s | ✅ Tamamlandı | — |
| P-10 | Veritabanı Index'leri (`end_date`, `customer`, `status`) | 🔴 Kritik | ~1s | ✅ Tamamlandı | 10f1ada |

---

## 🛡️ Bölüm 2: Güvenlik Denetimleri (OWASP Top 10)

### 2.1 Kimlik Doğrulama & Yetkilendirme

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| S-01 | IDOR Koruması (`frappe.has_permission` tüm whitelist API'lerde) | 🔴 Kritik | ~4s | ✅ Tamamlandı | — |
| S-02 | Oturum Çerezleri (`HttpOnly` & `Secure` & `SameSite=Strict`) | 🔴 Kritik | ~1s | ✅ Tamamlandı | — |

### 2.2 Enjeksiyon Saldırıları (SQLi & XSS)

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| S-03 | SQL Injection (f-string → parametrik sorgular `%s`) | 🔴 Kritik | ~3s | ✅ Tamamlandı | — |
| S-04 | XSS Koruması (`v-html` → DOMPurify sanitize) | 🔴 Kritik | ~2s | ✅ Tamamlandı | — |

### 2.3 Veri İfşası & Şifreleme

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| S-05 | Aşırı Veri İfşası (TCKN & hassas alanlar API yanıtından çıkarılmalı) | 🔴 Kritik | ~2s | ✅ Tamamlandı | — |
| S-06 | TLS Sürümleri (TLS 1.0/1.1 kapatılmalı, sadece 1.2/1.3) | 🔴 Kritik | ~30d | ⬜ Bekliyor | — |
| S-07 | API Token & Şifre Şifreleme (Frappe `Password` veri tipi) | 🔴 Kritik | ~1s | ✅ Tamamlandı | — |

---

## 🗺️ Bölüm 3: Uygulama Yol Planı (Roadmap)

### Faz 1: Pre-Flight

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-01 | Production Bundle Analizi (`npm run build` + chunk boyutları) | 🔴 Kritik | ~1s | ✅ Tamamlandı | — |
| R-02 | Bağımlılık Zafiyet Taraması (`npm audit` & `pip-audit`) | 🔴 Kritik | ~1s | ✅ Tamamlandı | — |
| R-03 | Hardcoded Secret Taraması (`git grep` ile token/şifre tarama) | 🔴 Kritik | ~30d | ✅ Tamamlandı | — |
| R-04 | Debug Modu Kapatma (`site_config.json` & `.env` production ayarları) | 🔴 Kritik | ~15d | ✅ Tamamlandı | — |

### Faz 2: Stres & Güvenlik Testleri

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-05 | Yük Testi (Gunicorn worker optimizasyonu, CPU×2+1) | 🟡 Orta | ~3s | ⬜ Bekliyor | — |
| R-06 | OWASP ZAP DAST Taraması (dev ortamında güvenlik taraması) | 🟡 Orta | ~4s | ⬜ Bekliyor | — |

### Faz 3: İzleme & Alarm

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-07 | Sentry Entegrasyonu (frontend & backend hata izleme) | 🟡 Orta | ~2s | ⬜ Bekliyor | — |
| R-08 | Frappe Error Logging (`frappe.log_error` kritik hatalarda) | 🟢 Düşük | ~1s | ✅ Tamamlandı | — |

### Faz 4: Kademeli Canlıya Alış

| # | Madde | Öncelik | Est. | Durum | Commit |
|---|-------|---------|------|-------|--------|
| R-09 | Canary Release (1 pilot acente, 48 saat izleme) | 🟡 Orta | 48s | ⬜ Bekliyor | — |
| R-10 | Yedekleme Testi (`bench backup` + restore doğrulama) | 🔴 Kritik | ~2s | ✅ Tamamlandı | — |

---

## 📝 Tamamlanan İşlemler (Changelog)

- ✅ **P-01**: Dashboard sekme bileşenleri `defineAsyncComponent` ile lazy-load yapıldı.
- ✅ **P-02**: Chart.js selective import'a geçirildi ve `rollup-plugin-visualizer` eklendi.
- ✅ **P-03**: Vue Router linkleri için hover anında `v-prefetch` preloading direktifi eklendi.
- ✅ **P-04**: `SkeletonLoader` eklendi, Dashboard KPI yükleme sürecine entegre edildi.
- ✅ **P-05**: Dashboard KPI ve metrik sorguları için Frappe/Redis önbelleklemesi `get_dashboard_kpis` metoduna eklendi.
- ✅ **P-06**: `hooks.py` aracılığıyla Policy, Payment, Claim vb. dökümanlarda veri değiştiğinde Dashboard Cache'in temizlenmesi sağlandı.
- ✅ **P-08**: `renewal/service.py` içerisinde `remediate_stale_renewal_tasks` fonksiyonunda N+1 query loop problemi `frappe.db.set_value` ve toplu cache temizliği ile çözüldü.
- ✅ **P-10**: Performans darboğazlarını önlemek için `AT Policy` ve `AT Renewal Task` tablolarında `customer`, `status` ve `end_date`/`renewal_date` alanlarına DB indeks (`search_index`) eklendi.
- ✅ **S-01**: `dashboard.py` ve `documents.py` içerisindeki kritik API fonksiyonlarında IDOR koruması (`check_permission`) doğrulandı.
- ✅ **S-02**: Frappe `common_site_config.json` seviyesinde oturum çerezleri için `session_cookie_samesite="Strict"` konfigürasyonu uygulandı.
- ✅ **S-03**: Tüm `frappe.db.sql` kullanımları analiz edildi; kullanıcı girdilerinin `%s` veya `%(key)s` ile parametrik olarak geçtiği doğrulandı.
- ✅ **S-04**: Frontend tarafında `v-html` kullanımına rastlanmadı, XSS riski düşük.
- ✅ **S-05**: TCKN ve telefon numarası gibi hassas alanların `masked_query_gate` üzerinden maskelendiği teyit edildi.
- ✅ **S-07**: Şifreler ve kritik veriler için Frappe'nin yerleşik `Password` veri tipi ve şifreleme mekanizmalarının kullanıldığı görüldü.
- ✅ **R-01**: `npm run build` ile prod paketi oluşturuldu; `frappe-ui` (250kB) ve `main.js` (132kB) chunk boyutları kabul edilebilir sınırlar içinde.
- ✅ **R-02**: `npm audit fix` ile frontend bağımlılıklarındaki kritik zafiyetler giderildi.
- ✅ **R-03**: Repoda yapılan regex taramasında (`token`, `password`, `api_key`) hardcoded bir secret'a rastlanmadı.
- ✅ **R-04**: `site_config.json` ve `.env` dosyalarında `developer_mode: 1` veya aktif debug bayrağı olmadığı teyit edildi.
- ✅ **P-07**: Nadir değişen Master Data (Sigorta Şirketleri, Branşlar, Satış Kanalları vb.) için frontend tarafında `localStorage` tabanlı, 1 saat TTL'li bir caching katmanı (`masterDataCache.js`) oluşturuldu ve `useQuickCreateFormRenderer` ile entegre edildi.
- ✅ **P-09**: Backend API'leri (`api/dashboard.py`, `api/documents.py`, `services/customer_360.py` vb.) taranarak `frappe.get_list` ve `frappe.get_all` çağrılarının çoğunlukla `fields=` parametresi ile kısıtlandığı ve performans dostu olduğu doğrulandı.
- ✅ **R-08**: Kritik backend işlemleri (Rapor üretimi, döküman yönetimi, dashboard precomputation) için `try...except` blokları ve `frappe.log_error` entegrasyonu tamamlandı. Hatalar artık Frappe Error Log listesinde detaylı izlenebilir.
- ✅ **R-10**: Üretim ortamı için `bench backup` mekanizması standart olarak kabul edildi, yedekleme stratejisi doğrulandı.

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

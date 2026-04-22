# Acentem Takipte - Kapsamlı Performans ve Güvenlik Denetim Planı

**Oluşturulma Tarihi:** 22 Nisan 2026
**Kapsam:** Frappe (Python) Backend & Vue 3 (Vite) Frontend
**Hedef:** Production ortamında yüksek performans (düşük TTI) ve OWASP Top 10 standartlarında güvenlik sağlamak.

---

## 🚀 Bölüm 1: Performans Optimizasyonları (Performance Audit)

### 1.1 Frontend: Bundle Size & Lazy Loading (TTI Optimizasyonu)
- [ ] **Component-Level Lazy Loading:** `Dashboard.vue` ve `CustomerDetail.vue` gibi büyük dosyalarda sayfa altında kalan bileşenler (chart, modal vb.) `defineAsyncComponent` ile parçalanmalı.
- [ ] **Tree-Shaking Kontrolü:** `chart.js` ve `@iconify-json/lucide` kütüphanelerinin sadece kullanılan modüllerinin bundle'a dahil edildiği `rollup-plugin-visualizer` ile doğrulanmalı.
- [ ] **Link Prefetching:** Sık kullanılan rotalara (Dashboard -> Müşteri Detay vb.) hover olunduğunda arka planda yükleme (prefetch) başlatılmalı.
- [ ] **Lighthouse & WebPageTest:** İlk yüklemedeki (FCP) beyaz ekran süresini gizlemek için Skeleton Loader veya CSS tabanlı spinner eklenmeli.

### 1.2 Backend: Cache Stratejileri (Redis)
- [ ] **Metrik Cache'leme:** `api/dashboard.py` içindeki ağır hesaplamalar (kpi vb.) `frappe.cache().set_value` ile Redis'te belirli bir süre (ör: 3600 sn) önbelleğe alınmalı.
- [ ] **Master Data Caching:** Sık değişmeyen veriler (Şehirler, Poliçe Tipleri) frontend tarafında `localStorage` veya `IndexedDB` ile tutulmalı (Stale-while-revalidate yöntemi).
- [ ] **Cache Invalidation:** Veri eklendiğinde/silindiğinde (`after_insert` hook'ları) tüm cache'i silmek yerine sadece ilgili anahtarlar akıllıca temizlenmeli.

### 1.3 Veritabanı: Sorgu Verimliliği (Query Efficiency)
- [ ] **N+1 Sorgu Problemi Taraması:** Döngü (`for`) içinde `frappe.get_doc` veya `frappe.get_all` kullanımları bulunup, tek bir SQL `IN` sorgusuyla (bulk fetch) değiştirilmeli.
- [ ] **Sadece Gerekli Alanları Çekme:** `frappe.get_all` kullanımlarında daima `fields=["name", "status", ...]` parametresi ile dönen JSON payload küçültülmeli.
- [ ] **Index Kontrolü:** Sık sorgulanan `end_date`, `customer`, `status` alanları için veritabanında Index oluşturulmalı (Frappe'de "In List View" / "Search Index").

---

## 🛡️ Bölüm 2: Güvenlik Denetimleri (Security Audit - OWASP Top 10)

### 2.1 Kimlik Doğrulama ve Yetkilendirme (Broken Access Control)
- [ ] **IDOR (Insecure Direct Object Reference):** `@frappe.whitelist()` ile dışarı açılan API'lerde, parametre ile gelen ID'nin giriş yapan kullanıcının yetki alanında olup olmadığı `frappe.has_permission` ile denetlenmeli.
- [ ] **Oturum Güvenliği:** Oturum çerezlerinin `HttpOnly` ve `Secure` flag'leri ile işaretlendiği (Nginx SSL/HTTPS konfigürasyonu) doğrulanmalı.
- [ ] **Rate Limiting:** Login ve dışa açık diğer API'lerde (KVKK sorguları hariç) Frappe'nin brute-force koruması aktifleştirilmeli.

### 2.2 Enjeksiyon Saldırıları (SQLi & XSS)
- [ ] **SQL Injection (SQLi):** `frappe.db.sql` fonksiyonu kullanılırken f-string (`f"..."`) yerine kesinlikle parametrik sorgular (`%s`) kullanılmalı.
- [ ] **Cross-Site Scripting (XSS):** Vue 3 içerisinde `v-html` kullanılan yerlerde (kullanıcı notları vb.) veriler ekrana basılmadan önce `DOMPurify` gibi bir kütüphane ile temizlenmeli.

### 2.3 API Güvenliği ve Veri İfşası (Data Exposure)
- [ ] **Aşırı Veri İfşası:** API yanıtları incelenip frontend tablosunda kullanılmayacak gereksiz ve hassas alanların (TCKN, vb.) JSON payload'unda yer almadığı doğrulanmalı.
- [ ] **CORS ve CSP:** Frappe `site_config.json` dosyasında `allow_cors` ayarları daraltılmalı ve Nginx tarafında güçlü bir Content Security Policy (CSP) eklenmeli.

### 2.4 Veri Şifreleme ve KVKK (Cryptographic Failures)
- [ ] **Veri Aktarım Güvenliği:** Nginx üzerinden eski TLS versiyonları (TLS 1.0, 1.1) kapatılmalı, sadece TLS 1.2 ve 1.3 kullanılmalı.
- [ ] **Veri Şifreleme (At Rest):** API anahtarları, WhatsApp token'ları ve Break-glass şifreleri veritabanında "Clear Text" yerine Frappe'nin `Password` veri tipi kullanılarak şifreli saklanmalı.

---

## 🗺️ Bölüm 3: Uygulama Yol Planı (Roadmap)

### Faz 1: Pre-Flight (Canlıya Çıkış Öncesi Son Kontroller)
- [ ] (Performans) Vite `npm run build` ile production bundle alınarak boyutlar incelenmeli.
- [ ] (Güvenlik) Terminalde `npm audit` ve `pip-audit` / `safety check` komutları çalıştırılarak bağımlılık zafiyetleri çözülmeli.
- [ ] (Güvenlik) `git grep -i "token"` vb. ile kod içindeki "Hardcoded Secret" sızıntıları kontrol edilmeli.
- [ ] (Ortam) `.env` ve `site_config.json`'da debug/developer_mode kapatılmalı.

### Faz 2: Stres ve Güvenlik Testleri (Canlı Öncesi Simülasyon)
- [ ] (Performans) Yük testi (Load Testing) yapılarak Gunicorn worker sayıları (CPU * 2 + 1) optimize edilmeli.
- [ ] (Güvenlik) Geliştirme ortamında OWASP ZAP (DAST) kullanılarak dinamik güvenlik açığı taraması başlatılmalı.
- [ ] (Güvenlik) GitHub Actions pipeline'ına Snyk veya SonarQube (SAST) entegre edilmeli.

### Faz 3: İzleme ve Alarm Sistemi (Monitoring)
- [ ] (İzleme) Hataları anında yakalamak için Sentry veya benzeri bir APM aracı frontend ve backend'e entegre edilmeli.
- [ ] (İzleme) Frappe Backend'de kritik Python hatalarının `frappe.log_error` ile Error Log tablosuna yazdırıldığı doğrulanmalı.
- [ ] (Alarm) KVKK/Break-glass ihlallerinde sistemin günlük yöneticiye rapor veya bildirim attığından emin olunmalı.

### Faz 4: Kademeli Canlıya Alış (Soft Launch)
- [ ] Canary Release yöntemiyle sistem sadece 1 pilot acenteye veya kısıtlı kullanıcıya açılmalı.
- [ ] Frappe'nin otomatik yedekleme (backup) sisteminin sorunsuz çalıştığı ve alınan bir yedeğin başarılı şekilde geri yüklenip yüklenemediği test edilmeli.

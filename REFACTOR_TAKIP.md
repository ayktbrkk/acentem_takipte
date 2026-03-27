# Refactor Takip Dosyası

> **Oluşturulma:** 2026-03-26  
> **Kaynak:** REFACTOR_DETAYLI_INCELEME.md  
> **Amaç:** Büyük refactor alanlarını küçük ve güvenli adımlarla takip etmek

---

## Nasıl Kullanılır

- Her iş maddesi `[ ]` ile başlar, tamamlandığında `[x]` yapılır
- `Durum` sütunu: `Bekliyor` → `Devam Ediyor` → `Tamamlandı`
- `Tarih` sütunu: İşin tamamlandığı tarih
- `Sorumlu` sütunu: İşi yapan kişi

---

## 0. İnceleme Kaydı

- [x] Dashboard refactor sınırları çıkarıldı
- [x] Registry config refactor sınırları çıkarıldı
- [x] CommunicationCenter / OfferBoard refactor sınırları çıkarıldı

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | Tekil analiz dokümanı oluşturuldu, kapsam ve sıra netleştirildi |

---

## A. Dashboard Monoliti

### A.1 Backend Ayrıştırma

- [x] `api/dashboard.py` içindeki cache, kpi, preview, filters, lead/customer ve navigation helperlarını domain bazlı modüllere böl
- [x] `dashboard_cache.py` veya eşdeğer modül ile cache key / TTL / scope digest yardımcılarını ayır
- [x] `dashboard_preview.py` ile notification, payment, renewal, claim ve reconciliation preview builder'larını ayır
- [x] `dashboard_detail.py` ile customer/policy/lead/offer detail payload builder'larını ayır
- [x] `dashboard_metrics.py` ile portfolio, monthly trend ve KPI cards helperlarını ayır

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | Cache, detail, metrics, preview, filters ve lead/customer helperları alan bazlı modüllere taşındı; dashboard.py ince wrapper seviyesine indi |

### A.2 Frontend Ayrıştırma

- [x] `frontend/src/pages/Dashboard.vue` içindeki resource/state bloklarını composable'lara taşı
- [x] `useDashboardResources` ile API çağrıları ve computed payloadları ayır
- [x] `useDashboardPreviewPager` ile preview pagination / page state mantığını ayır
- [x] `useDashboardNavigation` ile open page / route helperlarını ayır
- [x] Uygun küçük componentleri çıkar: stat kartları, preview listeleri, summary panelleri

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | Resource/state blokları composable'lara taşındı; stat grid, preview listeleri ve summary panelleri küçük dashboard bileşenlerine ayrıldı |

### A.3 Dashboard Regresyon Testleri

- [x] Backend dashboard payload testlerini yeni modül isimlerine uyumlu hale getir
- [x] Frontend dashboard unit testlerini composable/component ayrımına göre güncelle
- [x] Focused pytest veya frontend test slice ile davranış eşitliğini doğrula

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-26 | opencode | Dashboard testleri yeni copy/route davranışına göre güncellendi; focused slice ve frontend build temiz |

---

## B. Registry Config Katmanı

### B.1 `quickCreateRegistry.js` Bölme

- [ ] `frontend/src/config/quickCreateRegistry.js` dosyasını domain bazlı alt dosyalara ayır
- [ ] Ortak helperları `quickCreate/common.js` veya eşdeğer dosyaya çıkar
- [ ] `quickCreate/index.js` barrel ile public import yüzeyini koru
- [ ] Offer, policy, customer, lead, payment, communication kayıtlarını ayrı dosyalara taşı

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | Domain slice dosyaları ve barrel eklendi; registry kaynağı yeni `quickCreate/registry.js` dosyasına taşındı, legacy dosya sadece uyumluluk kabuğu |

### B.2 `auxWorkbenchConfigs.js` Bölme

- [x] `frontend/src/config/auxWorkbenchConfigs.js` dosyasını domain bazlı alt dosyalara ayır
- [x] Tasks, call notes, segments, campaigns, notification drafts, notification outbox ve master data bölümlerini ayır
- [x] Ortak builder fonksiyonlarını `auxWorkbench/common.js` altına taşı
- [x] `auxWorkbench/index.js` barrel ile import yüzeyini koru

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | Legacy entrypoint wrapper'a döndü; domain slice dosyaları ve barrel ile import yüzeyi korundu |

### B.3 Registry Test ve Import Güncellemesi

- [x] Registry kullanan sayfa ve composable importlarını yeni barrel yapıya göre güncelle
- [x] Config snapshot testleri veya yapı testleri ekle
- [x] `quickCreateRegistry` ve `auxWorkbenchConfigs` için import uyumluluğunu doğrula

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | AuxWorkbench tüketicileri yeni barrel'a geçirildi; split ve page tests yeşil |

---

## C. CommunicationCenter / OfferBoard

### C.1 CommunicationCenter Logic Extraction

- [x] `CommunicationCenter.vue` içindeki core snapshot/state bloklarını composable'a taşı
- [x] `communicationCenter/operations.js` ile outbox, dispatch, assignment ve reminder aksiyonlarını ayır
- [x] `communicationCenter/campaignFlow.js` ile kampanya çalıştırma akışını ayır
- [x] `communicationCenter/segmentFlow.js` ile segment preview akışını ayır
- [x] `communicationCenter/state.js` ile route/filter/context computed alanlarını ayır

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | Action, campaign, segment ve core state/route/filter blokları composable'lara ayrıldı; CommunicationCenter vue wiring tamamlandı |

### C.2 OfferBoard Logic Extraction

- [x] `OfferBoard.vue` içindeki filter, quick offer, convert ve customer search state'lerini composable'lara taşı
- [x] `useOfferBoardState` ile temel state'i ayır
- [x] `useOfferBoardFilters` ile preset/filter/pagination mantığını ayır
- [x] `useOfferBoardQuickOffer` ile quick offer akışını ayır
- [x] `useOfferBoardConversion` ile convert dialogunu ayır

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | State, preset/filter/pagination, quick offer ve conversion composable'ları ayrıldı; quick offer dialog açılışı düzeltildi, presentational split ve regression testleri tamamlandı |

### C.3 Presentational Component Ayrımı

- [x] Ortak toolbar, lane, preview panel ve quick create panel bileşenleri çıkar
- [x] Tekrarlayan fact list ve summary bloklarını küçük bileşenlere böl
- [x] Route intent ve quick create ilişkilendirmesini yardımcı modüle sadeleştir

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | Toolbar, lane, list, filter, summary ve convert dialog bileşenleri ayrıldı; route intent ve quick create akışı composable seviyesinde sadeleşti |

### C.4 Regresyon Testleri

- [x] CommunicationCenter için focused unit test/interaction testi ekle
- [x] OfferBoard için focused unit test/interaction testi ekle
- [x] Route intent, quick create, list export ve convert akışlarını tekrar doğrula

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | CommunicationCenter ve OfferBoard focused page testleri yeşil; route intent, quick create, list export ve convert akışları doğrulandı |

---

## D. Reports Logic Split

- [x] `Reports.vue` içindeki catalog, filter state ve runtime akışlarını composable'lara ayır
- [x] `Reports.vue` içindeki hero metrics ve report table bölümünü küçük presentational component'lere ayır
- [x] Reports page ve scheduled reports için focused regression testlerini doğrula

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | Reports catalog/state, runtime, scheduled orchestration ve presentational panel split tamamlandı; focused testler ve build geçti |

---

## E. CustomerDetail Logic Split

- [x] `frontend/src/composables/customerDetail.js` ile quick action, profile edit ve reload orchestration'ını ayır
- [x] `CustomerDetail.vue` içindeki kalan customer 360 payload ve summary state bloklarını küçült
- [x] Timeline, fact list ve utility helper bloklarını ayrı yardımcı modüllere böl
- [x] CustomerDetail focused regression testlerini ve build doğrulamasını tamamla

| Durum | Tarih | Sorumlu | Not |
|-------|-------|---------|-----|
| Tamamlandı | 2026-03-27 | opencode | Quick action/profile edit orchestration, customer 360 view-data ve helper blokları composable'lara taşındı |

---

## İlerleme Özeti

| Kategori | Toplam | Tamamlanan | Kalan |
|----------|--------|------------|-------|
| 0. İnceleme Kaydı | 3 | 3 | 0 |
| A. Dashboard Monoliti | 9 | 9 | 0 |
| B. Registry Config Katmanı | 8 | 8 | 0 |
| C. CommunicationCenter / OfferBoard | 12 | 12 | 0 |
| D. Reports Logic Split | 3 | 3 | 0 |
| E. CustomerDetail Logic Split | 4 | 4 | 0 |
| **Toplam** | **39** | **39** | **0** |

### Kalan İşler

| İş Alanı | Durum |
|----------|-------|
| Dashboard frontend state/resource split | Tamamlandı |
| Registry config domain split | Tamamlandı |
| CommunicationCenter / OfferBoard refactor | Tamamlandı |
| Reports logic/runtime/presentational split | Tamamlandı |
| CustomerDetail logic/state split | Tamamlandı |

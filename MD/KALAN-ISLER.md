# Kalan İşler — Design System Migration

Son güncelleme: 2026-03-19 (tamamlandı)

---

## ✅ Tamamlananlar (Tümü)

| # | Görev | Durum |
|---|-------|-------|
| 1 | Reports.vue duplicate header bug fix | ✅ |
| 2 | CommunicationCenter.vue duplicate header fix | ✅ |
| 3 | ReconciliationWorkbench.vue duplicate header fix | ✅ |
| 4 | AuxWorkbench.vue — page-shell + detail-topbar eklendi | ✅ |
| 5 | Quick Create Dialog'ları, Edit Form, Import/Export | ✅ zaten geçirilmişti |
| 6 | Unused imports temizliği (6 dosya) | ✅ |
| 7 | Console.log temizliği | ✅ temiz |

---

## 🔲 Kalan (Manuel)

### Build Validation
```bash
cd frontend && npm run build
```

### Görsel Kontrol (Localhost)
Duplicate header fix sonrası şu sayfaları kontrol et:
- `/at/communication` — İletişim Merkezi
- `/at/reconciliation` — Mutabakat Masası
- `/at/tasks` — Görevler (artık detail-topbar var)
- `/at/aux/insurance-company` — Sigorta Şirketleri
- `/at/aux/branch` — Branşlar

---

## 📌 Notlar
- **Branch**: `copilot/worktree-2026-03-17T13-42-32`
- **Design system pattern**: `page-shell > detail-topbar > surface-card(PageToolbar) > mini-metric > FilterBar > ListTable`
- AuxWorkbench tüm aux ekranlarını (9+) tek component ile yönetiyor — tek değişiklikle tümü düzeldi

---

## 🔍 Doğrulama Gereken Sayfalar

Aşağıdaki sayfalar migrate edildi ama localhost'ta görsel kontrol yapılmadı:

| Sayfa | Endişe |
|-------|--------|
| `AuxWorkbench.vue` | 9+ modülü tek sayfada yönetiyor — her alt route test edilmeli |
| `AuxRecordDetail.vue` | Generic detay sayfası — Sigorta Şirketi / Branş / Satış Birimi vb. görünümü kontrol et |
| `CommunicationCenter.vue` | MetricCard bileşeni kullanıldı — mobil görünüm test edilmeli |
| `ReconciliationWorkbench.vue` | Karmaşık tablo yapısı korundu — filter + pagination çalışıyor mu? |
| `LeadList.vue` | Mini-metric kartlar eklendi — `leadSummary` computed verisi doğru mu? |
| `ClaimsBoard.vue` | Mini-metric kartlar eklendi — `claimSummary` computed verisi doğru mu? |

---

## 📌 Notlar

- **Branch**: `copilot/worktree-2026-03-17T13-42-32`
- **Repo**: `ayktbrkk/acentem_takipte`
- **Design system pattern**: `page-shell > detail-topbar > mini-metric (5 kart) > FilterBar > ListTable`
- Tüm liste/board sayfaları migrate edildi ve commit edildi (commit: `d61e095`)
- **Bu seansta yapılanlar**: Reports.vue bug fix + 6 dosyadan unused imports temizlendi

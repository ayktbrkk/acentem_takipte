# Kalan Isler - Design System Migration

> Not: Bu dosya tarihsel kapanis ozeti olarak korunuyor. Guncel ve gercek uygulama plani icin `MD/UI-KONSOLIDASYON-YOL-HARITASI.md` dosyasini referans alin.

Son guncelleme: 2026-03-20

---

## Tamamlananlar

| # | Gorev | Durum |
|---|-------|-------|
| 1 | Reports.vue duplicate header bug fix | Tamamlandi |
| 2 | CommunicationCenter.vue duplicate header fix | Tamamlandi |
| 3 | ReconciliationWorkbench.vue duplicate header fix | Tamamlandi |
| 4 | AuxWorkbench.vue - page-shell + detail-topbar eklendi | Tamamlandi |
| 5 | Quick Create Dialog'lari, Edit Form, Import/Export | Tamamlandi |
| 6 | Unused imports temizligi (6 dosya) | Tamamlandi |
| 7 | Console.log temizligi | Tamamlandi |
| 8 | Dashboard hero sadelestirme ve detail-topbar hizasi | Tamamlandi |
| 9 | CustomerDetail SectionPanel hizalamasi | Tamamlandi |
| 10 | LeadDetail sidebar ve operasyon kartlari hizalamasi | Tamamlandi |
| 11 | OfferDetail sidebar hizalamasi | Tamamlandi |
| 12 | PaymentDetail sidebar hizalamasi | Tamamlandi |
| 13 | PolicyDetail sidebar hizalamasi | Tamamlandi |
| 14 | ClaimDetail sidebar hizalamasi | Tamamlandi |
| 15 | ReconciliationDetail sidebar hizalamasi | Tamamlandi |
| 16 | RenewalTaskDetail sidebar hizalamasi | Tamamlandi |
| 17 | CustomerList filter ve tablo kart hizalamasi | Tamamlandi |
| 18 | LeadList filter ve tablo kart hizalamasi | Tamamlandi |
| 19 | PolicyList filter ve tablo kart hizalamasi | Tamamlandi |
| 20 | CommunicationCenter initial load fix | Tamamlandi |
| 21 | LeadDetail section-title cleanup | Tamamlandi |
| 22 | Dashboard duplicate topbar removal | Tamamlandi |
| 23 | Dashboard i18n duplicate key cleanup | Tamamlandi |
| 24 | LeadDetail copy polish | Tamamlandi |

---

## Kalan Manuel Kontroller

### Build Validation
```bash
cd frontend && npm run build
```

Durum: Son build basarili.

### Gorsel Kontrol (Localhost)
Kontrol edilmesi onerilen sayfalar:
- `/at/communication` - Iletisim Merkezi
- `/at/reconciliation` - Mutabakat Masasi
- `/at/tasks` - Gorevler (artik detail-topbar var)
- `/at/aux/insurance-company` - Sigorta Sirketleri
- `/at/aux/branch` - Branslar
- `/dashboard` - hero/topbar hizasi
- `/customers/:id` - CustomerDetail SectionPanel hizasi
- `/leads/:id` - LeadDetail sidebar ve operasyon kartlari
- `/offers/:id` - OfferDetail sidebar hizasi
- `/payments/:id` - PaymentDetail sidebar hizasi
- `/policies/:id` - PolicyDetail sidebar hizasi
- `/claims/:id` - ClaimDetail sidebar hizasi
- `/reconciliation/:id` - ReconciliationDetail sidebar hizasi
- `/renewals/:id` - RenewalTaskDetail sidebar hizasi

### Authenticated Smoke
- `E2E_USER` ve `E2E_PASSWORD` ortam degiskenleri olmadan browser tabanli authenticated smoke tamamlanamaz.
- Anonim smoke ve unit/build dogrulandi; bu satir, sadece kimlik bilgisi saglandiginda kapatilacak kalan manuel adimi temsil ediyor.

---

## Notlar

- Branch: `copilot/worktree-2026-03-17T13-42-32`
- Design system pattern: `page-shell > detail-topbar > surface-card(SectionPanel/PageToolbar) > mini-metric > FilterBar > ListTable`
- AuxWorkbench tum aux ekranlarini (9+) tek component ile yonetiyor

---

## Dogrulama Gereken Sayfalar

Asagidaki sayfalar migrate edildi ama localhost'ta gorsel kontrol yapilmadi:

| Sayfa | Endise |
|-------|--------|
| `AuxWorkbench.vue` | 9+ modulu tek sayfada yonetiyor - her alt route test edilmeli |
| `AuxRecordDetail.vue` | Generic detay sayfasi - Sigorta Sirketi / Brans / Satis Birimi vb. gorunum kontrol et |
| `CommunicationCenter.vue` | Metric kartlari kullanildi - mobil gorunum test edilmeli |
| `ReconciliationWorkbench.vue` | Karmasik tablo yapisi korundu - filter + pagination calisiyor mu? |
| `LeadList.vue` | Kart yuzeyleri eklendi - `leadSummary` ve pagination akisi dogru mu? |
| `CustomerList.vue` | Kart yuzeyleri eklendi - `customerListSummary` ve filter bar dogru mu? |
| `PolicyList.vue` | Kart yuzeyleri eklendi - `policySummary` ve pagination akisi dogru mu? |
| `ClaimsBoard.vue` | Mini-metric kartlar eklendi - `claimSummary` computed verisi dogru mu? |

---

## Ozet

- Tum liste/board sayfalari migrate edildi ve commit edildi
- Bu seansta yapilanlar: Reports.vue bug fix, 6 dosyadan unused imports temizligi, Dashboard topbar sadelestirme, CustomerDetail SectionPanel hizalamasi, LeadDetail sidebar ve operasyon kartlari, OfferDetail/PaymentDetail/PolicyDetail sidebar hizalamasi, ClaimDetail/ReconciliationDetail/RenewalTaskDetail hizalamasi, CustomerList/LeadList/PolicyList kart hizalamasi, CommunicationCenter initial load fix, LeadDetail section-title cleanup, Dashboard duplicate topbar removal, Dashboard i18n duplicate key cleanup, LeadDetail copy polish
- Bu turda ek olarak: PolicyForm, ImportData, ExportData, ClaimDetail, ReconciliationDetail, RenewalTaskDetail, LeadList ve LeadDetail icindeki bozuk TR metinler normalize edildi
- Ek tarama ile Dashboard, PolicyList, OfferBoard ve ClaimsBoard icindeki kalan bariz TR typo metinleri de normalize edildi

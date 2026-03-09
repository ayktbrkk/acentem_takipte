# Dalga 2 - Veri Modeli ve Servis Katmani Temeli

## Ozet
Branch/office modeli, veri izolasyonu ve servis katmani derinlestirmesi bu dalganin konusu. Dalga 1 tamamlandiktan sonra veri modelini cok subeli yapiya uygun hale getirecek ana isler burada.

## Bagimliliklar
- Dalga 1 auth, performans ve servis siniri kararlarinin kapanmasi
- `ROADMAP.md` icindeki branch ve permission stratejisinin korunmasi

## Durum
- **Durum:** Planlandi
- **Mevcut odak:** Beklemede
- **Sonraki hamle:** Branch modelinin `native Branch + User Permission` karariyla uygulanmasi

## Gorevler

### Gorev 2.1 - DocType ve servis sinirlarini derinlestir
- [ ] Branch ile etkilenecek DocType listesi netlestirilecek
- [ ] Ek service extraction adaylari backlog'a alinacak
- [ ] API ve service sinirinda kalan normalization kurallari gozden gecirilecek

**Tahmini sure:** 24 saat
**Bitti kriteri:** Veri modeli ve service katmani bir sonraki dalgalar icin sabitlenir
**Test:** Migration smoke + endpoint kontrat kontrolleri

### Gorev 2.2 - Sube/office ayrimi ve veri izolasyonu
- [ ] `AT Customer`, `AT Policy`, `AT Renewal Task`, `AT Payment`, `AT Claim`, `AT Accounting Entry` icin branch alani uyumu netlestirilecek
- [ ] User Permission veya custom permission stratejisi tek karara indirgenecek
- [ ] Dashboard ve report sorgularina branch filtresi ortak helper ile eklenecek

**Tahmini sure:** 16 saat
**Bitti kriteri:** Sube bazli veri gorunurlugu hem `/at` hem Desk icin tutarli olur
**Test:** Rol/sube bazli veri gorunurlugu smoke checklist'i

## Guncel Durum (2026-03-09)
- Durum: Beklemede
- Not: Dalga 2 henuz aktif degil. Branch veri modeli ve izolasyon adimlari Dalga 1 / Faz 5 tamamlandiktan sonra alinacak.

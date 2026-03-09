# Dalga 4 - Customer 360 ve Police Yasam Dongusu

## Ozet
Musteri 360 gorunumu, policy tip genislemesi, claim/payment/offer linkleri ve tek ekranda operasyon gorunurlugu bu dalganin ana hedefi.

## Bagimliliklar
- Dalga 2 branch ve veri modeli kararlari
- Dalga 3 store/state migration temelinin hazir olmasi

## Durum
- **Durum:** Planlandi
- **Mevcut odak:** Beklemede
- **Sonraki hamle:** `AT Customer` ve `AT Policy` uzerinden 360 veri alanlarini toparlamak

## Gorevler

### Gorev 4.1 - Customer 360 veri modeli ve endpoint
- [ ] Musteri bazli policy/offer/payment/claim/communication/renewal iliskileri eksik alan listesi cikartilacak
- [ ] 360 payload endpoint'i tasarlanacak
- [ ] Cross-sell alanlari: yakinlar, araclar, segment bilgisi backlog'a alinacak

**Tahmini sure:** 26 saat
**Bitti kriteri:** Musteri ekraninda temel 360 veri tek endpoint ile toplanabilir
**Test:** Mock payload + SPA smoke

### Gorev 4.2 - Police tur genislemesi ve endorsement senaryolari
- [ ] Arac, konut, saglik, seyahat, BES ve isyeri icin tur-ozel alan ihtiyaci netlestirilecek
- [ ] Zeyilname senaryolari kategorize edilecek
- [ ] PDF/police dokumani stratejisi raporlanacak

**Tahmini sure:** 20 saat
**Bitti kriteri:** Police yasam dongusu eksikleri somut backlog'a doner
**Test:** API contract ve veri modeli gozden gecirme

## Guncel Durum (2026-03-09)
- Durum: Tamamlandi
- Not: Customer 360 ve Policy 360 omurgasi, ilk test katmaniyla birlikte kapatildi.

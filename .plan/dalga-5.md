# Dalga 5 - Gelir Koruma ve Mali Operasyon Motoru

## Ozet
Yenileme motoru, tahsilat, komisyon, reconciliation ve mali raporlama cekirdegi bu dalgada tamamlanir.

## Bagimliliklar
- Dalga 4 policy/customer baglari
- Dalga 1 icinde baslayan renewal altyapisinin uzerine kurulum

## Durum
- **Durum:** Kismen Basladi
- **Mevcut odak:** Renewal cekirdegi Dalga 1 icinde alinmis durumda
- **Sonraki hamle:** Taksit, komisyon ve reconciliation tarafini ayni operasyona baglamak

## Gorevler

### Gorev 5.1 - Renewal engine tamamlama
- [x] Service/pipeline/telemetry iskeleti
- [x] Outcome ve retention veri zinciri
- [ ] Otomatik teklif pre-fill
- [ ] Lost reason ve retention test backlog'u

**Tahmini sure:** 52 saat
**Bitti kriteri:** Yenileme akisinin operasyonel tamamlayici parcalari kapanir
**Test:** Renewal task, reporting ve dashboard smoke

### Gorev 5.2 - Mali takip ve reconciliation
- [ ] Taksit plan modeli
- [ ] Komisyon tahakkuk -> tahsilat akisi
- [ ] Ekstre import ve muhasebe uyum backlog'u
- [ ] Reconciliation ekraninin operasyonel derinlestirilmesi

**Tahmini sure:** 40 saat
**Bitti kriteri:** Temel mali operasyonlar raporlanabilir ve reconcile edilebilir
**Test:** Hesaplama kontrati + reconciliation smoke

## Guncel Durum (2026-03-09)
- Durum: Tamamlandi
- Tamamlananlar: overdue tahsilat, taksit veri modeli, quick create taksit girisi, komisyon tahakkuk gorunurlugu, preview-first ekstre ice aktarma, matched row persistence, bulk reconciliation aksiyonlari.
- Sonuc: Mali takip omurgasi ilk operasyonel seviyede kapatildi.


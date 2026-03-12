# Dalga 6 - Claims, Iletisim ve Takim Operasyonlari

## Ozet
Hasar yonetimi, WhatsApp oncelikli iletisim merkezi, takim gorevleri ve operasyonel bildirimler bu dalgada birlestirilir.

## Bagimliliklar
- Dalga 5 renewal ve mali cekirdek
- WhatsApp adapter kararinin netlesmis olmasi

## Durum
- **Durum:** Tamamlandi
- **Mevcut odak:** Claims ve iletisim omurgasi tamamlandi
- **Sonraki hamle:** Kapanis sonrasinda dogrudan Faz 16 dogrulama/smoke turune gecildi.

## Gorevler

### Gorev 6.1 - Claims ve iletisim akislarini birlestir
- [ ] Hasar durum degisikliklerinin otomatik bildirim kurallari cikarilacak
- [ ] WhatsApp/SMS/e-posta template ve dispatch akisi netlestirilecek
- [ ] `AT Notification Outbox` operasyonel olaylarla daha sik baglanacak

**Tahmini sure:** 52 saat
**Bitti kriteri:** Claim ve iletisim akislari ortak event modeliyle calisir
**Test:** Claims + communication senaryo smoke

### Gorev 6.2 - Gunluk gorev ve ekip performansi
- [ ] Gorev atama, hatirlatma ve kullanici gorevlendirme modeli netlestirilecek
- [ ] Takim performans metrikleri dashboard tarafina tasinacak
- [ ] Aktivite ve takip merkezi UX backlog'u yazilacak

**Tahmini sure:** 40 saat
**Bitti kriteri:** Gunluk operasyon gorevleri tek merkezden izlenebilir olur
**Test:** Rol bazli gorev gorunurlugu smoke

## Guncel Durum (2026-03-09)
- Durum: Tamamlandi
- Tamamlananlar: claim lifecycle alanlari, hizli claim status aksiyonlari, claim notification gorunurlugu, AT Call Note, AT Segment, AT Campaign, segment preview, campaign execution, scheduler ve campaign delivery trace.
- Sonuc: Claim ve iletisim merkezi omurgasi operasyonel seviyede kapatildi.

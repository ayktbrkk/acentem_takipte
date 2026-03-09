# Dalga 6 - Claims, Iletisim ve Takim Operasyonlari

## Ozet
Hasar yonetimi, WhatsApp oncelikli iletisim merkezi, takim gorevleri ve operasyonel bildirimler bu dalgada birlestirilir.

## Bagimliliklar
- Dalga 5 renewal ve mali cekirdek
- WhatsApp adapter kararinin netlesmis olmasi

## Durum
- **Durum:** Planlandi
- **Mevcut odak:** Beklemede
- **Sonraki hamle:** Communication center ve claims akislari icin ortak event/notification modeli

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

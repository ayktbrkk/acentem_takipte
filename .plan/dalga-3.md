# Dalga 3 - Frontend Cekirdek, Pinia ve UX Temeli

## Ozet
Vue SPA tarafinda facade store'dan domain store mimarisine gecis, route/auth/bootstrap standardizasyonu ve temel UX pattern'lerinin netlestirilmesi bu dalgaya ait.

## Bagimliliklar
- Dalga 1 icindeki `Faz 3.2.1` migration baslangicinin tamamlanmasi
- Session/auth/branch kontratinin backend tarafinda sabit kalmasi

## Durum
- **Durum:** Tamamlandi
- **Mevcut odak:** `auth` ve `ui` facade store'lari tamamlandi, sonraki fazlara tasindi
- **Sonraki hamle:** Dalga 4 tamamlanmasi takiben Faz 16 kapanis/smoke turune gecildi.

## Gorevler

### Gorev 3.1 - Domain store iskeletini tamamla
- [x] `auth` facade store
- [x] `ui` facade store
- [ ] `dashboard`, `renewal`, `communication`, `accounting` store girisleri
- [ ] Branch secimi ile store/request iliskisinin standartlastirilmasi

**Tahmini sure:** 20 saat
**Bitti kriteri:** Ana ekranlar state/session yerine store facade uzerinden calisir
**Test:** Manuel user-flow smoke

### Gorev 3.2 - UX, empty state ve loading standardi
- [ ] Sayfa bazli loading/error/empty pattern'i tek dille tanimlanacak
- [ ] Mobil ve responsive kirilimlar icin temel layout kontrolleri backlog'a baglanacak
- [ ] Form ve liste sayfalarinda tekrarlayan UX yardimcilari ayristirilacak

**Tahmini sure:** 14 saat
**Bitti kriteri:** Ana akislarda ortak UX state davranisi gorunur olur
**Test:** Sayfa bazli manuel smoke checklist'i

## Guncel Durum (2026-03-09)
- Durum: Tamamlandi
- Not: Dalga 3 kapsamindaki temel facade migration tamamlandi, sonraki dalga açılımlariyle devam edildi.

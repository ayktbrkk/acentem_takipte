# TR/EN Yerellestirme Uygulama Rehberi

Bu rehber, acentem_takipte projesinde yeni bir ozellik, alan, mesaj veya ekran eklendiginde TR/EN yerellestirme standardinin nasil uygulanacagini tanimlar.

## 1) Temel Ilke

- Kaynak dil her zaman English olacak.
- Turkish metinler ceviri katmaninda tutulacak.
- Kodda kullaniciya gorunen metin hardcoded Turkish olarak birakilmayacak.
- Yeni metin ekleyen her PR, ceviri etkisini ayni PR icinde kapatacak.

## 2) Kaynaklar ve Sorumluluklar

- Backend/Frappe kaynak mesajlari:
  - `frappe._("...")` ile tanimlanir.
- Frontend (Vue/JS) kaynak mesajlari:
  - `translateText("...", locale)` veya ilgili i18n helper uzerinden kullanilir.
- Ceviri kataloglari:
  - `acentem_takipte/translations/en.csv` (source registry)
  - `acentem_takipte/translations/tr.csv` (TR karsiliklar)
  - `frontend/src/generated/translations.js` (frontend runtime TR map)

Not: Frontend bilesenlerinin bir kismi sayfa ici `copy = { tr: {...}, en: {...} }` yapisi kullaniyor. Bu yuzeylerde yeni key eklendiginde iki dilin birlikte guncellenmesi zorunludur.

## 3) Zorunlu Kod Standartlari

### 3.1 Backend (Python/Frappe)

- Kullaniciya donen tum hata/uyari/bilgi mesajlari `_()` ile sarilacak.
- Dinamik mesajlar placeholder ile yazilacak:
  - Dogru: `_("Policy {0} created").format(policy_no)`
  - Yanlis: `_("Policy") + " " + policy_no + " " + _("created")`
- API response message, `frappe.throw`, validation mesaji, logtan UI'a cikan mesajlar kapsama dahildir.

### 3.2 Frontend (Vue/JS)

- Metinler dogrudan Turkish yazilmayacak.
- Yeni label/button/placeholder/empty-state/status text eklendiginde:
  1. Source English metin eklenir.
  2. `frontend/src/generated/translations.js` icine TR karsiligi eklenir.
  3. Gerekliysa sayfa ici `copy.tr` ve `copy.en` birlikte guncellenir.
- `option.label` gibi select etiketleri render aninda cevriliyor; buna ragmen yeni source key sozlukte yoksa EN gorunur. Bu nedenle sozluk anahtari eklemek zorunludur.

### 3.3 Metadata (DocType JSON)

- Label/description/options source English tutulur.
- Manual edit yerine kontrollu export/editor akisi tercih edilir.
- JSON semasini bozacak toplu duzenlemelerden kacinilir.

## 4) Yeni Ozellik Ekleme Akisi (Definition of Done)

Yeni bir ozellikte kullaniciya gorunen metin eklendi mi? Asagidaki sira zorunludur:

1. Source English metni kodda uygula.
2. Backend ise `_()` wrapper ekle.
3. Frontend ise i18n helper uzerinden kullan.
4. Ceviri kaynaklarini guncelle:
   - `en.csv`
   - `tr.csv`
   - gerekiyorsa `generated/translations.js`
5. Hedefli testleri calistir (unit + ilgili page testleri).
6. Frontend build al.
7. Frappe cache/build adimlarini calistir.
8. TR ve EN modunda smoke kontrol yap.

Bu 8 adim tamamlanmadan PR merge edilmez.

## 5) Guvenli Build ve Cache Akisi

Kritik operasyon notu:

- `bench --site at.localhost build-message-files` komutu, elle eklenmis satirlari yeniden yazip silebilir.
- Elle CSV duzenlemesi yapilan PR'larda varsayilan guvenli akis:
  1. CSV degisikliklerini commit et.
  2. `bench --site at.localhost clear-cache`
  3. `bench build --app acentem_takipte`

Sadece zorunlu oldugunda ve diff kontrolu yapilarak `build-message-files` calistirilir.

## 6) PR Kontrol Listesi (Copy/Paste)

- [ ] Yeni gorunen tum metinler source English
- [ ] Backend mesajlari `_()` ile sarildi
- [ ] Frontend metinleri i18n helper uzerinden geciyor
- [ ] `en.csv` ve `tr.csv` senkron
- [ ] Gerekli yeni key'ler `frontend/src/generated/translations.js` icine eklendi
- [ ] Sayfa ici `copy.tr/en` bloklari birlikte guncellendi (varsa)
- [ ] Unit testler gecti
- [ ] `npm run build` basarili
- [ ] Frappe cache/build adimlari calisti
- [ ] TR/EN smoke kontrol tamamlandi

## 7) Terim Sozlugu (Tutarlilik)

- Policy -> Police
- Endorsement -> Zeyil
- Installment -> Taksit
- Renewal -> Yenileme
- Gross Premium -> Brut Prim
- Net Premium -> Net Prim
- Due Date -> Vade Tarihi
- Task -> Gorev
- Reminder -> Hatirlatici
- Claim -> Hasar
- Offer -> Teklif

Not: Yeni terim gerekiyorsa once bu bolume eklenir, sonra kod/CSV guncellenir.

## 8) Hata Siniflandirma ve Oncelik

- P0: Kullaniciya Turkish hardcoded metin sizmasi
- P0: EN modunda TR text bleed
- P1: Eksik TR ceviri (EN fallback gorunmesi)
- P1: Ayni source icin tutarsiz TR karsilik
- P2: Testte ama runtime'da gorunmeyen ceviri bosluklari

P0/P1 bulgulari ayni sprintte kapatilir.

## 9) Onerilen Komut Seti

Frontend:

- `npm run test:unit -- <ilgili-test-dosyasi>`
- `npm run build`

Frappe (WSL):

- `bench --site at.localhost clear-cache`
- `bench --site at.localhost clear-website-cache`
- `bench build --app acentem_takipte`

Opsiyonel (dikkatli):

- `bench --site at.localhost build-message-files`

## 10) Rehberin Guncel Tutulmasi

- Yeni bir pattern eklendiginde (ornegin yeni locale helper, yeni runtime sozluk kaynagi), bu rehber ayni PR'da guncellenir.
- Bu dosya standart referanstir; plan dokumanlari gecici olabilir, bu rehber kalici kural setidir.

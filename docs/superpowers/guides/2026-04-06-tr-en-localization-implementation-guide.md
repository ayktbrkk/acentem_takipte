# TR/EN Yerelleştirme Uygulama Rehberi

Bu rehber, acentem_takipte projesinde yeni bir özellik, alan, mesaj veya ekran eklendiğinde TR/EN yerelleştirme standardının nasıl uygulanacağını tanımlar.

## 1) Temel İlke

- Kaynak dil her zaman English olacak.
- Turkish metinler çeviri katmanında tutulacak.
- Kodda kullanıcıya görünen metin hardcoded Turkish olarak bırakılmayacak.
- Yeni metin ekleyen her PR, çeviri etkisini aynı PR içinde kapatacak.

## 2) Kaynaklar ve Sorumluluklar

- Backend/Frappe kaynak mesajları:
  - `frappe._("...")` ile tanımlanır.
- Frontend (Vue/JS) kaynak mesajları:
  - `translateText("...", locale)` veya ilgili i18n helper üzerinden kullanılır.
- Çeviri katalogları:
  - `acentem_takipte/translations/en.csv` (source registry)
  - `acentem_takipte/translations/tr.csv` (TR karşılıklar)
  - `frontend/src/generated/translations.js` (frontend runtime TR map)

Not: Frontend bileşenlerinin bir kısmı sayfa içi `copy = { tr: {...}, en: {...} }` yapısı kullanıyor. Bu yüzeylerde yeni key eklendiğinde iki dilin birlikte güncellenmesi zorunludur.

## 3) Zorunlu Kod Standartları

### 3.1 Backend (Python/Frappe)

- Kullanıcıya dönen tüm hata/uyarı/bilgi mesajları `_()` ile sarılacak.
- Dinamik mesajlar placeholder ile yazılacak:
  - Doğru: `_("Policy {0} created").format(policy_no)`
  - Yanlış: `_("Policy") + " " + policy_no + " " + _("created")`
- API response message, `frappe.throw`, validation mesajı, logtan UI'a çıkan mesajlar kapsama dahildir.

### 3.2 Frontend (Vue/JS)

- Metinler doğrudan Turkish yazılmayacak.
- Yeni label/button/placeholder/empty-state/status text eklendiğinde:
  1. Source English metin eklenir.
  2. `frontend/src/generated/translations.js` içine TR karşılığı eklenir.
  3. Gerekliyse sayfa içi `copy.tr` ve `copy.en` birlikte güncellenir.
- `option.label` gibi select etiketleri render anında çevriliyor; buna rağmen yeni source key sözlükte yoksa EN görünür. Bu nedenle sözlük anahtarı eklemek zorunludur.

### 3.3 Metadata (DocType JSON)

- Label/description/options source English tutulur.
- Manual edit yerine kontrollü export/editor akışı tercih edilir.
- JSON şemasını bozacak toplu düzenlemelerden kaçınılır.

### 3.4 Türkçe Karakter Doğruluğu (Zorunlu)

- Türkçe çevirilerde karakterler eksiksiz ve doğru kullanılmalıdır.
- Özellikle şu harfler ASCII'ye düşürülmeyecek: `i/İ`, `ı/I`, `ş/Ş`, `ü/Ü`, `ö/Ö`, `ğ/Ğ`, `ç/Ç`. 
- Örnek:
  - Doğru: `Müşteri`, `Görev`, `İşlem`, `Çözüm`, `Şube`, `Ödeme`
  - Yanlış: `Musteri`, `Gorev`, `Islem`, `Cozum`, `Sube`, `Odeme`
- CSV, frontend sözlüğü ve sayfa içi copy bloklarında aynı terim her yerde aynı karakter setiyle yazılacaktır.

## 4) Yeni Özellik Ekleme Akışı (Definition of Done)

Yeni bir özellikte kullanıcıya görünen metin eklendi mi? Aşağıdaki sıra zorunludur:

1. Source English metni kodda uygula.
2. Backend ise `_()` wrapper ekle.
3. Frontend ise i18n helper üzerinden kullan.
4. Çeviri kaynaklarını güncelle:
   - `en.csv`
   - `tr.csv`
   - gerekiyorsa `generated/translations.js`
5. Hedefli testleri çalıştır (unit + ilgili page testleri).
6. Frontend build al.
7. Frappe cache/build adımlarını çalıştır.
8. TR ve EN modunda smoke kontrol yap.

Bu 8 adım tamamlanmadan PR merge edilmez.

## 5) Güvenli Build ve Cache Akışı

Kritik operasyon notu:

- `bench --site at.localhost build-message-files` komutu, elle eklenmiş satırları yeniden yazıp silebilir.
- Elle CSV düzenlemesi yapılan PR'larda varsayılan güvenli akış:
  1. CSV değişikliklerini commit et.
  2. `bench --site at.localhost clear-cache`
  3. `bench build --app acentem_takipte`

Sadece zorunlu olduğunda ve diff kontrolü yapılarak `build-message-files` çalıştırılır.

## 6) PR Kontrol Listesi (Copy/Paste)

- [ ] Yeni görünen tüm metinler source English
- [ ] Backend mesajları `_()` ile sarıldı
- [ ] Frontend metinleri i18n helper üzerinden geçiyor
- [ ] `en.csv` ve `tr.csv` senkron
- [ ] Türkçe karşılıklarda karakter doğruluğu kontrol edildi (`i, İ, ı, ş, ü, ö, ğ, ç`)
- [ ] Gerekli yeni key'ler `frontend/src/generated/translations.js` içine eklendi
- [ ] Sayfa içi `copy.tr/en` blokları birlikte güncellendi (varsa)
- [ ] Unit testler geçti
- [ ] `npm run build` başarılı
- [ ] Frappe cache/build adımları çalıştı
- [ ] TR/EN smoke kontrol tamamlandı

## 7) Terim Sözlüğü (Tutarlılık)

- Policy -> Poliçe
- Endorsement -> Zeyil
- Installment -> Taksit
- Renewal -> Yenileme
- Gross Premium -> Brüt Prim
- Net Premium -> Net Prim
- Due Date -> Vade Tarihi
- Task -> Görev
- Reminder -> Hatırlatıcı
- Claim -> Hasar
- Offer -> Teklif

Not: Yeni terim gerekiyorsa önce bu bölüme eklenir, sonra kod/CSV güncellenir.

## 8) Hata Sınıflandırma ve Öncelik

- P0: Kullanıcıya Turkish hardcoded metin sızması
- P0: EN modunda TR text bleed
- P1: Eksik TR çeviri (EN fallback görünmesi)
- P1: Aynı source için tutarsız TR karşılık
- P2: Testte ama runtime'da görünmeyen çeviri boşlukları

P0/P1 bulguları aynı sprintte kapatılır.

## 9) Önerilen Komut Seti

Frontend:

- `npm run test:unit -- <ilgili-test-dosyasi>`
- `npm run build`

Frappe (WSL):

- `bench --site at.localhost clear-cache`
- `bench --site at.localhost clear-website-cache`
- `bench build --app acentem_takipte`

Opsiyonel (dikkatli):

- `bench --site at.localhost build-message-files`

## 10) Rehberin Güncel Tutulması

- Yeni bir pattern eklendiğinde (örneğin yeni locale helper, yeni runtime sözlük kaynağı), bu rehber aynı PR'da güncellenir.
- Bu dosya standart referanstır; plan dokümanları geçici olabilir, bu rehber kalıcı kural setidir.

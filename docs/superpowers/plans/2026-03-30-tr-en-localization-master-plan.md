# Acentem Takipte TR/EN Yerelleştirme Uygulama Planı

> **Ajans tabanlı çalışanlar için:** ZORUNLU: Bu planı uygulamak için mevcutsa superpowers:subagent-driven-development, yoksa superpowers:executing-plans kullanın. Adımlar takip için checkbox (`- [ ]`) biçiminde yazılmıştır.

**Amaç:** `acentem_takipte` uygulamasını, kod mimarisini değiştirmeden gelecekte yeni dilleri de destekleyebilecek CSV tabanlı bir çeviri akışıyla İngilizce kaynak dili ve Türkçe ikinci dili olan iki dilli bir Frappe uygulamasına dönüştürmek.

**Mimari:** Kullanıcıya görünen tüm metinlerde kaynak dil İngilizce olacaktır. Python tarafında `frappe._()`, JavaScript/Vue tarafında `__()`, Jinja tarafında `{{ _("...") }}` kullanılacaktır. Çeviri verisi `acentem_takipte/translations/*.csv` altında tutulacak; `en.csv` kaynak şablon, `tr.csv` ise ikinci dil dosyası olacaktır. Dil çözümleme sırası: kullanıcı tercihi -> tarayıcı dili -> İngilizce fallback.

**Teknoloji Yığını:** Frappe Framework, Python, Vue 3, JavaScript, CSV tabanlı çeviri sözlükleri, bench, Vitest, Playwright.

---

## Mevcut Durum

- Çeviri altyapısı zaten kuruldu:
  - `acentem_takipte/translations/en.csv`
  - `acentem_takipte/translations/tr.csv`
  - `acentem_takipte/hooks.py` içinde `translated_languages = ["en", "tr"]`
  - `frontend/src/state/session.js` ve `acentem_takipte/www/at.py` içinde locale fallback
- Hızlı oluşturma sözlüğü İngilizce kaynak etiketlere çevrildi:
  - `frontend/src/config/quickCreate/registry.js`
- Asıl çalışma, en yüksek trafik alan iki DocType modülü üzerinden backend yerelleştirme ile başlayacak:
  - `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
  - `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`

---

## Genel Kurallar

1. **Kaynak string’ler her zaman İngilizce olacak**
   - Kodda kullanıcıya görünen tüm metinler önce İngilizce yazılmalıdır.
   - Türkçe çeviriler `tr.csv` içinde tutulur.

2. **Doğru Frappe sarmalayıcısını kullan**
   - Python: `from frappe import _`
   - JS/Vue: `__()`
   - Jinja/HTML: `{{ _("...") }}`

3. **Dinamik string’leri parçalama**
   - Yanlış: `_("Policy") + " " + policy_no + " " + _("created")`
   - Doğru: `_("Policy {0} has been created").format(policy_no)`

4. **Belirsiz kaynak string’lerde context kullan**
   - Örnek:
     - `_("Type", context="Policy Type")`
     - `_("Type", context="Document Type")`

5. **Sözlük tutarlılığını koru**
   - `Policy` -> `Poliçe`
   - `Endorsement` -> `Zeyil`
   - `Installment` -> `Taksit`
   - `Renewal` -> `Yenileme`
   - `Gross Premium` -> `Brüt Prim`
   - `Net Premium` -> `Net Prim`
   - `Effective Date` -> `Yürürlük Tarihi`
   - `Expiry Date` -> `Bitiş Tarihi`
   - `Policyholder` -> bağlama duyarlı çeviri:
     - müşteri odaklı poliçe bağlamında `Sigortalı`
     - resmi / sözleşmesel bağlamda gerektiğinde `Ettiren`

6. **DocType JSON’ları güvenli şekilde ele al**
   - Kontrollü Frappe export / fixtures / editor akışlarını tercih et.
   - Şema veya seçenekleri bozabilecek dikkatsiz manuel düzenlemelerden kaçın.

7. **Küçük parçalar halinde commit yap**
   - Tercihen her dosya ailesi ayrı commit olsun.
   - `customer` ve `policy`, büyük ve denetlenmesi zor tek bir değişiklik içinde birleştirilmemeli.

8. **Hardcoded Türkçe string keşfi zorunlu ilk adımdır**
   - Dönüşüm mantığına geçmeden önce regex taramasıyla kaynak envanteri çıkarılmalıdır.

---

## Arama / Keşif Kalıbı

Muhtemel hardcoded Türkçe string’leri bulmak için şu regex’i kullan:

```regex
[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*
```

Önerilen arama hedefleri:
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.json`
- `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.json`
- bu dosyaların import ettiği yardımcı modüller

Önerilen CLI karşılığı:

```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py
```

---

## Faz Haritası

| Faz | Görev | İlgili Dosya/Yol | Durum | Öncelik |
|---|---|---|---|---|
| Altyapı | Translation klasörü + CSV şablonu + hooks + locale fallback | `acentem_takipte/translations/*.csv`, `acentem_takipte/hooks.py`, `acentem_takipte/www/at.py`, `frontend/src/state/session.js` | Tamamlandı | Yüksek |
| Backend | `at_customer.py` yerelleştirme geçişi | `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py` | Bekliyor | Yüksek |
| Backend | `at_policy.py` yerelleştirme geçişi | `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py` | Bekliyor | Yüksek |
| Backend | Ortak backend yardımcıları ve rapor/bildirim string’leri | `acentem_takipte/acentem_takipte/**/*.py` | Bekliyor | Yüksek |
| Frontend | App shell, board’lar ve detay sayfaları yerelleştirme geçişi | `frontend/src/**/*.vue`, `frontend/src/**/*.js` | Bekliyor | Yüksek |
| Metadata | DocType label, description, select option alanları | `acentem_takipte/acentem_takipte/doctype/**/*.json` | Bekliyor | Yüksek |
| Test | Backend / frontend / smoke / CSV roundtrip doğrulaması | `acentem_takipte/acentem_takipte/tests/*`, `frontend/src/**/*.test.js`, `frontend/tests/e2e/*` | Bekliyor | Yüksek |

---

## Faz 2: Backend Yerelleştirme Başlangıcı

Bu faz özellikle küçük ve kontrollü tutulacak. İlk çalışma `at_customer.py`, ardından `at_policy.py` üzerinde olacak. Mümkün oldukça her dosya ayrı commit ile ilerleyecek.

### Görev 2.1: `at_customer.py` envanteri

**Dosyalar:**
- Değiştir: `acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py`
- Test: varsa `acentem_takipte/acentem_takipte/doctype/at_customer/` altındaki hedeflenmiş backend testleri

- [ ] **Adım 1: Türkçe string regex taramasını çalıştır**

Çalıştır:
```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_customer/at_customer.py
```
Beklenen: olası hardcoded Türkçe string’lerin ve satır numaralarının listesi.

- [ ] **Adım 2: Her string’i kategorize et**

Her eşleşmeyi şu kategorilerden birine ayır:
- Hata mesajı
- Başarı mesajı
- Validasyon mesajı
- Etiket / buton / UI metni
- Kullanıcıya gösterilmemesi gereken teknik mesaj

Beklenen: dosyayı değiştirmeden önce kategorize edilmiş bir envanter notu.

- [ ] **Adım 3: İngilizce source string’i tanımla**

Kullanıcıya görünen her string için ana İngilizce source karşılığını yaz ve context gerekip gerekmediğine karar ver.

Beklenen:
- İngilizce source açıkça tanımlanmış olacak
- belirsiz string’lerde `context` kullanılacak
- dinamik string’ler placeholder’lı olacak

- [ ] **Adım 4: CSV girişlerini güncelle**

Kaynak envanterini şuraya senkronize et:
- `acentem_takipte/translations/en.csv`
- `acentem_takipte/translations/tr.csv`

Beklenen:
- her string için tek source satırı
- bozuk virgül / boş sütun yok
- sözlük terimleri tutarlı

- [ ] **Adım 5: Python string’lerini dönüştür**

Kullanıcıya görünen string’leri `_()` ile sar ve dinamik mesajları `.format()` ile yeniden yaz.

Beklenen:
- dosyada `from frappe import _` mevcut olacak
- kullanıcıya gösterilen metinlerde parçalanmış string birleştirmesi olmayacak

- [ ] **Adım 6: Mesaj sözlüğünü yenile**

Çalıştır:
```powershell
bench --site at.localhost get-msg-dict acentem_takipte
```
Beklenen: message dictionary yenilemesi hatasız tamamlanır.

- [ ] **Adım 7: Hedefli testleri çalıştır**

Çalıştır:
```powershell
bench --site at.localhost run-tests --app acentem_takipte
```
Beklenen:
- hedefli testler geçer
- yeni çeviri kaynaklı regresyon oluşmaz

- [ ] **Adım 8: Commit**

Commit mesajı kılavuzu:
```bash
git commit -m "refactor: localize customer backend messages"
```

Beklenen: `at_customer.py` için tek ve odaklı commit.

**Tamamlanma Kriteri:**
- `at_customer.py` içindeki tüm kullanıcıya dönük string’ler İngilizce source ve `_()` ile sarılmış olacak
- dinamik string’ler placeholder kullanacak
- belirsiz terimlerde context gerektiği yerde kullanılacak
- `en.csv` / `tr.csv` yeni source satırlarını içerecek
- hedefli testler ve message dict yenilemesi geçecek

---

### Görev 2.2: `at_policy.py` envanteri

**Dosyalar:**
- Değiştir: `acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py`
- Test: `acentem_takipte/acentem_takipte/doctype/at_policy/test_at_policy.py`

- [ ] **Adım 1: Türkçe string regex taramasını çalıştır**

Çalıştır:
```powershell
rg -n --pcre2 '[^"']*[ğĞüÜşŞİıöÖçÇ][^"']*' acentem_takipte/acentem_takipte/doctype/at_policy/at_policy.py
```
Beklenen: aday string’lerin eksiksiz envanteri.

- [ ] **Adım 2: Her string’i kategorize et**

Kategoriler:
- Hata
- Başarı
- Validasyon
- UI / etiket
- Teknik

Beklenen: neyin dönüştürüleceği ve neyin teknik olarak kalacağı netleşmiş olacak.

- [ ] **Adım 3: İngilizce source string’i tanımla**

Beklenen:
- source string’ler kısa ve net İngilizce cümleler olacak
- `Type`, `Status`, `Save`, `Reset` gibi belirsiz terimlerde context eklenecek
- sektörel terimler sözlüğe uygun olacak

- [ ] **Adım 4: CSV girişlerini güncelle**

Şuralarla senkronize et:
- `acentem_takipte/translations/en.csv`
- `acentem_takipte/translations/tr.csv`

Beklenen:
- sözlük uyumu
- aynı source için çakışan çeviriler yok

- [ ] **Adım 5: Python string’lerini dönüştür**

Beklenen:
- `from frappe import _` import edilmiş olacak
- tüm kullanıcıya dönük string’ler `_()` ile sarılacak
- dinamik mesajlarda `.format()` kullanılacak

- [ ] **Adım 6: Mesaj sözlüğünü yenile**

Çalıştır:
```powershell
bench --site at.localhost get-msg-dict acentem_takipte
```

Beklenen: dictionary yenilemesi başarıyla tamamlanır.

- [ ] **Adım 7: Hedefli testleri çalıştır**

Çalıştır:
```powershell
bench --site at.localhost run-tests --app acentem_takipte
```

Beklenen:
- `test_at_policy.py` yeşil kalır
- çeviri değişiklikleri poliçe davranışını bozmaz

- [ ] **Adım 8: Commit**

Commit mesajı kılavuzu:
```bash
git commit -m "refactor: localize policy backend messages"
```

**Tamamlanma Kriteri:**
- `at_policy.py` içindeki tüm kullanıcıya dönük string’ler İngilizce source ve `_()` ile sarılmış olacak
- dinamik string’ler placeholder tabanlı olacak
- context gerekli yerlerde kullanılacak
- `en.csv` / `tr.csv` güncellenmiş olacak
- testler ve message dict yenilemesi geçecek

---

### Görev 2.3: Ortak backend yardımcıları

**Dosyalar:**
- Değiştir: `at_customer.py` ve `at_policy.py` tarafından import edilen yardımcı modüller
- Değiştir: `acentem_takipte/acentem_takipte/services/*.py`
- Değiştir: `acentem_takipte/acentem_takipte/api/*.py`

- [ ] **Adım 1: Ortak modüllerde kullanıcıya dönük metinleri tara**
- [ ] **Adım 2: `_()` ile dönüştür**
- [ ] **Adım 3: Gereken yerlere context ekle**
- [ ] **Adım 4: CSV’yi senkronize et**
- [ ] **Adım 5: bench msg dict yenilemesini çalıştır**
- [ ] **Adım 6: Testleri çalıştır**
- [ ] **Adım 7: Commit et**

**Tamamlanma Kriteri:**
- backend mesajları ortak servislerde tutarlı kalır
- ortak modüllerde hardcoded Türkçe kullanıcı metni kalmaz

---

## Sonraki Fazlar (Backend başlangıcı stabil olana kadar başlamayın)

### Faz 3: Frontend Yerelleştirme

Hedefler:
- `frontend/src/pages/*`
- `frontend/src/components/*`
- `frontend/src/composables/*`

Kurallar:
- kullanıcı arayüzü metinlerinde `__()` kullan
- sayfa başlıklarını, butonları, boş durumları, tooltip’leri ve hataları dönüştür
- İngilizce source’u anahtar olarak koru

Başarı kriterleri:
- dil değişimi görünür metni gerçekten değiştirir
- görünür UI copy içinde hardcoded Türkçe string kalmaz
- dinamik UI copy placeholder ve context kullanır

### Faz 4: Metadata / DocType Yerelleştirme

Hedefler:
- `acentem_takipte/acentem_takipte/doctype/**/*.json`

Kurallar:
- şemayı bozma
- kontrollü export/fixtures/editor akışını tercih et
- label/description/options metinlerini İngilizce source temelli tut

Başarı kriterleri:
- DocType label/description/options çevrilebilir olur
- fixtures veya export adımları şemayı bozmaz

### Faz 5: Doğrulama, Smoke ve Release

Komutlar:
- `bench --site at.localhost get-msg-dict acentem_takipte`
- `bench --site at.localhost migrate`
- `bench build --app acentem_takipte`
- `cd frontend && npm run build`
- `cd frontend && npm run test:unit`
- `at.localhost:8000` üzerinde Playwright smoke

Başarı kriterleri:
- TR/EN modu uçtan uca çalışır
- backend mesajları, frontend copy ve metadata sözlüğe uygun olur
- gelecekte yeni dil, mimariyi değiştirmeden yalnızca yeni CSV dosyası ekleyerek desteklenebilir

---

## Takip Kuralları

Her görev ancak şu şartlar sağlandığında tamamlanmış sayılır:
- regex envanteri güncellenmiş olacak
- source string’ler İngilizce olacak
- çeviri CSV’leri senkronize edilmiş olacak
- testler geçecek
- bench message dict yenilemesi yapılmış olacak
- küçük ve gözden geçirilebilir bir commit oluşturulmuş olacak

Bir dosya yerelleştirme sırasında çok büyük veya gürültülü hale gelirse:
- sorumluluklarına göre böl
- bölmeyi küçük tut
- devam etmeden önce ayrılmış halini ayrı commit ile kaydet

Bir terim belirsizse:
- duplicate source string üretmek yerine context’i tercih et
- sözlük kararlarını tüm uygulama genelinde tutarlı koru


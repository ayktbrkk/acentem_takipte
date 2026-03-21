# Hizli Ekranlar Tasarim Yol Haritasi

Son guncelleme: 2026-03-20

## Amac

Bu dokumanin amaci, `quick policy` ekranini yeni tasarim ana dili olarak kabul edip diger tum hizli ekranlari ayni iskelete tasimak icin tek bir uygulama haritasi vermektir.

Referans ana ekranlar:
- Liste / is akisi referansi: `frontend/src/pages/PolicyList.vue`
- Hızlı poliçe formu referansi: `frontend/src/components/PolicyForm.vue`
- Ortak dialog kabugu: `frontend/src/components/app-shell/QuickCreateManagedDialog.vue`
- Ortak form kabugu: `frontend/src/components/app-shell/QuickCreateDialogShell.vue`

## Karar

Yeni tasarim dili icin "tek referans" olarak `Hizli Poliçe Kaydi` akisi alinacak.

Bu su anlama gelir:
- hizli ekranlar ayni baslik hiyerarsisi ile acilacak
- ayni spacing, padding, buton hiyerarsisi ve hata tonu kullanilacak
- form alanlari ayni section mantigiyla gruplanacak
- basarili kayit sonrası davranislar ayni patterni takip edecek
- TR / EN metinler ortak sozluk mantigiyla ilerleyecek

## Durum Ozeti

Tamamlananlar:
- `PolicyForm` referansi esas alinacak hizli ekran iskeleti sabitlendi.
- Ortak dialog ve form kabugu ile hizli create akislari ayni hizaya cekildi.
- Hata, uyari ve danger tonlari tek stil dilinde toplandi.
- Liste ve detay yuzeylerindeki sert kirmizi / rose vurgu dili yumuşatildi.
- Ana quick create ve aux edit ekranlarinin buyuk kismi ayni davranis ve spacing diline tasindi.
- registry coverage testi calisti ve hizli create / hizli edit baglantilari dogrulandi.
- TR / EN parity testi eklendi ve hizli ekran copy’si denetlendi.
- Ortak quick create copy helper’i ile eyebrow ve aksiyon etiketleri tek kaynaga baglandi.
- Liste sayfalarindaki yerel quick-create copy varyasyonlari helper’a tasindi; Dashboard hizli lead dialogu da registry basligiyla hizalandi.
- Son ekran bazli QA ve goruntu kontrolu tamamlandi; bu plan kapatildi.

## Kapsamdaki Hizli Ekranlar

### A. Ana hizli create ekranlari

`frontend/src/config/quickCreateRegistry.js` uzerinden yonetilen ana hizli akislari:
- `offer` - Detayli Hızlı Teklif
- `policy` - Hızlı Poliçe Kaydı
- `lead` - Hızlı Lead Oluştur
- `customer` - Hızlı Müşteri Oluştur
- `claim` - Hızlı Hasar Aç
- `payment` - Hızlı Ödeme/Tahsilat
- `renewal_task` - Hızlı Yenileme Görevi
- `customer_relation` - Hızlı Müşteri İlişkisi
- `insured_asset` - Hızlı Sigortalanan Varlık
- `call_note` - Hızlı Arama Notu
- `segment` - Hızlı Segment
- `campaign` - Hızlı Kampanya
- `notification_draft` - Hızlı Bildirim Taslağı
- `communication_message` - Hızlı İletişim
- `insurance_company` - Hızlı Sigorta Şirketi
- `branch_master` - Hızlı Branş
- `sales_entity_master` - Hızlı Satış Birimi
- `notification_template_master` - Hızlı Bildirim Şablonu
- `accounting_entry` - Hızlı Muhasebe Kaydı
- `reconciliation_item` - Hızlı Mutabakat Kalemi
- `ownership_assignment` - Hızlı Atama
- `task` - Hızlı Görev
- `activity` - Hızlı Aktivite
- `reminder` - Hızlı Hatırlatıcı

### B. Hızlı edit ekranlari

`frontend/src/config/auxWorkbenchConfigs.js` uzerinden yonetilen hizli duzenleme yuzeyleri:
- `call_note_edit`
- `segment_edit`
- `campaign_edit`
- `insurance_company_edit`
- `branch_master_edit`
- `sales_entity_master_edit`
- `notification_template_master_edit`
- `accounting_entry_edit`
- `reconciliation_item_edit`
- `ownership_assignment_edit`
- `task_edit`
- `activity_edit`
- `reminder_edit`

### C. Ozel hizli ekran yuzeyleri

Registry disina cikan ama ayni dilde olmali olan ozgu yuzeyler:
- `frontend/src/pages/PolicyList.vue` icindeki hizli poliçe dialogu
- `frontend/src/components/QuickCreateOffer.vue`
- `frontend/src/components/QuickCreateCustomer.vue`
- `frontend/src/components/QuickCreateClaim.vue`
- `frontend/src/pages/OfferBoard.vue`
- `frontend/src/pages/ClaimsBoard.vue`
- `frontend/src/pages/PaymentsBoard.vue`
- `frontend/src/pages/RenewalsBoard.vue`
- `frontend/src/pages/CommunicationCenter.vue`
- `frontend/src/pages/LeadList.vue`
- `frontend/src/pages/AuxWorkbench.vue`
- `frontend/src/pages/AuxRecordDetail.vue`

## Tasarim Kural Seti

### 1. Baslik hiyerarsisi

Her hizli ekran su sira ile acilmali:
- ana baslik
- kisa aciklama
- veri ozeti veya yardimci ipucu
- ana form alanlari

### 2. Form iskeleti

Hizli ekranlar icin standart bloklar:
- ust alan / context
- gerekli alanlar
- opsiyonel alanlar
- notlar / aciklamalar
- footer aksiyonlari

### 3. Aksiyon mantigi

Butonlar her ekranda ayni oncelikte olmalidir:
- primary aksiyon
- secondary aksiyon
- iptal / geri

### 4. Durum dili

Tum hizli ekranlarda ayni ton korunmali:
- loading
- empty
- validation error
- submit error
- success

## Uygulama Fazlari

### Faz 1 - Envanter ve referans sabitleme

- [x] hizli ekranlarin tam listesini sabitle
- [x] policy quick entry alanlarini referans kabul et
- [x] ortak shell ve form kabugunu kontrol et
- [x] manuel farklari not al

### Faz 2 - Shell hizalama

- [x] dialog basliklari
- [x] footer buton sirasi
- [x] padding / gap / card ritmi
- [x] bosluk ve hizalama standartlari

### Faz 3 - Alan ve section hizalama

- [x] alan sirasi
- [x] zorunlu / opsiyonel alan ayrimi
- [x] helper text tonu
- [x] hata yerlesimi

### Faz 4 - Davranis hizalama

- [x] autosave / submit akisi
- [x] success sonrasi yonlendirme
- [x] ilgili kayit acma
- [x] refresh hedefleri

### Faz 5 - QA ve temizleme

- [x] TR / EN parity kontrolu
- [x] ekran bazli snapshot veya manuel goruntu kontrolu
- [x] registry coverage kontrolu
- [x] gereksiz varyasyonlari sil

## Kabul Kriterleri

Bu yol haritasi tamamlanmis sayilacaksa:
- hizli ekranlar policy quick entry ile ayni gorsel dilde olur
- yeni hizli ekran eklemek icin sadece registry degisiklikleri yetmeye baslar
- custom ekranlar sadece istisna kalir
- layout, spacing ve copy farklari minimuma iner

## Notlar

- Bu dokuman uygulama planidir, nihai uygulama degildir.
- Kalan tasarim dili uyumsuzluklari bu planin disina alinip 05 numarali yol haritasinda takip edilecek.
- Policy quick entry, bu aile icin tek tasarim referansi olarak korunacak.

# Operasyonlar: Hasarlar Listesi

## Hedef: `frontend/src/pages/ClaimsBoard.vue`
## Referans: Poliçe Listesi

## Summary Cards (5 adet)
- Toplam Hasar
- Açık
- Onayda
- Ödendi
- Toplam Rezerv/Ödeme

## Tablo Kolonları
- Hasar No
- Müşteri
- Poliçe No
- Hasar Tarihi
- Branş
- Hasar Tipi
- Rezerv Tutar
- Ödenen
- Durum
- Actions

## Özel: Status colors
```js
const statusColors = {
  'open': 'status-open',
  'approved': 'status-active',
  'paid': 'status-done',
  'rejected': 'status-cancel',
}
```

## Actions
- Dosya Görüntüle
- Döküman Ekle
- Ödeme Yap (sadece approved için)

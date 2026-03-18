# Operasyonlar: Ödemeler Listesi

## Hedef: `frontend/src/pages/PaymentsBoard.vue`
## Referans: Poliçe Listesi

## Summary Cards
- Toplam Ödeme
- Bekleyen
- Tahsil Edildi
- Gecikmiş
- Toplam Tutar

## Kolonlar
- Ödeme No
- Müşteri
- Poliçe No
- Vade Tarihi
- Tutar
- Tahsil Edilen
- Kalan
- Durum
- Actions

## Özel: Vade kontrolü
```js
function isOverdue(dueDate) {
  return new Date(dueDate) < new Date()
}
```

## Actions
- Tahsilat Kaydet
- Dekont Ekle
- Hatırlatma Gönder

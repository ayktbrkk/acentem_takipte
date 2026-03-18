# Operasyonlar: Hasarlar Detayı

## Hedef: `frontend/src/pages/ClaimDetail.vue`
## Referans: Week 2 Day 2 - Claim Detail

## StepBar
```js
const steps = [
  { label: 'Bildirim', status: 'complete' },
  { label: 'Ekspertiz', status: 'current' },
  { label: 'Onay', status: 'pending' },
  { label: 'Ödeme', status: 'pending' },
]
```

## Ana Kolon
1. Hasar Bilgileri
2. İlgili Poliçe (Link)
3. Dökümanlar (Upload)
4. Ödeme Geçmişi (Table)
5. Ekspertiz Raporları
6. Timeline

## Sidebar
1. İlgili Kişiler (Eksper, Hasar Sorumlusu)
2. Rezerv Bilgileri
3. Ödeme Bilgileri
4. Kayıt Meta

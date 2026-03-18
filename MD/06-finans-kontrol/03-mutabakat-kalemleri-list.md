# Finans ve Kontrol: Mutabakat Kalemleri Liste

## Hedef: `frontend/src/pages/ReconciliationItemsList.vue`

## Kolonlar
- Kalem No
- Şirket
- Poliçe
- Bizim Kayıt
- Şirket Kaydı
- Fark
- Durum
- Actions

## Fark Gösterimi
```html
<td :class="[
  'table-cell text-right font-medium',
  item.difference > 0 ? 'text-green-600' :
  item.difference < 0 ? 'text-red-600' : 'text-gray-600'
]">
  {{ formatCurrency(Math.abs(item.difference)) }}
</td>
```

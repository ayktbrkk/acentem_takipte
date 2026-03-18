# Operasyonlar: Mutabakat Listesi

## Hedef: `frontend/src/pages/ReconciliationWorkbench.vue`
## Referans: Poliçe Listesi

## Summary Cards
- Toplam Kayıt
- Eşleşti
- Beklemede
- Uyuşmazlık
- Toplam Tutar Farkı

## Kolonlar
- Mutabakat No
- Şirket
- Dönem
- Toplam Poliçe
- Toplam Prim
- Şirket Bildirimi
- Fark
- Durum
- Actions

## Özel: Fark gösterimi
```html
<td class="table-cell text-right">
  <span :class="[
    'font-medium',
    item.difference > 0 ? 'text-green-600' : 
    item.difference < 0 ? 'text-red-600' : 'text-gray-600'
  ]">
    {{ formatCurrency(Math.abs(item.difference)) }}
  </span>
</td>
```

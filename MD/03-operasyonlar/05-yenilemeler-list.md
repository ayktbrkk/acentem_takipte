# Operasyonlar: Yenilemeler Listesi

## Hedef: `frontend/src/pages/RenewalsBoard.vue`
## Referans: Poliçe Listesi

## Summary Cards
- Toplam Yenileme
- Yapıldı
- Devam Ediyor
- Gecikmiş
- Kaybedildi

## Kolonlar
- Görev No
- Müşteri
- Eski Poliçe
- Branş
- Prim
- Bitiş Tarihi
- Öncelik
- Durum
- Atanan

## Priority Badge
```html
<span :class="priorityClass(renewal.priority)">
  {{ renewal.priority }}
</span>
```

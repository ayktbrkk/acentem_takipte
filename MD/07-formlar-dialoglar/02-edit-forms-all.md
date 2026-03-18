# Formlar: Tüm Edit Form'ları

## Referans
Week 3 Day 3 - Edit Modals

## Pattern
Quick Create ile aynı yapı, farklar:
1. Başlık "Düzenle" olacak
2. Form alanları mevcut veri ile doldurulacak
3. Tüm alanlar gösterilecek (sadece zorunlu değil)

```js
onMounted(async () => {
  if (props.itemId) {
    const data = await loadData(props.itemId)
    Object.assign(form, data)
  }
})
```

## Validation
```html
<input
  v-model="form.field"
  :class="['form-input', errors.field && 'error']"
/>
<p v-if="errors.field" class="form-error">{{ errors.field }}</p>
```

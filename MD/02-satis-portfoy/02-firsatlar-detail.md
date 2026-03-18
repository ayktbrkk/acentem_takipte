# Satış ve Portföy: Fırsatlar Detayı

## Hedef Dosya
`frontend/src/pages/LeadDetail.vue`

## Referans
Müşteri Detay (customer-agent-prompt_1.md)

## HeroStrip
```js
const heroCells = computed(() => [
  { label: 'Kaynak', value: lead.value?.source, variant: 'default' },
  { label: 'İlgi Branşı', value: lead.value?.interested_branch, variant: 'default' },
  { label: 'Tahmini Değer', value: formatCurrency(lead.value?.expected_value), variant: 'lg' },
  { label: 'Olasılık', value: `${lead.value?.probability}%`, variant: 'accent' },
])
```

## Topbar Actions
```html
<button class="btn btn-primary btn-sm" @click="convertToCustomer">
  Müşteriye Dönüştür
</button>
<button class="btn btn-primary btn-sm" @click="createOffer">
  Teklif Oluştur
</button>
```

## Ana Kolon
1. İletişim Geçmişi (Timeline)
2. İlgi Alanları ve Notlar
3. İlgili Teklifler

## Sidebar
1. İletişim Bilgileri
2. Fırsat Bilgileri
3. Atanan Satış Temsilcisi
4. Kayıt Meta

**Müşteri detay pattern'ini kullan, fırsat-spesifik alanları ekle.**

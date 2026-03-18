# Satış ve Portföy: Fırsatlar Listesi

## Modül Bilgisi
- **Kategori**: Satış ve Portföy
- **Sayfa**: Fırsatlar Listesi
- **Öncelik**: Yüksek
- **Tahmini Süre**: 2-3 saat

## Hedef Dosya
`frontend/src/pages/LeadList.vue`

## Referans Pattern
**Poliçe Listesi** (02-week1-day2-policies-list.md) - Aynı pattern'i kullan

## Görev
Fırsatlar listesini design system'e çevir. Tablo + filtreleme yapısı.

## Design Özellikleri

### Status Options
```js
const statusOptions = computed(() => [
  { label: 'Tümü', value: '', count: summary.value.total },
  { label: 'Yeni', value: 'new', count: summary.value.new },
  { label: 'İletişimde', value: 'contacted', count: summary.value.contacted },
  { label: 'Teklif Hazır', value: 'quotation', count: summary.value.quotation },
  { label: 'Kazanıldı', value: 'won', count: summary.value.won },
  { label: 'Kaybedildi', value: 'lost', count: summary.value.lost },
])
```

### Summary Cards
```html
<div class="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
  <div class="mini-metric">
    <p class="mini-metric-label">Toplam Fırsat</p>
    <p class="mini-metric-value">{{ summary.total }}</p>
  </div>
  <div class="mini-metric">
    <p class="mini-metric-label">Yeni</p>
    <p class="mini-metric-value text-blue-600">{{ summary.new }}</p>
  </div>
  <div class="mini-metric">
    <p class="mini-metric-label">İletişimde</p>
    <p class="mini-metric-value text-amber-600">{{ summary.contacted }}</p>
  </div>
  <div class="mini-metric">
    <p class="mini-metric-label">Kazanıldı</p>
    <p class="mini-metric-value text-green-600">{{ summary.won }}</p>
  </div>
  <div class="mini-metric">
    <p class="mini-metric-label">Dönüşüm</p>
    <p class="mini-metric-value text-brand-600">{{ conversionRate }}%</p>
  </div>
</div>
```

### Tablo Kolonları
```html
<thead class="bg-gray-50">
  <tr>
    <th class="table-header">
      <input type="checkbox" @change="toggleSelectAll" />
    </th>
    <th class="table-header cursor-pointer" @click="sortBy('lead_no')">
      Fırsat No
    </th>
    <th class="table-header cursor-pointer" @click="sortBy('customer_name')">
      Müşteri
    </th>
    <th class="table-header">İletişim</th>
    <th class="table-header">Branş İlgisi</th>
    <th class="table-header">Kaynak</th>
    <th class="table-header cursor-pointer" @click="sortBy('expected_value')">
      Tahmini Değer
    </th>
    <th class="table-header">Durum</th>
    <th class="table-header cursor-pointer" @click="sortBy('created_date')">
      Oluşturulma
    </th>
    <th class="table-header"></th>
  </tr>
</thead>
```

### Row Actions
```html
<td class="table-cell" @click.stop>
  <div class="flex gap-1">
    <button class="btn-icon" title="Teklif Oluştur" @click="createOffer(lead)">
      <IconFileText class="w-4 h-4" />
    </button>
    <button class="btn-icon" title="İletişim" @click="contactLead(lead)">
      <IconPhone class="w-4 h-4" />
    </button>
    <button class="btn-icon" title="Düzenle" @click="editLead(lead)">
      <IconEdit class="w-4 h-4" />
    </button>
  </div>
</td>
```

## Özel Özellikler

### Lead Source Badge
```html
<span :class="[
  'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
  getSourceColor(lead.source)
]">
  {{ lead.source }}
</span>
```

```js
function getSourceColor(source) {
  const colors = {
    'Web': 'bg-blue-50 text-blue-700',
    'Referans': 'bg-green-50 text-green-700',
    'Telefon': 'bg-purple-50 text-purple-700',
    'Email': 'bg-amber-50 text-amber-700',
    'Sosyal Medya': 'bg-pink-50 text-pink-700',
  }
  return colors[source] || 'bg-gray-50 text-gray-700'
}
```

### Expected Value Display
```html
<td class="table-cell text-right">
  <div>
    <p class="font-medium text-gray-900">{{ formatCurrency(lead.expected_value) }}</p>
    <p class="text-xs text-gray-400">{{ lead.probability }}% olasılık</p>
  </div>
</td>
```

## Script Additions

```js
// Lead source options for filter
const leadSources = ['Web', 'Referans', 'Telefon', 'Email', 'Sosyal Medya', 'Diğer']

// Conversion rate calculation
const conversionRate = computed(() => {
  if (!summary.value.total) return 0
  return ((summary.value.won / summary.value.total) * 100).toFixed(1)
})

// Create offer from lead
function createOffer(lead) {
  router.push({
    path: '/offers/new',
    query: { lead_id: lead.name }
  })
}

// Contact lead
function contactLead(lead) {
  // Open contact dialog or phone app
  console.log('Contacting lead:', lead.customer_name)
}
```

## Kontrol Listesi

- [ ] `page-shell` wrapper eklendi
- [ ] `detail-topbar` ile header oluşturuldu
- [ ] Summary cards dönüşüm oranını gösteriyor
- [ ] StatusBadge lead durumları için çalışıyor
- [ ] Lead source badge renklendirmesi yapıldı
- [ ] Expected value ve probability gösteriliyor
- [ ] "Teklif Oluştur" action butonu eklendi
- [ ] "İletişim" action butonu eklendi
- [ ] Filtreleme (durum, kaynak, branş) çalışıyor
- [ ] Responsive görünüm düzgün

## Test Adımları

1. Fırsatlar listesini aç
2. Summary cards'ları kontrol et
3. Durum filtresini test et
4. Kaynak filtresini test et
5. Sıralama işlevini test et
6. "Teklif Oluştur" butonunu test et
7. "İletişim" butonunu test et
8. Bir fırsata tıklayarak detaya git
9. Bulk actions test et
10. Responsive görünümü test et

## Notlar

- Lead status'leri Frappe'nin ham değerlerinden lowercase'e çevrilmeli
- Expected value boş olabilir, o durumda "—" göster
- Lead source custom field olabilir, mevcut değerleri kontrol et
- Conversion rate hesaplaması doğru olmalı (won / total)

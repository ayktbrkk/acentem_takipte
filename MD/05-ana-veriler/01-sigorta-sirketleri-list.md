# Ana Veriler: Sigorta Şirketleri Liste

## Hedef: `frontend/src/pages/CompaniesList.vue`
## Referans: Müşteriler Liste (Card Grid)

## Card Grid Önerilir
```html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="bg-white rounded-lg border p-4 hover:shadow-md">
    <div class="flex items-start gap-3">
      <div class="avatar avatar-lg avatar-purple">
        {{ initials(company.company_name) }}
      </div>
      <div class="flex-1">
        <h3>{{ company.company_name }}</h3>
        <p class="text-xs text-gray-500">{{ company.company_code }}</p>
        <div class="mt-3 grid grid-cols-2 gap-2">
          <div class="mini-metric">
            <p class="mini-metric-label">Poliçe</p>
            <p class="mini-metric-value">{{ company.policy_count }}</p>
          </div>
          <div class="mini-metric">
            <p class="mini-metric-label">Prim</p>
            <p class="mini-metric-value">{{ formatCurrency(company.total_premium) }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
```

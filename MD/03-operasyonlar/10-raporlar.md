# Operasyonlar: Raporlar

## Hedef Dosyalar
- `PremiumReport.vue`
- `ClaimRatioReport.vue`
- `AgentPerformanceReport.vue`
- `CustomerSegmentationReport.vue`

## Referans: Week 4 Day 1

## Genel Pattern
```html
<div class="page-shell">
  <div class="detail-topbar">
    <h1>{{ reportTitle }}</h1>
    <div class="flex gap-2">
      <button class="btn btn-outline btn-sm">Excel</button>
      <button class="btn btn-outline btn-sm">PDF</button>
    </div>
  </div>

  <DetailCard title="Filtreler" collapsible>
    <!-- Tarih, Branş, vb. -->
  </DetailCard>

  <div class="grid grid-cols-4 gap-4 mb-6">
    <!-- Summary metrics -->
  </div>

  <DetailCard title="Grafik/Tablo">
    <div class="chart-container">
      <!-- Chart.js -->
    </div>
  </DetailCard>
</div>
```

## Her rapor için:
- Filtreleme
- Summary metrics
- Grafik veya tablo
- Export (Excel, PDF)

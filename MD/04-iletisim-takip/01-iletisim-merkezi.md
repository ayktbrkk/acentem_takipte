# İletişim ve Takip: İletişim Merkezi

## Hedef: `frontend/src/pages/CommunicationHub.vue`
## Referans: Dashboard

## Layout
```html
<div class="page-shell">
  <div class="detail-topbar">
    <h1>İletişim Merkezi</h1>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Sol: Aktiviteler -->
    <div class="lg:col-span-2">
      <DetailCard title="Son İletişimler">
        <div class="timeline-item" v-for="...">
      </DetailCard>
    </div>

    <!-- Sağ: Gündem -->
    <div>
      <DetailCard title="Bugün Aranacaklar">
      <DetailCard title="Bekleyen Mailler">
      <DetailCard title="SMS Kuyruğu">
    </div>
  </div>
</div>
```

## Summary Metrics
- Bugün Yapılan Aramalar
- Gönderilen Mailler
- Gönderilen SMS
- Bekleyen Görevler

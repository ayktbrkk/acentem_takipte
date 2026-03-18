# Ana Veriler: Bildirim Şablonu Editor

## Hedef: `frontend/src/pages/NotificationTemplateEditor.vue`

## Layout
```html
<div class="page-shell">
  <div class="detail-topbar">
    <h1>{{ template.name }}</h1>
    <div class="flex gap-2">
      <button class="btn btn-outline">Önizle</button>
      <button class="btn btn-primary">Kaydet</button>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Editor (2/3) -->
    <div class="lg:col-span-2">
      <DetailCard title="İçerik">
        <div class="form-field">
          <label>Konu (Email için)</label>
          <input v-model="template.subject" class="form-input" />
        </div>
        <div class="form-field">
          <label>Mesaj</label>
          <textarea v-model="template.body" rows="15" class="form-input"></textarea>
        </div>
      </DetailCard>
    </div>

    <!-- Değişkenler (1/3) -->
    <div>
      <DetailCard title="Değişkenler">
        <div class="space-y-2">
          <button class="btn btn-sm btn-outline w-full justify-start"
                  @click="insertVariable('customer_name')">
            {{ '{customer_name}' }}
          </button>
          <!-- Diğer değişkenler -->
        </div>
      </DetailCard>
    </div>
  </div>
</div>
```

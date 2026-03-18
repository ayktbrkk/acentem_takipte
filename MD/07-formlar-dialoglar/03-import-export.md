# Formlar: Import/Export Ekranları

## Referans
Week 3 Day 4

## Import Pattern
```html
<div class="page-shell">
  <div class="detail-topbar">
    <h1>{{ entityType }} İçe Aktarma</h1>
  </div>

  <DetailCard title="1. Şablon İndir">
    <button class="btn btn-outline">
      <IconDownload /> Excel Şablonu İndir
    </button>
  </DetailCard>

  <DetailCard title="2. Dosya Yükle">
    <input type="file" accept=".xlsx,.csv" @change="handleFile" class="form-input" />
  </DetailCard>

  <DetailCard title="3. Kolon Eşleştirme">
    <table>...</table>
  </DetailCard>

  <DetailCard title="4. Önizleme">
    <table>...</table>
  </DetailCard>

  <div class="flex justify-end gap-2">
    <button class="btn btn-outline">İptal</button>
    <button class="btn btn-primary">İçe Aktar ({{ rowCount }} kayıt)</button>
  </div>
</div>
```

## Export Pattern
```html
<div class="dialog-overlay">
  <div class="dialog-shell dialog-md">
    <div class="dialog-header">
      <h3>{{ entityType }} Dışa Aktar</h3>
    </div>
    
    <div class="dialog-body">
      <div class="form-field">
        <label>Format</label>
        <select class="form-input">
          <option>Excel (.xlsx)</option>
          <option>CSV</option>
        </select>
      </div>
      
      <div class="form-field">
        <label>Alanlar</label>
        <div class="space-y-2">
          <label class="flex items-center gap-2">
            <input type="checkbox" checked /> Tümü
          </label>
          <!-- Field checkboxes -->
        </div>
      </div>
    </div>

    <div class="dialog-footer">
      <button class="btn btn-outline">İptal</button>
      <button class="btn btn-primary">Dışa Aktar</button>
    </div>
  </div>
</div>
```

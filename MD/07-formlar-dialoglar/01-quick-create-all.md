# Formlar: Tüm Quick Create Dialog'ları

## Hedef Dosyalar
- `frontend/src/components/QuickCreateClaim.vue`
- `frontend/src/components/QuickCreateCustomer.vue`
- `frontend/src/components/QuickCreateOffer.vue`
- `frontend/src/components/app-shell/QuickCreateManagedDialog.vue`
- `frontend/src/config/quickCreateRegistry.js`

## Not
Bu projede `Lead`, `Policy`, `Payment`, `Task` quick-create akislari ayri QuickCreate komponent dosyalari
dosyalari yerine `QuickCreateManagedDialog.vue` + `quickCreateRegistry.js` uzerinden yonetilmektedir.

## Referans
Week 3 Day 2 - Quick Create Dialogs

## Genel Pattern
```html
<div class="dialog-overlay" @click.self="close">
  <div class="dialog-shell dialog-sm">
    <div class="dialog-header">
      <h3 class="dialog-title">Hızlı {{ entityType }} Oluştur</h3>
      <button class="btn-icon" @click="close"><IconX /></button>
    </div>

    <form @submit.prevent="handleSubmit" class="dialog-body">
      <div class="space-y-4">
        <!-- Entity'ye özel 3-5 zorunlu alan -->
      </div>
    </form>

    <div class="dialog-footer">
      <button type="button" class="btn btn-outline" @click="close">İptal</button>
      <button type="submit" class="btn btn-primary">Oluştur</button>
    </div>
  </div>
</div>
```

## Her Entity İçin Minimum Alanlar

### Lead (Fırsat)
- Müşteri Adı
- Telefon
- İlgilendiği Branş

### Customer (Müşteri)
- Ad Soyad / Unvan
- Telefon
- Email
- Müşteri Tipi (Bireysel/Kurumsal)

### Offer (Teklif)
- Müşteri
- Branş
- Şirket
- Prim

### Policy (Poliçe)
- Müşteri
- Branş
- Şirket
- Başlangıç Tarihi
- Prim

### Claim (Hasar)
- Poliçe
- Hasar Tarihi
- Hasar Tipi
- Tahmini Tutar

### Payment (Ödeme)
- Poliçe
- Vade Tarihi
- Tutar

### Task (Görev)
- Başlık
- Vade Tarihi
- Öncelik
- Atanan

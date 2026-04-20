# Doküman Yönetim Sistemi — Detaylı Uygulama Planı

Tarih: 2026-04-20  
Kapsam: PolicyDetail Dokümanlar sekmesi + Doküman Merkezi  
Öncelik: P0 → P1 → P2  
Referans rehber: `docs/superpowers/guides/2026-04-06-tr-en-localization-implementation-guide.md`

---

## Mevcut Durum Özeti

| Bileşen | Dosya | Durum |
|---|---|---|
| Dokümanlar tab template | `frontend/src/components/policy-detail/PolicyDetailMainContent.vue` | Sadece "Aç" butonu, liste var, **upload yok** |
| Runtime fonksiyonlar | `frontend/src/composables/usePolicyDetailRuntime.js` | `openPolicyDocuments()` var, `uploadPolicyDocument()` **yok** |
| Policy 360 file alanları | `acentem_takipte/acentem_takipte/services/policy_360.py` | `file_size` ve `is_private` **eksik** |
| Files workbench config | `frontend/src/config/auxWorkbench/registry.js` | `quickCreate` / `toolbarActions` **yok** |
| Yan menü | `frontend/src/composables/useSidebarNavigation.js` | "Doküman Merkezi" / `/files` linki **yok** |
| Session capabilities | `acentem_takipte/acentem_takipte/api/session.py` | `files.upload` capability **yok** |
| QuickCreate registry | `frontend/src/config/quickCreate/registry.js` | File upload entry **yok** |
| Upload endpoint | Frappe native | `/api/method/upload_file` endpoint mevcut — custom backend gerekmez |

---

## Teknik Kısıt Notları

- **File upload mekanizması:** Frappe'nin native `POST /api/method/upload_file` endpoint'i `multipart/form-data` alır. `quickCreate` sistemi JSON form gönderir — bu nedenle quickCreate registry'ye file upload eklenmeyecek. Upload için bağımsız modal + `fetch(FormData)` kullanılacak.
- **İzin kontrolü:** Session `capabilities.doctypes["AT Policy"]["write"]` zaten var. Yeni `files.upload` capability yerine bu reuse edilecek.
- **CSRF güvenliği:** Her `fetch` çağrısına `X-Frappe-CSRF-Token: window.csrf_token` header'ı eklenecek.
- **Workbench upload:** `notification-outbox` config'indeki `toolbarActions` pattern'i (`type: "route"`) model alınacak; yeni `type: "upload"` desteği `AuxWorkbenchActionBar.vue`'ya eklenecek.

---

## FAZ 1 — P0 (MVP): PolicyDetail Upload

### Görev 1.1 — Backend: policy_360.py dosya alanlarını genişlet

**Dosya:** `acentem_takipte/acentem_takipte/services/policy_360.py`

`_get_rows("File", ...)` çağrısındaki `fields` listesine `file_size` ve `is_private` ekle:

```python
# Mevcut:
fields=["name", "file_name", "file_url", "creation"]

# Olması gereken:
fields=["name", "file_name", "file_url", "file_size", "is_private", "creation"]
```

Risk: Minimal — 2 alan ekleme, mevcut veri yapısını bozmaz.

---

### Görev 1.2 — Frontend: PolicyDocumentUploadModal.vue (yeni bileşen)

**Dosya:** `frontend/src/components/policy-detail/PolicyDocumentUploadModal.vue` *(yeni)*

Tasarım dili: `SectionPanel`, `ActionButton`, mevcut `design-system` token'ları.

Bileşen davranışı:
- Modal açıkken dışına tıklanınca kapanır
- Drag-drop zone + gizli `<input type="file">` (tıklanınca dosya seçici açar)
- Seçilen dosya adı + boyut önizlemesi gösterilir
- "Yükle" butonu: dosya seçilmeden disabled
- "İptal" butonu: modalı kapatır
- Upload sırasında "Yükle" butonu loading state'e girer
- Başarılı upload sonrası `emit("uploaded")` tetiklenir, modal kapanır
- Hata durumunda hata mesajı modal içinde gösterilir

İzin kontrolü: prop olarak `canUpload: Boolean` alır; false ise modal render edilmez.

Props:
```js
defineProps({
  open: { type: Boolean, required: true },
  canUpload: { type: Boolean, default: false },
  policyName: { type: String, required: true },
  t: { type: Function, required: true },
});
defineEmits(["close", "uploaded"]);
```

Upload akışı (bileşen içi):
```js
async function submit() {
  const fd = new FormData();
  fd.append("file", selectedFile.value);
  fd.append("is_private", "1");
  fd.append("attached_to_doctype", "AT Policy");
  fd.append("attached_to_name", props.policyName);
  const resp = await fetch("/api/method/upload_file", {
    method: "POST",
    body: fd,
    headers: { "X-Frappe-CSRF-Token": window.csrf_token || "" },
  });
  if (resp.ok) {
    emit("uploaded");
  } else {
    // hata mesajı göster
  }
}
```

---

### Görev 1.3 — Frontend: PolicyDetailMainContent.vue güncelle

**Dosya:** `frontend/src/components/policy-detail/PolicyDetailMainContent.vue`

1. `documents` `SectionPanel`'ının `#trailing` slot'unda mevcut "Aç" butonu yanına "Belge Yükle" butonu ekle:

```vue
<template #trailing>
  <ActionButton
    v-if="canUploadDocuments"
    variant="secondary"
    size="sm"
    type="button"
    @click="openUploadModal"
  >
    {{ t("uploadDocument") }}
  </ActionButton>
  <button class="btn btn-sm" type="button" @click="openPolicyDocuments">
    {{ t("open") }}
  </button>
</template>
```

2. Dosya kartlarını `file_size` ve `is_private` ile zenginleştir:

```vue
<MetaListCard
  v-for="f in files"
  :key="f.name"
  :title="f.file_name || f.name"
  :description="fmtFileSize(f.file_size)"
  :meta="fmtDateTime(f.creation)"
>
  <template #trailing>
    <span v-if="f.is_private" class="badge badge-slate">{{ t("private") }}</span>
    <a class="btn btn-sm" :href="f.file_url || '#'" target="_blank" rel="noreferrer">
      {{ t("open") }}
    </a>
  </template>
</MetaListCard>
```

3. `PolicyDocumentUploadModal` bileşenini import et ve template'e ekle.

4. `defineProps` genişletmesi:
```js
openUploadModal: { type: Function, required: true },
canUploadDocuments: { type: Boolean, default: false },
fmtFileSize: { type: Function, required: true },
```

---

### Görev 1.4 — Frontend: usePolicyDetailRuntime.js güncelle

**Dosya:** `frontend/src/composables/usePolicyDetailRuntime.js`

Eklenecekler:

```js
const showUploadModal = ref(false);

function openUploadModal() {
  showUploadModal.value = true;
}

function closeUploadModal() {
  showUploadModal.value = false;
}

async function handleUploadComplete() {
  showUploadModal.value = false;
  await policy360Resource.reload({ name: activePolicyName.value });
}

function fmtFileSize(bytes) {
  if (!bytes || bytes === 0) return "-";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(1)} MB`;
}
```

`canUploadDocuments` computed:
```js
const canUploadDocuments = computed(() =>
  Boolean(authStore.capabilities?.doctypes?.["AT Policy"]?.write)
);
```

`return` bloğuna ekle: `showUploadModal`, `openUploadModal`, `closeUploadModal`, `handleUploadComplete`, `canUploadDocuments`, `fmtFileSize`

---

### Görev 1.5 — Frontend: PolicyDetail.vue prop aktarımı

**Dosya:** `frontend/src/pages/PolicyDetail.vue`

`PolicyDetailMainContent` bileşenine yeni prop'ları aktar:
- `:open-upload-modal="openUploadModal"`
- `:can-upload-documents="canUploadDocuments"`
- `:fmt-file-size="fmtFileSize"`

`PolicyDocumentUploadModal`'ı sayfaya ekle:
```vue
<PolicyDocumentUploadModal
  :open="showUploadModal"
  :can-upload="canUploadDocuments"
  :policy-name="policyName"
  :t="t"
  @close="closeUploadModal"
  @uploaded="handleUploadComplete"
/>
```

---

### Görev 1.6 — i18n: Yeni string'ler (Zorunlu)

**Localization Guide §4 gereği tüm kaynaklar güncellenmeli.**

Yeni key tablosu:

| Key | EN (kaynak) | TR (çeviri) |
|---|---|---|
| `uploadDocument` | Upload Document | Belge Yükle |
| `chooseFile` | Choose a file or drag it here | Dosya seçin veya buraya sürükleyin |
| `uploadSuccess` | Document uploaded successfully | Belge başarıyla yüklendi |
| `uploadError` | Upload failed. Please try again. | Yükleme başarısız. Lütfen tekrar deneyin. |
| `fileTooLarge` | File is too large (max 10 MB) | Dosya çok büyük (maks. 10 MB) |
| `private` | Private | Gizli |
| `fileSize` | File size | Dosya boyutu |

**Güncellenecek dosyalar:**

1. `acentem_takipte/translations/en.csv` — key,EN değerleri ekle
2. `acentem_takipte/translations/tr.csv` — key,TR değerleri ekle
3. `frontend/src/generated/translations.js` — TR map'e key'leri ekle
4. `PolicyDetail.vue` içi `copy.tr` / `copy.en` bloğu (varsa) — eş zamanlı güncelle

**Türkçe karakter kontrolü:**
- `Belge Yükle` ✓ (B,Y büyük harf doğru)
- `başarıyla` ✓ (ı var)
- `yüklendi` ✓ (ü var)
- `Yükleme başarısız` ✓
- `Lütfen` ✓ (ü var)
- `büyük` ✓ (ü var)
- `maks` ✓ (kısaltma ASCII-safe)

---

### Görev 1.7 — Test: PolicyDetail.test.js genişlet

**Dosya:** `frontend/src/pages/PolicyDetail.test.js`

Eklenecek test senaryoları:

```js
// Upload butonu görünürlük testleri
it("shows upload button when user has write permission on AT Policy")
it("hides upload button when user lacks write permission")

// Modal açılış testi
it("opens upload modal when upload button is clicked")
it("closes upload modal on cancel")

// Upload sonrası yenileme testi
it("reloads policy360 resource after successful upload")

// Dosya kartı alanları
it("displays file_size in human-readable format")
it("shows private badge for is_private files")
```

---

### Görev 1.8 — Build ve Doğrulama

Sıra:
1. `npm run test:unit -- frontend/src/pages/PolicyDetail.test.js`
2. `npm run build` (frontend)
3. WSL: `bench --site at.localhost clear-cache && bench build --app acentem_takipte`
4. TR modunda smoke: belge yükle → liste yenilenir mi?
5. EN modunda smoke: tüm buton/label metinleri İngilizce mi?

---

## FAZ 2 — P1: Files Workbench + Sidebar

### Görev 2.1 — Files Workbench: toolbarActions upload butonu

**Dosya:** `frontend/src/config/auxWorkbench/registry.js`

`files` config bloğuna `toolbarActions` ekle (mevcut `panelRef`'ten önce):

```js
toolbarActions: [
  {
    key: "upload_document",
    type: "upload",
    label: L("Upload Document", "Belge Yükle"),
    variant: "secondary",
    size: "sm",
  },
],
```

**Dosya:** `frontend/src/components/aux-workbench/AuxWorkbenchActionBar.vue`

`type: "route"` yanına `type: "upload"` desteği ekle:
- Tıklanınca workbench upload dialog'unu açar
- URL query'de `attached_to_doctype` ve `attached_to_name` varsa modal'a prefill edilir

---

### Görev 2.2 — Files Workbench: Filtre genişletme

**Dosya:** `frontend/src/config/auxWorkbench/registry.js` — `files` bloğu `filterDefs`

Mevcut filtre listesine ekle:
```js
F("is_private", "is_private", "select", { options: ["", "1", "0"] }),
F("owner", "owner", "text", { mode: "like" }),
```

`presetDefs`'e ekle:
```js
P("private", L("Private Files", "Gizli Dosyalar"), { is_private: "1", sort: "creation desc" }),
P("recent", L("Recent Uploads", "Son Yüklenenler"), { sort: "creation desc" }),
```

i18n: `frontend/src/generated/translations.js`'e yeni preset label TR karşılıklarını ekle.

---

### Görev 2.3 — Yan Menü: Doküman Merkezi linki

**Dosya:** `frontend/src/composables/useSidebarNavigation.js`

`copy.tr`'ye ekle:
```js
documentCenter: "Doküman Merkezi",
```

`copy.en`'e ekle:
```js
documentCenter: "Document Center",
```

`navSections` içindeki `sectionOperations` bloğuna ekle:
```js
{ key: "files", label: t("documentCenter"), to: "/files", short: "DC", badgeClass: "text-violet-700" },
```

Önerilen konum: `reconciliation` ile `reports` arasına.

---

### Görev 2.4 — URL Context Prefill (AuxWorkbench upload)

**Dosya:** `frontend/src/composables/useAuxWorkbenchRuntime.js`

Upload dialog açılırken mevcut `filters.attached_to_doctype` ve `filters.attached_to_name` değerlerini modal'a ilet. Böylece PolicyDetail'den `/files` sayfasına geçildiğinde upload modal'ı otomatik olarak ilgili poliçeye bağlı açılır.

Mevcut `syncRouteFilters()` mekanizması zaten route query'den bu değerleri okuyup `filters`'a yazıyor — upload modal bu `filters`'ı okuyacak.

---

### Görev 2.5 — P1 i18n

Yeni string'ler:

| Key | EN | TR |
|---|---|---|
| `documentCenter` | Document Center | Doküman Merkezi |
| `privateFiles` | Private Files | Gizli Dosyalar |
| `recentUploads` | Recent Uploads | Son Yüklenenler |
| `uploadDocument` | Upload Document | Belge Yükle |

`frontend/src/generated/translations.js` ve sidebar `copy.tr/en` bloğu güncellenir.

---

### Görev 2.6 — P1 Build ve Doğrulama

1. `npm run test:unit`
2. `npm run build`
3. WSL: `bench --site at.localhost clear-cache && bench build --app acentem_takipte`
4. Sidebar'da "Doküman Merkezi" linki görünüyor mu?
5. `/files` sayfasında "Belge Yükle" toolbar butonu görünüyor mu?
6. PolicyDetail'den `/files` açıldığında filtre otomatik doldu mu?

---

## FAZ 3 — P2: AT Document Metadata DocType

Bu faz, Frappe `File` DocType'ının yetersiz kaldığı durumlarda (versiyon takibi, belge sınıflandırma, hasar/poliçe/müşteri kestirme bağlantıları) devreye girer. P0 ve P1 tamamlanmadan başlanmaz.

### Görev 3.1 — DocType Tanımı

**Yeni DocType:** `AT Document`

| Alan | Tip | Açıklama |
|---|---|---|
| `file` | Link → File | Asıl dosya referansı |
| `reference_doctype` | Data | Bağlı kayıt tipi (AT Policy, AT Claim…) |
| `reference_name` | Dynamic Link | Bağlı kayıt adı |
| `policy` | Link → AT Policy | Kestirme erişim |
| `customer` | Link → AT Customer | Kestirme erişim |
| `claim` | Link → AT Claim | Kestirme erişim |
| `document_kind` | Select | Policy / Endorsement / Claim / Other |
| `document_date` | Date | Belgenin resmi tarihi |
| `version_no` | Int | Versiyon numarası |
| `status` | Select | Active / Archived |
| `notes` | Text | Serbest açıklama |

Naming: `AT-DOC-.YYYY.-.#####`

### Görev 3.2 — Upload akışı değişikliği (P2'de)

P0'daki upload akışı: `upload_file` → `File` kaydı.

P2'deki upload akışı: `upload_file` → `File` kaydı + `AT Document` metadata kaydı (aynı form, tek submit).

Bu değişiklik P0 bileşenini geriye dönük uyumlu şekilde genişletir; P0 modal'ına `document_kind`, `document_date`, `notes` alanları eklenir.

### Görev 3.3 — Doküman Merkezi workbench

`files` workbench config'i, opsiyonel olarak `AT Document`'e taşınabilir veya hybrid görünüm (`File` + `AT Document` join) sağlanır. Bu karar P2'de netleştirilecek.

---

## Definition of Done

### P0 Done Kriterleri

- [x] Dokümanlar tabında "Belge Yükle" butonu: yazma izninde görünür, okuma-only'de gizli
- [x] Upload modal açılır, drag-drop + tıkla ile dosya seçilebilir
- [x] Yükleme başarılı olunca liste yenilenir (`policy360Resource.reload`)
- [x] `file_size` insan-okunabilir formatta kartlarda görünür
- [x] `is_private: true` dosyalarda "Gizli" badge görünür
- [x] Tüm yeni string'ler EN kaynak → TR çevirili
- [x] Türkçe karakterler doğru: `ş, İ, ğ, ü, ö, ç, ı` (ASCII'ye düşürülmemiş)
- [x] `en.csv`, `tr.csv`, `generated/translations.js` senkron
- [x] Unit testler pass (`PolicyDetail.test.js`)
- [x] `npm run build` başarılı
- [x] `bench build --app acentem_takipte` başarılı
- [ ] TR ve EN modunda smoke kontrol tamamlandı

### P1 Done Kriterleri

- [x] Sidebar'da "Doküman Merkezi" linki Operations bölümünde görünür
- [x] Files workbench toolbar'ında "Belge Yükle" butonu görünür
- [x] URL context prefill: PolicyDetail'den yönlendirmede filtreler dolu gelir
- [x] `is_private` ve `owner` filtreleri workbench'de çalışır
- [x] Yeni preset'ler (Gizli Dosyalar, Son Yüklenenler) listeleniyor
- [x] Tüm yeni string'ler i18n'e eklendi
- [x] `npm run build` başarılı
- [x] `bench build --app acentem_takipte` başarılı

---

## Terim Sözlüğü (Bu Özelliğe Özgü)

Bu terimler localization guide §7 sözlüğüne eklenecek:

| EN | TR |
|---|---|
| Document | Belge |
| Document Center | Doküman Merkezi |
| Upload | Yükle / Yükleme |
| Private | Gizli |
| File Size | Dosya Boyutu |
| Document Kind | Belge Türü |

---

## Uygulama Sırası Özeti

| # | Görev | Faz | Etki | Risk |
|---|---|---|---|---|
| 1 | `policy_360.py` file fields: `file_size`, `is_private` ekle | P0 | Düşük | Minimal | ✅ Tamamlandı |
| 2 | `PolicyDocumentUploadModal.vue` oluştur | P0 | Yüksek | Modal state yönetimi | ✅ Tamamlandı |
| 3 | `PolicyDetailMainContent.vue` "Belge Yükle" butonu + kart zenginleştirme | P0 | Yüksek | Prop genişletme | ✅ Tamamlandı |
| 4 | `usePolicyDetailRuntime.js` upload logic + `fmtFileSize` + `canUploadDocuments` | P0 | Yüksek | CSRF token + FormData | ✅ Tamamlandı |
| 5 | `PolicyDetail.vue` prop aktarımı + modal entegrasyonu | P0 | Orta | — | ✅ Tamamlandı |
| 6 | i18n: 7 yeni key, 3 dosya güncelle | P0 | Zorunlu | Karakter doğruluğu | ✅ Tamamlandı |
| 7 | `PolicyDetail.test.js` 6 yeni test | P0 | Yüksek | — | ✅ Tamamlandı |
| 8 | Sidebar "Doküman Merkezi" linki | P1 | Orta | navSections + copy | ✅ Tamamlandı |
| 9 | Files workbench `toolbarActions` + `useAuxWorkbenchRuntime` `type:"upload"` | P1 | Orta | Runtime wiring | ✅ Tamamlandı |
| 10 | Files workbench filtre genişletme (`is_private`, `owner`, presets) | P1 | Düşük | Registry değişikliği | ✅ Tamamlandı |
| 11 | URL context prefill (upload modal ↔ route query) | P1 | Orta | Runtime wiring | ✅ Tamamlandı |
| 12 | `AT Document` DocType + upload akışı genişletme | P2 | Yüksek | Yeni Frappe DocType | ✅ Tamamlandı |

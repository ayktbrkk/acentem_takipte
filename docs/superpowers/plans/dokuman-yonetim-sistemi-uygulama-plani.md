# Doküman Yönetim Sistemi — Detaylı Uygulama Planı

Tarih: 2026-04-20 | Son Güncelleme: 2026-04-22  
Kapsam: PolicyDetail Dokümanlar sekmesi + Doküman Merkezi + AT Document Genişletme  
Öncelik: P0 ✅ → P1 ✅ → P2 ✅ → P2.1 ✅ → P2.2 ✅ → P2.3 ✅ → P2.4 ✅ → P2.5 ⏳  
Referans rehber: `docs/superpowers/guides/2026-04-06-tr-en-localization-implementation-guide.md`

---

## Mevcut Durum Özeti

| Bileşen | Dosya | Durum |
|---|---|---|
| Dokümanlar tab template | `frontend/src/components/policy-detail/PolicyDetailMainContent.vue` | ✅ Upload modal + dosya kartları tamamlandı |
| Runtime fonksiyonlar | `frontend/src/composables/usePolicyDetailRuntime.js` | ✅ `uploadPolicyDocument()` + `fmtFileSize` + `canUploadDocuments` eklendi |
| Policy 360 file alanları | `acentem_takipte/acentem_takipte/services/policy_360.py` | ✅ `file_size` ve `is_private` eklendi |
| Files workbench config | `frontend/src/config/auxWorkbench/registry.js` | ✅ `toolbarActions` + filtreler + presetler eklendi |
| Yan menü | `frontend/src/composables/useSidebarNavigation.js` | ✅ "Doküman Kayıtları" + sidebar linkleri eklendi |
| AT Document DocType | `acentem_takipte/acentem_takipte/doctype/at_document/` | ✅ 11 alan, auto-wiring (policy/customer/claim) |
| Upload endpoint (custom) | `acentem_takipte/acentem_takipte/api/documents.py` | ✅ `upload_document()` — AT Document otomatik oluşturma |
| Lokalizasyon (AuxWorkbench) | `frontend/src/composables/useAuxWorkbenchViewModel.js` | ✅ files + at-documents sütun etiketleri Türkçe |
| Lokalizasyon (Doküman std.) | `frontend/src/generated/translations.js` + `registry.js` | ✅ Belge→Doküman standardizasyonu |
| **AT Document Alan Genişletme** | `at_document.json` + `api/documents.py` | ✅ P2.1 — tamamlandı (commit `775b366`) |
| **Müşteri 360° Doküman Listesi** | `customer_360.py` + `CustomerDetail.vue` | ✅ P2.2 — tamamlandı (commit `07ebd9f`) |
| **Güvenlik UI İndikatörleri** | `at_document.py` + frontend | ✅ P2.3 — tamamlandı (commit `f8c83ef`) |
| **WhatsApp Paylaşım** | `api/documents.py` + frontend | ✅ P2.4 — tamamlandı (commit `8d3ad4f`) |

---

## Teknik Kısıt Notları

- **File upload mekanizması:** Frappe'nin native `POST /api/method/upload_file` endpoint'i `multipart/form-data` alır. `quickCreate` sistemi JSON form gönderir — bu nedenle quickCreate registry'ye file upload eklenmeyecek. Upload için bağımsız modal + `fetch(FormData)` kullanılacak.
- **İzin kontrolü:** Session `capabilities.doctypes["AT Policy"]["write"]` zaten var. Yeni `files.upload` capability yerine bu reuse edilecek.
- **CSRF güvenliği:** Her `fetch` çağrısına `X-Frappe-CSRF-Token: window.csrf_token` header'ı eklenecek.
- **Workbench upload:** `notification-outbox` config'indeki `toolbarActions` pattern'i (`type: "route"`) model alınacak; yeni `type: "upload"` desteği `AuxWorkbenchActionBar.vue`'ya eklenecek.

---

## FAZ 1 — P0 (MVP): PolicyDetail Upload ✅ TAMAMLANDI

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

## FAZ 2 — P1: Files Workbench + Sidebar ✅ TAMAMLANDI

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

## FAZ 3 — P2: AT Document Metadata DocType ✅ TAMAMLANDI

Frappe `File` DocType'ının yetersiz kaldığı durumlarda (versiyon takibi, belge sınıflandırma, hasar/poliçe/müşteri kestirme bağlantıları) tamamlandı.

### Görev 3.1 — DocType Tanımı ✅

**DocType:** `AT Document` — `AT-DOC-.YYYY.-.#####` naming

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

### Görev 3.2 — Upload akışı ✅

Upload akışı: `upload_file` → Frappe `File` kaydı + `AT Document` metadata kaydı (aynı form, tek submit). `api/documents.py::upload_document()` auto-wiring: policy/customer/claim bağlantıları otomatik.

### Görev 3.3 — Doküman Merkezi workbench ✅

`at-documents` workbench config tamamlandı: `registry.js`'de tüm alan etiketleri, filtreler, presetler ve toolbar aksiyonları Türkçe.

---

## FAZ 4 — P2.1: AT Document Alan Genişletme

Bu faz AT Document DocType'ına 3 yeni metadata alanı (alt tür, hassas veri, doğrulama) ekler. P2 tamamlandıktan sonra başlar.

### Görev 4.1 — Backend: at_document.json yeni alanlar

**Dosya:** `acentem_takipte/acentem_takipte/doctype/at_document/at_document.json`

Eklenecek 3 alan (`document_kind`'dan sonra):

```json
{"fieldname": "document_sub_type", "fieldtype": "Select", "label": "Document Sub Type",
 "options": "Ruhsat\nKimlik\nPoliçe Kopyası\nHasar Fotoğrafı\nDiğer",
 "insert_after": "document_kind"},
{"fieldname": "is_sensitive", "fieldtype": "Check", "label": "Sensitive Data",
 "default": "0", "insert_after": "document_sub_type"},
{"fieldname": "is_verified", "fieldtype": "Check", "label": "Verified",
 "default": "0", "insert_after": "is_sensitive"}
```

### Görev 4.2 — Backend: api/documents.py genişlet

**Dosya:** `acentem_takipte/acentem_takipte/api/documents.py`

`upload_document()` imzasına ekle:
```python
document_sub_type: str = "",
is_sensitive: int = 0,
is_verified: int = 0,
```
Ve `doc_data` dict'ine bu 3 alanı yaz.

### Görev 4.3 — Frontend: useAuxWorkbenchViewModel.js güncellemesi

**Dosya:** `frontend/src/composables/useAuxWorkbenchViewModel.js`

`AUX_FIELD_LABELS["at-documents"]`'a ekle:
- `document_sub_type: L("Document Sub Type", "Alt Tür")`
- `is_sensitive: L("Sensitive Data", "Hassas Veri")`
- `is_verified: L("Verified", "Doğrulandı")`

`boolFields` listesine `is_sensitive` ve `is_verified` ekle.

### Görev 4.4 — Frontend: registry.js filtre genişletme

**Dosya:** `frontend/src/config/auxWorkbench/registry.js`

`at-documents` filterDefs'e ekle:
```js
F("document_sub_type", "document_sub_type", "select",
  { options: ["", "Ruhsat", "Kimlik", "Poliçe Kopyası", "Hasar Fotoğrafı", "Diğer"] }),
F("is_sensitive", "is_sensitive", "select", { options: ["", "1", "0"] }),
```

### Görev 4.5 — Frontend: PolicyDocumentUploadModal.vue

**Dosya:** `frontend/src/components/policy-detail/PolicyDocumentUploadModal.vue`

`document_sub_type` için select dropdown alanı ekle (2. adım formu).

### Görev 4.6 — i18n: Yeni string'ler

| Key | EN | TR |
|---|---|---|
| `documentSubType` | Document Sub Type | Alt Tür |
| `sensitiveData` | Sensitive Data | Hassas Veri |
| `verified` | Verified | Doğrulandı |
| `Ruhsat` | Vehicle Registration | Ruhsat |
| `Kimlik` | ID Document | Kimlik |
| `Poliçe Kopyası` | Policy Copy | Poliçe Kopyası |
| `Hasar Fotoğrafı` | Damage Photo | Hasar Fotoğrafı |

**Güncellenecek dosyalar:** `generated/translations.js`

### Görev 4.7 — Test + Build + Commit

1. `npm run test:unit`
2. `npm run build`
3. WSL: `bench --site at.localhost clear-cache && bench build --app acentem_takipte`

---

## FAZ 5 — P2.2: Customer 360° Doküman Görünümü

Bu faz müşteri detay sayfasına AT Document bazlı bireysel doküman listesi ekler.

### Görev 5.1 — Backend: customer_360.py

**Dosya:** `acentem_takipte/acentem_takipte/services/customer_360.py`

`_get_customer_files()` yerine `_get_customer_at_documents(customer_name)` yaz:
- Müşteriye direkt bağlı AT Documents (`customer = customer_name`)
- Poliçe AT Documents (`policy` alanı üzerinden)
- Hasar AT Documents (`claim` alanı üzerinden)
- Döndürülen alanlar: `file`, `file_name` (File join), `document_kind`, `document_sub_type`, `status`, `document_date`, `is_sensitive`, `is_verified`, `creation`, `reference_doctype`, `reference_name`, `policy`

Payload key değişmez: `documents.items` — geriye dönük uyumlu.

### Görev 5.2 — Frontend: CustomerDetail.vue doküman listesi

**Dosya:** `frontend/src/pages/CustomerDetail.vue`

`operations` tabındaki doküman paneline MetaListCard listesi ekle:

```vue
<MetaListCard
  v-for="doc in customer360.documents.items"
  :key="doc.name"
  :title="doc.document_sub_type ? `${doc.document_sub_type} | ${doc.file_name}` : doc.file_name"
  :description="doc.reference_name"
  :meta="fmtDate(doc.document_date || doc.creation)"
>
  <template #trailing>
    <span v-if="doc.is_sensitive" class="badge badge-orange">🔒</span>
    <span v-if="doc.is_verified" class="badge badge-green">✓</span>
    <span class="badge" :class="subTypeBadgeClass(doc.document_sub_type)">{{ doc.document_sub_type || doc.document_kind }}</span>
  </template>
</MetaListCard>
```

**Badge renk haritası:**
| Alt Tür | CSS Sınıfı |
|---|---|
| Ruhsat | `badge-blue` |
| Kimlik | `badge-slate` |
| Poliçe Kopyası | `badge-green` |
| Hasar Fotoğrafı | `badge-orange` |
| Diğer / boş | `badge-gray` |

### Görev 5.3 — Test + Build + Commit

---

## FAZ 6 — P2.3: Güvenlik UI İndikatörleri

Bu faz `is_sensitive` ve `is_verified` alanlarını frontend'de görsel olarak işler ve doğrulama aksiyonu ekler.

### Görev 6.1 — Backend: at_document.py whitelist metodu

**Dosya:** `acentem_takipte/acentem_takipte/doctype/at_document/at_document.py`

```python
@frappe.whitelist()
def toggle_verified(docname: str) -> dict:
    doc = frappe.get_doc("AT Document", docname)
    doc.is_verified = 0 if doc.is_verified else 1
    doc.save(ignore_permissions=False)
    return {"is_verified": doc.is_verified}
```

### Görev 6.2 — Frontend: Doğrula butonu

**Dosya:** `frontend/src/pages/CustomerDetail.vue` ve AT Documents workbench detail panel

- Yazma yetkisi varsa AT Document kartında "Doğrula" / "Doğrulamayı Kaldır" butonu
- `toggle_verified()` çağırır, sonucu reactive olarak günceller

### Görev 6.3 — Test + Build + Commit

---

## FAZ 7 — P2.4: WhatsApp Paylaşım

Bu faz AT Document'i müşteriyle WhatsApp üzerinden paylaşmayı sağlar.

### Görev 7.1 — Backend: share_document()

**Dosya:** `acentem_takipte/acentem_takipte/api/documents.py`

```python
@frappe.whitelist()
def share_document(docname: str, method: str = "whatsapp") -> dict:
    doc = frappe.get_doc("AT Document", docname)
    if doc.is_sensitive:
        return {"warning": "Hassas veri işareti var. Paylaşım önerilmez.", "url": None}
    file_doc = frappe.get_doc("File", doc.file)
    customer = frappe.get_doc("AT Customer", doc.customer) if doc.customer else None
    phone = customer.mobile_no if customer and customer.mobile_no else ""
    file_url = frappe.utils.get_url(file_doc.file_url)
    if method == "whatsapp":
        wa_url = f"https://wa.me/{phone}?text={frappe.utils.quote(file_url)}"
        return {"url": wa_url, "phone": phone}
    return {"url": file_url}
```

Not: `is_sensitive` dosyalar için uyarı döndürülür ama paylaşım engellenmez (son karar kullanıcıda).

### Görev 7.2 — Frontend: Paylaş butonu

**Dosya:** AT Documents workbench detail panel + CustomerDetail doküman kartları

- "WhatsApp ile Paylaş" butonu (tıklanınca `wa.me` linkini yeni sekmede açar)
- `is_sensitive` ise sarı uyarı tooltip gösterir

### Görev 7.3 — Test + Build + Commit

---

## FAZ 8 — P3: DMS Naming + Secondary Ad Yönetimi

Bu faz standart doküman adı üretimini merkezi servis ile yapar ve orijinal dosya adını secondary bilgi olarak düzenlenebilir hale getirir.

### Görev 8.1 — Backend: AT Document yeni metadata alanları

**Dosya:** `acentem_takipte/acentem_takipte/doctype/at_document/at_document.json`

Eklenecek alanlar:
- `secondary_file_name` (Data) → kullanıcı tarafından düzenlenebilir ikincil ad
- `original_file_name` (Data, read_only) → upload edilen orijinal ad
- `sequence_no` (Int, read_only) → günlük sayaç
- `upload_date` (Date, read_only) → sayaç kovası
- `naming_key` (Data, hidden/index) → yarış durumu için partition anahtarı

`display_name` alanı unique olacak.

### Görev 8.2 — Backend: Merkezi ve sequence-safe isimlendirme servisi

**Dosya:** `acentem_takipte/acentem_takipte/api/documents.py`

`upload_document()` içinde:
- `AT Document` insert öncesi merkezi isim rezervasyonu yapılır.
- Format: `[REF]_[SUBTYPE]_[YYYYMMDD]_[SEQ]`
- `REF` tüm bağlamlarda çalışır: `POL-*`, `CLM-*`, `CUS-*`
- `GET_LOCK/RELEASE_LOCK` ile race condition korunur.

`original_file_name` upload edilen `File.file_name` ile doldurulur.
`secondary_file_name` başlangıçta `original_file_name` ile aynı yazılır.

### Görev 8.3 — Backend: Hook davranışı

**Dosya:** `acentem_takipte/acentem_takipte/doctype/at_document/at_document.py`

`before_insert` artık display_name'i her zaman ezmez; yalnızca boşsa fallback üretir.
Asıl isimlendirme upload servisinde merkezi yapılır.

### Görev 8.4 — Quick Edit ile secondary ad + not güncelleme

**Dosyalar:**
- `acentem_takipte/acentem_takipte/api/session.py`
- `acentem_takipte/acentem_takipte/services/quick_create_helpers.py`
- `acentem_takipte/acentem_takipte/api/aux_edit_registry.py`
- `frontend/src/config/quickCreate/registry.js`
- `frontend/src/config/auxWorkbench/registry.js`

`AT Document` quick-edit yetkisi açılır.
Kullanıcı şu alanları düzenleyebilir:
- `secondary_file_name`
- `notes`

### Görev 8.5 — Doküman Merkezi görünümü

**Dosyalar:**
- `frontend/src/config/auxWorkbench/registry.js`
- `frontend/src/composables/useAuxWorkbenchViewModel.js`

Liste/Detay görünümünde:
- Ana başlık: `display_name`
- Secondary bilgi: `secondary_file_name`
- Orijinal ad: `original_file_name` (salt okunur)

### Görev 8.6 — P3 Build ve Yayın

1. `npm run test:unit`
2. `npm run build`
3. `bench --site at.localhost migrate`
4. `bench --site at.localhost clear-cache`
5. `bench build --app acentem_takipte`
6. Smoke:
  - aynı gün aynı subtype için artan `_001`, `_002` oluşuyor mu?
  - quick edit ile `secondary_file_name` ve `notes` kaydedilebiliyor mu?

---

## Definition of Done

### P0 Done Kriterleri ✅

- [x] Dokümanlar tabında "Doküman Yükle" butonu: yazma izninde görünür, okuma-only'de gizli
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

### P1 Done Kriterleri ✅

- [x] Sidebar'da "Doküman Kayıtları" linki görünür
- [x] Files workbench toolbar'ında "Doküman Yükle" butonu görünür
- [x] URL context prefill: PolicyDetail'den yönlendirmede filtreler dolu gelir
- [x] `is_private` ve `owner` filtreleri workbench'de çalışır
- [x] Yeni preset'ler (Gizli Dosyalar, Son Yüklenenler) listeleniyor
- [x] Tüm yeni string'ler i18n'e eklendi
- [x] `npm run build` başarılı
- [x] `bench build --app acentem_takipte` başarılı

### P2 Done Kriterleri ✅

- [x] `AT Document` DocType tanımlı (11 alan, auto-naming)
- [x] `upload_document()` AT Document otomatik oluşturuyor + auto-wiring
- [x] `at-documents` workbench tam Türkçe etiketler + filtreler + presetler
- [x] AuxWorkbench `files` + `at-documents` sütunları Türkçe
- [x] Tüm UI'da "Belge" → "Doküman" standardizasyonu
- [x] 266/266 unit test pass
- [x] `npm run build` başarılı
- [x] `bench build --app acentem_takipte` başarılı

### P2.1 Done Kriterleri ✅

- [x] `at_document.json`'a `document_sub_type`, `is_sensitive`, `is_verified` eklendi
- [x] `upload_document()` bu 3 alanı kabul ediyor
- [x] AuxWorkbench `at-documents`'da yeni alanlar görünüyor
- [x] `document_sub_type` ve `is_sensitive` filtresi çalışıyor
- [x] `PolicyDocumentUploadModal`'da `document_sub_type` seçilebiliyor
- [x] i18n: Alt Tür, Hassas Veri, Doğrulandı çevirileri eklendi
- [x] Unit testler pass, build başarılı

### P2.2 Done Kriterleri ✅

- [x] `customer_360.py` AT Document sorgusu döndürüyor (direkt + poliçe + hasar)
- [x] CustomerDetail operations tab'ında bireysel doküman kartları görünüyor
- [x] Semantik başlık: `{document_sub_type} | {file_name}`
- [x] Badge renk haritası uygulandı (Ruhsat=blue, Kimlik=slate…)
- [x] `is_sensitive` kilit ikonu, `is_verified` yeşil tik gösteriliyor
- [x] Unit testler pass, build başarılı

### P2.3 Done Kriterleri ✅

- [x] `at_document.py`'da `toggle_verified()` whitelist metodu var
- [x] Yazma yetkisinde "Doğrula" butonu görünüyor
- [x] Toggle aksiyonu reactive olarak güncelleniyor
- [x] Unit testler pass, build başarılı

### P2.4 Done Kriterleri ✅

- [x] `share_document()` whitelist metodu var
- [x] `is_sensitive` belgeler için uyarı döndürülüyor
- [x] Frontend'de "WhatsApp ile Paylaş" butonu çalışıyor
- [x] Unit testler pass, build başarılı

---

## Terim Sözlüğü (Bu Özelliğe Özgü)

Bu terimler localization guide §7 sözlüğüne eklenecek:

| EN | TR |
|---|---|
| Document | Doküman |
| Document Center | Doküman Merkezi |
| Document Registry | Doküman Kayıtları |
| Upload | Yükle / Yükleme |
| Private | Gizli |
| File Size | Dosya Boyutu |
| Document Kind | Doküman Türü |
| Document Sub Type | Alt Tür |
| Sensitive Data | Hassas Veri |
| Verified | Doğrulandı |
| Vehicle Registration | Ruhsat |
| ID Document | Kimlik |
| Policy Copy | Poliçe Kopyası |
| Damage Photo | Hasar Fotoğrafı |

---

## Uygulama Sırası Özeti

| # | Görev | Faz | Etki | Risk | Durum |
|---|---|---|---|---|---|
| 1 | `policy_360.py` file fields: `file_size`, `is_private` ekle | P0 | Düşük | Minimal | ✅ Tamamlandı |
| 2 | `PolicyDocumentUploadModal.vue` oluştur | P0 | Yüksek | Modal state yönetimi | ✅ Tamamlandı |
| 3 | `PolicyDetailMainContent.vue` "Doküman Yükle" butonu + kart zenginleştirme | P0 | Yüksek | Prop genişletme | ✅ Tamamlandı |
| 4 | `usePolicyDetailRuntime.js` upload logic + `fmtFileSize` + `canUploadDocuments` | P0 | Yüksek | CSRF token + FormData | ✅ Tamamlandı |
| 5 | `PolicyDetail.vue` prop aktarımı + modal entegrasyonu | P0 | Orta | — | ✅ Tamamlandı |
| 6 | i18n: yeni keyler, 3 dosya güncelle | P0 | Zorunlu | Karakter doğruluğu | ✅ Tamamlandı |
| 7 | `PolicyDetail.test.js` yeni testler | P0 | Yüksek | — | ✅ Tamamlandı |
| 8 | Sidebar "Doküman Kayıtları" linki | P1 | Orta | navSections + copy | ✅ Tamamlandı |
| 9 | Files workbench `toolbarActions` + `type:"upload"` | P1 | Orta | Runtime wiring | ✅ Tamamlandı |
| 10 | Files workbench filtre genişletme (`is_private`, `owner`, presets) | P1 | Düşük | Registry değişikliği | ✅ Tamamlandı |
| 11 | URL context prefill (upload modal ↔ route query) | P1 | Orta | Runtime wiring | ✅ Tamamlandı |
| 12 | `AT Document` DocType + upload akışı + at-documents workbench | P2 | Yüksek | Yeni Frappe DocType | ✅ Tamamlandı |
| 13 | AuxWorkbench sütun etiketleri Türkçe (files + at-documents) | P2 | Orta | Lokalizasyon | ✅ Tamamlandı |
| 14 | Belge→Doküman standardizasyonu (tüm UI) | P2 | Orta | Lokalizasyon | ✅ Tamamlandı |
| 15 | `at_document.json` 3 yeni alan: sub_type, is_sensitive, is_verified | P2.1 | Orta | DocType migration | ✅ Tamamlandı |
| 16 | `upload_document()` yeni alanları kabul et | P2.1 | Düşük | API genişletme | ✅ Tamamlandı |
| 17 | AuxWorkbench + modal yeni alanlar + filtreler | P2.1 | Orta | Frontend wiring | ✅ Tamamlandı |
| 18 | `customer_360.py` AT Document sorgusu | P2.2 | Yüksek | Backend sorgu değişikliği | ✅ Tamamlandı |
| 19 | CustomerDetail bireysel doküman listesi + badge'ler | P2.2 | Yüksek | Frontend bileşen | ✅ Tamamlandı |
| 20 | `toggle_verified()` whitelist metodu + Doğrula butonu | P2.3 | Orta | Backend + frontend | ✅ Tamamlandı |
| 21 | `share_document()` whitelist + WhatsApp paylaşım butonu | P2.4 | Orta | Backend + frontend | ✅ Tamamlandı |

---

## FAZ 9 — P2.5: Dokümanı Aç Aksiyonu (Doküman Merkezi + Doküman Detayı)

Amaç: Kullanıcı, dokümanın metadata kaydına girebildiği gibi gerçek dosyanın kendisini de tek tıkla açabilmeli.

### Görev 9.1 — Frontend: Ortak dosya URL çözümleyici

**Dosya:** `frontend/src/utils/documentOpen.js` *(yeni)*

Ortak yardımcı fonksiyonlar:
- `resolveDocumentOpenUrl(row)`:
  - Öncelik 1: `row.file_url`
  - Öncelik 2: `row.file` bir File name ise `/api/resource/File/{name}` ile `file_url` çekme
  - Öncelik 3: `row.file` zaten URL ise direkt kullan
  - Sonuç URL mutlak değilse güvenli şekilde relatif aç
- `openDocumentInNewTab(row)`:
  - URL varsa `window.open(url, "_blank", "noopener,noreferrer")`
  - URL yoksa kullanıcıya lokalize hata mesajı döndürür

Not: Bu yaklaşım private/public dosya davranışını Frappe File izin modeline bırakır.

### Görev 9.2 — Frontend: Doküman Merkezi listesinde "Dokümanı Aç"

**Dosyalar:**
- `frontend/src/components/aux-workbench/AuxWorkbenchTableSection.vue`
- `frontend/src/pages/AuxWorkbench.vue`
- `frontend/src/composables/useAuxWorkbenchRuntime.js`
- `frontend/src/composables/useAuxWorkbenchViewModel.js`

Yapılacaklar:
- `at-documents` ve `files` ekranlarında satır aksiyonlarına üçüncü buton ekle: `Dokümanı Aç` / `Open Document`.
- Emit zinciri: `open-document`.
- Runtime tarafında `openDocument(row)` implementasyonu ile ortak çözümleyici çağrılır.
- URL çözülemezse toast/banner ile bilgilendirme: `Dosya bağlantısı bulunamadı` / `File link not found`.

### Görev 9.3 — Frontend: Doküman Detay üst barda "Dokümanı Aç"

**Dosyalar:**
- `frontend/src/components/aux-record-detail/AuxRecordDetailTopbar.vue`
- `frontend/src/pages/AuxRecordDetail.vue`
- `frontend/src/composables/useAuxRecordDetailActions.js`

Yapılacaklar:
- Mevcut `Detayı Görüntüle` ve `Bağlı Kayda Git` aksiyonlarının yanına `Dokümanı Aç` butonu eklenir.
- Sadece ekran `files` veya `at-documents` olduğunda görünür.
- `AT Document` için `doc.file_url` yoksa `doc.file` üzerinden fallback çözümlemesi yapılır.

### Görev 9.4 — i18n ve metinler

**Güncellenecek dosyalar:**
- `frontend/src/generated/translations.js`
- (gerekirse) sayfa içi `copy.tr/en` blokları

Yeni metinler:
- `openDocument`: EN `Open Document` / TR `Dokümanı Aç`
- `fileLinkNotFound`: EN `File link not found` / TR `Dosya bağlantısı bulunamadı`

### Görev 9.5 — Test ve smoke doğrulama

Unit:
- `AuxWorkbenchTableSection` yeni buton görünürlüğü
- `useAuxWorkbenchRuntime.openDocument` URL çözümleme davranışı
- `AuxRecordDetailTopbar` koşullu buton görünürlüğü

Smoke:
1. Doküman Merkezi listesinde satırdan `Dokümanı Aç` -> dosya yeni sekmede açılır.
2. Doküman Detayı üst bardan `Dokümanı Aç` -> dosya yeni sekmede açılır.
3. `is_private=1` dosyada yetkisiz kullanıcı için Frappe izin davranışı (403/login) korunur.
4. TR/EN metinler doğru görünür.

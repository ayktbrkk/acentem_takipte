<template>
  <span :class="['status-badge', variantClass]">{{ label }}</span>
</template>

<script setup>
import { computed } from "vue";

const props = defineProps({
  status: { type: String, required: true },
  // Domain: 'customer', 'policy', 'offer', 'lead', 'claim', 'renewal', 'payment', etc.
  // Otomatik muamele yapıyoruz; gerekirse explicit ayarla
  domain: { type: String, default: null },
});

// Frappe raw value → normalization mapping
const DOMAIN_MAP = {
  customer: {
    1: "active",      // customer.enabled = 1
    0: "cancel",      // customer.enabled = 0
    enabled: "active",
    disabled: "cancel",
  },
  consent: {
    Unknown: "draft",
    Granted: "active",
    Revoked: "cancel",
  },
  policy: {
    "Active": "active",
    "Draft": "draft",
    "KYT": "waiting",  // Kaybedilme Tehdidi Altında
    "IPT": "waiting",  // İptal Prim Teklifinde
    "Expired": "cancel",
    "Cancelled": "cancel",
  },
  offer: {
    "Draft": "draft",
    "Sent": "waiting",
    "Accepted": "open",
    "Rejected": "cancel",
    "Converted": "active",
  },
  lead: {
    "Draft": "draft",
    "Open": "open",
    "Replied": "active",
    "Closed": "cancel",
  },
  lead_conversion: {
    "Actionable": "open",
    "Offer": "waiting",
    "Policy": "active",
    "Incomplete": "waiting",
    "Closed": "draft",
  },
  lead_stale: {
    "Fresh": "active",
    "FollowUp": "waiting",
    "Stale": "cancel",
  },
  claim: {
    "Open": "open",
    "Approved": "waiting",
    "Paid": "active",
    "Closed": "active",
    "Rejected": "cancel",
  },
  renewal: {
    "Open": "open",
    "In Progress": "waiting",
    "Completed": "active",
    "Done": "active",
    "Cancelled": "cancel",
  },
  reconciliation: {
    "Open": "open",
    "Matched": "active",
    "Pending": "waiting",
    "Mismatch": "waiting",
    "Cancelled": "cancel",
  },
  activity: {
    "Draft": "draft",
    "Open": "open",
    "In Progress": "waiting",
    "Pending": "waiting",
    "Done": "active",
    "Completed": "active",
    "Cancelled": "cancel",
  },
  reminder: {
    "Draft": "draft",
    "Open": "open",
    "Scheduled": "waiting",
    "Pending": "waiting",
    "Snoozed": "waiting",
    "Done": "active",
    "Completed": "active",
    "Cancelled": "cancel",
  },
  payment: {
    "Draft": "draft",
    "Outstanding": "open",
    "Pending": "waiting",
    "Processing": "waiting",
    "Overdue": "waiting",
    "Partially Paid": "waiting",
    "Paid": "active",
    "Completed": "active",
    "Failed": "cancel",
    "Cancelled": "cancel",
  },
  payment_direction: {
    "Inbound": "active",
    "Outbound": "waiting",
  },
  notification_status: {
    "Draft": "draft",
    "Queued": "open",
    "Processing": "waiting",
    "Sent": "active",
    "Failed": "waiting",
    "Dead": "cancel",
  },
  notification_channel: {
    "SMS": "open",
    "Email": "waiting",
    "WHATSAPP": "active",
    "Both": "draft",
  },
  boolean_active: {
    "1": "active",
    "0": "draft",
    "true": "active",
    "false": "draft",
  },
  sales_entity_type: {
    "Agency": "open",
    "Representative": "waiting",
    "Sub-Account": "draft",
  },
  accounting_sync: {
    "Draft": "draft",
    "Synced": "active",
    "Failed": "cancel",
  },
};

const DOMAIN_LABELS = {
  consent: {
    Unknown: "Bilinmiyor",
    Granted: "Onaylı",
    Revoked: "İptal",
  },
  lead_conversion: {
    Actionable: "Aksiyon Bekliyor",
    Offer: "Teklife Dönüştü",
    Policy: "Poliçeye Dönüştü",
    Incomplete: "Eksik Bilgi",
    Closed: "Kapalı",
  },
  lead_stale: {
    Fresh: "Güncel",
    FollowUp: "Takip Et",
    Stale: "Bekliyor",
  },
  activity: {
    Draft: "Taslak",
    Open: "Açık",
    "In Progress": "Devam Ediyor",
    Pending: "Bekliyor",
    Done: "Tamamlandı",
    Completed: "Tamamlandı",
    Cancelled: "İptal",
  },
  reminder: {
    Draft: "Taslak",
    Open: "Açık",
    Scheduled: "Planlandı",
    Pending: "Bekliyor",
    Snoozed: "Ertelendi",
    Done: "Tamamlandı",
    Completed: "Tamamlandı",
    Cancelled: "İptal",
  },
  payment: {
    Draft: "Taslak",
    Outstanding: "Açık",
    Pending: "Bekliyor",
    Processing: "İşleniyor",
    Overdue: "Vadesi Geçti",
    "Partially Paid": "Kısmi Ödendi",
    Paid: "Ödendi",
    Completed: "Tamamlandı",
    Failed: "Başarısız",
    Cancelled: "İptal",
  },
  payment_direction: {
    Inbound: "Tahsilat",
    Outbound: "Ödeme",
  },
  notification_status: {
    Draft: "Taslak",
    Queued: "Kuyrukta",
    Processing: "İşleniyor",
    Sent: "Gönderildi",
    Failed: "Başarısız",
    Dead: "Kalıcı Hata",
  },
  notification_channel: {
    SMS: "SMS",
    Email: "E-posta",
    WHATSAPP: "WhatsApp",
    Both: "Her İkisi",
  },
  boolean_active: {
    "1": "Aktif",
    "0": "Pasif",
    true: "Aktif",
    false: "Pasif",
  },
  sales_entity_type: {
    Agency: "Acente",
    Representative: "Temsilci",
    "Sub-Account": "Alt Hesap",
  },
  accounting_sync: {
    Draft: "Taslak",
    Synced: "Senkronize",
    Failed: "Başarısız",
  },
};

const STANDARD_MAP = {
  active: { cls: "status-active", label: "Aktif" },
  draft: { cls: "status-draft", label: "Taslak" },
  waiting: { cls: "status-waiting", label: "Bekliyor" },
  open: { cls: "status-open", label: "Açık" },
  cancel: { cls: "status-cancel", label: "İptal" },
};

const normalizedStatus = computed(() => {
  const raw = String(props.status || "").trim();
  
  // 1. Try domain-specific mapping
  if (props.domain && DOMAIN_MAP[props.domain]) {
    const domainNorm = DOMAIN_MAP[props.domain][raw];
    if (domainNorm) return domainNorm;
  }
  
  // 2. Fallback: lowercase → try standard map
  const lower = raw.toLowerCase();
  if (STANDARD_MAP[lower]) return lower;
  
  // 3. Last resort: kesin lowercase değerse (e.g., "active" → "active")
  return lower in STANDARD_MAP ? lower : "draft";
});

const localizedDomainLabel = computed(() => {
  const raw = String(props.status || "").trim();
  if (!props.domain || !DOMAIN_LABELS[props.domain]) return null;
  return DOMAIN_LABELS[props.domain][raw] || null;
});

const variantClass = computed(() => STANDARD_MAP[normalizedStatus.value]?.cls ?? "status-draft");
const label = computed(() => localizedDomainLabel.value || STANDARD_MAP[normalizedStatus.value]?.label || props.status);
</script>
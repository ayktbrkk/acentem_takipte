<template>
  <div class="detail-topbar">
    <div>
      <p class="detail-breadcrumb">{{ t("breadcrumb") }}</p>
      <h1 class="detail-title">
        {{ offer.offer_no || t("overview") }}
        <StatusBadge :status="uiOfferStatus" />
      </h1>
      <p v-if="offerHeaderSubtitle" class="detail-subtitle">{{ offerHeaderSubtitle }}</p>
      <div class="mt-1.5 flex flex-wrap items-center gap-2">
        <span class="copy-tag">{{ offer.name || name }}</span>
        <span v-if="offer.customer_name || offer.customer" class="copy-tag">{{ offer.customer_name || offer.customer }}</span>
        <span v-if="offer.branch" class="copy-tag">{{ offer.branch }}</span>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-2">
      <button class="btn btn-outline btn-sm" type="button" @click="goBack">{{ t("backList") }}</button>
      <button class="btn btn-outline btn-sm" type="button" @click="downloadPdf">{{ t("downloadPdf") }}</button>
      <button class="btn btn-outline btn-sm" type="button" @click="sendEmail">{{ t("sendEmail") }}</button>
      <button v-if="isOfferConvertible" class="btn btn-primary btn-sm" type="button" @click="convertToPolicy">{{ t("convertToPolicy") }}</button>
      <button v-else class="btn btn-primary btn-sm" type="button" @click="editOffer">{{ t("edit") }}</button>
    </div>
  </div>
</template>

<script setup>
import StatusBadge from "../ui/StatusBadge.vue";

defineProps({
  name: { type: String, default: "" },
  offer: { type: Object, required: true },
  uiOfferStatus: { type: String, required: true },
  offerHeaderSubtitle: { type: String, default: "" },
  isOfferConvertible: { type: Boolean, default: false },
  t: { type: Function, required: true },
  goBack: { type: Function, required: true },
  downloadPdf: { type: Function, required: true },
  sendEmail: { type: Function, required: true },
  convertToPolicy: { type: Function, required: true },
  editOffer: { type: Function, required: true },
});
</script>

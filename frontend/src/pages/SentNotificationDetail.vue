<template>
  <AuxRecordDetail screen-key="notification-outbox" :name="name" />
</template>

<script setup>
import AuxRecordDetail from "./AuxRecordDetail.vue";

defineProps({
  name: {
    type: String,
    required: true,
  },
});
</script>

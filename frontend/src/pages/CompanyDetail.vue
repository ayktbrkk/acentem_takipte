<template>
  <AuxRecordDetail screen-key="companies" :name="name" />
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

<template>
  <div class="card">
    <div v-if="title || $slots.action" class="card-head">
      <span class="card-title">{{ title }}</span>
      <slot name="action" />
    </div>
    <div class="card-body">
      <slot />
    </div>
  </div>
</template>

<script setup>
defineProps({ title: { type: String, default: "" } });
</script>
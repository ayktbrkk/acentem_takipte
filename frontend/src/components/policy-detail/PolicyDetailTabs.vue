<template>
  <div class="nav-tabs-bar">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      :class="['nav-tab', activeTab === tab.key && 'is-active']"
      type="button"
      @click="$emit('update:activeTab', tab.key)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup>
defineProps({
  activeTab: { type: String, required: true },
  tabs: { type: Array, required: true },
});

defineEmits(["update:activeTab"]);
</script>

<template>
  <div class="stepbar">
    <template v-for="(step, i) in steps" :key="step.label">
      <div :class="['step-item', step.state]">
        <div class="step-circle">
          <span v-if="step.state === 'done'">✓</span>
          <span v-else-if="step.state === 'current'">→</span>
          <span v-else style="opacity: 0.4">○</span>
        </div>
        <span>{{ step.label }}</span>
      </div>
      <div v-if="i < steps.length - 1" :class="['step-line', step.state === 'done' ? 'done' : '']" />
    </template>
  </div>
</template>

<script setup>
defineProps({ steps: { type: Array, required: true } });
</script>
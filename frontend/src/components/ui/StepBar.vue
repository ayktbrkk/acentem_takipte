<template>
  <div class="stepbar">
    <template v-for="(step, i) in steps" :key="step.label">
      <div :class="['step-item', step.state]">
        <div class="step-circle">
          <FeatherIcon v-if="step.state === 'done'" name="check" class="h-3 w-3" />
          <FeatherIcon v-else-if="step.state === 'current'" name="arrow-right" class="h-3 w-3" />
          <span v-else class="h-1.5 w-1.5 rounded-full bg-current" />
        </div>
        <span>{{ step.label }}</span>
      </div>
      <div v-if="i < steps.length - 1" :class="['step-line', step.state === 'done' ? 'done' : '']" />
    </template>
  </div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";
defineProps({ steps: { type: Array, required: true } });
</script>
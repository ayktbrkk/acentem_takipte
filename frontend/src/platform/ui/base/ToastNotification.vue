<template>
  <Transition
    enter-active-class="transform ease-out duration-300 transition"
    enter-from-class="translate-y-2 opacity-0 sm:translate-y-0 sm:translate-x-2"
    enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
    leave-active-class="transition ease-in duration-100"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="pointer-events-auto w-full max-w-sm overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-black ring-opacity-5 border-l-4"
      :class="type === 'success' ? 'border-emerald-500' : 'border-rose-500'"
    >
      <div class="p-4">
        <div class="flex items-start">
          <div class="flex-shrink-0">
            <FeatherIcon
              :name="type === 'success' ? 'check-circle' : 'alert-circle'"
              class="h-6 w-6"
              :class="type === 'success' ? 'text-emerald-500' : 'text-rose-500'"
            />
          </div>
          <div class="ml-3 w-0 flex-1 pt-0.5">
            <p class="text-sm font-bold text-slate-900">{{ message }}</p>
            <p v-if="description" class="mt-1 text-xs font-medium text-slate-500">{{ description }}</p>
          </div>
          <div class="ml-4 flex flex-shrink-0">
            <button
              type="button"
              class="inline-flex rounded-md bg-white text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              @click="$emit('close')"
            >
              <span class="sr-only">Close</span>
              <FeatherIcon name="x" class="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup>
import { FeatherIcon } from 'frappe-ui';

defineProps({
  show: Boolean,
  message: String,
  description: String,
  type: { type: String, default: 'success' }
});

defineEmits(['close']);
</script>

<template>
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="translate-x-full opacity-0"
    enter-to-class="translate-x-0 opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="translate-x-0 opacity-100"
    leave-to-class="translate-x-full opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-y-0 right-0 z-[60] w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl focus:outline-none"
      role="dialog"
      aria-modal="true"
    >
      <div class="flex h-full flex-col">
        <!-- Header -->
        <header class="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 class="text-lg font-bold text-slate-900">{{ title }}</h2>
            <p v-if="subtitle" class="text-xs text-slate-500 font-medium">{{ subtitle }}</p>
          </div>
          <button
            class="rounded-full p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors"
            @click="$emit('close')"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>

        <!-- Content -->
        <main class="flex-1 overflow-y-auto p-6 bg-slate-50/30">
          <slot></slot>
        </main>

        <!-- Footer -->
        <footer v-if="$slots.footer" class="border-t border-slate-100 bg-white px-6 py-4">
          <slot name="footer"></slot>
        </footer>
      </div>
    </div>
  </Transition>
  
  <!-- Backdrop -->
  <Transition
    enter-active-class="transition duration-300 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-200 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="show"
      class="fixed inset-0 z-[55] bg-brand-600/40 backdrop-blur-sm"
      @click="$emit('close')"
    ></div>
  </Transition>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  title: { type: String, default: "" },
  subtitle: { type: String, default: "" },
});

defineEmits(["close"]);
</script>

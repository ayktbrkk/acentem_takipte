<template>
  <ActionButton
    :variant="variant"
    :size="size"
    :disabled="disabled || busy"
    @click="onClick"
  >
    <slot>{{ label }}</slot>
  </ActionButton>
</template>

<script setup>
import { useRoute, useRouter } from "vue-router";
import ActionButton from "./ActionButton.vue";
import { buildQuickCreateIntentQuery } from "../../utils/quickRouteIntent";

const props = defineProps({
  label: { type: String, default: "" },
  variant: { type: String, default: "primary" },
  size: { type: String, default: "sm" },
  disabled: { type: Boolean, default: false },
  busy: { type: Boolean, default: false },
  routeName: { type: String, default: "" },
  prefills: { type: Object, default: () => ({}) },
  extras: { type: Object, default: () => ({}) },
  withReturnTo: { type: Boolean, default: false },
  returnTo: { type: String, default: "" },
});

const emit = defineEmits(["launch"]);

const router = useRouter();
const route = useRoute();

function onClick() {
  if (props.disabled || props.busy) return;
  if (!props.routeName) {
    emit("launch");
    return;
  }
  const returnTo = props.withReturnTo ? (props.returnTo || route.fullPath || "") : "";
  router.push({
    name: props.routeName,
    query: buildQuickCreateIntentQuery({
      prefills: props.prefills,
      extras: props.extras,
      returnTo,
    }),
  });
}
</script>


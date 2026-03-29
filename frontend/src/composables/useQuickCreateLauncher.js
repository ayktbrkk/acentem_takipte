import { useRoute, useRouter } from "vue-router";

import { buildQuickCreateIntentQuery } from "../utils/quickRouteIntent";

export function useQuickCreateLauncher(props, emit) {
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

  return {
    onClick,
  };
}

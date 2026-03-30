import { usePolicyQuickCreateRuntime } from "./usePolicyQuickCreateRuntime";

export function usePolicyListQuickPolicy({
  t,
  activeLocale,
  router,
  route,
  branchStore,
  refreshPolicyList,
  openPolicyDetail,
}) {
  return usePolicyQuickCreateRuntime({
    t,
    activeLocale,
    router,
    route,
    branchStore,
    refreshPolicyList,
    openPolicyDetail,
  });
}

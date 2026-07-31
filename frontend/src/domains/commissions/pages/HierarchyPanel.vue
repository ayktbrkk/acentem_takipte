<template>
  <SectionPanel :title="t('hierarchy_title')">
    <div v-if="loading" class="py-4">
      <SkeletonLoader variant="list" :rows="3" />
    </div>
    <div v-else-if="error" class="py-4 text-sm text-red-600">
      {{ error }}
    </div>
    <div v-else-if="!hierarchy.branches.length" class="py-4 text-sm text-slate-400">
      {{ t('no_hierarchy') }}
    </div>
    <div v-else>
      <div v-for="branch in hierarchy.branches" :key="branch.name" class="mb-4">
        <EntityNode
          :node="branch"
          :depth="0"
          :selected-name="selectedName"
          @select="$emit('select', $event)"
        />
      </div>
      <div v-if="violations.length" class="mt-4 p-3 rounded-lg bg-at-amber/10 border border-at-amber/30">
        <div class="flex items-center gap-2 text-sm text-at-amber font-medium mb-2">
          <FeatherIcon name="alert-triangle" class="h-4 w-4" />
          {{ t('share_pct_warning') }}
        </div>
        <div v-for="v in violations" :key="v.parent_name" class="text-xs text-at-amber/80 ml-6">
          {{ v.parent }}: {{ v.total_pct }}% {{ t('exceeds_100') }}
        </div>
      </div>
      <div class="mt-3 text-xs text-slate-400">
        {{ t('total_entities') }}: {{ hierarchy.total_entities }}
      </div>
    </div>
  </SectionPanel>
</template>

<script setup>
import { computed, onMounted, ref, unref, watch } from "vue";
import { createResource } from "frappe-ui";
import { FeatherIcon } from "frappe-ui";
import { useAuthStore } from "../../../stores/auth";
import { COMMISSION_TRANSLATIONS } from "../i18n/translations";
import SectionPanel from "../../../components/app-shell/SectionPanel.vue";
import SkeletonLoader from "../../../components/ui/SkeletonLoader.vue";
import EntityNode from "./EntityNode.vue";

const props = defineProps({
  officeBranch: { type: String, default: "" },
});

defineEmits(["select"]);

const authStore = useAuthStore();
const activeLocale = computed(() =>
  String(authStore.locale || "tr").toLowerCase().startsWith("tr") ? "tr" : "en",
);

function t(key) {
  return (
    COMMISSION_TRANSLATIONS[activeLocale.value]?.[key] ||
    COMMISSION_TRANSLATIONS.en?.[key] ||
    key
  );
}

const hierarchyResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.get_entity_hierarchy",
  auto: false,
});

const violationsResource = createResource({
  url: "acentem_takipte.acentem_takipte.domains.commissions.api.endpoints.validate_entity_share_totals",
  auto: false,
});

const loading = computed(() => Boolean(unref(hierarchyResource.loading)));
const error = ref("");
const hierarchy = computed(() => unref(hierarchyResource.data) || { branches: [], total_entities: 0 });
const violations = computed(() => (unref(violationsResource.data) || {}).violations || []);
const selectedName = ref("");

async function loadHierarchy() {
  try {
    const params = {};
    if (props.officeBranch) params.office_branch = props.officeBranch;
    await hierarchyResource.reload(params);
    await violationsResource.reload(params);
  } catch (e) {
    error.value = e?.message || "Failed to load hierarchy";
  }
}

onMounted(loadHierarchy);
watch(() => props.officeBranch, loadHierarchy);

defineExpose({ reload: loadHierarchy });
</script>

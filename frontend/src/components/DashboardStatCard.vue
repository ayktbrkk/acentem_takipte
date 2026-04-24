  <article class="relative overflow-hidden bg-white rounded-2xl border border-gray-100 p-5 shadow-sm transition-all hover:shadow-md hover:border-brand-200 active:scale-[0.98]">
    <div class="flex items-start justify-between">
      <div>
        <p class="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">{{ title }}</p>
        <p class="text-3xl font-black text-gray-900 tracking-tight">{{ value }}</p>
      </div>
      <div class="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 shadow-inner">
        <FeatherIcon :name="icon || 'bar-chart-2'" class="h-6 w-6" />
      </div>
    </div>

    <div class="mt-6 flex items-center justify-between border-t border-gray-50 pt-4">
      <span class="text-[10px] font-bold uppercase tracking-wider text-gray-400">
        {{ t("quickStatStatusLabel") }}
      </span>
      <div class="h-1.5 w-12 rounded-full bg-gray-100 overflow-hidden">
        <div class="h-full bg-brand-500 rounded-full" style="width: 65%"></div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui";

defineProps({
  title: {
    type: String,
    default: "",
  },
  value: {
    type: String,
    default: "",
  },
  t: {
    type: Function,
    required: true,
  },
  icon: {
    type: String,
    default: "bar-chart-2",
  },
});
</script>

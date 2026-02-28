<template>
  <header class="at-shell-topbar sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 px-3 py-3 backdrop-blur sm:px-4 lg:px-6">
    <div class="flex w-full flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <button
          class="rounded-lg border border-slate-300 px-2 py-1 text-sm text-slate-700 hover:bg-slate-100 lg:hidden"
          type="button"
          @click="$emit('toggle-sidebar')"
        >
          {{ t("menu") }}
        </button>
        <div>
          <p class="text-xs uppercase tracking-wide text-slate-500">{{ sectionLabel }}</p>
          <p class="text-lg font-semibold text-slate-900">{{ pageTitle }}</p>
        </div>
      </div>

      <div class="flex w-full items-center justify-end gap-2 md:w-auto md:gap-3">
        <button
          class="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          type="button"
          @click="toggleLocale"
        >
          {{ localeLabel }}
        </button>

        <div class="hidden rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right sm:block">
          <p class="text-[11px] text-slate-500">{{ branchCaption }}</p>
          <p class="text-xs font-semibold text-slate-800">{{ branchLabel }}</p>
        </div>

        <div class="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-right">
          <p class="text-[11px] text-slate-500">{{ t("user") }}</p>
          <p class="max-w-[180px] truncate text-xs font-semibold text-slate-800">{{ displayUser }}</p>
          <p v-if="showUserId" class="max-w-[180px] truncate text-[11px] text-slate-500">{{ displayUserId }}</p>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { createResource } from "frappe-ui";

import { sessionState, setPreferredLocale } from "../state/session";

defineEmits(["toggle-sidebar"]);

const route = useRoute();

const copy = {
  tr: {
    menu: "Menu",
    user: "Kullanici",
    allBranches: "Tum Subeler",
    branch: "Sube",
    defaultPage: "Pano",
    defaultSection: "Acentem Takipte",
  },
  en: {
    menu: "Menu",
    user: "User",
    allBranches: "All Branches",
    branch: "Branch",
    defaultPage: "Dashboard",
    defaultSection: "Acentem Takipte",
  },
};

function t(key) {
  return copy[sessionState.locale]?.[key] || copy.en[key] || key;
}

const branchLabel = computed(() => sessionState.branch || t("allBranches"));
const branchCaption = computed(() => t("branch"));
const pageTitle = computed(() => {
  const title = route.meta?.title;
  if (title && typeof title === "object") {
    return title[sessionState.locale] || title.en || t("defaultPage");
  }
  return title || t("defaultPage");
});
const sectionLabel = computed(() => {
  const section = route.meta?.section;
  if (section && typeof section === "object") {
    return section[sessionState.locale] || section.en || t("defaultSection");
  }
  return section || t("defaultSection");
});
const localeLabel = computed(() => (sessionState.locale === "tr" ? "TR" : "EN"));
const displayUser = computed(() => sessionState.user || sessionState.userId || t("user"));
const displayUserId = computed(() => sessionState.userId || "");
const showUserId = computed(() => Boolean(displayUserId.value && displayUserId.value !== displayUser.value));

const setLocaleResource = createResource({
  url: "acentem_takipte.acentem_takipte.api.session.set_session_locale",
});

async function persistLocaleViaFetch(locale) {
  const response = await fetch(
    `/api/method/acentem_takipte.acentem_takipte.api.session.set_session_locale?locale=${encodeURIComponent(locale)}`,
    {
      method: "GET",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    },
  );

  const payload = await response.json().catch(() => null);
  return payload?.message || null;
}

async function toggleLocale() {
  const next = sessionState.locale === "tr" ? "en" : "tr";
  setPreferredLocale(next);

  let payload = null;

  try {
    const response = await setLocaleResource.submit({ locale: next });
    payload = response?.message && typeof response.message === "object" ? response.message : response;
  } catch (error) {
    // fallback below
  }

  if (!payload) {
    try {
      payload = await persistLocaleViaFetch(next);
    } catch (error) {
      // Keep local UI locale even if server persistence fails.
    }
  }

  if (payload?.locale) {
    setPreferredLocale(payload.locale);
  }
  if (payload?.full_name) {
    sessionState.user = payload.full_name;
  }
  if (payload?.user) {
    sessionState.userId = payload.user;
  }
}

</script>

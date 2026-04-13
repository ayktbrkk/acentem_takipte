import { unref } from "vue";

function daysUntil(dateValue) {
  if (!dateValue) return null;
  const due = new Date(dateValue);
  if (Number.isNaN(due.getTime())) return null;
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / 86400000);
}

function compareDueDateAsc(leftDate, rightDate) {
  const leftDays = daysUntil(leftDate);
  const rightDays = daysUntil(rightDate);
  const safeLeft = leftDays == null ? Number.POSITIVE_INFINITY : leftDays;
  const safeRight = rightDays == null ? Number.POSITIVE_INFINITY : rightDays;
  return safeLeft - safeRight;
}

function compareDateDesc(leftDate, rightDate) {
  const leftTime = new Date(leftDate || 0).getTime();
  const rightTime = new Date(rightDate || 0).getTime();
  const safeLeft = Number.isFinite(leftTime) ? leftTime : 0;
  const safeRight = Number.isFinite(rightTime) ? rightTime : 0;
  return safeRight - safeLeft;
}

export function useDashboardFormatters({ dashboardComparisonTrendHint, localeCode, maxTrendValue }) {
    function upperLabel(text) {
      const locale = String(unref(localeCode) || "en").toLowerCase();
      return locale.startsWith("tr") ? String(text ?? "").toLocaleUpperCase("tr-TR") : String(text ?? "").toUpperCase();
    }

  function formatDate(dateValue) {
    if (!dateValue) return "-";
    const date = new Date(dateValue);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function formatMonthKey(monthKey) {
    if (!monthKey) return "-";
    const [year, month] = monthKey.split("-");
    if (!year || !month) return monthKey;
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat(unref(localeCode), { month: "short", year: "2-digit" }).format(date);
  }

  function formatNumber(value) {
    return new Intl.NumberFormat(unref(localeCode)).format(Number(value || 0));
  }

  function formatCurrencyBy(value, currency) {
    return new Intl.NumberFormat(unref(localeCode), {
      style: "currency",
      currency: currency || "TRY",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }

  function formatCurrency(value) {
    return formatCurrencyBy(value, "TRY");
  }

  function formatDaysToDue(dateValue) {
    if (!dateValue) return "-";
    const days = daysUntil(dateValue);
    if (days == null) return "-";
    if (days < 0) return `+${Math.abs(days)}d`;
    return `${days}d`;
  }

  function trendRatio(value) {
    const numericValue = Number(value || 0);
    if (numericValue <= 0) return 0;
    return Math.max(4, Math.round((numericValue / Number(unref(maxTrendValue) || 1)) * 100));
  }

  function rangeLabel(days) {
    return `${days}d`;
  }

  function buildTrend(currentValue, previousValue, reverseTrend = false) {
    const current = Number(currentValue || 0);
    const previous = Number(previousValue || 0);
    if (!previous && !current) {
      return { text: "0%", className: "text-slate-500" };
    }
    if (!previous && current) {
      return {
        text: "+100%",
        className: reverseTrend ? "text-amber-700" : "text-emerald-600",
      };
    }

    const rawPercent = ((current - previous) / Math.abs(previous)) * 100;
    const rounded = Math.round(rawPercent * 10) / 10;
    const positive = reverseTrend ? rounded <= 0 : rounded >= 0;
    const sign = rounded > 0 ? "+" : "";
    return {
      text: `${sign}${new Intl.NumberFormat(unref(localeCode), { maximumFractionDigits: 1 }).format(rounded)}%`,
      className: positive ? "text-emerald-600" : "text-amber-700",
    };
  }

  function buildQuickStatCard({ key, title, value, current, previous, icon, reverseTrend = false, trendHint }) {
    const trend = buildTrend(current, previous, reverseTrend);
    return {
      key,
      title: upperLabel(title),
      value,
      trendText: trend.text,
      trendClass: trend.className,
      trendHint: trendHint || unref(dashboardComparisonTrendHint),
      icon,
    };
  }

  return {
    buildQuickStatCard,
    compareDateDesc,
    compareDueDateAsc,
    formatCurrency,
    formatCurrencyBy,
    formatDate,
    formatDaysToDue,
    formatMonthKey,
    formatNumber,
    rangeLabel,
    trendRatio,
  };
}

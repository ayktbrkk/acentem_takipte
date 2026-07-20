import { unref } from "vue";

export function useAtFormatting(activeLocale) {
  /**
   * Formats currency according to AT standards.
   * TR: ₺14.000,00 (Symbol prefix, dot thousands, comma decimal)
   * EN: $14,000.00 (Symbol prefix, comma thousands, dot decimal)
   */
  function formatCurrency(val, currency = "TRY") {
    const locale = unref(activeLocale) || "tr";
    const isTr = locale.toLowerCase().startsWith("tr");
    const num = Number(val || 0);

    // Standard Intl format for the locale
    const formatter = new Intl.NumberFormat(isTr ? "tr-TR" : "en-US", {
      style: "currency",
      currency: currency || "TRY",
      currencyDisplay: "narrowSymbol",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    });

    let formatted = formatter.format(num);

    // Force symbol to front for TR if needed (Intl tr-TR usually puts it at the end)
    if (isTr && currency === "TRY") {
        // Intl tr-TR for TRY usually gives "14.000,00 ₺"
        // User wants "₺14.000,00"
        const cleanNum = new Intl.NumberFormat("tr-TR", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
        return `₺${cleanNum}`;
    }

    return formatted;
  }

  /**
   * Formats dates.
   * TR: DD.MM.YYYY
   * EN: MM/DD/YYYY
   */
  function formatDate(val) {
    if (!val) return "-";
    const locale = unref(activeLocale) || "tr";
    const isTr = locale.toLowerCase().startsWith("tr");
    const date = new Date(val);
    
    if (isNaN(date.getTime())) return val;

    return new Intl.DateTimeFormat(isTr ? "tr-TR" : "en-US", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
  }

  /**
   * Formats percent values.
   * TR: %14,28
   * EN: 14.28%
   */
  function formatPercent(val) {
    if (val === undefined || val === null) return "-";
    const locale = unref(activeLocale) || "tr";
    const isTr = locale.toLowerCase().startsWith("tr");
    const num = Number(val || 0);
    
    const formatted = new Intl.NumberFormat(isTr ? "tr-TR" : "en-US", {
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(num);

    return isTr ? `%${formatted}` : `${formatted}%`;
  }

  /**
   * Formats numbers/counts.
   */
  function formatCount(val) {
    const locale = unref(activeLocale) || "tr";
    const isTr = locale.toLowerCase().startsWith("tr");
    return Number(val || 0).toLocaleString(isTr ? "tr-TR" : "en-US");
  }

  return {
    formatCurrency,
    formatDate,
    formatPercent,
    formatCount
  };
}

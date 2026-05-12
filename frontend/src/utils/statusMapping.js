export const STATUS_DOMAIN_MAP = {
  payment: {
    Paid: "active",
    Unpaid: "hold",
    Overdue: "cancel",
    Partial: "warn",
  },
  claim: {
    Open: "active",
    Closed: "hold",
    Rejected: "cancel",
  },
  breakGlass: {
    approved: "active",
    pending: "hold",
    rejected: "cancel",
    expired: "warn",
  },
};

export function normalizeStatus(value, domain = "payment") {
  const domainMap = STATUS_DOMAIN_MAP[domain] || {};
  return domainMap[value] || value;
}

export function normalizePaidStatus(status) {
  return status === "Paid" ? "active" : "hold";
}

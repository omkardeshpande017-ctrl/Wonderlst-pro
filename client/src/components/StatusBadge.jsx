const STYLES = {
  pending: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
  approved: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
  payment_submitted: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  confirmed: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
  completed: "bg-ink-100 text-ink-700 ring-1 ring-ink-200",
  rejected: "bg-red-50 text-red-700 ring-1 ring-red-200",
  cancelled: "bg-ink-100 text-ink-600 ring-1 ring-ink-200",
  expired: "bg-orange-50 text-orange-700 ring-1 ring-orange-200",
};

const LABELS = {
  pending: "Pending approval",
  approved: "Approved — payment due",
  payment_submitted: "Payment submitted",
  confirmed: "Confirmed",
  completed: "Completed",
  rejected: "Declined",
  cancelled: "Cancelled",
  expired: "Expired",
};

const DOTS = {
  pending: "bg-amber-500",
  approved: "bg-sky-500",
  payment_submitted: "bg-violet-500",
  confirmed: "bg-emerald-500",
  completed: "bg-ink-400",
  rejected: "bg-red-500",
  cancelled: "bg-ink-400",
  expired: "bg-orange-500",
};

export default function StatusBadge({ status, dot = true }) {
  return (
    <span
      className={`badge ${STYLES[status] || "bg-ink-100 text-ink-600"} ${
        dot ? "" : "pl-2.5"
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${DOTS[status] || "bg-ink-400"}`} />}
      {LABELS[status] || status}
    </span>
  );
}

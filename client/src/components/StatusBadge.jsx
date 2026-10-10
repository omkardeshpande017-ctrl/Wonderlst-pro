const STYLES = {
  pending: "bg-yellow-100 text-yellow-700",
  approved: "bg-blue-100 text-blue-700",
  payment_submitted: "bg-purple-100 text-purple-700",
  confirmed: "bg-green-100 text-green-700",
  completed: "bg-gray-200 text-gray-600",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-red-100 text-red-700",
  expired: "bg-gray-200 text-gray-500",
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

export default function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STYLES[status] || "bg-gray-100 text-gray-600"}`}>
      {LABELS[status] || status}
    </span>
  );
}

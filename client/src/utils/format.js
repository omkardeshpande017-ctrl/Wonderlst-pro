// Shared formatting helpers + amenity icons used across the app.

export const inr = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

export const inrPlain = (value) =>
  new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value) || 0);

export const shortDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

export const longDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

export const toISODate = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(
    x.getDate()
  ).padStart(2, "0")}`;
};

export const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  return Math.round((new Date(b) - new Date(a)) / 86400000);
};

export const todayISO = () => toISODate(new Date());

// Amenity → emoji, so the UI never needs an icon library for these
export const AMENITY_ICONS = {
  Wifi: "📶",
  Kitchen: "🍳",
  "Free parking": "🅿️",
  "Air conditioning": "❄️",
  Pool: "🏊",
  "Hot tub": "🛁",
  TV: "📺",
  Washer: "🧺",
  Workspace: "💻",
  Breakfast: "🥐",
  Fireplace: "🔥",
  "Pet friendly": "🐾",
  Gym: "🏋️",
  "Sea view": "🌊",
  "Mountain view": "⛰️",
  "Self check-in": "🔑",
};

export const CATEGORY_ICONS = {
  All: "🌍",
  Trending: "🔥",
  Rooms: "🛏️",
  "Iconic Cities": "🏙️",
  Mountains: "⛰️",
  Castles: "🏰",
  "Amazing Pools": "🏊",
  Camping: "🏕️",
  Farms: "🚜",
  Arctic: "🧊",
  Boats: "⛵",
  Beachfront: "🏖️",
};

export const STATUS_STYLES = {
  pending: { label: "Pending", cls: "bg-amber-50 text-amber-700 ring-1 ring-amber-200" },
  approved: { label: "Approved", cls: "bg-sky-50 text-sky-700 ring-1 ring-sky-200" },
  payment_submitted: {
    label: "Payment submitted",
    cls: "bg-violet-50 text-violet-700 ring-1 ring-violet-200",
  },
  confirmed: { label: "Confirmed", cls: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" },
  completed: { label: "Completed", cls: "bg-ink-100 text-ink-700 ring-1 ring-ink-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 ring-1 ring-red-200" },
  cancelled: { label: "Cancelled", cls: "bg-ink-100 text-ink-600 ring-1 ring-ink-200" },
  expired: { label: "Expired", cls: "bg-orange-50 text-orange-700 ring-1 ring-orange-200" },
};

export const statusInfo = (status) =>
  STATUS_STYLES[status] || { label: status, cls: "bg-ink-100 text-ink-700" };

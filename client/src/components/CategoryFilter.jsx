const ICONS = {
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

export default function CategoryFilter({ categories, active, onChange }) {
  const all = ["All", ...categories];
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex gap-6 overflow-x-auto no-scrollbar border-b border-gray-200">
      {all.map((cat) => (
        <button
          key={cat}
          onClick={() => onChange(cat)}
          className={`flex flex-col items-center gap-1 text-xs font-medium shrink-0 pb-2 border-b-2 transition ${
            active === cat
              ? "border-gray-900 text-gray-900"
              : "border-transparent text-gray-400 hover:text-gray-700"
          }`}
        >
          <span className="text-xl">{ICONS[cat] || "📍"}</span>
          {cat}
        </button>
      ))}
    </div>
  );
}

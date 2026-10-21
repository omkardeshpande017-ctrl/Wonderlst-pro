import { CATEGORY_ICONS } from "../utils/format.js";

export default function CategoryFilter({ categories, active, onChange }) {
  const all = ["All", ...categories];

  return (
    <div className="sticky top-16 z-30 border-b border-ink-100 bg-white/90 backdrop-blur-md">
      <div className="container-page flex gap-2 overflow-x-auto py-3 no-scrollbar">
        {all.map((cat) => {
          const isActive = active === cat;
          return (
            <button
              key={cat}
              onClick={() => onChange(cat)}
              className={`flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
                isActive
                  ? "border-ink-900 bg-ink-900 text-white"
                  : "border-ink-200 text-ink-600 hover:border-ink-900 hover:text-ink-900"
              }`}
            >
              <span className="text-base leading-none">{CATEGORY_ICONS[cat] || "📍"}</span>
              {cat}
            </button>
          );
        })}
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaSearch, FaSlidersH, FaTimes } from "react-icons/fa";
import api from "../api/axios.js";
import { todayISO } from "../utils/format.js";

const EMPTY = {
  search: "",
  category: "All",
  guests: "",
  minPrice: "",
  maxPrice: "",
  bookingType: "",
  sort: "recommended",
};

// Hero search panel: destination + dates + guests, plus an expandable
// "more filters" drawer for price, type and amenities.
export default function SearchBar({ initial = {}, categories = [], amenities = [], bookingTypes = [] }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [selectedAmenities, setSelectedAmenities] = useState(
    initial.amenities ? String(initial.amenities).split(",") : []
  );

  useEffect(() => {
    setForm({ ...EMPTY, ...initial });
    setSelectedAmenities(initial.amenities ? String(initial.amenities).split(",") : []);
  }, [JSON.stringify(initial)]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const toggleAmenity = (a) =>
    setSelectedAmenities((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));

  const activeCount = useMemo(() => {
    let n = 0;
    if (form.minPrice) n++;
    if (form.maxPrice) n++;
    if (form.bookingType) n++;
    if (form.sort && form.sort !== "recommended") n++;
    n += selectedAmenities.length;
    return n;
  }, [form, selectedAmenities]);

  const submit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    Object.entries(form).forEach(([k, v]) => {
      if (!v || v === "All" || (k === "sort" && v === "recommended")) return;
      params.set(k, v);
    });
    if (selectedAmenities.length) params.set("amenities", selectedAmenities.join(","));
    navigate(`/?${params.toString()}`);
  };

  const reset = () => {
    setForm(EMPTY);
    setSelectedAmenities([]);
  };

  return (
    <form
      onSubmit={submit}
      className="rounded-3xl border border-ink-100 bg-white p-2.5 shadow-lift sm:p-3"
    >
      <div className="grid gap-2 sm:grid-cols-[1.6fr_1fr_1fr_auto]">
        <label className="flex items-center gap-2 rounded-2xl px-3.5 py-2.5 transition hover:bg-ink-50">
          <FaSearch className="shrink-0 text-brand-500" size={14} />
          <span className="flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">
              Where
            </span>
            <input
              value={form.search}
              onChange={set("search")}
              placeholder="Goa, Manali, houseboat..."
              className="w-full bg-transparent text-sm font-medium text-ink-900 outline-none placeholder:font-normal placeholder:text-ink-400"
            />
          </span>
        </label>

        <label className="rounded-2xl px-3.5 py-2.5 transition hover:bg-ink-50">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">
            Category
          </span>
          <select
            value={form.category}
            onChange={set("category")}
            className="w-full bg-transparent text-sm font-medium outline-none"
          >
            <option value="All">Any stay</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <label className="rounded-2xl px-3.5 py-2.5 transition hover:bg-ink-50">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-ink-400">
            Guests
          </span>
          <select
            value={form.guests}
            onChange={set("guests")}
            className="w-full bg-transparent text-sm font-medium outline-none"
          >
            <option value="">Any</option>
            {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
              <option key={n} value={n}>
                {n} guest{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className={`relative grid h-11 w-11 place-items-center rounded-2xl border transition ${
              open ? "border-ink-900 bg-ink-900 text-white" : "border-ink-200 text-ink-600 hover:border-ink-900"
            }`}
            aria-label="More filters"
          >
            <FaSlidersH size={13} />
            {activeCount > 0 && (
              <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </button>
          <button type="submit" className="btn-primary h-11 flex-1 sm:flex-none">
            <FaSearch size={12} /> Search
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-2 rounded-2xl bg-ink-50 p-4 animate-fade-in">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="label">Min price / night</label>
              <input
                type="number"
                min={0}
                value={form.minPrice}
                onChange={set("minPrice")}
                placeholder="0"
                className="input"
              />
            </div>
            <div>
              <label className="label">Max price / night</label>
              <input
                type="number"
                min={0}
                value={form.maxPrice}
                onChange={set("maxPrice")}
                placeholder="Any"
                className="input"
              />
            </div>
            <div>
              <label className="label">Place type</label>
              <select value={form.bookingType} onChange={set("bookingType")} className="input">
                <option value="">Any</option>
                {bookingTypes.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Sort by</label>
              <select value={form.sort} onChange={set("sort")} className="input">
                <option value="recommended">Recommended</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
                <option value="rating">Top rated</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>

          {amenities.length > 0 && (
            <div className="mt-4">
              <p className="label">Amenities</p>
              <div className="flex flex-wrap gap-2">
                {amenities.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`chip ${selectedAmenities.includes(a) ? "chip-active" : ""}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={reset}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-500 hover:text-ink-900"
            >
              <FaTimes size={10} /> Clear all filters
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

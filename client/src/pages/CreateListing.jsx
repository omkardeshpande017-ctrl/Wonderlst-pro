import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { AMENITY_ICONS, inr } from "../utils/format.js";

const initialForm = {
  title: "",
  description: "",
  price: "",
  cleaningFee: "",
  securityDeposit: "",
  location: "",
  country: "India",
  category: "Trending",
  bookingType: "Entire place",
  maxGuests: 2,
  bedrooms: 1,
  beds: 1,
  bathrooms: 1,
  instantBook: false,
};

export default function CreateListing() {
  const navigate = useNavigate();
  const [meta, setMeta] = useState({ categories: [], amenities: [], bookingTypes: [] });
  const [form, setForm] = useState(initialForm);
  const [amenities, setAmenities] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get("/listings/filters")
      .then(({ data }) =>
        setMeta({
          categories: data.categories || [],
          amenities: data.amenities || [],
          bookingTypes: data.bookingTypes || [],
        })
      )
      .catch(() => toast.error("Could not load form options"));
  }, []);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const toggleAmenity = (a) =>
    setAmenities((list) => (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, String(v)));
      fd.append("amenities", amenities.join(","));
      if (image) fd.append("image", image);

      const { data } = await api.post("/listings", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Listing published!");
      navigate(`/listings/${data.listing._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl text-ink-900">Host a new stay</h1>
        <p className="muted mt-1 text-sm">
          Guests pay over UPI after you approve, so make the details accurate.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6" encType="multipart/form-data">
          <section className="card p-5">
            <h2 className="font-bold text-ink-900">The basics</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Title</label>
                <input
                  required
                  maxLength={100}
                  value={form.title}
                  onChange={set("title")}
                  placeholder="e.g. Cliffside Sea Cottage"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={set("description")}
                  placeholder="What makes this place special?"
                  className="input resize-none"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">City / area</label>
                  <input required value={form.location} onChange={set("location")} className="input" />
                </div>
                <div>
                  <label className="label">Country</label>
                  <input required value={form.country} onChange={set("country")} className="input" />
                </div>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-ink-900">Stay details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Category</label>
                <select value={form.category} onChange={set("category")} className="input">
                  {meta.categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Place type</label>
                <select value={form.bookingType} onChange={set("bookingType")} className="input">
                  {meta.bookingTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:col-span-2 sm:grid-cols-4">
                <NumberField label="Guests" value={form.maxGuests} onChange={set("maxGuests")} min={1} />
                <NumberField label="Bedrooms" value={form.bedrooms} onChange={set("bedrooms")} min={0} />
                <NumberField label="Beds" value={form.beds} onChange={set("beds")} min={1} />
                <NumberField label="Bathrooms" value={form.bathrooms} onChange={set("bathrooms")} min={0} />
              </div>
            </div>

            <div className="mt-4">
              <label className="label">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {meta.amenities.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => toggleAmenity(a)}
                    className={`chip ${amenities.includes(a) ? "chip-active" : ""}`}
                  >
                    <span>{AMENITY_ICONS[a] || "✅"}</span>
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-ink-900">Pricing</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Price / night (₹)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={form.price}
                  onChange={set("price")}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Cleaning fee (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.cleaningFee}
                  onChange={set("cleaningFee")}
                  placeholder="0"
                  className="input"
                />
              </div>
              <div>
                <label className="label">Security deposit (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.securityDeposit}
                  onChange={set("securityDeposit")}
                  placeholder="0"
                  className="input"
                />
              </div>
            </div>
            <label className="mt-4 flex items-start gap-3 rounded-xl bg-ink-50 p-3">
              <input
                type="checkbox"
                checked={form.instantBook}
                onChange={set("instantBook")}
                className="mt-0.5 h-4 w-4 accent-brand-500"
              />
              <span className="text-sm text-ink-700">
                <span className="font-semibold text-ink-900">Enable instant book</span>
                <br />
                Guests skip approval and pay straight away. Leave this off to review every request.
              </span>
            </label>
            {form.price && (
              <p className="mt-3 text-xs text-ink-500">
                Guests see {inr(form.price)} / night plus a 5% service fee.
              </p>
            )}
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-ink-900">Cover photo</h2>
            <input type="file" accept="image/*" onChange={handleImageChange} className="mt-3 block text-sm" />
            {preview && (
              <img src={preview} alt="preview" className="mt-3 max-h-64 w-full rounded-xl object-cover" />
            )}
          </section>

          <button disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? "Publishing..." : "Publish listing"}
          </button>
        </form>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange, min }) {
  return (
    <div>
      <label className="label">{label}</label>
      <input type="number" min={min} value={value} onChange={onChange} className="input" />
    </div>
  );
}

import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { AMENITY_ICONS } from "../utils/format.js";

export default function EditListing() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [meta, setMeta] = useState({ categories: [], amenities: [], bookingTypes: [] });
  const [form, setForm] = useState(null);
  const [amenities, setAmenities] = useState([]);
  const [image, setImage] = useState(null);
  const [preview, setPreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

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
      .catch(() => {});

    api
      .get(`/listings/${id}`)
      .then(({ data }) => {
        const l = data.listing;
        if (user && l.owner?._id !== user._id) {
          toast.error("You can only edit your own listings");
          navigate(`/listings/${id}`);
          return;
        }
        setForm({
          title: l.title,
          description: l.description,
          price: l.price,
          cleaningFee: l.cleaningFee || 0,
          securityDeposit: l.securityDeposit || 0,
          location: l.location,
          country: l.country,
          category: l.category,
          bookingType: l.bookingType || "Entire place",
          maxGuests: l.maxGuests || 2,
          bedrooms: l.bedrooms ?? 1,
          beds: l.beds ?? 1,
          bathrooms: l.bathrooms ?? 1,
          instantBook: Boolean(l.instantBook),
        });
        setAmenities(l.amenities || []);
        setPreview(l.image?.url);
      })
      .catch(() => {
        toast.error("Listing not found");
        navigate("/");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  const set = (key) => (e) =>
    setForm((f) => ({
      ...f,
      [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
    }));

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

      await api.put(`/listings/${id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("Listing updated");
      navigate(`/listings/${id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update listing");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !form) {
    return (
      <div className="container-page py-12">
        <div className="skeleton h-8 w-1/3 rounded" />
        <div className="skeleton mt-4 h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <h1 className="font-display text-3xl text-ink-900">Edit listing</h1>
        <p className="muted mt-1 text-sm">Changes go live immediately for new guests.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6" encType="multipart/form-data">
          <section className="card p-5">
            <h2 className="font-bold text-ink-900">The basics</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="label">Title</label>
                <input required maxLength={100} value={form.title} onChange={set("title")} className="input" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={set("description")}
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
                <div>
                  <label className="label">Guests</label>
                  <input type="number" min={1} value={form.maxGuests} onChange={set("maxGuests")} className="input" />
                </div>
                <div>
                  <label className="label">Bedrooms</label>
                  <input type="number" min={0} value={form.bedrooms} onChange={set("bedrooms")} className="input" />
                </div>
                <div>
                  <label className="label">Beds</label>
                  <input type="number" min={1} value={form.beds} onChange={set("beds")} className="input" />
                </div>
                <div>
                  <label className="label">Bathrooms</label>
                  <input type="number" min={0} value={form.bathrooms} onChange={set("bathrooms")} className="input" />
                </div>
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
                <input type="number" min={0} required value={form.price} onChange={set("price")} className="input" />
              </div>
              <div>
                <label className="label">Cleaning fee (₹)</label>
                <input type="number" min={0} value={form.cleaningFee} onChange={set("cleaningFee")} className="input" />
              </div>
              <div>
                <label className="label">Security deposit (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={form.securityDeposit}
                  onChange={set("securityDeposit")}
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
                <span className="font-semibold text-ink-900">Instant book</span>
                <br />
                Guests skip approval and pay straight away.
              </span>
            </label>
          </section>

          <section className="card p-5">
            <h2 className="font-bold text-ink-900">Cover photo</h2>
            <input type="file" accept="image/*" onChange={handleImageChange} className="mt-3 block text-sm" />
            {preview && (
              <img src={preview} alt="preview" className="mt-3 max-h-64 w-full rounded-xl object-cover" />
            )}
          </section>

          <button disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </form>
      </div>
    </div>
  );
}

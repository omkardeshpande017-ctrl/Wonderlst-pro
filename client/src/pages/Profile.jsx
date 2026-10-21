import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaHeart, FaHome, FaSuitcase, FaUser } from "react-icons/fa";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ListingCard from "../components/ListingCard.jsx";
import { inr } from "../utils/format.js";

const TABS = [
  { key: "profile", label: "Profile", icon: <FaUser size={11} /> },
  { key: "wishlist", label: "Wishlist", icon: <FaHeart size={11} /> },
];

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "profile";

  const [wishlist, setWishlist] = useState([]);
  const [myListings, setMyListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    username: user?.username || "",
    bio: user?.bio || "",
    phone: user?.phone || "",
  });
  const [saving, setSaving] = useState(false);

  const isOwner = user?.role === "owner";

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    const requests = [api.get("/users/me/wishlist")];
    if (isOwner) requests.push(api.get("/listings/mine"));

    Promise.all(requests)
      .then(([wl, mine]) => {
        setWishlist(wl.data.wishlist || []);
        if (mine) setMyListings(mine.data.listings || []);
      })
      .catch(() => toast.error("Could not load your data"))
      .finally(() => setLoading(false));
  }, [user, isOwner]);

  useEffect(() => {
    if (user) {
      setForm({
        username: user.username || "",
        bio: user.bio || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleTab = (t) => setSearchParams(t === "profile" ? {} : { tab: t });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/users/me", form);
      await refreshUser();
      toast.success("Profile updated");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWishlist = async (listingId) => {
    try {
      const { data } = await api.post(`/users/me/wishlist/${listingId}`);
      if (!data.added) {
        setWishlist((prev) => prev.filter((l) => l._id !== listingId));
        toast.success("Removed from wishlist");
      } else {
        const { data: fresh } = await api.get("/users/me/wishlist");
        setWishlist(fresh.wishlist || []);
      }
    } catch {
      toast.error("Could not update wishlist");
    }
  };

  if (!user) return null;

  const tabs = isOwner
    ? [...TABS, { key: "listings", label: "My listings", icon: <FaHome size={11} /> }]
    : [...TABS, { key: "trips", label: "My trips", icon: <FaSuitcase size={11} /> }];

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="card flex flex-wrap items-center gap-5 p-6">
        {user.avatar ? (
          <img src={user.avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <span className="grid h-16 w-16 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-extrabold text-white">
            {user.username?.[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-ink-900">{user.username}</h1>
          <p className="truncate text-sm text-ink-500">{user.email}</p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <span className="badge bg-ink-100 text-ink-700">{user.role}</span>
            {user.phone && <span className="badge bg-ink-100 text-ink-700">{user.phone}</span>}
          </div>
        </div>
        {isOwner && (
          <Link to="/listings/new" className="btn-primary">
            Add listing
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 overflow-x-auto border-b border-ink-100 no-scrollbar">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleTab(t.key)}
            className={`flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === t.key
                ? "border-ink-900 text-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-8">
        {tab === "profile" && (
          <form onSubmit={handleSaveProfile} className="card max-w-xl space-y-4 p-6">
            <div>
              <label className="label">Username</label>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="label">Phone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="For booking coordination"
                className="input"
              />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea
                rows={3}
                maxLength={300}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
                placeholder="Tell guests a little about yourself"
                className="input resize-none"
              />
            </div>
            <button disabled={saving} className="btn-primary">
              {saving ? "Saving..." : "Save changes"}
            </button>
          </form>
        )}

        {tab === "wishlist" && (
          <div>
            {loading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i}>
                    <div className="skeleton aspect-[4/3] rounded-2xl" />
                    <div className="skeleton mt-3 h-3.5 w-2/3 rounded" />
                  </div>
                ))}
              </div>
            ) : wishlist.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink-200 py-16 text-center">
                <p className="text-3xl">💛</p>
                <p className="mt-2 font-semibold text-ink-900">Nothing saved yet</p>
                <p className="muted mt-1 text-sm">Tap the heart on any stay to keep it here.</p>
                <Link to="/" className="btn-ghost mt-5">
                  Browse stays
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {wishlist.map((l) => (
                  <ListingCard
                    key={l._id}
                    listing={l}
                    wishlist={wishlist.map((w) => w._id)}
                    onToggleWishlist={handleToggleWishlist}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "listings" && isOwner && (
          <div>
            {loading ? (
              <p className="muted">Loading...</p>
            ) : myListings.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink-200 py-16 text-center">
                <p className="font-semibold text-ink-900">You haven't listed any stays yet</p>
                <Link to="/listings/new" className="btn-primary mt-5">
                  Create your first listing
                </Link>
              </div>
            ) : (
              <>
                <p className="muted mb-4 text-sm">
                  {myListings.length} listing{myListings.length === 1 ? "" : "s"} · average{" "}
                  {inr(
                    myListings.reduce((s, l) => s + l.price, 0) / (myListings.length || 1)
                  )}{" "}
                  per night
                </p>
                <div className="grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {myListings.map((l) => (
                    <ListingCard key={l._id} listing={l} />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {tab === "trips" && (
          <div className="rounded-3xl border border-dashed border-ink-200 py-16 text-center">
            <p className="text-3xl">🧳</p>
            <p className="mt-2 font-semibold text-ink-900">Your trips live in one place</p>
            <p className="muted mt-1 text-sm">
              Every request, approval and payment is tracked with live status.
            </p>
            <Link to="/bookings" className="btn-primary mt-5">
              Open my trips
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

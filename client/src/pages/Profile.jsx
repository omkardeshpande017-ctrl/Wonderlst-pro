import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUserCircle } from "react-icons/fa";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ListingCard from "../components/ListingCard.jsx";

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "profile";

  const [myListings, setMyListings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ username: user?.username || "", bio: user?.bio || "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get("/listings/mine"), api.get("/users/me/wishlist")])
      .then(([mine, wl]) => {
        setMyListings(mine.data.listings);
        setWishlist(wl.data.wishlist);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleTab = (t) => setSearchParams(t === "profile" ? {} : { tab: t });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put("/users/me", form);
      await refreshUser();
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleWishlist = async (listingId) => {
    const { data } = await api.post(`/users/me/wishlist/${listingId}`);
    setWishlist((prev) => prev.filter((l) => l._id !== listingId || data.added));
    if (!data.added) setWishlist((prev) => prev.filter((l) => l._id !== listingId));
  };

  if (!user) return null;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
      <div className="flex items-center gap-4 mb-8">
        {user.avatar ? (
          <img src={user.avatar} className="w-16 h-16 rounded-full object-cover" />
        ) : (
          <FaUserCircle className="text-6xl text-gray-300" />
        )}
        <div>
          <h1 className="text-xl font-bold">{user.username}</h1>
          <p className="text-sm text-gray-500">{user.email}</p>
        </div>
      </div>

      <div className="flex gap-6 border-b border-gray-200 mb-8 text-sm font-medium">
        {["profile", "listings", "wishlist"].map((t) => (
          <button
            key={t}
            onClick={() => handleTab(t)}
            className={`pb-3 border-b-2 capitalize transition ${
              tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"
            }`}
          >
            {t === "listings" ? "My listings" : t}
          </button>
        ))}
      </div>

      {tab === "profile" && (
        <form onSubmit={handleSaveProfile} className="max-w-md space-y-4">
          <div>
            <label className="text-sm font-medium">Username</label>
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Bio</label>
            <textarea
              rows={3}
              maxLength={300}
              value={form.bio}
              onChange={(e) => setForm({ ...form, bio: e.target.value })}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <button
            disabled={saving}
            className="bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-lg transition"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>
      )}

      {tab === "listings" &&
        (loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : myListings.length === 0 ? (
          <p className="text-gray-400">You haven't listed any stays yet.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {myListings.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        ))}

      {tab === "wishlist" &&
        (loading ? (
          <p className="text-gray-400">Loading...</p>
        ) : wishlist.length === 0 ? (
          <p className="text-gray-400">Nothing saved yet. Tap the heart on a listing to save it here.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {wishlist.map((l) => (
              <ListingCard
                key={l._id}
                listing={l}
                wishlist={wishlist.map((w) => w._id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        ))}
    </div>
  );
}

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import ListingCard from "../components/ListingCard.jsx";
import CategoryFilter from "../components/CategoryFilter.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [listings, setListings] = useState([]);
  const [categories, setCategories] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "All";

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/listings", {
        params: { search, category, page },
      });
      setListings(data.listings);
      setPages(data.pages || 1);
    } catch (err) {
      toast.error("Could not load listings");
    } finally {
      setLoading(false);
    }
  }, [search, category, page]);

  useEffect(() => {
    api.get("/listings/categories").then(({ data }) => setCategories(data.categories));
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    if (user) {
      api.get("/users/me/wishlist").then(({ data }) =>
        setWishlist(data.wishlist.map((l) => l._id))
      );
    } else {
      setWishlist([]);
    }
  }, [user]);

  const handleCategory = (cat) => {
    const next = new URLSearchParams(searchParams);
    if (cat === "All") next.delete("category");
    else next.set("category", cat);
    setSearchParams(next);
    setPage(1);
  };

  const handleToggleWishlist = async (listingId) => {
    if (!user) return toast.error("Log in to save listings");
    const { data } = await api.post(`/users/me/wishlist/${listingId}`);
    setWishlist(data.wishlist);
    toast.success(data.added ? "Added to wishlist" : "Removed from wishlist");
  };

  return (
    <div>
      <CategoryFilter categories={categories} active={category} onChange={handleCategory} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {search && (
          <p className="text-sm text-gray-500 mb-4">
            Showing results for <span className="font-semibold">&ldquo;{search}&rdquo;</span>
          </p>
        )}

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-200 rounded-xl" />
                <div className="h-3 bg-gray-200 rounded mt-2 w-3/4" />
                <div className="h-3 bg-gray-200 rounded mt-2 w-1/2" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            No stays found. Try a different search or category.
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-8">
            {listings.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`w-9 h-9 rounded-full text-sm font-medium ${
                  page === i + 1 ? "bg-gray-900 text-white" : "bg-gray-100 hover:bg-gray-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

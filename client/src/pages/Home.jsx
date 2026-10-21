import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaStar, FaArrowRight, FaShieldAlt, FaBolt, FaCheckCircle } from "react-icons/fa";
import api from "../api/axios.js";
import ListingCard from "../components/ListingCard.jsx";
import CategoryFilter from "../components/CategoryFilter.jsx";
import SearchBar from "../components/SearchBar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { inr, shortDate } from "../utils/format.js";

const PAGE_SIZE = 12;

export default function Home() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [meta, setMeta] = useState({ categories: [], amenities: [], bookingTypes: [] });
  const [stats, setStats] = useState(null);
  const [featured, setFeatured] = useState([]);
  const [testimonials, setTestimonials] = useState([]);

  const [listings, setListings] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);

  const query = useMemo(() => {
    const params = {
      search: searchParams.get("search") || "",
      category: searchParams.get("category") || "All",
      guests: searchParams.get("guests") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      bookingType: searchParams.get("bookingType") || "",
      amenities: searchParams.get("amenities") || "",
      sort: searchParams.get("sort") || "recommended",
    };
    return params;
  }, [searchParams]);

  const isFiltering = useMemo(
    () =>
      Object.entries(query).some(([k, v]) =>
        k === "category" ? v !== "All" : k === "sort" ? v !== "recommended" : Boolean(v)
      ),
    [query]
  );

  // One call for everything the filter UI needs
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
      .catch(() => toast.error("Could not load filters"));
  }, []);

  // Landing-page extras (only needed when the user is not filtering)
  useEffect(() => {
    api.get("/listings/stats").then(({ data }) => setStats(data.stats)).catch(() => {});
    api.get("/listings/featured").then(({ data }) => setFeatured(data.listings || [])).catch(() => {});
    api.get("/reviews/recent?limit=3").then(({ data }) => setTestimonials(data.reviews || [])).catch(() => {});
  }, []);

  const fetchListings = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      Object.entries(query).forEach(([k, v]) => {
        if (!v || v === "All" || (k === "sort" && v === "recommended")) return;
        params[k] = v;
      });
      const { data } = await api.get("/listings", { params });
      setListings(data.listings || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error("Could not load listings");
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  useEffect(() => {
    if (user) {
      api
        .get("/users/me/wishlist")
        .then(({ data }) => setWishlist(data.wishlist.map((l) => l._id)))
        .catch(() => {});
    } else {
      setWishlist([]);
    }
  }, [user]);

  const handleCategory = (cat) => {
    const next = new URLSearchParams(searchParams);
    if (cat === "All") next.delete("category");
    else next.set("category", cat);
    setSearchParams(next);
  };

  const handleToggleWishlist = async (listingId) => {
    if (!user) return toast.error("Log in to save listings");
    try {
      const { data } = await api.post(`/users/me/wishlist/${listingId}`);
      setWishlist(data.wishlist);
      toast.success(data.added ? "Saved to wishlist" : "Removed from wishlist");
    } catch {
      toast.error("Could not update wishlist");
    }
  };

  return (
    <div>
      {/* ---------- Hero ---------- */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1602002418082-a4443e081dd1?q=80&w=2000&auto=format&fit=crop"
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/45 to-ink-950/75" />
        </div>

        <div className="container-page relative py-16 sm:py-24">
          <span className="badge bg-white/15 text-white ring-1 ring-white/25 backdrop-blur">
            <FaCheckCircle size={10} /> Host-approved · UPI payments · Verified stays
          </span>
          <h1 className="mt-5 max-w-3xl font-display text-4xl leading-tight text-white sm:text-5xl lg:text-6xl">
            Stays worth travelling for.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/80 sm:text-base">
            Villas, cabins, houseboats and heritage havelis across India — each one reviewed by its
            host, paid over UPI and confirmed in a thread you can track.
          </p>

          {stats && (
            <div className="mt-6 flex flex-wrap gap-x-8 gap-y-3 text-white/90">
              <Stat value={stats.listings} label="handpicked stays" />
              <Stat value={stats.hosts} label="verified hosts" />
              <Stat value={stats.guests} label="travellers" />
              <Stat
                value={stats.avgRating ? `${stats.avgRating}★` : "New"}
                label={`${stats.reviews} reviews`}
              />
            </div>
          )}

          <div className="mt-8 max-w-4xl">
            <SearchBar
              initial={query}
              categories={meta.categories}
              amenities={meta.amenities}
              bookingTypes={meta.bookingTypes}
            />
          </div>
        </div>
      </section>

      <CategoryFilter categories={meta.categories} active={query.category} onChange={handleCategory} />

      {/* ---------- Featured stays (only on the unfiltered home page) ---------- */}
      {!isFiltering && featured.length > 0 && (
        <section className="container-page pt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="section-title">Guest favourites</h2>
              <p className="muted mt-1 text-sm">The stays our travellers rate highest.</p>
            </div>
            <Link
              to="/?sort=rating"
              className="hidden shrink-0 items-center gap-1.5 text-sm font-semibold text-ink-900 hover:text-brand-500 sm:flex"
            >
              See all <FaArrowRight size={11} />
            </Link>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.slice(0, 3).map((listing, i) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
                priority={i === 0}
              />
            ))}
          </div>
        </section>
      )}

      {/* ---------- All listings ---------- */}
      <section className="container-page py-12">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="section-title">
              {isFiltering ? "Search results" : "Explore all stays"}
            </h2>
            <p className="muted mt-1 text-sm">
              {loading ? "Finding stays..." : `${total} stay${total === 1 ? "" : "s"} available`}
              {query.search && (
                <>
                  {" "}for <span className="font-semibold text-ink-900">“{query.search}”</span>
                </>
              )}
            </p>
          </div>
          {isFiltering && (
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="text-sm font-semibold text-brand-500 hover:text-brand-600"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[4/3] rounded-2xl" />
                <div className="skeleton mt-3 h-3.5 w-3/4 rounded" />
                <div className="skeleton mt-2 h-3.5 w-1/2 rounded" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-10 rounded-3xl border border-dashed border-ink-200 py-20 text-center">
            <p className="text-4xl">🧭</p>
            <p className="mt-3 font-semibold text-ink-900">No stays match those filters</p>
            <p className="muted mt-1 text-sm">Try widening your dates, price range or amenities.</p>
            <button
              onClick={() => setSearchParams(new URLSearchParams())}
              className="btn-ghost mt-5"
            >
              Reset search
            </button>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
          <div className="mt-12 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn-soft disabled:opacity-40"
            >
              Prev
            </button>
            {Array.from({ length: pages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i + 1)}
                className={`h-9 w-9 rounded-full text-sm font-semibold transition ${
                  page === i + 1
                    ? "bg-ink-900 text-white"
                    : "bg-ink-100 text-ink-700 hover:bg-ink-200"
                }`}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="btn-soft disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </section>

      {/* ---------- How it works ---------- */}
      {!isFiltering && (
        <section className="border-y border-ink-100 bg-sand py-16">
          <div className="container-page">
            <h2 className="section-title text-center">Booking that respects both sides</h2>
            <p className="muted mx-auto mt-2 max-w-xl text-center text-sm">
              No surprise charges and no instant lock-ins — the host approves first, then you pay.
            </p>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              <Step
                icon={<FaArrowRight />}
                step="01"
                title="Request your dates"
                text="Pick your stay and dates. The host gets a notification with your message."
              />
              <Step
                icon={<FaShieldAlt />}
                step="02"
                title="Host approves"
                text="Clashing dates are blocked automatically. Once approved you see the UPI QR and ID."
              />
              <Step
                icon={<FaBolt />}
                step="03"
                title="Pay over UPI"
                text="Pay, submit the transaction ID, and the host verifies it. Your invoice is ready instantly."
              />
            </div>
          </div>
        </section>
      )}

      {/* ---------- Testimonials ---------- */}
      {!isFiltering && testimonials.length > 0 && (
        <section className="container-page py-16">
          <h2 className="section-title">What travellers say</h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {testimonials.map((r) => (
              <figure key={r._id} className="card flex h-full flex-col p-6">
                <div className="flex items-center gap-1 text-amber-400">
                  {Array.from({ length: r.rating }).map((_, i) => (
                    <FaStar key={i} size={13} />
                  ))}
                </div>
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-ink-700">
                  “{r.comment}”
                </blockquote>
                <figcaption className="mt-5 flex items-center gap-3 border-t border-ink-100 pt-4">
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-100 text-xs font-bold text-ink-700">
                    {(r.author?.username || "G")[0].toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink-900">
                      {r.author?.username || "Guest"}
                    </p>
                    <p className="truncate text-xs text-ink-400">
                      {r.listing ? `${r.listing.title} · ${r.listing.location}` : shortDate(r.createdAt)}
                    </p>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* ---------- Host CTA ---------- */}
      <section className="container-page pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-ink-900 px-6 py-12 sm:px-12">
          <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/25 blur-3xl" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-3xl text-white">Have a place to share?</h2>
              <p className="mt-2 max-w-md text-sm text-white/70">
                List it in minutes, set your own UPI details and approve every guest yourself. From{" "}
                {featured[0] ? inr(featured[0].price) : "₹1,800"} a night, no listing fee.
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/register?role=owner" className="btn-primary">
                Become a host
              </Link>
              <Link
                to="/login"
                className="btn border border-white/25 px-5 py-2.5 text-sm font-semibold text-white hover:bg-white/10"
              >
                Host log in
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-2xl font-extrabold text-white">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-white/60">{label}</p>
    </div>
  );
}

function Step({ icon, step, title, text }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-50 text-brand-500">
          {icon}
        </span>
        <span className="font-display text-2xl text-ink-200">{step}</span>
      </div>
      <h3 className="mt-4 font-bold text-ink-900">{title}</h3>
      <p className="muted mt-1.5 text-sm leading-relaxed">{text}</p>
    </div>
  );
}

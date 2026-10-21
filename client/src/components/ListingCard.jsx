import { Link } from "react-router-dom";
import { FaStar, FaHeart, FaRegHeart, FaBolt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import { inr } from "../utils/format.js";

export default function ListingCard({ listing, wishlist = [], onToggleWishlist, priority }) {
  const { user } = useAuth();
  const isWishlisted = wishlist.includes(listing._id);

  return (
    <article className="group relative animate-fade-up">
      <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-ink-100">
        <Link to={`/listings/${listing._id}`} aria-label={listing.title}>
          <img
            src={listing.image?.url}
            alt={listing.title}
            loading={priority ? "eager" : "lazy"}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.06]"
          />
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0 opacity-70" />
        </Link>

        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {listing.featured && (
            <span className="badge bg-white/95 text-ink-900 shadow-sm">★ Guest favourite</span>
          )}
          {listing.instantBook && (
            <span className="badge bg-emerald-500/95 text-white shadow-sm">
              <FaBolt size={9} /> Instant
            </span>
          )}
        </div>

        {user && (
          <button
            onClick={() => onToggleWishlist?.(listing._id)}
            className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 text-ink-700 shadow-sm transition hover:scale-105 hover:text-brand-500"
            aria-label={isWishlisted ? "Remove from wishlist" : "Save to wishlist"}
          >
            {isWishlisted ? <FaHeart className="text-brand-500" /> : <FaRegHeart />}
          </button>
        )}

        <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
          <span className="badge bg-white/90 text-ink-800 shadow-sm">{listing.category}</span>
          {listing.avgRating > 0 && (
            <span className="badge bg-ink-900/85 text-white">
              <FaStar className="text-amber-300" size={10} /> {listing.avgRating.toFixed(1)}
              {listing.reviewCount ? ` (${listing.reviewCount})` : ""}
            </span>
          )}
        </div>
      </div>

      <Link to={`/listings/${listing._id}`} className="mt-3 block">
        <h3 className="line-clamp-1 text-sm font-bold text-ink-900">
          {listing.location}, {listing.country}
        </h3>
        <p className="line-clamp-1 text-sm text-ink-500">{listing.title}</p>
        <p className="mt-1 text-xs text-ink-400">
          {listing.bookingType} · {listing.maxGuests} guest{listing.maxGuests > 1 ? "s" : ""} ·{" "}
          {listing.bedrooms || 0} bed{listing.bedrooms === 1 ? "" : "s"}
        </p>
        <p className="mt-1.5 text-sm text-ink-900">
          <span className="font-extrabold">{inr(listing.price)}</span>
          <span className="text-ink-500"> / night</span>
        </p>
      </Link>
    </article>
  );
}

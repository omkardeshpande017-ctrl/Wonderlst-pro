import { Link } from "react-router-dom";
import { FaStar, FaHeart, FaRegHeart } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

export default function ListingCard({ listing, wishlist = [], onToggleWishlist }) {
  const { user } = useAuth();
  const isWishlisted = wishlist.includes(listing._id);

  return (
    <div className="group">
      <div className="relative rounded-xl overflow-hidden aspect-square">
        <Link to={`/listings/${listing._id}`}>
          <img
            src={listing.image?.url}
            alt={listing.title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
          />
        </Link>
        {user && (
          <button
            onClick={() => onToggleWishlist?.(listing._id)}
            className="absolute top-3 right-3 text-lg text-white drop-shadow"
            aria-label="Toggle wishlist"
          >
            {isWishlisted ? <FaHeart className="text-brand-500" /> : <FaRegHeart />}
          </button>
        )}
        <span className="absolute bottom-3 left-3 bg-white/90 text-[11px] font-semibold px-2 py-1 rounded-full">
          {listing.category}
        </span>
      </div>

      <Link to={`/listings/${listing._id}`} className="block mt-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-sm text-gray-900 line-clamp-2">
            {listing.location}, {listing.country}
          </h3>
          {listing.avgRating > 0 && (
            <span className="flex items-center gap-1 text-xs shrink-0">
              <FaStar className="text-gray-900" />
              {listing.avgRating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-sm truncate">{listing.title}</p>
        <p className="mt-1 text-sm">
          <span className="font-semibold">&#8377;{listing.price.toLocaleString("en-IN")}</span> / night
        </p>
      </Link>
    </div>
  );
}

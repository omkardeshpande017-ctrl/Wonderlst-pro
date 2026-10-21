import { FaUserCircle, FaTrash } from "react-icons/fa";
import StarRating from "./StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { shortDate } from "../utils/format.js";

export default function ReviewCard({ review, listingOwnerId, onDelete }) {
  const { user } = useAuth();
  const canDelete = user && (user._id === review.author?._id || user._id === listingOwnerId);
  const name = review.author?.username || review.username || "Guest";

  return (
    <div className="rounded-2xl border border-ink-100 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {review.author?.avatar ? (
            <img
              src={review.author.avatar}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <span className="grid h-10 w-10 place-items-center rounded-full bg-ink-100 text-sm font-bold text-ink-600">
              {name[0]?.toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-sm font-bold text-ink-900">{name}</p>
            <p className="text-xs text-ink-400">{shortDate(review.createdAt)}</p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(review._id)}
            className="rounded-full p-2 text-ink-400 transition hover:bg-red-50 hover:text-red-500"
            aria-label="Delete review"
          >
            <FaTrash size={12} />
          </button>
        )}
      </div>
      <div className="mt-2.5">
        <StarRating value={review.rating} readOnly size={13} />
      </div>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{review.comment}</p>
    </div>
  );
}

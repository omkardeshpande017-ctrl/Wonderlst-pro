import { FaUserCircle, FaTrash } from "react-icons/fa";
import StarRating from "./StarRating.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function ReviewCard({ review, listingOwnerId, onDelete }) {
  const { user } = useAuth();
  const canDelete =
    user && (user._id === review.author?._id || user._id === listingOwnerId);

  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {review.author?.avatar ? (
            <img src={review.author.avatar} className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <FaUserCircle className="text-2xl text-gray-400" />
          )}
          <div>
            <p className="text-sm font-semibold">{review.author?.username || review.username}</p>
            <p className="text-xs text-gray-400">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        {canDelete && (
          <button
            onClick={() => onDelete(review._id)}
            className="text-gray-400 hover:text-red-500"
            aria-label="Delete review"
          >
            <FaTrash size={13} />
          </button>
        )}
      </div>
      <div className="mt-2">
        <StarRating value={review.rating} readOnly size={14} />
      </div>
      <p className="mt-2 text-sm text-gray-700">{review.comment}</p>
    </div>
  );
}

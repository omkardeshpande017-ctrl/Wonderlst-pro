import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaMapMarkerAlt, FaTrash, FaEdit, FaHeart, FaRegHeart } from "react-icons/fa";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ReviewCard from "../components/ReviewCard.jsx";
import StarRating from "../components/StarRating.jsx";
import BookingWidget from "../components/BookingWidget.jsx";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/listings/${id}`);
      setListing(data.listing);
    } catch (err) {
      toast.error("Listing not found");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListing();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (user) {
      api.get("/users/me/wishlist").then(({ data }) =>
        setWishlisted(data.wishlist.some((l) => l._id === id))
      );
    }
  }, [user, id]);

  const handleDeleteListing = async () => {
    if (!window.confirm("Delete this listing? This cannot be undone.")) return;
    try {
      await api.delete(`/listings/${id}`);
      toast.success("Listing deleted");
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete listing");
    }
  };

  const handleToggleWishlist = async () => {
    if (!user) return toast.error("Log in to save listings");
    const { data } = await api.post(`/users/me/wishlist/${id}`);
    setWishlisted(data.added);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.rating) return toast.error("Please select a rating");
    setSubmittingReview(true);
    try {
      await api.post(`/listings/${id}/reviews`, reviewForm);
      toast.success("Review submitted!");
      setReviewForm({ rating: 0, comment: "" });
      fetchListing();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm("Delete this review?")) return;
    try {
      await api.delete(`/listings/${id}/reviews/${reviewId}`);
      toast.success("Review deleted");
      fetchListing();
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete review");
    }
  };

  if (loading || !listing) {
    return <div className="text-center py-24 text-gray-400">Loading...</div>;
  }

  const isOwner = user && listing.owner?._id === user._id;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-start justify-between gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">{listing.title}</h1>
        {user && (
          <button onClick={handleToggleWishlist} className="text-2xl text-brand-500 shrink-0">
            {wishlisted ? <FaHeart /> : <FaRegHeart />}
          </button>
        )}
      </div>
      <p className="text-gray-500 flex items-center gap-1 mt-1">
        <FaMapMarkerAlt /> {listing.location}, {listing.country}
      </p>

      <img
        src={listing.image?.url}
        alt={listing.title}
        className="w-full max-h-[480px] object-cover rounded-2xl mt-4"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
            {listing.owner?.avatar ? (
              <img src={listing.owner.avatar} className="w-11 h-11 rounded-full object-cover" />
            ) : (
              <div className="w-11 h-11 rounded-full bg-gray-200 flex items-center justify-center font-semibold">
                {listing.owner?.username?.[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-semibold">Hosted by {listing.owner?.username}</p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full">{listing.category}</span>
            </div>
          </div>

          <p className="mt-4 text-gray-700 leading-relaxed">{listing.description}</p>

          {isOwner && (
            <div className="flex gap-3 mt-6">
              <Link
                to={`/listings/${id}/edit`}
                className="flex items-center gap-2 border border-gray-900 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                <FaEdit /> Edit listing
              </Link>
              <button
                onClick={handleDeleteListing}
                className="flex items-center gap-2 border border-red-500 text-red-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50"
              >
                <FaTrash /> Delete listing
              </button>
            </div>
          )}
        </div>

        <div className="h-fit">
          {listing.avgRating > 0 && (
            <p className="text-sm text-gray-500 mb-2">
              ★ {listing.avgRating.toFixed(1)} ({listing.reviews.length} review
              {listing.reviews.length !== 1 ? "s" : ""})
            </p>
          )}
          <BookingWidget listing={listing} />
        </div>
      </div>

      <div className="mt-12 border-t border-gray-200 pt-8">
        <h2 className="text-xl font-bold mb-4">
          {listing.reviews.length > 0 ? `${listing.reviews.length} Reviews` : "No reviews yet"}
        </h2>

        {user && !isOwner ? (
          <form onSubmit={handleReviewSubmit} className="mb-8 bg-gray-50 rounded-xl p-5 space-y-3">
            <p className="font-medium text-sm">Leave a review</p>
            <StarRating value={reviewForm.rating} onChange={(r) => setReviewForm({ ...reviewForm, rating: r })} />
            <textarea
              required
              maxLength={500}
              placeholder="Share your experience..."
              value={reviewForm.comment}
              onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              rows={3}
            />
            <button
              disabled={submittingReview}
              className="bg-gray-900 hover:bg-black disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded-lg"
            >
              {submittingReview ? "Submitting..." : "Submit review"}
            </button>
          </form>
        ) : !user ? (
          <p className="text-sm text-gray-500 mb-8">
            <Link to="/login" className="text-brand-500 font-medium">
              Log in
            </Link>{" "}
            to leave a review.
          </p>
        ) : null}

        <div className="grid sm:grid-cols-2 gap-4">
          {listing.reviews.map((review) => (
            <ReviewCard
              key={review._id}
              review={review}
              listingOwnerId={listing.owner?._id}
              onDelete={handleDeleteReview}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

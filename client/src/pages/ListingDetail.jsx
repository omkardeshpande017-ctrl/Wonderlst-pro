import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaMapMarkerAlt,
  FaTrash,
  FaEdit,
  FaHeart,
  FaRegHeart,
  FaStar,
  FaBed,
  FaBath,
  FaUsers,
  FaHome,
  FaShareAlt,
} from "react-icons/fa";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import ReviewCard from "../components/ReviewCard.jsx";
import SmartImage from "../components/SmartImage.jsx";
import StarRating from "../components/StarRating.jsx";
import BookingWidget from "../components/BookingWidget.jsx";
import { AMENITY_ICONS, inr, shortDate } from "../utils/format.js";

export default function ListingDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [breakdown, setBreakdown] = useState({});
  const [busyUntil, setBusyUntil] = useState(null);
  const [loading, setLoading] = useState(true);
  const [wishlisted, setWishlisted] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 0, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);

  const fetchListing = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/listings/${id}`);
      setListing(data.listing);
      setBreakdown(data.ratingBreakdown || {});
      setBusyUntil(data.busyUntil || null);
      setActivePhoto(0);
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
      api
        .get("/users/me/wishlist")
        .then(({ data }) => setWishlisted(data.wishlist.some((l) => l._id === id)))
        .catch(() => {});
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
    toast.success(data.added ? "Saved to wishlist" : "Removed from wishlist");
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: listing.title, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled the share sheet */
    }
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
    return (
      <div className="container-page py-10">
        <div className="skeleton h-8 w-2/3 rounded" />
        <div className="skeleton mt-4 h-4 w-1/3 rounded" />
        <div className="skeleton mt-6 aspect-[16/9] w-full rounded-3xl" />
      </div>
    );
  }

  const isOwner = user && listing.owner?._id === user._id;
  const photos = [listing.image, ...(listing.gallery || [])].filter((p) => p?.url);
  const main = photos[activePhoto] || photos[0];

  const totalReviews = listing.reviewCount || listing.reviews.length;

  return (
    <div className="container-page py-8">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge bg-ink-100 text-ink-700">{listing.category}</span>
            <span className="badge bg-ink-100 text-ink-700">{listing.bookingType}</span>
            {listing.instantBook && (
              <span className="badge bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                Instant book
              </span>
            )}
            {busyUntil && (
              <span className="badge bg-orange-50 text-orange-700 ring-1 ring-orange-200">
                Booked until {shortDate(busyUntil)}
              </span>
            )}
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-ink-900 sm:text-3xl">
            {listing.title}
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
            <span className="flex items-center gap-1">
              <FaMapMarkerAlt size={11} /> {listing.location}, {listing.country}
            </span>
            {listing.avgRating > 0 && (
              <span className="flex items-center gap-1 font-semibold text-ink-800">
                <FaStar className="text-amber-400" size={11} /> {listing.avgRating.toFixed(1)} ·{" "}
                {totalReviews} review{totalReviews === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleShare} className="btn-soft">
            <FaShareAlt size={11} /> Share
          </button>
          {user && (
            <button onClick={handleToggleWishlist} className="btn-soft">
              {wishlisted ? <FaHeart className="text-brand-500" /> : <FaRegHeart />}
              {wishlisted ? "Saved" : "Save"}
            </button>
          )}
        </div>
      </div>

      {/* Gallery */}
      <div className="mt-6 grid gap-2 overflow-hidden rounded-3xl sm:grid-cols-[2fr_1fr]">
        <div className="relative aspect-[4/3] bg-ink-100 sm:aspect-auto sm:min-h-[420px]">
          <SmartImage
            key={main?.url}
            src={main?.url}
            alt={listing.title}
            category={listing.category}
            priority
            wrapperClassName="absolute inset-0"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-2">
          {photos.slice(0, 4).map((p, i) => (
            <button
              key={i}
              onClick={() => setActivePhoto(i)}
              className={`relative aspect-square overflow-hidden bg-ink-100 transition ${
                activePhoto === i ? "ring-2 ring-ink-900 ring-offset-1" : "opacity-90 hover:opacity-100"
              }`}
            >
              <SmartImage
                src={p.url}
                alt={`${listing.title} photo ${i + 1}`}
                category={listing.category}
                wrapperClassName="absolute inset-0"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-3">
        {/* Left column */}
        <div className="lg:col-span-2">
          {/* Host + capacity */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-100 pb-6">
            <div className="flex items-center gap-3">
              {listing.owner?.avatar ? (
                <img
                  src={listing.owner.avatar}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-900 text-lg font-bold text-white">
                  {listing.owner?.username?.[0]?.toUpperCase()}
                </span>
              )}
              <div>
                <p className="font-bold text-ink-900">Hosted by {listing.owner?.username}</p>
                <p className="text-xs text-ink-500">
                  {listing.owner?.bio || "Verified host"} · joined{" "}
                  {listing.owner?.createdAt ? shortDate(listing.owner.createdAt) : "recently"}
                </p>
              </div>
            </div>
            <div className="flex gap-5 text-center text-xs text-ink-500">
              <Capacity icon={<FaUsers />} value={listing.maxGuests} label="guests" />
              <Capacity icon={<FaBed />} value={listing.bedrooms} label="bedrooms" />
              <Capacity icon={<FaHome />} value={listing.beds} label="beds" />
              <Capacity icon={<FaBath />} value={listing.bathrooms} label="baths" />
            </div>
          </div>

          <p className="mt-6 leading-relaxed text-ink-700">{listing.description}</p>

          {/* Amenities */}
          {listing.amenities?.length > 0 && (
            <div className="mt-8">
              <h2 className="text-lg font-bold text-ink-900">What this place offers</h2>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {listing.amenities.map((a) => (
                  <div
                    key={a}
                    className="flex items-center gap-2.5 rounded-xl border border-ink-100 px-3 py-2.5 text-sm text-ink-700"
                  >
                    <span className="text-base">{AMENITY_ICONS[a] || "✅"}</span>
                    {a}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing summary */}
          <div className="mt-8 rounded-2xl bg-sand p-5">
            <h2 className="text-lg font-bold text-ink-900">Pricing</h2>
            <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
              <li className="flex justify-between">
                <span>Per night</span>
                <span className="font-semibold text-ink-900">{inr(listing.price)}</span>
              </li>
              <li className="flex justify-between">
                <span>Cleaning fee</span>
                <span className="font-semibold text-ink-900">{inr(listing.cleaningFee || 0)}</span>
              </li>
              <li className="flex justify-between">
                <span>Refundable security deposit</span>
                <span className="font-semibold text-ink-900">
                  {inr(listing.securityDeposit || 0)}
                </span>
              </li>
            </ul>
          </div>

          {isOwner && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={`/listings/${id}/edit`} className="btn-dark">
                <FaEdit size={12} /> Edit listing
              </Link>
              <button onClick={handleDeleteListing} className="btn-danger">
                <FaTrash size={12} /> Delete listing
              </button>
            </div>
          )}
        </div>

        {/* Right column: booking */}
        <div>
          <BookingWidget listing={listing} />
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-14 border-t border-ink-100 pt-10">
        <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
          <div>
            <h2 className="text-xl font-bold text-ink-900">
              {totalReviews > 0 ? `${totalReviews} review${totalReviews === 1 ? "" : "s"}` : "No reviews yet"}
            </h2>
            {listing.avgRating > 0 && (
              <>
                <div className="mt-3 flex items-center gap-2">
                  <FaStar className="text-amber-400" />
                  <span className="text-2xl font-extrabold text-ink-900">
                    {listing.avgRating.toFixed(1)}
                  </span>
                  <StarRating value={listing.avgRating} readOnly size={14} />
                </div>
                <div className="mt-4 space-y-1.5">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = breakdown?.[star] || 0;
                    const pct = totalReviews ? Math.round((count / totalReviews) * 100) : 0;
                    return (
                      <div key={star} className="flex items-center gap-2 text-xs text-ink-500">
                        <span className="w-6">{star}★</span>
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink-100">
                          <span
                            className="block h-full rounded-full bg-amber-400"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        <span className="w-6 text-right">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div>
            {user && !isOwner ? (
              <form onSubmit={handleReviewSubmit} className="card mb-6 p-5">
                <p className="font-bold text-ink-900">Leave a review</p>
                <div className="mt-2">
                  <StarRating
                    value={reviewForm.rating}
                    onChange={(r) => setReviewForm({ ...reviewForm, rating: r })}
                    size={22}
                  />
                </div>
                <textarea
                  required
                  maxLength={500}
                  rows={3}
                  placeholder="Share your experience..."
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                  className="input mt-3 resize-none"
                />
                <button disabled={submittingReview} className="btn-primary mt-3">
                  {submittingReview ? "Submitting..." : "Submit review"}
                </button>
              </form>
            ) : !user ? (
              <p className="mb-6 text-sm text-ink-500">
                <Link to="/login" className="font-semibold text-brand-500">
                  Log in
                </Link>{" "}
                to leave a review.
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
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
      </div>
    </div>
  );
}

function Capacity({ icon, value, label }) {
  return (
    <div>
      <div className="mx-auto mb-1 grid h-8 w-8 place-items-center rounded-full bg-ink-50 text-ink-600">
        {icon}
      </div>
      <p className="font-bold text-ink-900">{value || 0}</p>
      <p>{label}</p>
    </div>
  );
}

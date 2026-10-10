const Listing = require("../models/Listing");
const Review = require("../models/Review");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");

const recalcAvgRating = async (listingId) => {
  const listing = await Listing.findById(listingId).populate("reviews");
  if (!listing) return;
  const count = listing.reviews.length;
  listing.avgRating = count
    ? listing.reviews.reduce((sum, r) => sum + r.rating, 0) / count
    : 0;
  await listing.save();
};

exports.createReview = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(new ApiError(404, "Listing not found"));
  if (listing.owner.toString() === req.user._id.toString()) {
    return next(new ApiError(403, "You can't review your own listing"));
  }

  const review = await Review.create({
    comment: req.body.comment,
    rating: req.body.rating,
    author: req.user._id,
    username: req.user.username,
    listing: listing._id,
  });

  listing.reviews.push(review._id);
  await listing.save();
  await recalcAvgRating(listing._id);

  const populated = await review.populate("author", "username avatar");
  res.status(201).json({ success: true, review: populated });
});

exports.deleteReview = catchAsync(async (req, res, next) => {
  const { id: listingId, reviewId } = req.params;
  const review = await Review.findById(reviewId);
  if (!review) return next(new ApiError(404, "Review not found"));

  const listing = await Listing.findById(listingId);
  const isReviewAuthor = review.author.toString() === req.user._id.toString();
  const isListingOwner = listing && listing.owner.toString() === req.user._id.toString();

  if (!isReviewAuthor && !isListingOwner) {
    return next(new ApiError(403, "You don't have permission to delete this review"));
  }

  await Listing.findByIdAndUpdate(listingId, { $pull: { reviews: reviewId } });
  await Review.findByIdAndDelete(reviewId);
  await recalcAvgRating(listingId);

  res.status(200).json({ success: true, message: "Review deleted" });
});

const express = require("express");
const router = express.Router();

const {
  getListings,
  getCategories,
  getListing,
  createListing,
  updateListing,
  deleteListing,
  getMyListings,
} = require("../controllers/listingController");
const { createReview, deleteReview } = require("../controllers/reviewController");

const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { validateListing, validateReview } = require("../middleware/validate");

router.get("/categories", getCategories);
router.get("/mine", protect, restrictTo("owner"), getMyListings);

router
  .route("/")
  .get(getListings)
  .post(protect, restrictTo("owner"), upload.single("image"), validateListing, createListing);

router
  .route("/:id")
  .get(getListing)
  .put(protect, restrictTo("owner"), upload.single("image"), updateListing)
  .delete(protect, restrictTo("owner"), deleteListing);

router.post("/:id/reviews", protect, validateReview, createReview);
router.delete("/:id/reviews/:reviewId", protect, deleteReview);

module.exports = router;

const express = require("express");
const router = express.Router();

const {
  getListings,
  getCategories,
  getFilterMeta,
  getFeatured,
  getStats,
  getNearby,
  getAvailability,
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

// Public
router.get("/categories", getCategories);
router.get("/filters", getFilterMeta);
router.get("/featured", getFeatured);
router.get("/stats", getStats);
router.get("/nearby", getNearby);

// Owner-only (must be declared before "/:id")
router.get("/mine", protect, restrictTo("owner"), getMyListings);

router
  .route("/")
  .get(getListings)
  .post(
    protect,
    restrictTo("owner"),
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "gallery", maxCount: 5 },
    ]),
    validateListing,
    createListing
  );

router.get("/:id/availability", getAvailability);

router
  .route("/:id")
  .get(getListing)
  .put(
    protect,
    restrictTo("owner"),
    upload.fields([
      { name: "image", maxCount: 1 },
      { name: "gallery", maxCount: 5 },
    ]),
    updateListing
  )
  .delete(protect, restrictTo("owner"), deleteListing);

router.post("/:id/reviews", protect, validateReview, createReview);
router.delete("/:id/reviews/:reviewId", protect, deleteReview);

module.exports = router;

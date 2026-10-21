const express = require("express");
const router = express.Router();
const {
  getMe,
  updateProfile,
  getWishlist,
  toggleWishlist,
  updatePayment,
} = require("../controllers/userController");
const { protect, restrictTo } = require("../middleware/auth");
const upload = require("../middleware/upload");

router.get("/me", protect, getMe);
router.put("/me", protect, updateProfile);
router.put("/me/payment", protect, restrictTo("owner"), upload.single("qr"), updatePayment);
router.get("/me/wishlist", protect, getWishlist);
router.post("/me/wishlist/:listingId", protect, toggleWishlist);

module.exports = router;

const express = require("express");
const router = express.Router();
const { getRecentReviews } = require("../controllers/reviewController");

router.get("/recent", getRecentReviews);

module.exports = router;

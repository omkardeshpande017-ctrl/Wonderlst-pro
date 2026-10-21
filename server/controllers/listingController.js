const Listing = require("../models/Listing");
const Review = require("../models/Review");
const Booking = require("../models/Booking");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { fileInfo } = require("../middleware/upload");

// Every sort option the UI offers, mapped to a Mongo sort spec
const SORTS = {
  recommended: { featured: -1, avgRating: -1, createdAt: -1 },
  newest: { createdAt: -1 },
  "price-asc": { price: 1 },
  "price-desc": { price: -1 },
  rating: { avgRating: -1, reviewCount: -1 },
};

// GET /api/listings
// ?search=&category=&bookingType=&minPrice=&maxPrice=&guests=&bedrooms=&bathrooms=
// &amenities=Wifi,Pool&instantBook=true&featured=true&sort=&page=&limit=
exports.getListings = catchAsync(async (req, res) => {
  const {
    search,
    category,
    bookingType,
    minPrice,
    maxPrice,
    guests,
    bedrooms,
    bathrooms,
    amenities,
    instantBook,
    featured,
    ownerId,
    sort = "recommended",
    page = 1,
    limit = 12,
  } = req.query;

  const filter = {};

  if (search) {
    const rx = { $regex: search, $options: "i" };
    filter.$or = [{ title: rx }, { location: rx }, { country: rx }, { category: rx }];
  }
  if (category && category !== "All") filter.category = category;
  if (bookingType) filter.bookingType = bookingType;
  if (ownerId) filter.owner = ownerId;

  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  if (guests) filter.maxGuests = { $gte: Number(guests) };
  if (bedrooms) filter.bedrooms = { $gte: Number(bedrooms) };
  if (bathrooms) filter.bathrooms = { $gte: Number(bathrooms) };

  if (amenities) {
    const list = String(amenities)
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);
    if (list.length) filter.amenities = { $all: list };
  }

  if (instantBook === "true") filter.instantBook = true;
  if (featured === "true") filter.featured = true;

  const sortSpec = SORTS[sort] || SORTS.recommended;
  const pageNum = Math.max(1, Number(page));
  const limitNum = Math.min(50, Math.max(1, Number(limit)));
  const skip = (pageNum - 1) * limitNum;

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .populate("owner", "username avatar")
      .sort(sortSpec)
      .skip(skip)
      .limit(limitNum),
    Listing.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: listings.length,
    total,
    page: pageNum,
    pages: Math.ceil(total / limitNum),
    sort,
    listings,
  });
});

// GET /api/listings/filters — everything the filter UI needs, in one call
exports.getFilterMeta = (req, res) => {
  res.status(200).json({
    success: true,
    categories: Listing.CATEGORIES,
    amenities: Listing.AMENITIES,
    bookingTypes: Listing.BOOKING_TYPES,
    sorts: Object.keys(SORTS),
  });
};

exports.getCategories = (req, res) => {
  res.status(200).json({ success: true, categories: Listing.CATEGORIES });
};

// GET /api/listings/featured — hand-picked stays for the home page
exports.getFeatured = catchAsync(async (req, res) => {
  const listings = await Listing.find({ featured: true })
    .populate("owner", "username avatar")
    .sort({ avgRating: -1 })
    .limit(6);
  res.status(200).json({ success: true, count: listings.length, listings });
});

// GET /api/listings/stats — trust signals for the landing page
exports.getStats = catchAsync(async (req, res) => {
  const [listings, hosts, guests, bookings, reviewAgg] = await Promise.all([
    Listing.countDocuments({}),
    Listing.distinct("owner").then((ids) => ids.length),
    Booking.distinct("guest").then((ids) => ids.length),
    Booking.countDocuments({ status: { $in: ["confirmed", "completed"] } }),
    Review.aggregate([
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]),
  ]);

  const avgRating = reviewAgg[0]?.avg || 0;
  const reviewCount = reviewAgg[0]?.count || 0;

  res.status(200).json({
    success: true,
    stats: {
      listings,
      hosts,
      guests,
      bookings,
      reviews: reviewCount,
      avgRating: Math.round(avgRating * 10) / 10,
    },
  });
});

// GET /api/listings/nearby?lat=&lng=&radius=&limit=
exports.getNearby = catchAsync(async (req, res) => {
  const { lat, lng, radius = 50000, limit = 6 } = req.query;
  if (!lat || !lng) throw new ApiError(400, "lat and lng are required");

  const listings = await Listing.find({
    geometry: {
      $near: {
        $geometry: { type: "Point", coordinates: [Number(lng), Number(lat)] },
        $maxDistance: Number(radius),
      },
    },
  })
    .populate("owner", "username avatar")
    .limit(Number(limit));

  res.status(200).json({ success: true, count: listings.length, listings });
});

// GET /api/listings/:id/availability?from=&to=
// Returns the booked ranges so the calendar can block them
exports.getAvailability = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(new ApiError(404, "Listing not found"));

  const { from, to } = req.query;
  const query = {
    listing: listing._id,
    status: { $in: Booking.BLOCKING_STATUSES },
  };

  if (from || to) {
    query.checkIn = {};
    if (to) query.checkIn.$lt = new Date(to);
    if (from) query.checkOut = { $gt: new Date(from) };
  }

  const bookings = await Booking.find(query).select("checkIn checkOut status").sort("checkIn");

  res.status(200).json({
    success: true,
    booked: bookings.map((b) => ({
      checkIn: b.checkIn,
      checkOut: b.checkOut,
      status: b.status,
    })),
  });
});

exports.getListing = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id)
    .populate("owner", "username avatar bio createdAt")
    .populate({
      path: "reviews",
      populate: { path: "author", select: "username avatar" },
      options: { sort: { createdAt: -1 } },
    });

  if (!listing) return next(new ApiError(404, "Listing not found"));

  // Rating breakdown (5★ → 1★) so the detail page can draw bars
  const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  listing.reviews.forEach((r) => {
    if (breakdown[r.rating] !== undefined) breakdown[r.rating] += 1;
  });

  // Is this listing booked right now? Useful for a "Booked" badge.
  const today = new Date();
  const activeBooking = await Booking.findOne({
    listing: listing._id,
    status: { $in: Booking.BLOCKING_STATUSES },
    checkIn: { $lte: today },
    checkOut: { $gt: today },
  }).select("checkOut");

  res.status(200).json({
    success: true,
    listing,
    ratingBreakdown: breakdown,
    busyUntil: activeBooking ? activeBooking.checkOut : null,
  });
});

// Shared create/update mapping so both routes stay in sync
const applyListingFields = (listing, body) => {
  const {
    title,
    description,
    price,
    cleaningFee,
    securityDeposit,
    location,
    country,
    category,
    bookingType,
    maxGuests,
    bedrooms,
    beds,
    bathrooms,
    instantBook,
    featured,
    lat,
    lng,
  } = body;

  const setIf = (key, value) => {
    if (value !== undefined && value !== "") listing[key] = value;
  };

  setIf("title", title);
  setIf("description", description);
  if (price !== undefined && price !== "") listing.price = Number(price);
  if (cleaningFee !== undefined && cleaningFee !== "") listing.cleaningFee = Number(cleaningFee);
  if (securityDeposit !== undefined && securityDeposit !== "")
    listing.securityDeposit = Number(securityDeposit);
  setIf("location", location);
  setIf("country", country);
  setIf("category", category);
  setIf("bookingType", bookingType);
  if (maxGuests !== undefined && maxGuests !== "") listing.maxGuests = Number(maxGuests);
  if (bedrooms !== undefined && bedrooms !== "") listing.bedrooms = Number(bedrooms);
  if (beds !== undefined && beds !== "") listing.beds = Number(beds);
  if (bathrooms !== undefined && bathrooms !== "") listing.bathrooms = Number(bathrooms);

  if (instantBook !== undefined) listing.instantBook = instantBook === "true" || instantBook === true;
  if (featured !== undefined) listing.featured = featured === "true" || featured === true;

  if (lat && lng) {
    listing.geometry = { type: "Point", coordinates: [Number(lng), Number(lat)] };
  }

  return listing;
};

const parseAmenities = (body) => {
  if (body.amenities === undefined) return undefined;
  if (Array.isArray(body.amenities)) return body.amenities;
  if (typeof body.amenities === "string" && body.amenities.trim() === "") return [];
  return String(body.amenities)
    .split(",")
    .map((a) => a.trim())
    .filter(Boolean);
};

exports.createListing = catchAsync(async (req, res, next) => {
  const listing = new Listing({ owner: req.user._id });

  // Mongoose validation runs on save(), so give it a title/price to start with
  listing.title = req.body.title;
  listing.description = req.body.description;
  listing.price = Number(req.body.price);
  listing.location = req.body.location;
  listing.country = req.body.country;

  applyListingFields(listing, req.body);

  const amenities = parseAmenities(req.body);
  if (amenities) listing.amenities = amenities;

  if (req.file) listing.image = fileInfo(req.file);
  if (req.files && req.files.length) {
    listing.gallery = req.files.map((f) => fileInfo(f));
  }

  await listing.save();
  res.status(201).json({ success: true, listing });
});

exports.updateListing = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(new ApiError(404, "Listing not found"));

  if (listing.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, "You don't have permission to edit this listing"));
  }

  applyListingFields(listing, req.body);

  const amenities = parseAmenities(req.body);
  if (amenities) listing.amenities = amenities;

  if (req.file) listing.image = fileInfo(req.file);
  if (req.files && req.files.length) {
    listing.gallery = req.files.map((f) => fileInfo(f));
  }

  await listing.save();
  res.status(200).json({ success: true, listing });
});

exports.deleteListing = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(new ApiError(404, "Listing not found"));

  if (listing.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, "You don't have permission to delete this listing"));
  }

  await Listing.findOneAndDelete({ _id: req.params.id });
  res.status(200).json({ success: true, message: "Listing deleted" });
});

// GET /api/listings/mine
exports.getMyListings = catchAsync(async (req, res) => {
  const listings = await Listing.find({ owner: req.user._id }).sort("-createdAt");
  res.status(200).json({ success: true, count: listings.length, listings });
});

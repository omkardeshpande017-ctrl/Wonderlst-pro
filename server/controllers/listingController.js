const Listing = require("../models/Listing");
const Review = require("../models/Review");
const ApiError = require("../utils/ApiError");
const catchAsync = require("../utils/catchAsync");
const { fileInfo } = require("../middleware/upload");

// GET /api/listings?search=&category=&minPrice=&maxPrice=&sort=&page=&limit=
exports.getListings = catchAsync(async (req, res) => {
  const {
    search,
    category,
    minPrice,
    maxPrice,
    sort = "-createdAt",
    page = 1,
    limit = 12,
  } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: "i" } },
      { location: { $regex: search, $options: "i" } },
      { country: { $regex: search, $options: "i" } },
    ];
  }
  if (category && category !== "All") filter.category = category;
  if (minPrice || maxPrice) {
    filter.price = {};
    if (minPrice) filter.price.$gte = Number(minPrice);
    if (maxPrice) filter.price.$lte = Number(maxPrice);
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [listings, total] = await Promise.all([
    Listing.find(filter)
      .populate("owner", "username avatar")
      .sort(sort)
      .skip(skip)
      .limit(Number(limit)),
    Listing.countDocuments(filter),
  ]);

  res.status(200).json({
    success: true,
    count: listings.length,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
    listings,
  });
});

exports.getCategories = (req, res) => {
  res.status(200).json({ success: true, categories: Listing.CATEGORIES });
};

exports.getListing = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id)
    .populate("owner", "username avatar bio")
    .populate({
      path: "reviews",
      populate: { path: "author", select: "username avatar" },
      options: { sort: { createdAt: -1 } },
    });

  if (!listing) return next(new ApiError(404, "Listing not found"));

  res.status(200).json({ success: true, listing });
});

exports.createListing = catchAsync(async (req, res, next) => {
  const { title, description, price, location, country, category, lat, lng } =
    req.body;

  const newListing = new Listing({
    title,
    description,
    price,
    location,
    country,
    category,
    owner: req.user._id,
  });

  if (lat && lng) {
    newListing.geometry = { type: "Point", coordinates: [Number(lng), Number(lat)] };
  }

  if (req.file) {
    newListing.image = fileInfo(req.file);
  }

  await newListing.save();
  res.status(201).json({ success: true, listing: newListing });
});

exports.updateListing = catchAsync(async (req, res, next) => {
  const listing = await Listing.findById(req.params.id);
  if (!listing) return next(new ApiError(404, "Listing not found"));

  if (listing.owner.toString() !== req.user._id.toString()) {
    return next(new ApiError(403, "You don't have permission to edit this listing"));
  }

  const { title, description, price, location, country, category, lat, lng } =
    req.body;

  Object.assign(listing, {
    title: title ?? listing.title,
    description: description ?? listing.description,
    price: price ?? listing.price,
    location: location ?? listing.location,
    country: country ?? listing.country,
    category: category ?? listing.category,
  });

  if (lat && lng) {
    listing.geometry = { type: "Point", coordinates: [Number(lng), Number(lat)] };
  }

  if (req.file) {
    listing.image = fileInfo(req.file);
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

const Joi = require("joi");
const ApiError = require("../utils/ApiError");

const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("guest", "owner").default("guest"),
  phone: Joi.string().allow("").max(20).optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const listingSchema = Joi.object({
  title: Joi.string().max(100).required(),
  description: Joi.string().max(2000).required(),
  price: Joi.number().min(0).required(),
  location: Joi.string().required(),
  country: Joi.string().required(),
  category: Joi.string().optional(),
  lat: Joi.number().optional(),
  lng: Joi.number().optional(),
});

const reviewSchema = Joi.object({
  comment: Joi.string().max(500).required(),
  rating: Joi.number().min(1).max(5).required(),
});

const bookingSchema = Joi.object({
  listingId: Joi.string().required(),
  checkIn: Joi.date().required(),
  checkOut: Joi.date().required(),
  guests: Joi.number().integer().min(1).max(20).default(1),
  message: Joi.string().allow("").max(500).optional(),
});

const makeValidator = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    return next(new ApiError(400, message));
  }
  next();
};

module.exports = {
  validateRegister: makeValidator(registerSchema),
  validateLogin: makeValidator(loginSchema),
  validateListing: makeValidator(listingSchema),
  validateReview: makeValidator(reviewSchema),
  validateBooking: makeValidator(bookingSchema),
};

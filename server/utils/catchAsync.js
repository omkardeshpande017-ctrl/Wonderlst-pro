// Wraps async route handlers so rejected promises are forwarded to Express' error handler
module.exports = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

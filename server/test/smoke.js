// Quick end-to-end feature test against a running API.
//   node server/test/smoke.js                 -> http://localhost:8080/api
//   node server/test/smoke.js https://site/api -> a deployed instance
const base = process.argv[2] || "http://localhost:8080/api";

let pass = 0;
let fail = 0;
const failures = [];

const ok = (name, cond, extra = "") => {
  if (cond) {
    pass += 1;
    console.log(`  ✓ ${name}`);
  } else {
    fail += 1;
    failures.push(name);
    console.log(`  ✗ ${name} ${extra}`);
  }
};

const call = async (method, path, { token, body, form } = {}) => {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }
  const res = await fetch(`${base}${path}`, { method, headers, body: payload });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  return { status: res.status, data };
};

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
};

(async () => {
  console.log(`\nTesting ${base}\n`);

  // ---------- Public ----------
  console.log("Public");
  const health = await call("GET", "/health");
  ok("health", health.status === 200 && health.data.success === true);

  const listings = await call("GET", "/listings");
  ok("listings list", listings.status === 200 && listings.data.listings.length > 0);
  const firstId = listings.data.listings[0]?._id;

  const filters = await call("GET", "/listings/filters");
  ok(
    "filters meta",
    filters.status === 200 &&
      filters.data.categories.length > 0 &&
      filters.data.amenities.length > 0
  );

  const stats = await call("GET", "/listings/stats");
  ok("stats", stats.status === 200 && stats.data.stats.listings > 0);

  const featured = await call("GET", "/listings/featured");
  ok("featured", featured.status === 200 && featured.data.listings.length > 0);

  const search = await call("GET", "/listings?search=goa&amenities=Pool");
  ok("search + amenity filter", search.status === 200);

  const sorted = await call("GET", "/listings?sort=price-asc&minPrice=1000&maxPrice=20000");
  const prices = sorted.data.listings.map((l) => l.price);
  ok(
    "price filter + sort",
    sorted.status === 200 && prices.every((p) => p >= 1000 && p <= 20000) &&
      prices.every((p, i) => i === 0 || prices[i - 1] <= p)
  );

  const recent = await call("GET", "/reviews/recent?limit=3");
  ok("recent reviews", recent.status === 200 && recent.data.reviews.length > 0);

  const detail = await call("GET", `/listings/${firstId}`);
  ok(
    "listing detail + breakdown",
    detail.status === 200 && detail.data.listing && detail.data.ratingBreakdown
  );

  const availability = await call("GET", `/listings/${firstId}/availability`);
  ok("availability", availability.status === 200 && Array.isArray(availability.data.booked));

  const quote = await call(
    "GET",
    `/bookings/quote?listingId=${firstId}&checkIn=${iso(addDays(500))}&checkOut=${iso(
      addDays(503)
    )}&guests=1`
  );
  ok(
    "price quote",
    quote.status === 200 && quote.data.quote && quote.data.quote.nights === 3
  );

  // ---------- Auth ----------
  console.log("\nAuth");
  const badLogin = await call("POST", "/auth/login", {
    body: { email: "guest@wanderlust.com", password: "wrongpass" },
  });
  ok("wrong password rejected", badLogin.status === 401);

  const guest = await call("POST", "/auth/login", {
    body: { email: "guest@wanderlust.com", password: "password123" },
  });
  ok("guest login", guest.status === 200 && !!guest.data.token);
  const guestToken = guest.data.token;

  const owner = await call("POST", "/auth/login", {
    body: { email: "owner@wanderlust.com", password: "password123" },
  });
  ok("owner login", owner.status === 200 && owner.data.user.role === "owner");
  const ownerToken = owner.data.token;

  const me = await call("GET", "/auth/me", { token: guestToken });
  ok("auth/me", me.status === 200 && me.data.user.email === "guest@wanderlust.com");

  const noToken = await call("GET", "/bookings/mine");
  ok("protected route blocks anonymous", noToken.status === 401);

  const wrongRole = await call("GET", "/bookings/owner", { token: guestToken });
  ok("role guard blocks guest from owner routes", wrongRole.status === 403);

  // ---------- Registration ----------
  console.log("\nRegistration");
  const uniq = Date.now().toString(36);
  const reg = await call("POST", "/auth/register", {
    body: {
      username: `tester_${uniq}`,
      email: `tester_${uniq}@example.com`,
      password: "password123",
      role: "guest",
    },
  });
  ok("register new guest", reg.status === 201 && !!reg.data.token);
  const newToken = reg.data.token;

  const dup = await call("POST", "/auth/register", {
    body: {
      username: `tester_${uniq}`,
      email: `tester_${uniq}@example.com`,
      password: "password123",
    },
  });
  ok("duplicate email/username rejected", dup.status === 400);

  // ---------- Profile & wishlist ----------
  console.log("\nProfile & wishlist");
  const prof = await call("PUT", "/users/me", {
    token: newToken,
    body: { bio: "Smoke test bio", phone: "9000000000" },
  });
  ok("update profile", prof.status === 200 && prof.data.user.bio === "Smoke test bio");

  const wish = await call("POST", `/users/me/wishlist/${firstId}`, { token: newToken });
  ok("add to wishlist", wish.status === 200 && wish.data.added === true);
  const wishList = await call("GET", "/users/me/wishlist", { token: newToken });
  ok("wishlist persisted", wishList.status === 200 && wishList.data.wishlist.length === 1);
  const unwish = await call("POST", `/users/me/wishlist/${firstId}`, { token: newToken });
  ok("remove from wishlist", unwish.status === 200 && unwish.data.added === false);

  // ---------- Full booking lifecycle ----------
  console.log("\nBooking lifecycle");
  // use a far-future window that the seed data never touches
  const start = 400 + Math.floor(Math.random() * 300);
  const checkIn = iso(addDays(start));
  const checkOut = iso(addDays(start + 2));
  // a listing with no seeded bookings keeps the test independent of demo data
  const freeListing = listings.data.listings.find((l) => l._id !== firstId && !l.instantBook) || listings.data.listings[1];
  const created = await call("POST", "/bookings", {
    token: newToken,
    body: { listingId: freeListing._id, checkIn, checkOut, guests: 1, message: "smoke test" },
  });
  ok("create booking request", created.status === 201 && !!created.data.booking?._id);
  const bookingId = created.data.booking?._id;

  // a second guest asking for the same nights must be refused
  const overlapTry = await call("POST", "/bookings", {
    token: guestToken,
    body: { listingId: freeListing._id, checkIn, checkOut, guests: 1 },
  });
  ok("overlapping dates blocked", overlapTry.status === 409 || overlapTry.status === 400);

  const ownerList = await call("GET", "/bookings/owner", { token: ownerToken });
  ok("owner sees the request", ownerList.status === 200 && ownerList.data.bookings.length > 0);

  // instant-book listings are approved at creation time, others need the host
  if (created.data.booking.status === "pending") {
    const approve = await call("PUT", `/bookings/${bookingId}/approve`, { token: ownerToken });
    ok("owner approves", approve.status === 200);
  } else {
    ok("instant-book auto-approved", created.data.booking.status === "approved");
  }

  const pay = await call("PUT", `/bookings/${bookingId}/payment`, {
    token: newToken,
    // unique per run — the API refuses a transaction ID that was already used
    body: { transactionId: `SMOKE${Date.now()}` },
  });
  ok("guest submits UPI transaction", pay.status === 200 && pay.data.booking.payment.status === "submitted");

  const verify = await call("PUT", `/bookings/${bookingId}/payment/verify`, { token: ownerToken });
  ok("owner verifies payment", verify.status === 200 && verify.data.booking.status === "confirmed");

  const invoice = await call("GET", `/bookings/${bookingId}/invoice`, { token: newToken });
  ok(
    "invoice generated",
    invoice.status === 200 && invoice.data.invoice && invoice.data.invoice.total > 0
  );

  const notAllowed = await call("GET", `/bookings/${bookingId}/invoice`, { token: guestToken });
  ok("invoice blocked for other users", notAllowed.status === 403);

  const trips = await call("GET", "/trips", { token: newToken });
  ok("my trips", trips.status === 200 && trips.data.bookings.length > 0);

  // ---------- Review ----------
  console.log("\nReviews");
  const review = await call("POST", `/listings/${firstId}/reviews`, {
    token: newToken,
    body: { rating: 5, comment: "Automated smoke test review" },
  });
  ok("create review", review.status === 201);
  const reviewId = review.data.review?._id;
  const after = await call("GET", `/listings/${firstId}`);
  ok("rating recalculated", after.status === 200 && after.data.listing.reviewCount > 0);
  const delReview = await call("DELETE", `/listings/${firstId}/reviews/${reviewId}`, {
    token: newToken,
  });
  ok("delete own review", delReview.status === 200);

  // ---------- Owner listing CRUD ----------
  console.log("\nListing CRUD (owner)");
  const fd = new FormData();
  fd.append("title", "Smoke Test Cottage");
  fd.append("description", "Created by the automated smoke test.");
  fd.append("price", "3333");
  fd.append("cleaningFee", "300");
  fd.append("securityDeposit", "1000");
  fd.append("location", "Testville");
  fd.append("country", "India");
  fd.append("category", "Mountains");
  fd.append("bookingType", "Entire place");
  fd.append("maxGuests", "3");
  fd.append("bedrooms", "1");
  fd.append("beds", "2");
  fd.append("bathrooms", "1");
  fd.append("instantBook", "true");
  fd.append("amenities", "Wifi,Kitchen");

  const createListing = await call("POST", "/listings", { token: ownerToken, form: fd });
  ok("owner creates listing", createListing.status === 201 && !!createListing.data.listing?._id);
  const newListingId = createListing.data.listing?._id;

  const mine = await call("GET", "/listings/mine", { token: ownerToken });
  ok("owner listing list", mine.status === 200 && mine.data.listings.some((l) => l._id === newListingId));

  const editFd = new FormData();
  editFd.append("title", "Smoke Test Cottage (edited)");
  editFd.append("description", "Edited by the smoke test.");
  editFd.append("price", "4444");
  editFd.append("location", "Testville");
  editFd.append("country", "India");
  const edit = await call("PUT", `/listings/${newListingId}`, { token: ownerToken, form: editFd });
  ok("owner edits listing", edit.status === 200 && edit.data.listing.price === 4444);

  const guestEdit = await call("PUT", `/listings/${newListingId}`, {
    token: guestToken,
    form: new FormData(),
  });
  ok("guest cannot edit listing", guestEdit.status === 403);

  const remove = await call("DELETE", `/listings/${newListingId}`, { token: ownerToken });
  ok("owner deletes listing", remove.status === 200);

  // ---------- Owner dashboard ----------
  console.log("\nOwner dashboard");
  const dashStats = await call("GET", "/bookings/owner/stats", { token: ownerToken });
  ok(
    "owner stats",
    dashStats.status === 200 && typeof dashStats.data.stats.earnings === "number"
  );

  const paySettings = await call("PUT", "/users/me/payment", {
    token: ownerToken,
    body: { upiId: "smoketest@okbank", payeeName: "Smoke Test" },
  });
  ok("update payment settings", paySettings.status === 200);

  const badUpi = await call("PUT", "/users/me/payment", {
    token: ownerToken,
    body: { upiId: "not-a-upi-id" },
  });
  ok("invalid UPI rejected", badUpi.status === 400);

  // ---------- Notifications ----------
  console.log("\nNotifications");
  const notifs = await call("GET", "/notifications", { token: ownerToken });
  ok("notifications list", notifs.status === 200 && Array.isArray(notifs.data.notifications));
  const readAll = await call("PUT", "/notifications/read-all", { token: ownerToken });
  ok("mark all read", readAll.status === 200);

  // ---------- Logout ----------
  console.log("\nSession");
  const logout = await call("POST", "/auth/logout", { token: newToken });
  ok("logout", logout.status === 200);

  const badToken = await call("GET", "/auth/me", { token: "invalid.token.here" });
  ok("invalid token rejected", badToken.status === 401);

  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail) {
    console.log("Failed:", failures.join(", "));
    process.exit(1);
  }
})();

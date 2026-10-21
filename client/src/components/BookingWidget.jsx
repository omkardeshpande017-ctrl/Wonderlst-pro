import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaBolt,
  FaCheckCircle,
  FaMinus,
  FaPlus,
  FaRegCalendarAlt,
  FaShieldAlt,
  FaStar,
} from "react-icons/fa";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";
import { inr, nightsBetween, todayISO } from "../utils/format.js";

export default function BookingWidget({ listing }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  const nights = nightsBetween(checkIn, checkOut);
  const maxGuests = listing.maxGuests || 2;

  // Local estimate so the summary never flickers while the server quote loads
  const localQuote = useMemo(() => {
    if (nights <= 0) return null;
    const subtotal = nights * listing.price;
    const cleaningFee = listing.cleaningFee || 0;
    const serviceFee = Math.round(subtotal * 0.05);
    return {
      nights,
      subtotal,
      cleaningFee,
      serviceFee,
      securityDeposit: listing.securityDeposit || 0,
      total: subtotal + cleaningFee + serviceFee,
      dueNow: subtotal + cleaningFee + serviceFee + (listing.securityDeposit || 0),
    };
  }, [nights, listing]);

  const shown = quote?.quote || localQuote;

  // Ask the server for the authoritative quote + availability
  useEffect(() => {
    if (nights <= 0) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoteLoading(true);
    api
      .get("/bookings/quote", { params: { listingId: listing._id, checkIn, checkOut, guests } })
      .then(({ data }) => {
        if (!cancelled) setQuote(data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setQuoteLoading(false));
    return () => {
      cancelled = true;
    };
  }, [listing._id, checkIn, checkOut, guests, nights]);

  const unavailable = quote && quote.available === false;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      toast.error("Log in as a guest to request a booking");
      return navigate("/login");
    }
    if (user.role === "owner") {
      return toast.error("Owner accounts can't book stays. Log in with a guest account.");
    }
    if (!checkIn || !checkOut) return toast.error("Select check-in and check-out dates");
    if (nights <= 0) return toast.error("Check-out must be after check-in");
    if (guests > maxGuests) return toast.error(`This stay hosts up to ${maxGuests} guests`);
    if (unavailable) return toast.error("Those dates are already booked");

    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        listingId: listing._id,
        checkIn,
        checkOut,
        guests,
        message,
      });
      toast.success(
        listing.instantBook ? "Booked! Complete the UPI payment next." : "Request sent to the host!"
      );
      navigate(`/bookings/${data.booking._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create booking request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card sticky top-24 p-5">
      <div className="flex items-end justify-between">
        <p className="text-2xl font-extrabold text-ink-900">
          {inr(listing.price)}
          <span className="text-sm font-medium text-ink-500"> / night</span>
        </p>
        {listing.avgRating > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-ink-600">
            <FaStar className="text-amber-400" size={11} />
            {listing.avgRating.toFixed(1)} · {listing.reviewCount || 0} reviews
          </span>
        )}
      </div>

      {listing.instantBook && (
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
          <FaBolt size={10} /> Instant book — no waiting for approval
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-ink-200">
          <label className="border-r border-ink-200 p-3">
            <span className="label mb-1 flex items-center gap-1">
              <FaRegCalendarAlt size={9} /> Check-in
            </span>
            <input
              type="date"
              required
              min={todayISO()}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <label className="p-3">
            <span className="label mb-1 flex items-center gap-1">
              <FaRegCalendarAlt size={9} /> Check-out
            </span>
            <input
              type="date"
              required
              min={checkIn || todayISO()}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-ink-200 px-3 py-2.5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-ink-500">Guests</p>
            <p className="text-sm text-ink-900">
              {guests} guest{guests > 1 ? "s" : ""}{" "}
              <span className="text-ink-400">· max {maxGuests}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              disabled={guests <= 1}
              className="grid h-8 w-8 place-items-center rounded-full border border-ink-200 text-ink-700 disabled:opacity-40"
              aria-label="Fewer guests"
            >
              <FaMinus size={10} />
            </button>
            <button
              type="button"
              onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
              disabled={guests >= maxGuests}
              className="grid h-8 w-8 place-items-center rounded-full border border-ink-200 text-ink-700 disabled:opacity-40"
              aria-label="More guests"
            >
              <FaPlus size={10} />
            </button>
          </div>
        </div>

        <textarea
          placeholder="Message to host (optional)"
          maxLength={500}
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="input resize-none"
        />

        {unavailable && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-600">
            These dates are already booked. Try different dates.
          </p>
        )}

        {shown && nights > 0 && (
          <div className="space-y-1.5 border-t border-ink-100 pt-3 text-sm">
            <Row
              label={`${inr(listing.price)} × ${nights} night${nights > 1 ? "s" : ""}`}
              value={inr(shown.subtotal)}
            />
            {shown.cleaningFee > 0 && <Row label="Cleaning fee" value={inr(shown.cleaningFee)} />}
            <Row label="Service fee (5%)" value={inr(shown.serviceFee)} />
            <div className="flex justify-between border-t border-ink-100 pt-2 font-bold text-ink-900">
              <span>Total</span>
              <span>{inr(shown.total)}</span>
            </div>
            {shown.securityDeposit > 0 && (
              <Row
                label="Refundable security deposit"
                value={inr(shown.securityDeposit)}
                muted
              />
            )}
          </div>
        )}

        <button
          disabled={submitting || Boolean(unavailable) || quoteLoading}
          className="btn-primary w-full py-3"
        >
          {submitting
            ? "Sending..."
            : listing.instantBook
            ? "Instant book"
            : "Request to book"}
        </button>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <FaShieldAlt size={10} /> You won't be charged yet — pay by UPI after approval.
        </p>
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-ink-400">
          <FaCheckCircle size={10} /> Free cancellation before the stay starts.
        </p>
      </form>
    </div>
  );
}

function Row({ label, value, muted }) {
  return (
    <div className={`flex justify-between ${muted ? "text-ink-400" : "text-ink-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

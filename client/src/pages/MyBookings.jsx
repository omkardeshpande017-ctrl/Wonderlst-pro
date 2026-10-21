import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FaMapMarkerAlt, FaArrowRight } from "react-icons/fa";
import api from "../api/axios.js";
import StatusBadge from "../components/StatusBadge.jsx";
import { inr, shortDate } from "../utils/format.js";
import SmartImage from "../components/SmartImage.jsx";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "upcoming", label: "Upcoming" },
  { key: "pending", label: "Awaiting action" },
  { key: "past", label: "Past" },
  { key: "cancelled", label: "Cancelled" },
];

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    api
      .get("/bookings/mine")
      .then(({ data }) => setBookings(data.bookings || []))
      .catch(() => setBookings([]))
      .finally(() => setLoading(false));
  }, []);

  const counts = useMemo(() => {
    const today = new Date();
    return {
      all: bookings.length,
      upcoming: bookings.filter(
        (b) => ["approved", "payment_submitted", "confirmed"].includes(b.status) && new Date(b.checkIn) >= today
      ).length,
      pending: bookings.filter((b) => ["pending", "approved", "payment_submitted"].includes(b.status)).length,
      past: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => ["cancelled", "rejected", "expired"].includes(b.status)).length,
    };
  }, [bookings]);

  const visible = useMemo(() => {
    const today = new Date();
    if (filter === "all") return bookings;
    if (filter === "upcoming")
      return bookings.filter(
        (b) => ["approved", "payment_submitted", "confirmed"].includes(b.status) && new Date(b.checkIn) >= today
      );
    if (filter === "pending")
      return bookings.filter((b) => ["pending", "approved", "payment_submitted"].includes(b.status));
    if (filter === "past") return bookings.filter((b) => b.status === "completed");
    return bookings.filter((b) => ["cancelled", "rejected", "expired"].includes(b.status));
  }, [bookings, filter]);

  return (
    <div className="container-page py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">My trips</h1>
          <p className="muted mt-1 text-sm">
            {loading ? "Loading..." : `${bookings.length} booking${bookings.length === 1 ? "" : "s"} total`}
          </p>
        </div>
        <Link to="/" className="btn-ghost">
          Find another stay
        </Link>
      </div>

      <div className="mt-6 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`chip shrink-0 ${filter === f.key ? "chip-active" : ""}`}
          >
            {f.label}
            {counts[f.key] > 0 && (
              <span className={`ml-1 rounded-full px-1.5 text-[10px] ${filter === f.key ? "bg-white/20" : "bg-ink-100"}`}>
                {counts[f.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-2xl" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-ink-200 py-20 text-center">
          <p className="text-4xl">🧳</p>
          <p className="mt-3 font-semibold text-ink-900">
            {bookings.length === 0 ? "You haven't booked any stays yet" : "Nothing in this filter"}
          </p>
          <p className="muted mt-1 text-sm">
            {bookings.length === 0
              ? "Request a stay and the host will approve it within a day."
              : "Try another filter to see your other trips."}
          </p>
          <Link to="/" className="btn-primary mt-5">
            Browse stays
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {visible.map((b) => (
            <Link
              key={b._id}
              to={`/bookings/${b._id}`}
              className="card flex flex-col gap-4 p-4 transition hover:shadow-lift sm:flex-row sm:items-center"
            >
              <SmartImage
                src={b.listing?.image?.url}
                alt={b.listing?.title}
                wrapperClassName="h-40 w-full shrink-0 rounded-xl sm:h-24 sm:w-32"
                className="h-full w-full object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate font-bold text-ink-900">{b.listing?.title}</p>
                  <StatusBadge status={b.status} />
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-400">
                  <FaMapMarkerAlt size={9} />
                  {b.listing?.location}, {b.listing?.country} · {b.code}
                </p>
                <p className="mt-1.5 text-sm text-ink-600">
                  {shortDate(b.checkIn)} → {shortDate(b.checkOut)} · {b.nights} night
                  {b.nights > 1 ? "s" : ""} · {b.guests} guest{b.guests > 1 ? "s" : ""}
                </p>
              </div>
              <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
                <p className="font-extrabold text-ink-900">{inr(b.totalPrice)}</p>
                <span className="flex items-center gap-1 text-xs font-semibold text-brand-500">
                  View <FaArrowRight size={9} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

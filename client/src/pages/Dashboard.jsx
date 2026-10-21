import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FaHome,
  FaClock,
  FaMoneyBillWave,
  FaCheckCircle,
  FaQrcode,
  FaPlus,
  FaArrowRight,
  FaBed,
} from "react-icons/fa";
import api from "../api/axios.js";
import ListingCard from "../components/ListingCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { inr, shortDate } from "../utils/format.js";
import SmartImage from "../components/SmartImage.jsx";

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Awaiting payment" },
  { key: "payment_submitted", label: "To verify" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "bookings", label: "Bookings" },
  { key: "listings", label: "Listings" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get("tab") || "overview";
  const statusFilter = searchParams.get("status") || "";

  const [stats, setStats] = useState(null);
  const [monthly, setMonthly] = useState([]);
  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingsLoading, setBookingsLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get("/bookings/owner/stats"), api.get("/listings/mine")])
      .then(([s, l]) => {
        setStats(s.data.stats);
        setMonthly(s.data.monthly || []);
        setListings(l.data.listings || []);
      })
      .catch(() => toast.error("Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab !== "bookings") return;
    setBookingsLoading(true);
    api
      .get("/bookings/owner", { params: statusFilter ? { status: statusFilter } : {} })
      .then(({ data }) => setBookings(data.bookings || []))
      .catch(() => toast.error("Could not load bookings"))
      .finally(() => setBookingsLoading(false));
  }, [tab, statusFilter]);

  const setTab = (t) => setSearchParams(t === "overview" ? {} : { tab: t });
  const setStatus = (s) => setSearchParams({ tab: "bookings", ...(s ? { status: s } : {}) });

  const maxMonthly = useMemo(
    () => Math.max(1, ...monthly.map((m) => m.total || 0)),
    [monthly]
  );

  const needsPaymentSetup = !user?.payment?.upiId && !user?.payment?.qrCode?.url;
  const needsAttention =
    (stats?.pendingRequests || 0) + (stats?.awaitingVerification || 0);

  return (
    <div className="container-page py-10">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Owner dashboard</h1>
          <p className="muted mt-1 text-sm">
            Welcome back, {user?.username}. {needsAttention > 0
              ? `${needsAttention} booking${needsAttention > 1 ? "s" : ""} need your attention.`
              : "You're all caught up."}
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/payment-settings" className="btn-ghost">
            <FaQrcode size={11} /> Payment settings
          </Link>
          <Link to="/listings/new" className="btn-primary">
            <FaPlus size={11} /> Add listing
          </Link>
        </div>
      </div>

      {needsPaymentSetup && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>
            Add your UPI ID or QR code so guests can pay you — required before you approve bookings.
          </span>
          <Link to="/payment-settings" className="btn-dark py-2 text-xs">
            Set up payments
          </Link>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-ink-100">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
              tab === t.key
                ? "border-ink-900 text-ink-900"
                : "border-transparent text-ink-400 hover:text-ink-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "overview" &&
        (loading || !stats ? (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard label="Total earnings" value={inr(stats.earnings)} icon={<FaMoneyBillWave />} highlight />
              <StatCard label="Listings" value={stats.listings} icon={<FaHome />} />
              <StatCard label="Pending requests" value={stats.pendingRequests} icon={<FaClock />} />
              <StatCard label="Awaiting payment" value={stats.awaitingPayment} icon={<FaClock />} />
              <StatCard label="To verify" value={stats.awaitingVerification} icon={<FaClock />} />
              <StatCard label="Confirmed" value={stats.confirmed} icon={<FaCheckCircle />} />
              <StatCard label="Completed stays" value={stats.completed} icon={<FaCheckCircle />} />
              <StatCard label="Upcoming stays" value={stats.upcomingStays} icon={<FaBed />} />
            </div>

            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div className="card p-5 lg:col-span-2">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-ink-900">Earnings — last 6 months</h2>
                  <span className="text-xs text-ink-400">confirmed + completed</span>
                </div>
                <div className="mt-6 flex h-44 items-end gap-3">
                  {monthly.map((m) => (
                    <div key={m.key || m.month} className="flex flex-1 flex-col items-center gap-2">
                      <span className="text-[10px] font-semibold text-ink-500">
                        {m.total ? inr(m.total).replace("₹", "") : ""}
                      </span>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-brand-500 to-brand-400 transition-all"
                        style={{ height: `${Math.max(4, (m.total / maxMonthly) * 100)}%` }}
                        title={inr(m.total)}
                      />
                      <span className="text-[11px] text-ink-400">{m.label || m.month}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card flex flex-col justify-between p-5">
                <div>
                  <h2 className="font-bold text-ink-900">Next actions</h2>
                  <ul className="mt-3 space-y-2 text-sm text-ink-600">
                    <li className="flex items-center justify-between">
                      <span>Approve requests</span>
                      <span className="font-bold text-ink-900">{stats.pendingRequests}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Verify payments</span>
                      <span className="font-bold text-ink-900">{stats.awaitingVerification}</span>
                    </li>
                    <li className="flex items-center justify-between">
                      <span>Awaiting guest payment</span>
                      <span className="font-bold text-ink-900">{stats.awaitingPayment}</span>
                    </li>
                  </ul>
                </div>
                <button onClick={() => setTab("bookings")} className="btn-dark mt-5 w-full">
                  Open bookings <FaArrowRight size={10} />
                </button>
              </div>
            </div>
          </>
        ))}

      {/* Bookings */}
      {tab === "bookings" && (
        <div className="mt-6">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`chip shrink-0 ${statusFilter === f.key ? "chip-active" : ""}`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {bookingsLoading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-2xl" />
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="mt-6 rounded-3xl border border-dashed border-ink-200 py-16 text-center">
              <p className="font-semibold text-ink-900">No bookings in this filter</p>
              <p className="muted mt-1 text-sm">New requests will appear here instantly.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {bookings.map((b) => (
                <Link
                  key={b._id}
                  to={`/bookings/${b._id}`}
                  className="card flex items-center gap-4 p-4 transition hover:shadow-lift"
                >
                  <SmartImage
                    src={b.listing?.image?.url}
                    alt={b.listing?.title}
                    category={b.listing?.category}
                    wrapperClassName="h-20 w-24 shrink-0 rounded-xl"
                    className="h-full w-full object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-bold text-ink-900">{b.listing?.title}</p>
                      <StatusBadge status={b.status} />
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      {b.guest?.username} · {shortDate(b.checkIn)} → {shortDate(b.checkOut)} ·{" "}
                      {b.nights} night{b.nights > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-ink-400">{b.code}</p>
                  </div>
                  <p className="shrink-0 font-extrabold text-ink-900">{inr(b.totalPrice)}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Listings */}
      {tab === "listings" &&
        (loading ? (
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i}>
                <div className="skeleton aspect-[4/3] rounded-2xl" />
                <div className="skeleton mt-3 h-3.5 w-2/3 rounded" />
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-ink-200 py-16 text-center">
            <p className="font-semibold text-ink-900">You haven't listed any stays yet</p>
            <Link to="/listings/new" className="btn-primary mt-5">
              Add your first listing
            </Link>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {listings.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        ))}
    </div>
  );
}

function StatCard({ icon, label, value, highlight }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        highlight ? "border-brand-200 bg-brand-50" : "border-ink-100 bg-white"
      }`}
    >
      <span className={`text-sm ${highlight ? "text-brand-500" : "text-ink-400"}`}>{icon}</span>
      <p className={`mt-2 text-xl font-extrabold ${highlight ? "text-brand-700" : "text-ink-900"}`}>
        {value}
      </p>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">{label}</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaHome, FaClock, FaMoneyBillWave, FaCheckCircle, FaQrcode } from "react-icons/fa";
import api from "../api/axios.js";
import ListingCard from "../components/ListingCard.jsx";
import StatusBadge from "../components/StatusBadge.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const STATUS_FILTERS = [
  { key: "", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Awaiting payment" },
  { key: "payment_submitted", label: "To verify" },
  { key: "confirmed", label: "Confirmed" },
  { key: "completed", label: "Completed" },
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

  const loadOverview = async () => {
    const { data } = await api.get("/bookings/owner/stats");
    setStats(data.stats);
    setMonthly(data.monthly);
  };

  const loadListings = async () => {
    const { data } = await api.get("/listings/mine");
    setListings(data.listings);
  };

  const loadBookings = async () => {
    const { data } = await api.get("/bookings/owner", {
      params: statusFilter ? { status: statusFilter } : {},
    });
    setBookings(data.bookings);
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([loadOverview(), loadListings()])
      .catch(() => toast.error("Could not load dashboard"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "bookings") loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, statusFilter]);

  const setTab = (t) => setSearchParams(t === "overview" ? {} : { tab: t });
  const setStatus = (s) => setSearchParams({ tab: "bookings", ...(s ? { status: s } : {}) });

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.total));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">Owner dashboard</h1>
        <Link
          to="/payment-settings"
          className="flex items-center gap-2 text-sm font-medium border border-gray-300 px-3 py-1.5 rounded-full hover:bg-gray-50"
        >
          <FaQrcode /> Payment settings
        </Link>
      </div>

      {!user.payment?.upiId && !user.payment?.qrCode?.url && (
        <div className="bg-yellow-50 text-yellow-800 text-sm rounded-lg px-4 py-3 mb-6">
          Add your UPI ID or QR code in{" "}
          <Link to="/payment-settings" className="font-semibold underline">
            Payment settings
          </Link>{" "}
          before you can approve bookings.
        </div>
      )}

      <div className="flex gap-6 border-b border-gray-200 mb-6 text-sm font-medium">
        {["overview", "listings", "bookings"].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`pb-3 border-b-2 capitalize transition ${
              tab === t ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "overview" &&
        (loading || !stats ? (
          <p className="text-gray-400">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<FaHome />} label="Listings" value={stats.listings} />
              <StatCard icon={<FaClock />} label="Pending requests" value={stats.pendingRequests} />
              <StatCard icon={<FaClock />} label="Awaiting payment" value={stats.awaitingPayment} />
              <StatCard icon={<FaClock />} label="To verify" value={stats.awaitingVerification} />
              <StatCard icon={<FaCheckCircle />} label="Confirmed" value={stats.confirmed} />
              <StatCard icon={<FaCheckCircle />} label="Completed stays" value={stats.completed} />
              <StatCard
                icon={<FaMoneyBillWave />}
                label="Total earnings"
                value={`\u20b9${stats.earnings.toLocaleString("en-IN")}`}
              />
              <StatCard icon={<FaHome />} label="Upcoming stays" value={stats.upcomingStays} />
            </div>

            <div className="border border-gray-200 rounded-xl p-5">
              <h2 className="font-semibold mb-4">Earnings — last 6 months</h2>
              <div className="flex items-end gap-3 h-40">
                {monthly.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-brand-500 rounded-t-md min-h-[4px]"
                      style={{ height: `${(m.total / maxMonthly) * 100}%` }}
                      title={`\u20b9${m.total.toLocaleString("en-IN")}`}
                    />
                    <span className="text-[11px] text-gray-400">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ))}

      {tab === "listings" &&
        (listings.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 mb-4">You haven't listed any stays yet.</p>
            <Link to="/listings/new" className="text-brand-500 font-medium">
              Add your first listing
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-8">
            {listings.map((l) => (
              <ListingCard key={l._id} listing={l} />
            ))}
          </div>
        ))}

      {tab === "bookings" && (
        <div>
          <div className="flex gap-2 overflow-x-auto pb-4 mb-2">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setStatus(f.key)}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border ${
                  statusFilter === f.key
                    ? "bg-gray-900 text-white border-gray-900"
                    : "border-gray-300 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {bookings.length === 0 ? (
            <p className="text-gray-400 text-center py-16">No bookings in this filter.</p>
          ) : (
            <div className="space-y-3">
              {bookings.map((b) => (
                <Link
                  key={b._id}
                  to={`/bookings/${b._id}`}
                  className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
                >
                  <img src={b.listing?.image?.url} alt="" className="w-16 h-16 object-cover rounded-lg shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{b.listing?.title}</p>
                    <p className="text-sm text-gray-500">
                      {b.guest?.username} &middot; {fmtDate(b.checkIn)} &rarr; {fmtDate(b.checkOut)}
                    </p>
                    <p className="text-sm font-medium mt-1">&#8377;{b.totalPrice.toLocaleString("en-IN")}</p>
                  </div>
                  <StatusBadge status={b.status} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon, label, value }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4">
      <div className="text-brand-500 mb-2">{icon}</div>
      <p className="text-xl font-bold">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/axios.js";
import StatusBadge from "../components/StatusBadge.jsx";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/bookings/mine")
      .then(({ data }) => setBookings(data.bookings))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-6">My trips</h1>

      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 mb-4">You haven't booked any stays yet.</p>
          <Link to="/" className="text-brand-500 font-medium">
            Browse listings
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.map((b) => (
            <Link
              key={b._id}
              to={`/bookings/${b._id}`}
              className="flex items-center gap-4 border border-gray-200 rounded-xl p-4 hover:shadow-md transition"
            >
              <img
                src={b.listing?.image?.url}
                alt=""
                className="w-20 h-20 object-cover rounded-lg shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{b.listing?.title}</p>
                <p className="text-sm text-gray-500">
                  {fmtDate(b.checkIn)} &rarr; {fmtDate(b.checkOut)} &middot; {b.nights} night
                  {b.nights > 1 ? "s" : ""}
                </p>
                <p className="text-sm font-medium mt-1">&#8377;{b.totalPrice.toLocaleString("en-IN")}</p>
              </div>
              <StatusBadge status={b.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

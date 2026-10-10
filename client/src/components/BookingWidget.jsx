import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

const toISO = (d) => d.toISOString().slice(0, 10);
const today = toISO(new Date());

export default function BookingWidget({ listing }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [booked, setBooked] = useState([]);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(1);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get(`/bookings/availability/${listing._id}`).then(({ data }) => setBooked(data.booked));
  }, [listing._id]);

  const nights =
    checkIn && checkOut ? Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) : 0;
  const total = nights > 0 ? nights * listing.price : 0;

  const rangesOverlap = () => {
    if (!checkIn || !checkOut) return false;
    const ci = new Date(checkIn);
    const co = new Date(checkOut);
    return booked.some((b) => ci < new Date(b.checkOut) && co > new Date(b.checkIn));
  };

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
    if (rangesOverlap()) return toast.error("Those dates overlap an existing booking");

    setSubmitting(true);
    try {
      const { data } = await api.post("/bookings", {
        listingId: listing._id,
        checkIn,
        checkOut,
        guests,
        message,
      });
      toast.success("Booking request sent to the host!");
      navigate(`/bookings/${data.booking._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not create booking request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border border-gray-200 rounded-2xl p-5 shadow-sm">
      <p className="text-xl font-bold">
        &#8377;{listing.price.toLocaleString("en-IN")}{" "}
        <span className="text-sm font-normal text-gray-500">/ night</span>
      </p>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div className="grid grid-cols-2 gap-2 border border-gray-300 rounded-lg overflow-hidden">
          <div className="p-2 border-r border-gray-300">
            <label className="block text-[10px] font-bold uppercase text-gray-500">Check-in</label>
            <input
              type="date"
              required
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="w-full text-sm outline-none"
            />
          </div>
          <div className="p-2">
            <label className="block text-[10px] font-bold uppercase text-gray-500">Check-out</label>
            <input
              type="date"
              required
              min={checkIn || today}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="w-full text-sm outline-none"
            />
          </div>
        </div>

        <div className="border border-gray-300 rounded-lg p-2">
          <label className="block text-[10px] font-bold uppercase text-gray-500">Guests</label>
          <input
            type="number"
            min={1}
            max={20}
            value={guests}
            onChange={(e) => setGuests(Number(e.target.value))}
            className="w-full text-sm outline-none"
          />
        </div>

        <textarea
          placeholder="Message to host (optional)"
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={2}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
        />

        {rangesOverlap() && (
          <p className="text-xs text-red-500">Those dates overlap an existing booking.</p>
        )}

        {nights > 0 && (
          <div className="text-sm space-y-1 border-t border-gray-200 pt-3">
            <div className="flex justify-between text-gray-500">
              <span>
                &#8377;{listing.price.toLocaleString("en-IN")} x {nights} night{nights > 1 ? "s" : ""}
              </span>
              <span>&#8377;{total.toLocaleString("en-IN")}</span>
            </div>
            <div className="flex justify-between font-semibold pt-1 border-t border-gray-100">
              <span>Total</span>
              <span>&#8377;{total.toLocaleString("en-IN")}</span>
            </div>
          </div>
        )}

        <button
          disabled={submitting}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {submitting ? "Sending request..." : "Request to book"}
        </button>
        <p className="text-xs text-center text-gray-400">
          You won't be charged yet — the host must approve first, then you pay by UPI/QR.
        </p>
      </form>
    </div>
  );
}

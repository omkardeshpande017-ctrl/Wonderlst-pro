import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { FaMapMarkerAlt, FaCopy, FaQrcode } from "react-icons/fa";
import api from "../api/axios.js";
import StatusBadge from "../components/StatusBadge.jsx";

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BookingDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [txnId, setTxnId] = useState("");
  const [screenshot, setScreenshot] = useState(null);
  const [busy, setBusy] = useState(false);

  const fetchBooking = async () => {
    try {
      const { data } = await api.get(`/bookings/${id}`);
      setBooking(data.booking);
    } catch (err) {
      toast.error(err.response?.data?.message || "Booking not found");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      fetchBooking();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const copyUpi = (upi) => {
    navigator.clipboard.writeText(upi);
    toast.success("UPI ID copied");
  };

  const handleSubmitPayment = async (e) => {
    e.preventDefault();
    if (txnId.trim().length < 6) return toast.error("Enter the transaction / UTR number");
    const fd = new FormData();
    fd.append("transactionId", txnId.trim());
    if (screenshot) fd.append("screenshot", screenshot);
    await run(
      () => api.put(`/bookings/${id}/payment`, fd, { headers: { "Content-Type": "multipart/form-data" } }),
      "Payment submitted — waiting for the host to verify"
    );
    setTxnId("");
    setScreenshot(null);
  };

  if (loading || !booking) return <div className="text-center py-24 text-gray-400">Loading...</div>;

  const isOwner = booking.viewerRole === "owner";
  const canCancel = ["pending", "approved", "payment_submitted", "confirmed"].includes(booking.status);
  const canPay = !isOwner && booking.status === "approved";
  const canVerify = isOwner && booking.status === "payment_submitted";

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link
        to={isOwner ? "/dashboard?tab=bookings" : "/bookings"}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        &larr; Back to bookings
      </Link>

      <div className="flex items-start justify-between gap-4 mt-4">
        <div>
          <h1 className="text-xl font-bold">{booking.listing?.title}</h1>
          <p className="text-gray-500 text-sm flex items-center gap-1 mt-1">
            <FaMapMarkerAlt /> {booking.listing?.location}, {booking.listing?.country}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="grid grid-cols-2 gap-4 mt-6 text-sm border border-gray-200 rounded-xl p-4">
        <div>
          <p className="text-gray-400">Check-in</p>
          <p className="font-semibold">{fmtDate(booking.checkIn)}</p>
        </div>
        <div>
          <p className="text-gray-400">Check-out</p>
          <p className="font-semibold">{fmtDate(booking.checkOut)}</p>
        </div>
        <div>
          <p className="text-gray-400">Guests</p>
          <p className="font-semibold">{booking.guests}</p>
        </div>
        <div>
          <p className="text-gray-400">Nights</p>
          <p className="font-semibold">{booking.nights}</p>
        </div>
        <div>
          <p className="text-gray-400">Booking code</p>
          <p className="font-semibold">{booking.code}</p>
        </div>
        <div>
          <p className="text-gray-400">Total</p>
          <p className="font-semibold">&#8377;{booking.totalPrice.toLocaleString("en-IN")}</p>
        </div>
      </div>

      <div className="mt-4 text-sm border border-gray-200 rounded-xl p-4">
        <p className="text-gray-400 mb-1">{isOwner ? "Guest" : "Host"}</p>
        <p className="font-semibold">{isOwner ? booking.guest?.username : booking.owner?.username}</p>
        {(isOwner ? booking.guest?.phone : booking.owner?.phone) && (
          <p className="text-gray-500">{isOwner ? booking.guest.phone : booking.owner.phone}</p>
        )}
        {booking.message && (
          <p className="text-gray-500 mt-2 italic">&ldquo;{booking.message}&rdquo;</p>
        )}
      </div>

      {booking.decisionReason && ["rejected", "cancelled"].includes(booking.status) && (
        <div className="mt-4 text-sm bg-red-50 text-red-600 rounded-xl p-4">
          {booking.status === "cancelled" ? "Cancellation note" : "Reason"}: {booking.decisionReason}
        </div>
      )}

      {/* Owner: approve / reject pending request */}
      {isOwner && booking.status === "pending" && (
        <div className="mt-6 flex gap-3">
          <button
            disabled={busy}
            onClick={() => run(() => api.put(`/bookings/${id}/approve`), "Booking approved")}
            className="flex-1 bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg"
          >
            Approve
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(
                () => api.put(`/bookings/${id}/reject`, { reason: "Not available for these dates" }),
                "Booking declined"
              )
            }
            className="flex-1 border border-red-400 text-red-500 hover:bg-red-50 disabled:opacity-60 font-semibold py-2.5 rounded-lg"
          >
            Decline
          </button>
        </div>
      )}

      {/* Guest: pay via host's UPI/QR */}
      {canPay && (
        <div className="mt-6 border border-brand-200 bg-brand-50/40 rounded-xl p-5">
          <h2 className="font-bold flex items-center gap-2 mb-3">
            <FaQrcode /> Pay &#8377;{booking.totalPrice.toLocaleString("en-IN")} to confirm
          </h2>
          {booking.ownerPayment?.qrCode?.url ? (
            <img
              src={booking.ownerPayment.qrCode.url}
              alt="Payment QR code"
              className="w-48 h-48 object-contain mx-auto bg-white rounded-lg border border-gray-200"
            />
          ) : (
            <p className="text-sm text-gray-500">The host hasn't uploaded a QR code — use the UPI ID below.</p>
          )}
          {booking.ownerPayment?.upiId && (
            <div className="mt-3 flex items-center justify-center gap-2 text-sm">
              <span className="font-mono bg-white border border-gray-300 rounded-lg px-3 py-1.5">
                {booking.ownerPayment.upiId}
              </span>
              <button
                onClick={() => copyUpi(booking.ownerPayment.upiId)}
                className="text-gray-500 hover:text-gray-800"
                aria-label="Copy UPI ID"
              >
                <FaCopy />
              </button>
            </div>
          )}
          {booking.ownerPayment?.payeeName && (
            <p className="text-center text-xs text-gray-400 mt-1">
              Payee: {booking.ownerPayment.payeeName}
            </p>
          )}

          <form onSubmit={handleSubmitPayment} className="mt-5 space-y-3">
            <div>
              <label className="text-sm font-medium">UPI transaction / UTR number</label>
              <input
                required
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="e.g. 412345678901"
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Payment screenshot (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setScreenshot(e.target.files[0])}
                className="mt-1 block text-sm"
              />
            </div>
            <button
              disabled={busy}
              className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg"
            >
              {busy ? "Submitting..." : "I've paid — submit for verification"}
            </button>
          </form>
        </div>
      )}

      {/* Guest: waiting after submission */}
      {!isOwner && booking.status === "payment_submitted" && (
        <div className="mt-6 bg-purple-50 text-purple-700 text-sm rounded-xl p-4">
          Payment submitted (txn: {booking.payment?.transactionId}). Waiting for the host to verify it.
        </div>
      )}

      {/* Owner: verify submitted payment */}
      {canVerify && (
        <div className="mt-6 border border-purple-200 bg-purple-50/40 rounded-xl p-5">
          <h2 className="font-bold mb-3">Verify payment</h2>
          <p className="text-sm">
            Transaction ID: <span className="font-mono">{booking.payment?.transactionId}</span>
          </p>
          {booking.payment?.screenshot?.url && (
            <img
              src={booking.payment.screenshot.url}
              alt="Payment screenshot"
              className="mt-3 max-h-72 rounded-lg border border-gray-200"
            />
          )}
          <p className="text-xs text-gray-500 mt-3">
            Check your UPI app / bank statement for &#8377;{booking.totalPrice.toLocaleString("en-IN")} from this transaction ID before confirming.
          </p>
          <div className="flex gap-3 mt-4">
            <button
              disabled={busy}
              onClick={() => run(() => api.put(`/bookings/${id}/payment/verify`), "Payment verified — booking confirmed")}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg"
            >
              Confirm payment received
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () => api.put(`/bookings/${id}/payment/reject`, { reason: "Payment not received yet" }),
                  "Marked as not received"
                )
              }
              className="flex-1 border border-red-400 text-red-500 hover:bg-red-50 disabled:opacity-60 font-semibold py-2.5 rounded-lg"
            >
              Not received
            </button>
          </div>
        </div>
      )}

      {/* Confirmed / completed summary */}
      {["confirmed", "completed"].includes(booking.status) && (
        <div className="mt-6 bg-green-50 text-green-700 text-sm rounded-xl p-4">
          Payment verified{booking.payment?.transactionId ? ` (txn: ${booking.payment.transactionId})` : ""}.
          {booking.status === "confirmed" ? " Your stay is confirmed." : " This stay is complete."}
        </div>
      )}

      {canCancel && (
        <button
          disabled={busy}
          onClick={() => {
            if (!window.confirm("Cancel this booking?")) return;
            run(() => api.put(`/bookings/${id}/cancel`, { reason: "Cancelled by user" }), "Booking cancelled");
          }}
          className="mt-6 text-sm text-red-500 hover:underline"
        >
          Cancel this booking
        </button>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaPrint, FaCheckCircle } from "react-icons/fa";
import api from "../api/axios.js";
import { inr, longDate, shortDate } from "../utils/format.js";

export default function Invoice() {
  const { id } = useParams();
  const [invoice, setInvoice] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/bookings/${id}/invoice`)
      .then(({ data }) => setInvoice(data.invoice))
      .catch((err) => setError(err.response?.data?.message || "Could not load invoice"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="container-page py-12">
        <div className="skeleton mx-auto h-96 w-full max-w-3xl rounded-3xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-page py-20 text-center">
        <p className="text-4xl">🧾</p>
        <p className="mt-3 font-semibold text-ink-900">{error}</p>
        <Link to={`/bookings/${id}`} className="btn-ghost mt-6">
          Back to booking
        </Link>
      </div>
    );
  }

  const lineTotal = invoice.lines.reduce((s, l) => s + l.amount, 0);

  return (
    <div className="container-page py-10">
      <div className="mx-auto max-w-3xl">
        <div className="no-print mb-6 flex items-center justify-between">
          <Link to={`/bookings/${id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-ink-600 hover:text-ink-900">
            <FaArrowLeft size={11} /> Back to booking
          </Link>
          <button onClick={() => window.print()} className="btn-dark">
            <FaPrint size={11} /> Print / Save PDF
          </button>
        </div>

        <div className="print-sheet card overflow-hidden">
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 bg-sand px-7 py-6">
            <div>
              <p className="font-display text-2xl text-ink-900">
                Wander<span className="text-brand-500">lust</span>
              </p>
              <p className="mt-1 text-xs text-ink-500">
                Stays across India · hello@wanderlust.example
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs font-bold uppercase tracking-wider text-ink-400">Invoice</p>
              <p className="text-lg font-extrabold text-ink-900">{invoice.number}</p>
              <p className="text-xs text-ink-500">Booking {invoice.bookingCode}</p>
            </div>
          </div>

          {/* Meta */}
          <div className="grid gap-6 px-7 py-6 sm:grid-cols-3">
            <Block title="Billed to">
              <p className="font-semibold text-ink-900">{invoice.guest.username}</p>
              <p>{invoice.guest.email}</p>
              {invoice.guest.phone && <p>{invoice.guest.phone}</p>}
            </Block>
            <Block title="Hosted by">
              <p className="font-semibold text-ink-900">{invoice.host.username}</p>
              <p>{invoice.host.email}</p>
              {invoice.host.phone && <p>{invoice.host.phone}</p>}
            </Block>
            <Block title="Stay">
              <p className="font-semibold text-ink-900">{invoice.listing.title}</p>
              <p>
                {invoice.listing.location}, {invoice.listing.country}
              </p>
              <p className="mt-1">
                {longDate(invoice.checkIn)} → {longDate(invoice.checkOut)}
              </p>
              <p>
                {invoice.nights} night{invoice.nights > 1 ? "s" : ""} · {invoice.guests} guest
                {invoice.guests > 1 ? "s" : ""}
              </p>
            </Block>
          </div>

          {/* Lines */}
          <div className="px-7">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-xs uppercase tracking-wide text-ink-400">
                  <th className="py-2 font-semibold">Description</th>
                  <th className="py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoice.lines.map((line, i) => (
                  <tr key={i} className="border-b border-ink-50">
                    <td className="py-2.5 text-ink-700">{line.label}</td>
                    <td className="py-2.5 text-right text-ink-900">{inr(line.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="ml-auto mt-4 w-full max-w-xs space-y-1.5 text-sm">
              <div className="flex justify-between text-ink-500">
                <span>Subtotal</span>
                <span>{inr(lineTotal)}</span>
              </div>
              {invoice.securityDeposit > 0 && (
                <div className="flex justify-between text-ink-500">
                  <span>Refundable deposit</span>
                  <span>{inr(invoice.securityDeposit)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-100 pt-2 text-base font-extrabold text-ink-900">
                <span>Total paid</span>
                <span>{inr(invoice.total)}</span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 bg-sand px-7 py-5 text-xs text-ink-500">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-emerald-600">
                <FaCheckCircle size={11} /> Payment verified by the host
              </p>
              {invoice.transactionId && <p className="mt-1">UPI transaction ID: {invoice.transactionId}</p>}
              {invoice.paidAt && <p>Paid on {shortDate(invoice.paidAt)}</p>}
            </div>
            <p className="max-w-xs text-right">
              This is a computer-generated invoice. The security deposit is refundable after check-out
              subject to the host's inspection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-ink-400">{title}</p>
      <div className="mt-1.5 space-y-0.5 text-sm text-ink-600">{children}</div>
    </div>
  );
}

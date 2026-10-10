import { useState } from "react";
import toast from "react-hot-toast";
import { FaQrcode, FaTrash } from "react-icons/fa";
import api from "../api/axios.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function PaymentSettings() {
  const { user, refreshUser } = useAuth();
  const [upiId, setUpiId] = useState(user.payment?.upiId || "");
  const [payeeName, setPayeeName] = useState(user.payment?.payeeName || "");
  const [qrFile, setQrFile] = useState(null);
  const [preview, setPreview] = useState(user.payment?.qrCode?.url || null);
  const [saving, setSaving] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setQrFile(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleRemoveQr = () => {
    setQrFile(null);
    setPreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("upiId", upiId);
      fd.append("payeeName", payeeName);
      if (qrFile) fd.append("qr", qrFile);
      if (!preview && user.payment?.qrCode?.url) fd.append("removeQr", "true");

      await api.put("/users/me/payment", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      await refreshUser();
      toast.success("Payment settings saved");
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not save payment settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
        <FaQrcode /> Payment settings
      </h1>
      <p className="text-gray-500 text-sm mb-6">
        Guests see this UPI ID / QR code after you approve their booking, so they can pay you directly.
        You must set this up before approving any bookings.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">UPI ID</label>
          <input
            placeholder="yourname@okbank"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Payee name (shown to guests)</label>
          <input
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium">QR code image</label>
          <input type="file" accept="image/*" onChange={handleFile} className="mt-1 block text-sm" />
          {preview && (
            <div className="mt-3 relative w-40">
              <img src={preview} alt="QR preview" className="w-40 h-40 object-contain border border-gray-200 rounded-lg bg-white" />
              <button
                type="button"
                onClick={handleRemoveQr}
                className="absolute -top-2 -right-2 bg-white border border-gray-300 rounded-full w-7 h-7 flex items-center justify-center text-red-500"
                aria-label="Remove QR code"
              >
                <FaTrash size={12} />
              </button>
            </div>
          )}
        </div>
        <button
          disabled={saving}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {saving ? "Saving..." : "Save payment settings"}
        </button>
      </form>
    </div>
  );
}

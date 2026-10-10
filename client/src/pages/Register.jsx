import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUser, FaHome } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("guest");
  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password, role, form.phone);
      toast.success("Account created!");
      navigate(role === "owner" ? "/dashboard" : "/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-1">Create your account</h1>
      <p className="text-gray-500 text-sm mb-6">Choose how you'll use Wanderlust.</p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <button
          type="button"
          onClick={() => setRole("guest")}
          className={`flex flex-col items-center gap-2 border rounded-xl py-4 transition ${
            role === "guest" ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-300 text-gray-500"
          }`}
        >
          <FaUser size={20} />
          <span className="text-sm font-semibold">Guest</span>
          <span className="text-[11px] text-gray-400 px-2 text-center">Book stays</span>
        </button>
        <button
          type="button"
          onClick={() => setRole("owner")}
          className={`flex flex-col items-center gap-2 border rounded-xl py-4 transition ${
            role === "owner" ? "border-brand-500 bg-brand-50 text-brand-600" : "border-gray-300 text-gray-500"
          }`}
        >
          <FaHome size={20} />
          <span className="text-sm font-semibold">Owner / Host</span>
          <span className="text-[11px] text-gray-400 px-2 text-center">List & manage stays</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium">Username</label>
          <input
            required
            minLength={3}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Phone (optional)</label>
          <input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          disabled={submitting}
          className="w-full bg-brand-500 hover:bg-brand-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition"
        >
          {submitting ? "Creating account..." : `Sign up as ${role === "owner" ? "an owner" : "a guest"}`}
        </button>
      </form>
      <p className="text-sm text-gray-500 mt-4">
        Already have an account?{" "}
        <Link to="/login" className="text-brand-500 font-medium">
          Log in
        </Link>
      </p>
    </div>
  );
}

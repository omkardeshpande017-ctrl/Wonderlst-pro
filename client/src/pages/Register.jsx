import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { FaUser, FaHome, FaCheck } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

const BENEFITS = {
  guest: [
    "Request dates and the host approves first",
    "Pay securely over UPI — no card needed",
    "Instant invoice for every confirmed stay",
  ],
  owner: [
    "List unlimited stays, set your own prices",
    "Approve or decline every request yourself",
    "Get paid straight to your UPI ID or QR",
  ],
};

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState(searchParams.get("role") === "owner" ? "owner" : "guest");
  const [form, setForm] = useState({ username: "", email: "", password: "", phone: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await register(form.username, form.email, form.password, role, form.phone);
      toast.success("Account created — welcome aboard!");
      navigate(role === "owner" ? "/dashboard" : "/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container-page grid min-h-[70vh] items-start gap-12 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <h2 className="font-display text-4xl leading-tight text-ink-900">
          {role === "owner" ? "Host your place, on your terms." : "Stays worth travelling for."}
        </h2>
        <p className="muted mt-3 max-w-sm text-sm leading-relaxed">
          {role === "owner"
            ? "Publish a listing in minutes, approve every guest yourself and collect payments over UPI."
            : "Handpicked villas, cabins and heritage stays — every booking approved by the host."}
        </p>
        <ul className="mt-6 space-y-2.5">
          {BENEFITS[role].map((b) => (
            <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700">
              <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <FaCheck size={9} />
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      <div className="card mx-auto w-full max-w-md p-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Create your account</h1>
        <p className="muted mt-1 text-sm">Choose how you'll use Wanderlust.</p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <RoleCard
            active={role === "guest"}
            onClick={() => setRole("guest")}
            icon={<FaUser size={16} />}
            title="Guest"
            text="Book stays"
          />
          <RoleCard
            active={role === "owner"}
            onClick={() => setRole("owner")}
            icon={<FaHome size={16} />}
            title="Owner / Host"
            text="List & manage stays"
          />
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="label">Username</label>
            <input
              required
              minLength={3}
              maxLength={30}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="yourname"
              className="input"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="input"
            />
          </div>
          <div>
            <label className="label">Phone (optional)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Used for booking coordination"
              className="input"
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 6 characters"
              className="input"
            />
          </div>

          <button disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? "Creating account..." : `Sign up as ${role === "owner" ? "a host" : "a guest"}`}
          </button>
        </form>

        <p className="muted mt-5 text-center text-sm">
          Already have an account?{" "}
          <Link to="/login" className="font-semibold text-brand-500 hover:text-brand-600">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon, title, text }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 rounded-xl border py-4 transition ${
        active
          ? "border-brand-500 bg-brand-50 text-brand-600 shadow-ring"
          : "border-ink-200 text-ink-500 hover:border-ink-900"
      }`}
    >
      {icon}
      <span className="text-sm font-bold">{title}</span>
      <span className="text-[11px] text-ink-400">{text}</span>
    </button>
  );
}

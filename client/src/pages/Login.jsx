import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FaCompass, FaLock, FaEnvelope } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";

const DEMO_ACCOUNTS = [
  { label: "Guest", email: "guest@wanderlust.com", note: "book stays" },
  { label: "Owner", email: "owner@wanderlust.com", note: "manage listings" },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.username.split("_")[0]}!`);
      navigate(location.state?.from?.pathname || (user.role === "owner" ? "/dashboard" : "/"));
    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  const fillDemo = (email) => setForm({ email, password: "password123" });

  return (
    <div className="container-page grid min-h-[70vh] items-center gap-12 py-12 lg:grid-cols-2">
      <div className="hidden lg:block">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-xl text-white">
          <FaCompass />
        </span>
        <h2 className="mt-6 font-display text-4xl leading-tight text-ink-900">
          Welcome back to Wanderlust.
        </h2>
        <p className="muted mt-3 max-w-sm text-sm leading-relaxed">
          Pick up where you left off — your trips, wishlist and hosting dashboard are all in one
          place.
        </p>
        <div className="mt-8 space-y-2">
          {DEMO_ACCOUNTS.map((a) => (
            <button
              key={a.email}
              type="button"
              onClick={() => fillDemo(a.email)}
              className="flex w-full items-center justify-between rounded-xl border border-ink-100 bg-white px-4 py-3 text-left text-sm transition hover:border-ink-900"
            >
              <span>
                <span className="font-semibold text-ink-900">Try the {a.label.toLowerCase()} demo</span>
                <span className="muted block text-xs">
                  {a.email} · {a.note}
                </span>
              </span>
              <span className="text-xs font-bold text-brand-500">Fill</span>
            </button>
          ))}
        </div>
      </div>

      <div className="card mx-auto w-full max-w-md p-7">
        <h1 className="text-2xl font-extrabold tracking-tight text-ink-900">Log in</h1>
        <p className="muted mt-1 text-sm">Use your email and password to continue.</p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="label">Email</label>
            <div className="relative">
              <FaEnvelope className="pointer-events-none absolute left-3 top-3.5 text-ink-400" size={12} />
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@example.com"
                className="input pl-9"
              />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <div className="relative">
              <FaLock className="pointer-events-none absolute left-3 top-3.5 text-ink-400" size={12} />
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                className="input pl-9"
              />
            </div>
          </div>

          <button disabled={submitting} className="btn-primary w-full py-3">
            {submitting ? "Logging in..." : "Log in"}
          </button>
        </form>

        <p className="muted mt-5 text-center text-sm">
          New here?{" "}
          <Link to="/register" className="font-semibold text-brand-500 hover:text-brand-600">
            Create an account
          </Link>
        </p>

        <div className="mt-6 rounded-xl bg-ink-50 p-3 text-xs text-ink-500 lg:hidden">
          Demo accounts (password <span className="font-semibold">password123</span>):
          <div className="mt-1.5 flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.email}
                type="button"
                onClick={() => fillDemo(a.email)}
                className="rounded-full bg-white px-3 py-1 font-semibold text-ink-700 shadow-sm"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

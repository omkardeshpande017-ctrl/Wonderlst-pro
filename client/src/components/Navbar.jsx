import { Link, NavLink, useNavigate, useSearchParams } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import {
  FaSearch,
  FaUserCircle,
  FaPlus,
  FaBars,
  FaTimes,
  FaCompass,
  FaRegHeart,
  FaSuitcase,
  FaCog,
  FaSignOutAlt,
  FaUser,
} from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

const navLink =
  "text-sm font-semibold text-ink-600 hover:text-ink-900 transition px-3 py-2 rounded-full hover:bg-ink-50";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("search") || "");
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef(null);

  const isOwner = user?.role === "owner";

  useEffect(() => {
    setQ(searchParams.get("search") || "");
  }, [searchParams]);

  // Close the account menu when clicking outside it
  useEffect(() => {
    const onClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(q ? `/?search=${encodeURIComponent(q)}` : "/");
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    setMenuOpen(false);
    setMobileOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/85 backdrop-blur-md">
      <div className="container-page flex h-16 items-center justify-between gap-3">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
            <FaCompass />
          </span>
          <span className="hidden text-lg font-extrabold tracking-tight text-ink-900 sm:inline">
            Wander<span className="text-brand-500">lust</span>
          </span>
        </Link>

        {!isOwner ? (
          <form
            onSubmit={handleSearch}
            className="hidden flex-1 max-w-lg items-center gap-2 rounded-full border border-ink-200 bg-white px-4 py-2 shadow-sm transition hover:shadow-md focus-within:border-ink-900 md:flex"
          >
            <FaSearch className="text-ink-400" size={13} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search destinations, categories, stays..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
            <button
              type="submit"
              className="rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white hover:bg-brand-600"
            >
              Search
            </button>
          </form>
        ) : (
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/dashboard" className={navLink}>
              Dashboard
            </NavLink>
            <NavLink to="/listings/new" className={navLink}>
              Add listing
            </NavLink>
            <NavLink to="/payment-settings" className={navLink}>
              Payments
            </NavLink>
          </nav>
        )}

        <div className="flex shrink-0 items-center gap-1.5">
          {user && !isOwner && (
            <Link to="/bookings" className="hidden rounded-full px-3 py-2 text-sm font-semibold text-ink-600 hover:bg-ink-50 lg:flex">
              My trips
            </Link>
          )}
          {isOwner && (
            <Link to="/listings/new" className="hidden rounded-full p-2.5 text-ink-600 hover:bg-ink-50 sm:flex">
              <FaPlus size={14} />
            </Link>
          )}

          {user && <NotificationBell />}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 rounded-full border border-ink-200 py-1.5 pl-3 pr-1.5 transition hover:shadow-md"
              aria-label="Account menu"
            >
              <span className="hidden text-xs font-semibold text-ink-700 sm:inline">
                {user ? user.username.split("_")[0] : "Menu"}
              </span>
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              ) : (
                <FaUserCircle className="text-2xl text-ink-400" />
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-60 overflow-hidden rounded-2xl border border-ink-100 bg-white py-2 text-sm shadow-lift animate-fade-in">
                {user ? (
                  <>
                    <div className="px-4 pb-2 pt-1">
                      <p className="truncate font-semibold text-ink-900">Hi, {user.username}</p>
                      <span className="badge mt-1 bg-ink-100 text-ink-600">{user.role}</span>
                    </div>
                    <div className="my-1 h-px bg-ink-100" />
                    {isOwner ? (
                      <>
                        <MenuLink to="/dashboard" icon={<FaSuitcase />} onClick={() => setMenuOpen(false)}>
                          Owner dashboard
                        </MenuLink>
                        <MenuLink to="/listings/new" icon={<FaPlus />} onClick={() => setMenuOpen(false)}>
                          Add listing
                        </MenuLink>
                        <MenuLink to="/payment-settings" icon={<FaCog />} onClick={() => setMenuOpen(false)}>
                          Payment settings
                        </MenuLink>
                      </>
                    ) : (
                      <>
                        <MenuLink to="/bookings" icon={<FaSuitcase />} onClick={() => setMenuOpen(false)}>
                          My trips
                        </MenuLink>
                        <MenuLink
                          to="/profile?tab=wishlist"
                          icon={<FaRegHeart />}
                          onClick={() => setMenuOpen(false)}
                        >
                          Wishlist
                        </MenuLink>
                      </>
                    )}
                    <MenuLink to="/profile" icon={<FaUser />} onClick={() => setMenuOpen(false)}>
                      My profile
                    </MenuLink>
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-red-600 hover:bg-red-50"
                    >
                      <FaSignOutAlt size={13} /> Log out
                    </button>
                  </>
                ) : (
                  <>
                    <MenuLink to="/login" onClick={() => setMenuOpen(false)} bold>
                      Log in
                    </MenuLink>
                    <MenuLink to="/register" onClick={() => setMenuOpen(false)}>
                      Sign up
                    </MenuLink>
                    <div className="my-1 h-px bg-ink-100" />
                    <MenuLink to="/register?role=owner" onClick={() => setMenuOpen(false)}>
                      Become a host
                    </MenuLink>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-full p-2.5 text-ink-700 hover:bg-ink-50 md:hidden"
            aria-label="Open menu"
          >
            {mobileOpen ? <FaTimes /> : <FaBars />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="border-t border-ink-100 bg-white px-4 pb-4 pt-3 md:hidden animate-fade-in">
          {!isOwner && (
            <form onSubmit={handleSearch} className="mb-3 flex items-center gap-2 rounded-full border border-ink-200 px-4 py-2">
              <FaSearch className="text-ink-400" size={13} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search stays..."
                className="flex-1 bg-transparent text-sm outline-none"
              />
            </form>
          )}
          <div className="grid gap-1 text-sm font-semibold">
            {isOwner ? (
              <>
                <MobileLink to="/dashboard" onClick={() => setMobileOpen(false)}>Dashboard</MobileLink>
                <MobileLink to="/listings/new" onClick={() => setMobileOpen(false)}>Add listing</MobileLink>
                <MobileLink to="/payment-settings" onClick={() => setMobileOpen(false)}>Payment settings</MobileLink>
              </>
            ) : (
              <MobileLink to="/bookings" onClick={() => setMobileOpen(false)}>My trips</MobileLink>
            )}
            <MobileLink to="/profile" onClick={() => setMobileOpen(false)}>My profile</MobileLink>
            {!user && <MobileLink to="/login" onClick={() => setMobileOpen(false)}>Log in</MobileLink>}
            {!user && <MobileLink to="/register" onClick={() => setMobileOpen(false)}>Sign up</MobileLink>}
            {user && (
              <button onClick={handleLogout} className="rounded-xl px-3 py-2 text-left text-red-600">
                Log out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

function MenuLink({ to, children, icon, onClick, bold }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-2.5 hover:bg-ink-50 ${
        bold ? "font-semibold text-ink-900" : "text-ink-700"
      }`}
    >
      {icon && <span className="text-ink-400">{icon}</span>}
      {children}
    </Link>
  );
}

function MobileLink({ to, children, onClick }) {
  return (
    <Link to={to} onClick={onClick} className="rounded-xl px-3 py-2 text-ink-700 hover:bg-ink-50">
      {children}
    </Link>
  );
}

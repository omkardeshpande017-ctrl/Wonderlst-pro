import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { FaCompass, FaSearch, FaUserCircle, FaPlus, FaHome } from "react-icons/fa";
import { useAuth } from "../context/AuthContext.jsx";
import NotificationBell from "./NotificationBell.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("search") || "");
  const [menuOpen, setMenuOpen] = useState(false);

  const isOwner = user?.role === "owner";

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(q ? `/?search=${encodeURIComponent(q)}` : "/");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-4 sm:px-6 py-3">
        <Link to="/" className="flex items-center gap-2 text-brand-500 font-extrabold text-xl shrink-0">
          <FaCompass />
          <span className="hidden sm:inline">Wanderlust</span>
        </Link>

        {!isOwner && (
          <form
            onSubmit={handleSearch}
            className="flex-1 max-w-md flex items-center border border-gray-300 rounded-full px-4 py-2 shadow-sm hover:shadow-md transition"
          >
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search destinations..."
              className="flex-1 outline-none text-sm bg-transparent"
            />
            <button type="submit" className="text-brand-500">
              <FaSearch />
            </button>
          </form>
        )}
        {isOwner && (
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-brand-500"
          >
            <FaHome /> Owner dashboard
          </Link>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {user && !isOwner && (
            <Link
              to="/bookings"
              className="hidden sm:flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-full hover:bg-gray-100"
            >
              My trips
            </Link>
          )}
          {isOwner && (
            <Link
              to="/listings/new"
              className="hidden sm:flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-full hover:bg-gray-100"
            >
              <FaPlus size={12} /> Add listing
            </Link>
          )}

          {user && <NotificationBell />}

          <div className="relative">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 border border-gray-300 rounded-full px-3 py-1.5 hover:shadow-md transition"
            >
              <span className="text-lg">☰</span>
              {user?.avatar ? (
                <img src={user.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
              ) : (
                <FaUserCircle className="text-2xl text-gray-500" />
              )}
            </button>

            {menuOpen && (
              <div
                onMouseLeave={() => setMenuOpen(false)}
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg py-2 text-sm"
              >
                {user ? (
                  <>
                    <div className="px-4 py-2 text-gray-500 truncate">
                      Hi, {user.username}{" "}
                      <span className="ml-1 text-[10px] uppercase bg-gray-100 px-1.5 py-0.5 rounded-full">
                        {user.role}
                      </span>
                    </div>
                    {isOwner ? (
                      <>
                        <Link to="/dashboard" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                          Dashboard
                        </Link>
                        <Link to="/listings/new" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                          Add listing
                        </Link>
                        <Link to="/dashboard?tab=bookings" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                          Bookings
                        </Link>
                        <Link to="/payment-settings" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                          Payment settings
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link to="/bookings" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                          My trips
                        </Link>
                        <Link to="/profile?tab=wishlist" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                          Wishlist
                        </Link>
                      </>
                    )}
                    <Link to="/profile" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                      My profile
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-red-500"
                    >
                      Log out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" className="block px-4 py-2 hover:bg-gray-50 font-medium" onClick={() => setMenuOpen(false)}>
                      Log in
                    </Link>
                    <Link to="/register" className="block px-4 py-2 hover:bg-gray-50" onClick={() => setMenuOpen(false)}>
                      Sign up
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

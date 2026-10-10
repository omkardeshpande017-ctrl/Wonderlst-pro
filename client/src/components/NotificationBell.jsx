import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaBell } from "react-icons/fa";
import api from "../api/axios.js";

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();
  const timer = useRef(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      // silent — notifications are non-critical
    }
  };

  useEffect(() => {
    fetchNotifications();
    timer.current = setInterval(fetchNotifications, 30000);
    return () => clearInterval(timer.current);
  }, []);

  const handleOpen = async () => {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      await api.put("/notifications/read-all");
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  const handleClick = (n) => {
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100"
        aria-label="Notifications"
      >
        <FaBell className="text-gray-600" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-brand-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-2 z-50"
        >
          <p className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase">Notifications</p>
          {items.length === 0 ? (
            <p className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet.</p>
          ) : (
            items.map((n) => (
              <button
                key={n._id}
                onClick={() => handleClick(n)}
                className={`w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 ${
                  !n.read ? "bg-brand-50/50" : ""
                }`}
              >
                <p className="text-sm font-medium text-gray-900">{n.title}</p>
                {n.message && <p className="text-xs text-gray-500 mt-0.5">{n.message}</p>}
                <p className="text-[10px] text-gray-400 mt-1">
                  {new Date(n.createdAt).toLocaleString()}
                </p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

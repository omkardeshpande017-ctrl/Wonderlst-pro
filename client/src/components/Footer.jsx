import { Link } from "react-router-dom";
import { FaCompass, FaInstagram, FaTwitter, FaLinkedin, FaEnvelope } from "react-icons/fa";

const columns = [
  {
    title: "Explore",
    links: [
      { label: "All stays", to: "/" },
      { label: "Beachfront", to: "/?category=Beachfront" },
      { label: "Mountains", to: "/?category=Mountains" },
      { label: "Heritage & castles", to: "/?category=Castles" },
    ],
  },
  {
    title: "Hosting",
    links: [
      { label: "Become a host", to: "/register?role=owner" },
      { label: "Owner dashboard", to: "/dashboard" },
      { label: "Payment settings", to: "/payment-settings" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "My trips", to: "/bookings" },
      { label: "Wishlist", to: "/profile?tab=wishlist" },
      { label: "Log in", to: "/login" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-ink-100 bg-sand">
      <div className="container-page grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Link to="/" className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white">
              <FaCompass />
            </span>
            <span className="text-lg font-extrabold text-ink-900">
              Wander<span className="text-brand-500">lust</span>
            </span>
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-500">
            Handpicked villas, cabins, houseboats and heritage stays across India. Every booking is
            reviewed by the host, paid over UPI, and confirmed in one thread you can track.
          </p>
          <div className="mt-5 flex items-center gap-3 text-ink-400">
            <a href="#" aria-label="Instagram" className="hover:text-brand-500"><FaInstagram /></a>
            <a href="#" aria-label="Twitter" className="hover:text-brand-500"><FaTwitter /></a>
            <a href="#" aria-label="LinkedIn" className="hover:text-brand-500"><FaLinkedin /></a>
            <a href="mailto:hello@wanderlust.example" aria-label="Email" className="hover:text-brand-500">
              <FaEnvelope />
            </a>
          </div>
        </div>

        {columns.map((col) => (
          <div key={col.title}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-ink-900">{col.title}</h4>
            <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
              {col.links.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition hover:text-brand-500">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-ink-200/70">
        <div className="container-page flex flex-col items-center justify-between gap-3 py-6 text-xs text-ink-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Wanderlust. All rights reserved.</p>
          <p className="flex items-center gap-4">
            <span>Privacy</span>
            <span>Terms</span>
            <span>Built with the MERN stack</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

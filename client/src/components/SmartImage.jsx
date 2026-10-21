import { useState } from "react";

// A listing image that never leaves a broken-image box on screen:
// shows a shimmering placeholder while loading and a graceful
// gradient + emoji fallback if the photo fails to load.
const FALLBACKS = ["🏔️", "🏖️", "🏕️", "🏰", "⛵", "🌊", "🌴", "🏡"];

const hash = (str = "") => {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) % 9973;
  return h;
};

export default function SmartImage({
  src,
  alt = "",
  className = "",
  wrapperClassName = "",
  category = "",
  priority = false,
  ...rest
}) {
  const [status, setStatus] = useState(src ? "loading" : "error");
  const emoji = FALLBACKS[hash(alt || category || src) % FALLBACKS.length];

  return (
    <span className={`relative block overflow-hidden bg-ink-100 ${wrapperClassName}`}>
      {status === "loading" && <span className="skeleton absolute inset-0 block" />}

      {status === "error" ? (
        <span
          className="absolute inset-0 grid place-items-center bg-gradient-to-br from-ink-200 via-ink-100 to-brand-100"
          aria-hidden="true"
        >
          <span className="text-4xl opacity-70">{emoji}</span>
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          onLoad={() => setStatus("loaded")}
          onError={() => setStatus("error")}
          className={`${className} ${status === "loaded" ? "opacity-100" : "opacity-0"} transition-opacity duration-300`}
          {...rest}
        />
      )}
    </span>
  );
}

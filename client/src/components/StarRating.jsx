import { useState } from "react";
import { FaStar } from "react-icons/fa";

export default function StarRating({ value = 0, onChange, readOnly = false, size = 18 }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1" role={readOnly ? "img" : "radiogroup"} aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar
          key={n}
          size={size}
          className={`${(hover || value) >= n ? "text-amber-400" : "text-ink-200"} ${
            readOnly ? "" : "cursor-pointer transition hover:scale-110"
          }`}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
        />
      ))}
    </div>
  );
}

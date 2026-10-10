import { useState } from "react";
import { FaStar } from "react-icons/fa";

export default function StarRating({ value, onChange, readOnly = false, size = 18 }) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <FaStar
          key={n}
          size={size}
          className={`${
            (hover || value) >= n ? "text-yellow-400" : "text-gray-300"
          } ${readOnly ? "" : "cursor-pointer"}`}
          onMouseEnter={() => !readOnly && setHover(n)}
          onMouseLeave={() => !readOnly && setHover(0)}
          onClick={() => !readOnly && onChange?.(n)}
        />
      ))}
    </div>
  );
}

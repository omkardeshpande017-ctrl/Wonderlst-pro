/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1f0",
          100: "#ffe0dd",
          200: "#ffc5bf",
          300: "#ff9d92",
          400: "#ff6a58",
          500: "#f43f5e",
          600: "#e11d48",
          700: "#be123c",
          800: "#9f1239",
          900: "#881337",
        },
        ink: {
          50: "#f7f7f8",
          100: "#eceef1",
          200: "#d8dce3",
          300: "#b6bcc8",
          400: "#8d95a5",
          500: "#6b7385",
          600: "#545a6b",
          700: "#40465a",
          800: "#272b3a",
          900: "#141824",
          950: "#0b0e16",
        },
        sand: "#f7f5f1",
        mint: "#0f9d76",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "Inter", "system-ui", "sans-serif"],
        display: ["Playfair Display", "Georgia", "serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(20,24,36,.06), 0 8px 24px -12px rgba(20,24,36,.18)",
        lift: "0 18px 40px -18px rgba(20,24,36,.35)",
        ring: "0 0 0 4px rgba(244,63,94,.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
        "3xl": "1.75rem",
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: 0, transform: "translateY(12px)" },
          "100%": { opacity: 1, transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: 0 },
          "100%": { opacity: 1 },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.22,.61,.36,1) both",
        "fade-in": "fade-in .3s ease both",
      },
    },
  },
  plugins: [],
};

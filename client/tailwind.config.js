/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#fff1ef",
          100: "#ffe1dc",
          200: "#ffc7bd",
          300: "#ff9f8e",
          400: "#ff6b52",
          500: "#ff385c",
          600: "#e61e4d",
          700: "#c21150",
          800: "#a1124a",
          900: "#861345",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

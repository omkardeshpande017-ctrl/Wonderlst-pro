import axios from "axios";

// In development the Vite proxy forwards /api to the Express server.
// In production (Vercel) VITE_API_URL points at the deployed API, e.g.
//   VITE_API_URL=https://wanderlust-api.onrender.com/api
const baseURL = import.meta.env.VITE_API_URL || "/api";

const api = axios.create({
  baseURL,
  withCredentials: true,
});

export default api;

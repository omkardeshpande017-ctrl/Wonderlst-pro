import axios from "axios";

// API location:
//   dev  -> "/api" (proxied by Vite)
//   prod -> VITE_API_URL, e.g. https://wanderlust-api.onrender.com/api
// Falls back to the deployed API if the env var is missing at build time,
// so a forgotten variable never leaves the site with no backend.
const DEFAULT_PROD_API = "https://wanderlust-api.onrender.com/api";
const baseURL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? DEFAULT_PROD_API : "/api");

const api = axios.create({
  baseURL,
  withCredentials: true,
  timeout: 45000, // Render's free tier can take ~30s to wake from sleep
});

// The API returns the JWT in the body as well as an httpOnly cookie.
// Cross-site cookies are often blocked, so keep the token and send it back
// as a Bearer header — the server accepts either.
const TOKEN_KEY = "wl_token";

export const setAuthToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage blocked — cookie auth still applies */
  }
};

export const getAuthToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    // Session expired / invalid -> drop the stale token so the UI shows logged out
    if (error?.response?.status === 401 && getAuthToken()) {
      setAuthToken(null);
    }
    return Promise.reject(error);
  }
);

export default api;

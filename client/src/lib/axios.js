import axios from "axios";
import { supabase } from "./supabase";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3001",
});

async function resolveAccessToken() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) return null;

  const expiryMs = Number(session.expires_at || 0) * 1000;
  const isExpiredOrNearExpiry = expiryMs > 0 && expiryMs <= Date.now() + 15 * 1000;

  if (!isExpiredOrNearExpiry) return session.access_token || null;

  const {
    data: refreshData,
    error: refreshError,
  } = await supabase.auth.refreshSession();

  if (refreshError) return session.access_token || null;
  return refreshData?.session?.access_token || session.access_token || null;
}

api.interceptors.request.use(async (config) => {
  const token = await resolveAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalConfig = error?.config;
    if (!originalConfig) throw error;

    const status = error?.response?.status;
    const isAuthEndpoint = String(originalConfig.url || "").includes("/api/auth/login");

    if (status !== 401 || originalConfig._retry || isAuthEndpoint) {
      throw error;
    }

    originalConfig._retry = true;

    const {
      data: refreshData,
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError || !refreshData?.session?.access_token) {
      throw error;
    }

    originalConfig.headers = originalConfig.headers || {};
    originalConfig.headers.Authorization = `Bearer ${refreshData.session.access_token}`;
    return api(originalConfig);
  }
);

export default api;

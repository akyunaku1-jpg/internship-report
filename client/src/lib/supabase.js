import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const projectRefPattern = /^[a-z0-9-]+$/i;
const normalizeSupabaseUrl = (value) => {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;
  if (projectRefPattern.test(value)) return `https://${value}.supabase.co`;
  return value;
};
const url = normalizeSupabaseUrl(rawUrl);
const isValidUrl = /^https?:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url);
const isValidKey = typeof key === "string" && key.startsWith("eyJ");

export const SUPABASE_CONFIG_ERROR =
  !isValidUrl || !isValidKey
    ? "Supabase client is misconfigured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    : "";

export const supabase = SUPABASE_CONFIG_ERROR ? null : createClient(url, key);

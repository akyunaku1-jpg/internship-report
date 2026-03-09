import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const isValidUrl = /^https?:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url || "");
const isValidKey = typeof key === "string" && key.startsWith("eyJ");

export const SUPABASE_CONFIG_ERROR =
  !isValidUrl || !isValidKey
    ? "Supabase client is misconfigured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
    : "";

export const supabase = SUPABASE_CONFIG_ERROR ? null : createClient(url, key);

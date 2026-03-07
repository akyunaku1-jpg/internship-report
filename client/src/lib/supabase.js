import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const isValidUrl = /^https?:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url || "");
const isValidKey = typeof key === "string" && key.startsWith("eyJ");

if (!isValidUrl || !isValidKey) {
  throw new Error("Supabase client is misconfigured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in client/.env.");
}

export const supabase = createClient(
  url,
  key
);

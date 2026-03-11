import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(__dirname, "..");
// Prefer local overrides for development, then fall back to standard .env.
dotenv.config({ path: path.resolve(envDir, ".env.local") });
dotenv.config({ path: path.resolve(envDir, ".env") });

const rawUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
const key = serviceRoleKey || anonKey;
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
export const hasAdminAccess = typeof serviceRoleKey === "string" && serviceRoleKey.startsWith("eyJ");
export const supabaseUrl = url;
export const supabaseAnonKey = anonKey || "";

if (!isValidUrl || !isValidKey) {
  throw new Error(
    "Supabase server is misconfigured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in server/.env.local or server/.env."
  );
}

if (!hasAdminAccess) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Login still works, but admin auth operations are disabled.");
}

export const supabase = createClient(url, key);

export function createUserScopedClient(accessToken) {
  if (!accessToken || !supabaseAnonKey) return supabase;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  });
}

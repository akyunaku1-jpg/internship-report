import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envDir = path.resolve(__dirname, "..");
// Prefer local overrides for development, then fall back to standard .env.
dotenv.config({ path: path.resolve(envDir, ".env.local") });
dotenv.config({ path: path.resolve(envDir, ".env") });

const url = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const anonKey = process.env.SUPABASE_ANON_KEY?.trim();
const key = serviceRoleKey || anonKey;
const isValidUrl = /^https?:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url || "");
const isValidKey = typeof key === "string" && key.startsWith("eyJ");
export const hasAdminAccess = typeof serviceRoleKey === "string" && serviceRoleKey.startsWith("eyJ");

if (!isValidUrl || !isValidKey) {
  throw new Error(
    "Supabase server is misconfigured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in server/.env.local or server/.env."
  );
}

if (!hasAdminAccess) {
  console.warn("SUPABASE_SERVICE_ROLE_KEY is missing. Login still works, but admin auth operations are disabled.");
}

export const supabase = createClient(url, key);

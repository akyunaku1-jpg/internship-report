import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const url = process.env.SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const isValidUrl = /^https?:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url || "");
const isValidKey = typeof key === "string" && key.startsWith("eyJ");

if (!isValidUrl || !isValidKey) {
  throw new Error("Supabase server is misconfigured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in server/.env.");
}

export const supabase = createClient(url, key);

import { supabase } from "../lib/supabase.js";

const ADMIN_EMAILS = new Set(
  String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
);

export const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: "Unauthorized" });

  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  const shouldBeAdminByEmail = ADMIN_EMAILS.has(normalizedEmail);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  const { count: adminCount } = await supabase.from("profiles").select("id", { head: true, count: "exact" }).eq("role", "admin");
  const hasAnyAdmin = Number(adminCount || 0) > 0;

  const shouldBootstrapAdmin = !hasAnyAdmin;
  const shouldBeAdmin = shouldBeAdminByEmail || shouldBootstrapAdmin;

  if (shouldBeAdmin && profile?.role !== "admin") {
    await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
  }

  req.user = user;
  req.userRole = shouldBeAdmin ? "admin" : profile?.role || "employee";
  next();
};

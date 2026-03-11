import { createUserScopedClient, hasAdminAccess, supabase } from "../lib/supabase.js";

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

  const scopedClient = hasAdminAccess ? supabase : createUserScopedClient(token);
  const normalizedEmail = String(user.email || "").trim().toLowerCase();
  const shouldBeAdminByEmail = ADMIN_EMAILS.has(normalizedEmail);
  const { data: profile } = await scopedClient.from("profiles").select("role").eq("id", user.id).single();
  const { count: adminCount } = await scopedClient.from("profiles").select("id", { head: true, count: "exact" }).eq("role", "admin");
  const hasAnyAdmin = Number(adminCount || 0) > 0;

  const shouldBootstrapAdmin = hasAdminAccess && !hasAnyAdmin;
  const shouldBeAdmin = shouldBeAdminByEmail || shouldBootstrapAdmin;

  if (hasAdminAccess && shouldBeAdmin && profile?.role !== "admin") {
    await supabase.from("profiles").update({ role: "admin" }).eq("id", user.id);
  }

  req.user = user;
  req.accessToken = token;
  req.userRole = shouldBeAdmin ? "admin" : profile?.role || "employee";
  next();
};

import express from "express";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/stats", verifyToken, async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  const [{ count: totalEmployees }, { count: newThisMonth }, profilesRes, notificationsRes] = await Promise.all([
    supabase.from("profiles").select("*", { head: true, count: "exact" }),
    supabase.from("profiles").select("*", { head: true, count: "exact" }).gte("created_at", startOfMonth),
    supabase.from("profiles").select("department,join_date").order("join_date", { ascending: true }),
    supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(5),
  ]);

  const departments = new Set((profilesRes.data || []).map((p) => p.department).filter(Boolean)).size;
  const departmentData = Object.values(
    (profilesRes.data || []).reduce((acc, p) => {
      const key = p.department || "Other";
      acc[key] = acc[key] || { department: key, count: 0 };
      acc[key].count += 1;
      return acc;
    }, {})
  );
  const growthMap = {};
  for (let i = 5; i >= 0; i -= 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = date.toLocaleString("en-US", { month: "short" });
    growthMap[label] = 0;
  }
  (profilesRes.data || []).forEach((p) => {
    if (!p.join_date) return;
    const label = new Date(p.join_date).toLocaleString("en-US", { month: "short" });
    if (growthMap[label] !== undefined) growthMap[label] += 1;
  });

  res.json({
    stats: {
      totalEmployees: totalEmployees || 0,
      newThisMonth: newThisMonth || 0,
      onLeaveToday: 0,
      departments,
    },
    growthData: Object.entries(growthMap).map(([month, count]) => ({ month, count })),
    departmentData,
    activities: notificationsRes.data || [],
    latestEmployees: (profilesRes.data || []).slice(-5).reverse(),
  });
});

export default router;

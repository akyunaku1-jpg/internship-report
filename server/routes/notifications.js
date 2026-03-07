import express from "express";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", req.user.id)
    .order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  const unreadCount = (data || []).filter((n) => !n.is_read).length;
  res.json({ notifications: data || [], unreadCount });
});

router.put("/read-all", verifyToken, async (req, res) => {
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("user_id", req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

router.put("/:id/read", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id).eq("user_id", req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

router.delete("/:id", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("notifications").delete().eq("id", id).eq("user_id", req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

export default router;

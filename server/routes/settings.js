import express from "express";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  const { data, error } = await supabase.from("settings").select("*").eq("user_id", req.user.id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ settings: data || [] });
});

router.put("/", verifyToken, async (req, res) => {
  const { settings = [] } = req.body;
  if (settings.length) {
    const payload = settings.map((s) => ({
      user_id: req.user.id,
      key: s.key,
      value: s.value,
      updated_at: new Date().toISOString(),
    }));
    const { error } = await supabase.from("settings").upsert(payload, { onConflict: "user_id,key" });
    if (error) return res.status(400).json({ error: error.message });
  }
  res.json({ success: true });
});

export default router;

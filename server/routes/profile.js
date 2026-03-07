import express from "express";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/", verifyToken, async (req, res) => {
  const { data, error } = await supabase.from("profiles").select("*").eq("id", req.user.id).single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ profile: data });
});

router.put("/", verifyToken, async (req, res) => {
  const { data, error } = await supabase
    .from("profiles")
    .update(req.body)
    .eq("id", req.user.id)
    .select("*")
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ profile: data, message: "✓ Profile updated successfully." });
});

export default router;

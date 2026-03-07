import express from "express";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

router.get("/employees/:id/onboarding", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("onboarding_tasks").select("*").eq("user_id", id);
  if (error) return res.status(400).json({ error: error.message });
  const completion = data?.length
    ? Math.round(data.reduce((acc, cur) => acc + Number(cur.completion_percentage || 0), 0) / data.length)
    : 0;
  res.json({ tasks: data || [], completion });
});

router.put("/employees/:id/onboarding", verifyToken, async (req, res) => {
  const { id } = req.params;
  const { tasks = [] } = req.body;
  await supabase.from("onboarding_tasks").delete().eq("user_id", id);
  if (tasks.length) {
    const payload = tasks.map((task) => ({
      user_id: id,
      task_name: task.task_name,
      is_completed: Boolean(task.is_completed),
      completion_percentage: Number(task.completion_percentage || 0),
    }));
    const { error } = await supabase.from("onboarding_tasks").insert(payload);
    if (error) return res.status(400).json({ error: error.message });
  }
  res.json({ message: "✓ Onboarding task updated." });
});

export default router;

import express from "express";
import { body, validationResult } from "express-validator";
import crypto from "node:crypto";
import { supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { requireAdmin } from "../middleware/requireAdmin.js";

const router = express.Router();

router.get("/", verifyToken, requireAdmin, async (req, res) => {
  const { search = "", searchBy = "all", department = "", role = "", page = 1, limit = 10 } = req.query;
  const from = (Number(page) - 1) * Number(limit);
  const to = from + Number(limit) - 1;

  let query = supabase.from("profiles").select("*", { count: "exact" }).order("created_at", { ascending: false }).range(from, to);
  if (search) {
    if (searchBy === "name") {
      query = query.ilike("name", `%${search}%`);
    } else if (searchBy === "email") {
      query = query.ilike("email", `%${search}%`);
    } else {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%`);
    }
  }
  if (department) query = query.eq("department", department);
  if (role) query = query.eq("role", role);

  const { data, count, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json({
    employees: data || [],
    pagination: { page: Number(page), limit: Number(limit), total: count || 0, totalPages: Math.ceil((count || 0) / Number(limit)) || 1 },
  });
});

router.get("/export", verifyToken, requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
  if (error) return res.status(400).json({ error: error.message });
  const header = "name,email,department,position,employee_id\n";
  const rows = (data || [])
    .map((e) => [e.name, e.email, e.department, e.position, e.employee_id].map((v) => `"${String(v || "").replaceAll('"', '""')}"`).join(","))
    .join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=employees.csv");
  res.send(`${header}${rows}`);
});

router.get("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const [employee, education, family, emergencyContacts, onboarding] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).single(),
    supabase.from("education").select("*").eq("user_id", id),
    supabase.from("family_members").select("*").eq("user_id", id),
    supabase.from("emergency_contacts").select("*").eq("user_id", id),
    supabase.from("onboarding_tasks").select("*").eq("user_id", id),
  ]);
  if (employee.error || !employee.data) return res.status(404).json({ error: "Employee not found." });
  res.json({
    employee: employee.data,
    education: education.data || [],
    family: family.data || [],
    emergencyContacts: emergencyContacts.data || [],
    onboarding: onboarding.data || [],
  });
});

router.post(
  "/",
  verifyToken,
  requireAdmin,
  [body("name").isString().isLength({ min: 1 }), body("email").optional().isEmail()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const payload = { ...req.body };
    if (!payload.id) payload.id = crypto.randomUUID();
    if (!payload.email) payload.email = `${payload.id}@placeholder.local`;
    const { data, error } = await supabase.from("profiles").insert(payload).select("*").single();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ employee: data, message: "✓ Employee added successfully!" });
  }
);

router.put("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { data, error } = await supabase.from("profiles").update(req.body).eq("id", id).select("*").single();
  if (error) return res.status(400).json({ error: error.message });
  res.json({ employee: data, message: "✓ Changes saved successfully." });
});

router.delete("/:id", verifyToken, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("profiles").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ message: "✓ Employee deleted successfully." });
});

export default router;

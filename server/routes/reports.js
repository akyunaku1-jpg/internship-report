import express from "express";
import { createUserScopedClient, hasAdminAccess, supabase } from "../lib/supabase.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();
const REPORT_TABLE_CANDIDATES = ["internship_reports", "reports"];

function sanitizeString(value) {
  return String(value || "").trim();
}

function resolveClientRef(report) {
  const directRef = sanitizeString(report.id);
  if (directRef) return directRef;
  const fallbackRef = `${sanitizeString(report.reportDate)}|${sanitizeString(report.taskTitle)}|${sanitizeString(report.startTime)}`;
  return fallbackRef.replace(/\s+/g, "_") || null;
}

function toPayload(report, userId) {
  return {
    user_id: userId,
    client_ref: resolveClientRef(report),
    full_name: sanitizeString(report.fullName),
    intern_id: sanitizeString(report.internId),
    department: sanitizeString(report.department),
    division: sanitizeString(report.division),
    supervisor_name: sanitizeString(report.supervisorName),
    report_date: sanitizeString(report.reportDate) || null,
    task_title: sanitizeString(report.taskTitle),
    work_status: sanitizeString(report.workStatus) || "Pending",
    task_description: sanitizeString(report.taskDescription),
    start_time: sanitizeString(report.startTime) || null,
    end_time: sanitizeString(report.endTime) || null,
    duration: sanitizeString(report.duration),
    additional_notes: sanitizeString(report.additionalNotes),
    attachment_url: sanitizeString(report.attachmentUrl),
    attachment_name: sanitizeString(report.attachmentName),
  };
}

function toUpdatePayload(report) {
  const fieldMap = {
    fullName: "full_name",
    internId: "intern_id",
    department: "department",
    division: "division",
    supervisorName: "supervisor_name",
    reportDate: "report_date",
    taskTitle: "task_title",
    workStatus: "work_status",
    taskDescription: "task_description",
    startTime: "start_time",
    endTime: "end_time",
    duration: "duration",
    additionalNotes: "additional_notes",
    attachmentUrl: "attachment_url",
    attachmentName: "attachment_name",
  };
  const payload = {};
  Object.entries(fieldMap).forEach(([sourceKey, targetKey]) => {
    if (Object.prototype.hasOwnProperty.call(report, sourceKey)) {
      const value = report[sourceKey];
      payload[targetKey] = value === null ? null : sanitizeString(value);
    }
  });
  return payload;
}

function isMissingReportsTableError(error) {
  const message = String(error?.message || "").toLowerCase();
  return message.includes("could not find the table") || message.includes("does not exist");
}

async function queryAcrossReportTables(operation) {
  let lastError = null;

  for (const table of REPORT_TABLE_CANDIDATES) {
    const result = await operation(table);
    if (!result?.error) return { ...result, table };

    lastError = result.error;
    if (isMissingReportsTableError(result.error)) {
      continue;
    }

    return { ...result, table };
  }

  return { data: null, error: lastError, table: null };
}

function respondWithReportError(res, error) {
  if (isMissingReportsTableError(error)) {
    return res.status(500).json({
      error: "Reports table is missing in Supabase. Run supabase/schema.sql (or supabase/fix_internship_reports.sql) in SQL Editor, then retry.",
    });
  }
  return res.status(400).json({ error: error?.message || "Report request failed." });
}

function resolveDbClient(req) {
  if (hasAdminAccess) return supabase;
  return createUserScopedClient(req.accessToken);
}

async function createNotification(dbClient, userId, type, title, message) {
  await dbClient.from("notifications").insert({
    user_id: userId,
    type,
    title,
    message,
    is_read: false,
  });
}

router.get("/", verifyToken, async (req, res) => {
  const dbClient = resolveDbClient(req);
  const { userId } = req.query;
  const isAdmin = req.userRole === "admin";

  const { data, error } = await queryAcrossReportTables((table) => {
    let query = dbClient.from(table).select("*").order("report_date", { ascending: false }).order("created_at", { ascending: false });
    if (isAdmin && userId) {
      query = query.eq("user_id", userId);
    } else if (!isAdmin) {
      query = query.eq("user_id", req.user.id);
    }
    return query;
  });
  if (error) return respondWithReportError(res, error);
  return res.json({ reports: data || [] });
});

router.post("/", verifyToken, async (req, res) => {
  const dbClient = resolveDbClient(req);
  const payload = toPayload(req.body, req.user.id);
  if (!payload.task_title || !payload.task_description || !payload.report_date) {
    return res.status(400).json({ error: "Task title, task description, and report date are required." });
  }

  const { data, error } = await queryAcrossReportTables((table) => dbClient.from(table).insert(payload).select("*").single());
  if (error) return respondWithReportError(res, error);

  await createNotification(
    dbClient,
    req.user.id,
    "success",
    "Report Submitted",
    `Your report '${payload.task_title || "Untitled Report"}' has been submitted successfully.`
  ).catch(() => null);

  if (payload.attachment_url) {
    await createNotification(
      dbClient,
      req.user.id,
      "info",
      "Task Attachment Update",
      "A new attachment has been added to your task."
    ).catch(() => null);
  }

  return res.status(201).json({ report: data });
});

router.post("/sync", verifyToken, async (req, res) => {
  const dbClient = resolveDbClient(req);
  const reports = Array.isArray(req.body?.reports) ? req.body.reports : [];
  if (!reports.length) return res.json({ synced: 0 });

  const payload = reports.map((item) => toPayload(item, req.user.id));
  const { error } = await queryAcrossReportTables((table) => dbClient.from(table).upsert(payload, { onConflict: "user_id,client_ref" }));
  if (error) return respondWithReportError(res, error);

  await createNotification(
    dbClient,
    req.user.id,
    "success",
    "Report Sync Completed",
    `${payload.length} locally saved report(s) have been synchronized to Supabase.`
  ).catch(() => null);

  return res.json({ synced: payload.length });
});

router.put("/:id", verifyToken, async (req, res) => {
  const dbClient = resolveDbClient(req);
  const { id } = req.params;
  const payload = toUpdatePayload(req.body);
  if (!Object.keys(payload).length) return res.status(400).json({ error: "No fields provided for update." });
  const isAdmin = req.userRole === "admin";

  const { data, error } = await queryAcrossReportTables((table) => {
    let query = dbClient.from(table).update(payload).eq("id", id);
    if (!isAdmin) query = query.eq("user_id", req.user.id);
    return query.select("*").single();
  });
  if (error) return respondWithReportError(res, error);
  return res.json({ report: data });
});

router.delete("/:id", verifyToken, async (req, res) => {
  const dbClient = resolveDbClient(req);
  const { id } = req.params;
  const isAdmin = req.userRole === "admin";
  const { error } = await queryAcrossReportTables((table) => {
    let query = dbClient.from(table).delete().eq("id", id);
    if (!isAdmin) query = query.eq("user_id", req.user.id);
    return query;
  });
  if (error) return respondWithReportError(res, error);
  return res.json({ message: "✓ Report deleted successfully." });
});

export default router;

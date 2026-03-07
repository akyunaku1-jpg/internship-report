export const REPORTS_STORAGE_KEY = "internshipReports";

export function getLegacyReports() {
  const raw = localStorage.getItem(REPORTS_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (_error) {
    return [];
  }
  return [];
}

export function clearLegacyReports() {
  localStorage.removeItem(REPORTS_STORAGE_KEY);
}

export function saveLegacyReport(report) {
  const existing = getLegacyReports();
  const next = [...existing, report];
  localStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(next));
}

function normalizeString(value) {
  return String(value || "").trim();
}

export function normalizeReportShape(report) {
  const reportDate = normalizeString(report.report_date || report.reportDate);
  const taskTitle = normalizeString(report.task_title || report.taskTitle);
  const startTime = normalizeString(report.start_time || report.startTime);
  const fallbackId = `${reportDate}|${taskTitle}|${startTime}` || String(Date.now());

  return {
    id: report.id || fallbackId,
    report_date: reportDate || null,
    task_title: taskTitle,
    division: normalizeString(report.division),
    work_status: normalizeString(report.work_status || report.workStatus) || "Pending",
    task_description: normalizeString(report.task_description || report.taskDescription),
    start_time: normalizeString(report.start_time || report.startTime),
    end_time: normalizeString(report.end_time || report.endTime),
    duration: normalizeString(report.duration),
    additional_notes: normalizeString(report.additional_notes || report.additionalNotes),
    attachment_url: normalizeString(report.attachment_url || report.attachmentUrl),
    attachment_name: normalizeString(report.attachment_name || report.attachmentName),
    full_name: normalizeString(report.full_name || report.fullName),
    created_at: report.created_at || new Date().toISOString(),
  };
}

export function getNormalizedLegacyReports() {
  return getLegacyReports().map((item) => normalizeReportShape(item));
}

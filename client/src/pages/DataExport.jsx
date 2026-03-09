import { useMemo, useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";

const EXPORT_TYPES = [
  { value: "daily", label: "Daily Reports" },
  { value: "weekly", label: "Weekly Reports" },
  { value: "all", label: "All Reports" },
];

const EXPORT_FORMATS = [
  { value: "csv", label: "CSV" },
  { value: "excel", label: "Excel" },
  { value: "pdf", label: "PDF" },
];

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function parseDurationToMinutes(duration) {
  const raw = String(duration || "");
  const hourMatch = raw.match(/(\d+)\s*h/i);
  const minuteMatch = raw.match(/(\d+)\s*m/i);
  const hours = hourMatch ? Number(hourMatch[1]) : 0;
  const minutes = minuteMatch ? Number(minuteMatch[1]) : 0;
  return hours * 60 + minutes;
}

function formatMinutesToHours(minutes) {
  const safe = Number(minutes) || 0;
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  return `${hours}h ${mins}m`;
}

function getIsoWeekLabel(dateInput) {
  const date = new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "-";
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function buildDailyRows(reports) {
  return reports.map((report, index) => ({
    No: index + 1,
    "Full Name": report.full_name || "-",
    "Intern ID": report.intern_id || "-",
    Department: report.department || "-",
    Date: toIsoDate(report.report_date) || "-",
    "Task Title": report.task_title || "-",
    "Task Description": report.task_description || "-",
    Division: report.division || "-",
    Status: report.work_status || "-",
    "Start Time": report.start_time || "-",
    "End Time": report.end_time || "-",
    Duration: report.duration || "-",
    Supervisor: report.supervisor_name || "-",
    "Additional Notes": report.additional_notes || "-",
    "Attachment Name": report.attachment_name || "-",
    Attachment: report.attachment_url || "-",
  }));
}

function buildWeeklyRows(reports) {
  const map = reports.reduce((acc, report) => {
    const week = getIsoWeekLabel(report.report_date);
    if (!acc[week]) {
      acc[week] = {
        week,
        totalReports: 0,
        completedReports: 0,
        pendingReports: 0,
        totalMinutes: 0,
      };
    }
    acc[week].totalReports += 1;
    if (report.work_status === "Completed") acc[week].completedReports += 1;
    if (report.work_status === "Pending") acc[week].pendingReports += 1;
    acc[week].totalMinutes += parseDurationToMinutes(report.duration);
    return acc;
  }, {});

  return Object.values(map)
    .sort((a, b) => a.week.localeCompare(b.week))
    .map((item) => ({
      Week: item.week,
      "Total Reports": item.totalReports,
      Completed: item.completedReports,
      Pending: item.pendingReports,
      "Total Duration": formatMinutesToHours(item.totalMinutes),
    }));
}

function toCsvString(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const csvRows = rows.map((row) =>
    headers
      .map((header) => `"${String(row[header] ?? "").replaceAll('"', '""')}"`)
      .join(",")
  );
  return [headers.join(","), ...csvRows].join("\n");
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function loadJsPdf() {
  if (window.jspdf?.jsPDF) return window.jspdf.jsPDF;

  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load PDF engine."));
    document.head.appendChild(script);
  });

  if (!window.jspdf?.jsPDF) {
    throw new Error("PDF engine is unavailable.");
  }
  return window.jspdf.jsPDF;
}

function shortenText(value, limit = 200) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1)}...`;
}

function detectImageFormat(dataUrl) {
  if (String(dataUrl).startsWith("data:image/png")) return "PNG";
  if (String(dataUrl).startsWith("data:image/webp")) return "WEBP";
  return "JPEG";
}

async function toDataUrlFromSource(sourceUrl) {
  const src = String(sourceUrl || "");
  if (!src) return null;
  if (src.startsWith("data:image/")) return src;

  const response = await fetch(src);
  if (!response.ok) return null;
  const blob = await response.blob();
  const readerResult = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to parse image."));
    reader.readAsDataURL(blob);
  });
  return readerResult || null;
}

function drawHeader(doc, heading) {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(91, 141, 239);
  doc.roundedRect(26, 22, pageWidth - 52, 56, 8, 8, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("PKL Report Data Export", 40, 46);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(heading, 40, 62);
  doc.text(`Generated at ${new Date().toLocaleString("en-US")}`, pageWidth - 230, 62);
}

function drawOverview(doc, reports, startY) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const cardWidth = (pageWidth - 78) / 3;
  const xStart = 26;
  const y = startY;
  const completed = reports.filter((item) => item.work_status === "Completed").length;
  const pending = reports.filter((item) => item.work_status === "Pending").length;
  const inProgress = reports.filter((item) => item.work_status === "In Progress").length;
  const dates = reports.map((item) => toIsoDate(item.report_date)).filter(Boolean).sort();
  const dateRange = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : "-";
  const summaryCards = [
    { title: "Total Reports", value: String(reports.length), detail: `Completed: ${completed}` },
    { title: "Work Status", value: `In Progress: ${inProgress}`, detail: `Pending: ${pending}` },
    { title: "Date Range", value: dateRange, detail: "Filtered export range" },
  ];

  summaryCards.forEach((card, index) => {
    const x = xStart + index * (cardWidth + 13);
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(x, y, cardWidth, 56, 8, 8, "F");
    doc.setTextColor(90, 90, 90);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(card.title, x + 10, y + 18);
    doc.setTextColor(42, 42, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text(card.value, x + 10, y + 34);
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(card.detail, x + 10, y + 48);
  });

  return y + 72;
}

function drawWeeklySummary(doc, weeklyRows, startY) {
  let y = startY;
  const pageWidth = doc.internal.pageSize.getWidth();
  const x = 30;
  const width = pageWidth - 60;

  doc.setTextColor(42, 42, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Weekly Summary", x, y);
  y += 14;

  weeklyRows.forEach((row, index) => {
    const line = `${index + 1}. ${row.Week} | Total: ${row["Total Reports"]} | Completed: ${row.Completed} | Pending: ${row.Pending} | Duration: ${row["Total Duration"]}`;
    const textLines = doc.splitTextToSize(line, width - 20);
    doc.setFillColor(248, 250, 255);
    doc.roundedRect(x, y - 10, width, textLines.length * 12 + 10, 6, 6, "F");
    doc.setTextColor(70, 70, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(textLines, x + 10, y + 2);
    y += textLines.length * 12 + 18;
  });

  return y;
}

async function exportAsPdf({ filename, heading, exportType, reports, weeklyRows }) {
  const JsPdf = await loadJsPdf();
  const doc = new JsPdf({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  drawHeader(doc, heading);
  let y = drawOverview(doc, reports, 96);

  if (exportType === "weekly") {
    y = drawWeeklySummary(doc, weeklyRows, y);
    const pageWidth = doc.internal.pageSize.getWidth();
    const contentWidth = pageWidth - 60;
    doc.setTextColor(42, 42, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Included Report Details", 30, y + 8);
    y += 22;

    reports.forEach((report, index) => {
      const line = `${index + 1}. ${getIsoWeekLabel(report.report_date)} | ${toIsoDate(report.report_date) || "-"} | ${report.task_title || "-"} | ${report.work_status || "-"} | ${report.duration || "-"}`;
      const lineParts = doc.splitTextToSize(line, contentWidth - 16);
      if (y + lineParts.length * 12 > pageHeight - 30) {
        doc.addPage();
        drawHeader(doc, heading);
        y = 96;
      }
      doc.setFillColor(248, 250, 255);
      doc.roundedRect(30, y - 10, contentWidth, lineParts.length * 12 + 10, 6, 6, "F");
      doc.setTextColor(70, 70, 70);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.text(lineParts, 38, y + 2);
      y += lineParts.length * 12 + 16;
    });
    doc.save(filename);
    return;
  }

  const cardX = 30;
  const cardWidth = pageWidth - 60;
  const imageWidth = 140;
  const imageHeight = 95;
  const textWidth = cardWidth - imageWidth - 34;

  for (let index = 0; index < reports.length; index += 1) {
    const report = reports[index];
    const description = shortenText(report.task_description || "-", 500);
    const notes = shortenText(report.additional_notes || "-", 350);
    const descriptionLines = doc.splitTextToSize(`Description: ${description}`, textWidth - 10);
    const notesLines = doc.splitTextToSize(`Notes: ${notes}`, textWidth - 10);
    const minCardHeight = Math.max(188, 110 + descriptionLines.length * 11 + notesLines.length * 11);

    if (y + minCardHeight > pageHeight - 30) {
      doc.addPage();
      drawHeader(doc, heading);
      y = 96;
    }

    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(220, 228, 242);
    doc.roundedRect(cardX, y, cardWidth, minCardHeight, 8, 8, "FD");

    doc.setTextColor(42, 42, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`${index + 1}. ${shortenText(report.task_title || "Untitled Task", 58)}`, cardX + 12, y + 18);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(90, 90, 90);
    doc.text(`Date: ${toIsoDate(report.report_date) || "-"} | Start: ${report.start_time || "-"} | End: ${report.end_time || "-"}`, cardX + 12, y + 34);
    doc.text(`Name: ${report.full_name || "-"} | Intern ID: ${report.intern_id || "-"}`, cardX + 12, y + 48);
    doc.text(`Department: ${report.department || "-"} | Division: ${report.division || "-"}`, cardX + 12, y + 62);
    doc.text(`Status: ${report.work_status || "-"} | Duration: ${report.duration || "-"}`, cardX + 12, y + 76);
    doc.text(`Supervisor: ${report.supervisor_name || "-"}`, cardX + 12, y + 90);
    doc.text(descriptionLines, cardX + 12, y + 104);
    doc.text(notesLines, cardX + 12, y + 104 + descriptionLines.length * 11 + 3);
    const attachmentLabel = shortenText(report.attachment_name || "No attachment name", 42);
    doc.text(`Attachment: ${attachmentLabel}`, cardX + 12, y + minCardHeight - 12);

    const imageX = cardX + cardWidth - imageWidth - 12;
    const imageY = y + 14;
    doc.setFillColor(246, 248, 252);
    doc.roundedRect(imageX, imageY, imageWidth, imageHeight, 6, 6, "F");

    try {
      const dataUrl = await toDataUrlFromSource(report.attachment_url);
      if (dataUrl) {
        const format = detectImageFormat(dataUrl);
        doc.addImage(dataUrl, format, imageX + 3, imageY + 3, imageWidth - 6, imageHeight - 6);
      } else {
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(9);
        doc.text("No attachment", imageX + 32, imageY + 50);
      }
    } catch (_imageError) {
      doc.setTextColor(150, 150, 150);
      doc.setFontSize(9);
      doc.text("Image unavailable", imageX + 28, imageY + 50);
    }

    y += minCardHeight + 12;
  }

  doc.save(filename);
}

export default function DataExport() {
  const [exportType, setExportType] = useState("daily");
  const [exportFormat, setExportFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const dateRangeLabel = useMemo(() => {
    if (dateFrom && dateTo) return `${dateFrom} to ${dateTo}`;
    if (dateFrom) return `from ${dateFrom}`;
    if (dateTo) return `until ${dateTo}`;
    return "all dates";
  }, [dateFrom, dateTo]);

  const exportLabel = EXPORT_TYPES.find((item) => item.value === exportType)?.label || "Reports";

  const runExport = async () => {
    setSuccess("");
    setError("");

    if (dateFrom && dateTo && dateFrom > dateTo) {
      setError("Start date must be before end date.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.get("/api/reports");
      const reports = response.data?.reports || [];
      const filteredByDate = reports.filter((report) => {
        const date = toIsoDate(report.report_date);
        if (!date) return false;
        const meetsStart = !dateFrom || date >= dateFrom;
        const meetsEnd = !dateTo || date <= dateTo;
        return meetsStart && meetsEnd;
      });

      const rows = exportType === "weekly" ? buildWeeklyRows(filteredByDate) : buildDailyRows(filteredByDate);
      if (!rows.length) {
        setError("No reports found for the selected filter.");
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const baseFilename = `pkl-${exportType}-reports-${timestamp}`;
      const heading = `${exportLabel} (${dateRangeLabel})`;

      if (exportFormat === "csv") {
        downloadBlob(`${baseFilename}.csv`, toCsvString(rows), "text/csv;charset=utf-8;");
      } else if (exportFormat === "excel") {
        downloadBlob(`${baseFilename}.xls`, toCsvString(rows), "application/vnd.ms-excel;charset=utf-8;");
      } else {
        await exportAsPdf({
          filename: `${baseFilename}.pdf`,
          heading,
          exportType,
          reports: filteredByDate,
          weeklyRows: buildWeeklyRows(filteredByDate),
        });
      }

      setSuccess(`Export completed: ${exportLabel} in ${exportFormat.toUpperCase()} format.`);
    } catch (_error) {
      setError("Failed to export report data.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper title="Data Export">
      <div className="space-y-5 rounded-xl bg-[#F4F7FB] p-4 text-[#2A2A2A] md:p-6">
        <section className="card border-[#E5EAF2] bg-white p-5 shadow-sm">
          <h2 className="text-2xl font-semibold">Data Export</h2>
          <p className="mt-1 text-sm text-slate-600">Export your PKL internship report data in CSV, Excel, or PDF format.</p>
        </section>

        <section className="card border-[#E5EAF2] bg-white p-4 shadow-sm md:p-5">
          <div className="mb-4 flex items-center gap-2 text-lg font-semibold">
            <span aria-hidden>📤</span>
            <h3>Export Configuration</h3>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm">
              Export Type
              <select
                value={exportType}
                onChange={(event) => setExportType(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 outline-none ring-[#5B8DEF] focus:ring-2"
              >
                {EXPORT_TYPES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Export Format
              <select
                value={exportFormat}
                onChange={(event) => setExportFormat(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 outline-none ring-[#5B8DEF] focus:ring-2"
              >
                {EXPORT_FORMATS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm">
              Date From
              <input
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 outline-none ring-[#5B8DEF] focus:ring-2"
              />
            </label>

            <label className="text-sm">
              Date To
              <input
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 outline-none ring-[#5B8DEF] focus:ring-2"
              />
            </label>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E5EAF2] bg-[#F8FAFF] p-3">
            <p className="text-sm text-slate-600">
              Selected: <span className="font-medium">{exportLabel}</span> | Range: <span className="font-medium">{dateRangeLabel}</span>
            </p>
            <button
              type="button"
              onClick={runExport}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg bg-[#5B8DEF] px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-[#4a7de3] disabled:opacity-70"
            >
              <span aria-hidden>⬇️</span>
              {loading ? "Exporting..." : "Export & Download"}
            </button>
          </div>

          {error ? <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{String(error)}</p> : null}
          {success ? <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{success}</p> : null}
        </section>
      </div>
    </PageWrapper>
  );
}

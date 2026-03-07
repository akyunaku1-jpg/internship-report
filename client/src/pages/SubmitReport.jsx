import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import { useAuth } from "../hooks/useAuth";
import api from "../lib/axios";
import { saveLegacyReport } from "../utils/reportsStorage";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png"];

const initialForm = {
  fullName: "",
  internId: "",
  department: "",
  division: "",
  supervisorName: "",
  reportDate: new Date().toISOString().slice(0, 10),
  taskTitle: "",
  workStatus: "Completed",
  taskDescription: "",
  startTime: "",
  endTime: "",
  additionalNotes: "",
};

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return "";
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  if (Number.isNaN(startTotalMinutes) || Number.isNaN(endTotalMinutes) || endTotalMinutes < startTotalMinutes) return "";
  const diff = endTotalMinutes - startTotalMinutes;
  const hours = Math.floor(diff / 60);
  const minutes = diff % 60;
  return `${hours}h ${minutes}m`;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

export default function SubmitReport() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState({
    ...initialForm,
    fullName: profile?.name || "",
    internId: profile?.employee_id || "",
    department: profile?.department || "",
    division: profile?.position || "",
  });
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState("");
  const [attachmentDataUrl, setAttachmentDataUrl] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const duration = useMemo(() => calculateDuration(form.startTime, form.endTime), [form.startTime, form.endTime]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleAttachment = async (file) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Only JPG and PNG files are allowed.");
      return;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      setError("File size must be 5MB or less.");
      return;
    }
    setError("");
    setAttachmentFile(file);
    setAttachmentPreview(URL.createObjectURL(file));
    try {
      const dataUrl = await fileToDataUrl(file);
      setAttachmentDataUrl(dataUrl);
    } catch (_error) {
      setAttachmentDataUrl("");
      setError("Attachment could not be processed.");
    }
  };

  const onDrop = (event) => {
    event.preventDefault();
    handleAttachment(event.dataTransfer.files?.[0]);
  };

  const onCancel = () => {
    navigate("/dashboard");
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    if (!form.taskTitle.trim() || !form.taskDescription.trim()) {
      setError("Task title and task description are required.");
      return;
    }
    if (!form.startTime || !form.endTime || !duration) {
      setError("Please provide valid start and end times.");
      return;
    }
    if (!attachmentFile || !attachmentDataUrl) {
      setError("Please upload a proof photo.");
      return;
    }
    setError("");
    setSaving(true);
    const payload = {
      id: crypto.randomUUID(),
      fullName: form.fullName.trim(),
      internId: form.internId.trim(),
      department: form.department.trim(),
      division: form.division.trim(),
      supervisorName: form.supervisorName.trim(),
      reportDate: form.reportDate,
      taskTitle: form.taskTitle.trim(),
      workStatus: form.workStatus,
      taskDescription: form.taskDescription.trim(),
      startTime: form.startTime,
      endTime: form.endTime,
      duration,
      additionalNotes: form.additionalNotes.trim(),
      attachmentUrl: attachmentDataUrl,
      attachmentName: attachmentFile.name,
    };
    try {
      await api.post("/api/reports", payload);
      alert("Report submitted successfully.");
      navigate("/analytics");
    } catch (submitError) {
      const message = submitError?.response?.data?.error || "Report submission failed.";
      const isUnauthorized = submitError?.response?.status === 401 || message.toLowerCase().includes("unauthorized");
      const isMissingReportsTable =
        message.toLowerCase().includes("could not find the table") ||
        message.toLowerCase().includes("schema cache") ||
        message.toLowerCase().includes("reports table is missing");

      if (isUnauthorized) {
        saveLegacyReport(payload);
        setError("Your session has expired. Report saved locally. Please login again, then open Report History to sync.");
        return;
      }

      if (isMissingReportsTable) {
        saveLegacyReport(payload);
        alert("Report saved locally. It will be synced automatically after the reports table is available.");
        navigate("/analytics");
        return;
      }

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageWrapper title="Internship Daily Report">
      <form onSubmit={onSubmit} className="space-y-5 rounded-xl bg-[#F4F7FB] p-4 text-[#2A2A2A] md:p-6">
        <section className="card border-[#E5EAF2] p-5">
          <h2 className="text-2xl font-semibold">Internship Daily Report</h2>
          <p className="mt-1 text-sm text-slate-600">Submit your daily internship activity report and attach proof of work.</p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card border-[#E5EAF2] p-4">
            <h3 className="mb-3 font-semibold">Personal Information</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Full Name
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.fullName} onChange={(e) => setField("fullName", e.target.value)} />
              </label>
              <label className="text-sm">
                Intern ID
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.internId} onChange={(e) => setField("internId", e.target.value)} />
              </label>
              <label className="text-sm">
                Department
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.department} onChange={(e) => setField("department", e.target.value)} />
              </label>
              <label className="text-sm">
                Internship Division
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.division} onChange={(e) => setField("division", e.target.value)} />
              </label>
              <label className="text-sm">
                Supervisor Name
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.supervisorName} onChange={(e) => setField("supervisorName", e.target.value)} />
              </label>
              <label className="text-sm">
                Report Date
                <input type="date" className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.reportDate} onChange={(e) => setField("reportDate", e.target.value)} />
              </label>
            </div>
          </div>

          <div className="card border-[#E5EAF2] p-4">
            <h3 className="mb-3 font-semibold">Work Information</h3>
            <div className="space-y-3">
              <label className="text-sm">
                Task Title
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.taskTitle} onChange={(e) => setField("taskTitle", e.target.value)} />
              </label>
              <label className="text-sm">
                Work Status
                <select className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-white px-3 py-2" value={form.workStatus} onChange={(e) => setField("workStatus", e.target.value)}>
                  <option>Completed</option>
                  <option>In Progress</option>
                  <option>Pending</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="card border-[#E5EAF2] p-4">
          <h3 className="mb-3 font-semibold">Task Details</h3>
          <div className="space-y-3">
            <label className="text-sm">
              Task Title
              <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.taskTitle} onChange={(e) => setField("taskTitle", e.target.value)} />
            </label>
            <label className="text-sm">
              Task Description
              <textarea
                rows={5}
                className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
                placeholder="Describe your daily activity..."
                value={form.taskDescription}
                onChange={(e) => setField("taskDescription", e.target.value)}
              />
            </label>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="card border-[#E5EAF2] p-4">
            <h3 className="mb-3 font-semibold">Work Time</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Start Time
                <input type="time" className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.startTime} onChange={(e) => setField("startTime", e.target.value)} />
              </label>
              <label className="text-sm">
                End Time
                <input type="time" className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={form.endTime} onChange={(e) => setField("endTime", e.target.value)} />
              </label>
              <label className="text-sm sm:col-span-2">
                Total Duration
                <input readOnly className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-slate-50 px-3 py-2" value={duration || "-"} />
              </label>
            </div>
          </div>

          <div className="card border-[#E5EAF2] p-4">
            <h3 className="mb-3 font-semibold">Attachment</h3>
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => handleAttachment(e.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
              className="w-full rounded-xl border-2 border-dashed border-[#E5EAF2] bg-slate-50 p-8 text-center"
            >
              <p className="font-medium">Drag &amp; Drop Image Here</p>
              <p className="text-sm text-slate-500">or Click to Upload</p>
            </button>
            <p className="mt-2 text-xs text-slate-500">Supported: JPG, PNG | Max Size: 5MB</p>
            {attachmentPreview && <img src={attachmentPreview} alt="Attachment preview" className="mt-3 h-40 w-full rounded-lg object-cover" />}
          </div>
        </section>

        <section className="card border-[#E5EAF2] p-4">
          <h3 className="mb-3 font-semibold">Additional Notes</h3>
          <textarea
            rows={4}
            className="w-full rounded-lg border border-[#E5EAF2] px-3 py-2"
            placeholder="Optional comments..."
            value={form.additionalNotes}
            onChange={(e) => setField("additionalNotes", e.target.value)}
          />
        </section>

        {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <section className="flex justify-end gap-3">
          <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 font-medium text-slate-700">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="rounded-lg bg-[#5B8DEF] px-5 py-2 font-semibold text-white hover:bg-[#4a7de3] disabled:opacity-70">
            {saving ? "Submitting..." : "Submit Report"}
          </button>
        </section>
      </form>
    </PageWrapper>
  );
}

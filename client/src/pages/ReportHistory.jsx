import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import { formatDate } from "../utils/formatDate";
import api from "../lib/axios";
import { clearLegacyReports, getLegacyReports, getNormalizedLegacyReports } from "../utils/reportsStorage";
import { useAuth } from "../hooks/useAuth";

const STATUS_FILTERS = ["All", "Completed", "In Progress", "Pending", "Revision"];

function getStatusClass(status) {
  if (status === "Completed") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-orange-100 text-orange-700";
  if (status === "Revision") return "bg-red-100 text-red-700";
  return "bg-gray-100 text-gray-600";
}

function createEditState(report) {
  return {
    id: report.id,
    reportDate: report.report_date || "",
    taskTitle: report.task_title || "",
    division: report.division || "",
    workStatus: report.work_status || "Pending",
    taskDescription: report.task_description || "",
    startTime: report.start_time || "",
    endTime: report.end_time || "",
    duration: report.duration || "",
  };
}

export default function ReportHistory() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [reports, setReports] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("");
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [selectedReport, setSelectedReport] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [editState, setEditState] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");

  useEffect(() => {
    if (!isAdmin) return;
    const loadUsers = async () => {
      try {
        const response = await api.get("/api/employees", { params: { page: 1, limit: 200 } });
        setUserOptions(response.data?.employees || []);
      } catch (_error) {
        setUserOptions([]);
      }
    };
    loadUsers();
  }, [isAdmin]);

  const loadReports = async () => {
    setLoading(true);
    setError("");
    const legacyReports = getLegacyReports();
    try {
      if (!isAdmin && legacyReports.length > 0) {
        try {
          await api.post("/api/reports/sync", { reports: legacyReports });
          clearLegacyReports();
        } catch (_syncError) {
          // Keep local reports for fallback display when sync is not available.
        }
      }
      const params = isAdmin && selectedUserId !== "all" ? { userId: selectedUserId } : {};
      const response = await api.get("/api/reports", { params });
      setReports(response.data?.reports || []);
    } catch (loadError) {
      if (!isAdmin) {
        const localFallback = getNormalizedLegacyReports();
        setReports(localFallback);
        setError(loadError?.response?.data?.error || "Unable to load reports from server. Showing local reports.");
      } else {
        setReports([]);
        setError(loadError?.response?.data?.error || "Unable to load reports.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports();
  }, [isAdmin, selectedUserId]);

  const divisionOptions = useMemo(() => {
    const divisions = new Set(reports.map((item) => item.division).filter(Boolean));
    return ["All", ...Array.from(divisions)];
  }, [reports]);

  const filteredReports = useMemo(() => {
    const query = search.trim().toLowerCase();
    return reports.filter((report) => {
      const matchesSearch =
        query.length === 0 ||
        (report.task_title || "").toLowerCase().includes(query) ||
        (report.division || "").toLowerCase().includes(query);
      const matchesStatus = statusFilter === "All" || report.work_status === statusFilter;
      const matchesDate = !dateFilter || report.report_date === dateFilter;
      const matchesDivision = divisionFilter === "All" || report.division === divisionFilter;
      return matchesSearch && matchesStatus && matchesDate && matchesDivision;
    });
  }, [reports, search, statusFilter, dateFilter, divisionFilter]);
  const completedCount = filteredReports.filter((item) => item.work_status === "Completed").length;
  const pendingCount = filteredReports.filter((item) => item.work_status === "Pending").length;
  const inProgressCount = filteredReports.filter((item) => item.work_status === "In Progress").length;
  const completionRate = filteredReports.length ? Math.round((completedCount / filteredReports.length) * 100) : 0;

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this report?")) return;
    try {
      await api.delete(`/api/reports/${id}`);
      const nextReports = reports.filter((report) => report.id !== id);
      setReports(nextReports);
      if (selectedReport?.id === id) setSelectedReport(null);
    } catch (deleteError) {
      setError(deleteError?.response?.data?.error || "Failed to delete report.");
    }
  };

  const saveEdit = async () => {
    if (!editState?.taskTitle?.trim()) return;
    try {
      const response = await api.put(`/api/reports/${editState.id}`, {
        reportDate: editState.reportDate,
        taskTitle: editState.taskTitle.trim(),
        division: editState.division,
        workStatus: editState.workStatus,
        taskDescription: editState.taskDescription,
        startTime: editState.startTime,
        endTime: editState.endTime,
        duration: editState.duration,
      });
      const updated = response.data?.report;
      const nextReports = reports.map((report) => (report.id === editState.id ? updated : report));
      setReports(nextReports);
      setEditState(null);
    } catch (saveError) {
      setError(saveError?.response?.data?.error || "Failed to update report.");
    }
  };

  return (
    <PageWrapper title="Report History">
      <div className="space-y-5 rounded-xl bg-[#F4F7FB] p-4 text-[#2A2A2A] md:p-6">
        <section className="card border-[#E5EAF2] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-2xl font-semibold">Report History</h2>
              <p className="text-sm text-slate-600">
                {isAdmin ? "Review all internship reports across users and monitor completion trends." : "View all submitted internship reports."}
              </p>
            </div>
            <button type="button" onClick={() => navigate("/reports")} className="rounded-lg bg-[#5B8DEF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a7de3]">
              + New Report
            </button>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">{isAdmin ? "Total Reports (All Users)" : "Total Reports"}</p>
            <p className="mt-2 text-2xl font-semibold">{filteredReports.length}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-semibold">{completedCount}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">In Progress / Pending</p>
            <p className="mt-2 text-2xl font-semibold">{inProgressCount} / {pendingCount}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Completion Progress</p>
            <p className="mt-2 text-2xl font-semibold">{completionRate}%</p>
          </div>
        </section>

        <section className="card border-[#E5EAF2] p-4">
          <div className="grid gap-3 md:grid-cols-5">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Report..."
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2"
            />
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2">
              {STATUS_FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFilter}
              onChange={(event) => setDateFilter(event.target.value)}
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2"
            />
            <select value={divisionFilter} onChange={(event) => setDivisionFilter(event.target.value)} className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2">
              {divisionOptions.map((division) => (
                <option key={division} value={division}>
                  {division}
                </option>
              ))}
            </select>
            {isAdmin ? (
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)} className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2">
                <option value="all">All Users</option>
                {userOptions.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name || user.email || user.id}
                  </option>
                ))}
              </select>
            ) : null}
          </div>
        </section>

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          {error ? <p className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead>
                <tr className="border-b border-[#E5EAF2] text-left text-slate-500">
                  <th className="py-3 pr-2">No</th>
                  {isAdmin ? <th className="py-3 pr-2">User</th> : null}
                  <th className="py-3 pr-2">Date</th>
                  <th className="py-3 pr-2">Task Title</th>
                  <th className="py-3 pr-2">Division</th>
                  <th className="py-3 pr-2">Status</th>
                  <th className="py-3 pr-2">Attachment</th>
                  <th className="py-3 pr-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500">
                      Loading reports...
                    </td>
                  </tr>
                ) : filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 8 : 7} className="py-8 text-center text-slate-500">
                      No reports found.
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report, index) => (
                    <tr key={report.id} className="border-b border-slate-100">
                      <td className="py-3 pr-2">{index + 1}</td>
                      {isAdmin ? <td className="py-3 pr-2">{report.full_name || "-"}</td> : null}
                      <td className="py-3 pr-2">{formatDate(report.report_date)}</td>
                      <td className="py-3 pr-2">{report.task_title || "-"}</td>
                      <td className="py-3 pr-2">{report.division || "-"}</td>
                      <td className="py-3 pr-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(report.work_status)}`}>{report.work_status || "Pending"}</span>
                      </td>
                      <td className="py-3 pr-2">
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(report.attachment_url || "")}
                          className="rounded-md border border-[#E5EAF2] px-2 py-1 text-lg transition hover:bg-slate-50"
                          aria-label={`Preview attachment for ${report.task_title}`}
                        >
                          📷
                        </button>
                      </td>
                      <td className="py-3 pr-2">
                        <div className="flex flex-wrap gap-2">
                          <button type="button" onClick={() => setSelectedReport(report)} className="rounded-md border border-[#E5EAF2] px-3 py-1 text-xs font-medium hover:bg-slate-50">
                            View
                          </button>
                          <button type="button" onClick={() => setEditState(createEditState(report))} className="rounded-md border border-[#E5EAF2] px-3 py-1 text-xs font-medium hover:bg-slate-50">
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(report.id)}
                            className="rounded-md border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {previewUrl && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Attachment Preview</h3>
              <button type="button" onClick={() => setPreviewUrl("")} className="rounded-lg border border-[#E5EAF2] px-3 py-1 text-sm hover:bg-slate-50">
                Close
              </button>
            </div>
            <img src={previewUrl} alt="Task evidence attachment" className="max-h-[70vh] w-full rounded-lg object-cover" />
          </div>
        </div>
      )}

      {selectedReport && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Report Detail</h3>
              <button type="button" onClick={() => setSelectedReport(null)} className="rounded-lg border border-[#E5EAF2] px-3 py-1 text-sm hover:bg-slate-50">
                Close
              </button>
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-semibold">Task Title</span> : {selectedReport.task_title || "-"}
              </p>
              <p>
                <span className="font-semibold">Task Description</span> : {selectedReport.task_description || "-"}
              </p>
              <p>
                <span className="font-semibold">Start Time</span> : {selectedReport.start_time || "-"}
              </p>
              <p>
                <span className="font-semibold">End Time</span> : {selectedReport.end_time || "-"}
              </p>
              <p>
                <span className="font-semibold">Work Duration</span> : {selectedReport.duration || "-"}
              </p>
              <p>
                <span className="font-semibold">Division</span> : {selectedReport.division || "-"}
              </p>
              <p>
                <span className="font-semibold">Status</span> :{" "}
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStatusClass(selectedReport.work_status)}`}>
                  {selectedReport.work_status || "Pending"}
                </span>
              </p>
              <div>
                <p className="font-semibold">Attachment Photo</p>
                {selectedReport.attachment_url ? (
                  <img src={selectedReport.attachment_url} alt={selectedReport.task_title || "Attachment"} className="mt-2 h-48 w-full rounded-lg object-cover" />
                ) : (
                  <p className="text-slate-500">No attachment available.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {editState && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edit Report</h3>
              <button type="button" onClick={() => setEditState(null)} className="rounded-lg border border-[#E5EAF2] px-3 py-1 text-sm hover:bg-slate-50">
                Close
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm">
                Date
                <input type="date" className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={editState.reportDate} onChange={(e) => setEditState((prev) => ({ ...prev, reportDate: e.target.value }))} />
              </label>
              <label className="text-sm">
                Status
                <select className="mt-1 w-full rounded-lg border border-[#E5EAF2] bg-white px-3 py-2" value={editState.workStatus} onChange={(e) => setEditState((prev) => ({ ...prev, workStatus: e.target.value }))}>
                  {STATUS_FILTERS.filter((item) => item !== "All").map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm sm:col-span-2">
                Task Title
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={editState.taskTitle} onChange={(e) => setEditState((prev) => ({ ...prev, taskTitle: e.target.value }))} />
              </label>
              <label className="text-sm">
                Division
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={editState.division} onChange={(e) => setEditState((prev) => ({ ...prev, division: e.target.value }))} />
              </label>
              <label className="text-sm">
                Duration
                <input className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={editState.duration} onChange={(e) => setEditState((prev) => ({ ...prev, duration: e.target.value }))} />
              </label>
              <label className="text-sm sm:col-span-2">
                Task Description
                <textarea rows={4} className="mt-1 w-full rounded-lg border border-[#E5EAF2] px-3 py-2" value={editState.taskDescription} onChange={(e) => setEditState((prev) => ({ ...prev, taskDescription: e.target.value }))} />
              </label>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => setEditState(null)} className="rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm text-slate-700">
                Cancel
              </button>
              <button type="button" onClick={saveEdit} className="rounded-lg bg-[#5B8DEF] px-4 py-2 text-sm font-semibold text-white hover:bg-[#4a7de3]">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

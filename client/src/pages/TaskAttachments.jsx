import { useEffect, useMemo, useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";
import { clearLegacyReports, getLegacyReports, getNormalizedLegacyReports } from "../utils/reportsStorage";
import { useAuth } from "../hooks/useAuth";

const STATUS_OPTIONS = ["All Status", "Completed", "In Progress", "Pending"];

function statusBadgeClass(status) {
  if (status === "Completed") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

function formatLongDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateValue) {
  return new Date(dateValue).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TaskAttachments() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const [attachments, setAttachments] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("All Status");
  const [selectedAttachment, setSelectedAttachment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userOptions, setUserOptions] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("all");

  const today = new Date().toISOString().slice(0, 10);

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

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const legacyReports = getLegacyReports();
      try {
        if (!isAdmin && legacyReports.length > 0) {
          try {
            await api.post("/api/reports/sync", { reports: legacyReports });
            clearLegacyReports();
          } catch (_syncError) {
            // Keep local reports for fallback display.
          }
        }
        const params = isAdmin && selectedUserId !== "all" ? { userId: selectedUserId } : {};
        const response = await api.get("/api/reports", { params });
        setAttachments(response.data?.reports || []);
      } catch (_loadError) {
        if (!isAdmin) {
          setAttachments(getNormalizedLegacyReports());
        } else {
          setAttachments([]);
        }
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, [isAdmin, selectedUserId]);

  const filteredAttachments = useMemo(() => {
    const query = search.trim().toLowerCase();
    return attachments.filter((item) => {
      const matchSearch =
        query.length === 0 ||
        String(item.full_name || "").toLowerCase().includes(query) ||
        String(item.task_title || "").toLowerCase().includes(query);
      const matchDate = !selectedDate || item.report_date === selectedDate;
      const matchStatus = selectedStatus === "All Status" || item.work_status === selectedStatus;
      return matchSearch && matchDate && matchStatus;
    });
  }, [attachments, search, selectedDate, selectedStatus]);

  const totalAttachments = attachments.length;
  const todaysTasks = attachments.filter((item) => item.report_date === today).length;
  const completedTasks = attachments.filter((item) => item.work_status === "Completed").length;
  const pendingReview = attachments.filter((item) => item.work_status === "Pending").length;
  const attachmentCoverage = attachments.length ? Math.round((attachments.filter((item) => Boolean(item.attachment_url)).length / attachments.length) * 100) : 0;
  const userProgress = useMemo(() => {
    const grouped = attachments.reduce((acc, item) => {
      const key = String(item.user_id || item.full_name || "unknown");
      if (!acc[key]) {
        acc[key] = {
          key,
          name: item.full_name || "Unknown User",
          total: 0,
          completed: 0,
        };
      }
      acc[key].total += 1;
      if (item.work_status === "Completed") acc[key].completed += 1;
      return acc;
    }, {});

    return Object.values(grouped)
      .map((user) => ({
        ...user,
        completionRate: user.total ? Math.round((user.completed / user.total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
        return b.total - a.total;
      });
  }, [attachments]);

  return (
    <PageWrapper title="PKL Task Attachment Dashboard">
      <div className="space-y-5 rounded-xl bg-[#F4F7FB] p-4 text-[#2A2A2A] md:p-6">
        <section className="card border-[#E5EAF2] p-4 md:p-5">
          <h3 className="text-2xl font-semibold text-[#2A2A2A]">PKL Task Attachment Dashboard</h3>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? "Administrator monitoring view for all internship task attachments." : "Track your submitted task attachments."}
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search report..."
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] placeholder:text-slate-400 focus:ring-2"
            />
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2"
            />
            <select
              value={selectedStatus}
              onChange={(event) => setSelectedStatus(event.target.value)}
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {status}
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

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Total Attachments</p>
            <p className="mt-2 text-2xl font-semibold">{totalAttachments} Photos</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Today&apos;s Tasks</p>
            <p className="mt-2 text-2xl font-semibold">{todaysTasks} Reports</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Completed Tasks</p>
            <p className="mt-2 text-2xl font-semibold">{completedTasks}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Pending Review</p>
            <p className="mt-2 text-2xl font-semibold">{pendingReview}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4 sm:col-span-2 xl:col-span-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">{isAdmin ? "Attachment Coverage (All Reports)" : "Attachment Coverage"}</span>
              <span className="font-semibold">{attachmentCoverage}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200">
              <div className="h-2.5 rounded-full bg-[#5B8DEF]" style={{ width: `${attachmentCoverage}%` }} />
            </div>
          </div>
        </section>

        {isAdmin ? (
          <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold">User Progress</h4>
              <span className="text-xs text-slate-500">Completion rate per user</span>
            </div>
            {userProgress.length === 0 ? <p className="text-sm text-slate-500">No user progress data available.</p> : null}
            {userProgress.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {userProgress.map((user, index) => (
                  <div key={user.key} className="rounded-xl border border-[#E5EAF2] bg-[#FAFCFF] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-[#2A2A2A]">{index + 1}. {user.name}</p>
                      <span className="rounded-full bg-[#EAF1FF] px-2 py-1 text-xs font-semibold text-[#2E5FCA]">{user.completionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-[#5B8DEF]" style={{ width: `${user.completionRate}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{user.completed} completed of {user.total} reports</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h4 className="mb-4 text-lg font-semibold">Task Attachment Gallery</h4>
          {loading ? (
            <p className="rounded-lg border border-dashed border-[#E5EAF2] p-8 text-center text-sm text-slate-500">Loading task attachments...</p>
          ) : null}
          {!loading && filteredAttachments.length === 0 ? (
            <p className="rounded-lg border border-dashed border-[#E5EAF2] p-8 text-center text-sm text-slate-500">
              No task attachments yet. Submit a report to display attachments here.
            </p>
          ) : null}
          {!loading && filteredAttachments.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredAttachments.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setSelectedAttachment(item)}
                  className="overflow-hidden rounded-xl border border-[#E5EAF2] text-left transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <img src={item.attachment_url} alt={item.task_title} className="h-40 w-full object-cover" />
                  <div className="space-y-1 p-3">
                    <p className="font-semibold">{item.task_title}</p>
                    <p className="text-sm text-slate-600">{item.full_name}</p>
                    <p className="text-sm text-slate-500">{formatLongDate(item.report_date)}</p>
                    <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(item.work_status)}`}>
                      {item.work_status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h4 className="mb-4 text-lg font-semibold">Attachment Data Table</h4>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-[#E5EAF2] text-left text-slate-500">
                  <th className="py-3 pr-2">No</th>
                  <th className="py-3 pr-2">Name</th>
                  <th className="py-3 pr-2">Task</th>
                  <th className="py-3 pr-2">Date</th>
                  <th className="py-3 pr-2">Attachment</th>
                  <th className="py-3 pr-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttachments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-500">
                      No attachment data available.
                    </td>
                  </tr>
                ) : (
                  filteredAttachments.map((item, index) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="py-3 pr-2">{index + 1}</td>
                      <td className="py-3 pr-2">{item.full_name}</td>
                      <td className="py-3 pr-2">{item.task_title}</td>
                      <td className="py-3 pr-2">{formatShortDate(item.report_date)}</td>
                      <td className="py-3 pr-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAttachment(item)}
                          className="rounded-md border border-[#E5EAF2] px-2 py-1 text-lg transition hover:bg-slate-50"
                          aria-label={`Open attachment for ${item.full_name}`}
                        >
                          📷
                        </button>
                      </td>
                      <td className="py-3 pr-2">
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(item.work_status)}`}>
                          {item.work_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {selectedAttachment && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-4 shadow-xl md:p-6">
            <div className="mb-4 flex items-start justify-between">
              <h3 className="text-xl font-semibold">Attachment Detail</h3>
              <button
                type="button"
                onClick={() => setSelectedAttachment(null)}
                className="rounded-lg border border-[#E5EAF2] px-3 py-1 text-sm hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <img
              src={selectedAttachment.attachment_url}
              alt={selectedAttachment.task_title}
              className="h-72 w-full rounded-lg bg-slate-100 object-contain p-1 md:h-80"
            />
            <div className="mt-5 grid gap-2 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold">Name</span> : {selectedAttachment.full_name}
              </p>
              <p>
                <span className="font-semibold">Task</span> : {selectedAttachment.task_title}
              </p>
              <p>
                <span className="font-semibold">Date</span> : {formatLongDate(selectedAttachment.report_date)}
              </p>
              <p>
                <span className="font-semibold">Working Hours</span> : {selectedAttachment.duration || "-"}
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold">Description</span> : {selectedAttachment.task_description || "-"}
              </p>
              <p>
                <span className="font-semibold">Status</span> :{" "}
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(selectedAttachment.work_status)}`}>
                  {selectedAttachment.work_status}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}

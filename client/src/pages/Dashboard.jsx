import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";
import { clearLegacyReports, getLegacyReports, getNormalizedLegacyReports } from "../utils/reportsStorage";
import { useAuth } from "../hooks/useAuth";

function statusBadgeClass(status) {
  if (status === "Completed") return "bg-green-100 text-green-700";
  if (status === "In Progress") return "bg-yellow-100 text-yellow-700";
  return "bg-gray-100 text-gray-600";
}

function formatShortDate(dateValue) {
  const date = new Date(dateValue || Date.now());
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function Dashboard() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const navigate = useNavigate();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      const legacyReports = getLegacyReports();
      try {
        if (legacyReports.length > 0) {
          try {
            await api.post("/api/reports/sync", { reports: legacyReports });
            clearLegacyReports();
          } catch (_syncError) {
            // Keep local reports for fallback display.
          }
        }
        const response = await api.get("/api/reports");
        setReports(response.data?.reports || []);
      } catch (_loadError) {
        setReports(getNormalizedLegacyReports());
      } finally {
        setLoading(false);
      }
    };
    loadReports();
  }, []);

  const safeReports = useMemo(
    () => (Array.isArray(reports) ? reports.filter((item) => item && typeof item === "object") : []),
    [reports]
  );

  const sortedReports = useMemo(
    () =>
      [...safeReports].sort((a, b) => {
        const left = new Date(a?.report_date || a?.created_at || 0).getTime();
        const right = new Date(b?.report_date || b?.created_at || 0).getTime();
        return right - left;
      }),
    [safeReports]
  );
  const totalReports = safeReports?.length || 0;
  const todaysReports = safeReports.filter((item) => item?.report_date === today).length;
  const completedReports = safeReports.filter((item) => item?.work_status === "Completed").length;
  const pendingReports = safeReports.filter((item) => item?.work_status === "Pending").length;
  const progress = totalReports === 0 ? 0 : Math.round((completedReports / totalReports) * 100);
  const recentReports = sortedReports.slice(0, 5);
  const recentAttachments = sortedReports.filter((item) => item?.attachment_url).slice(0, 4);
  const topPerformers = useMemo(() => {
    if (!isAdmin) return [];

    const byUser = safeReports.reduce((acc, report) => {
      const key = String(report?.user_id || report?.full_name || "unknown");
      if (!acc[key]) {
        acc[key] = {
          userId: report?.user_id || null,
          name: report?.full_name || "Unknown User",
          total: 0,
          completed: 0,
        };
      }
      acc[key].total += 1;
      if (report?.work_status === "Completed") acc[key].completed += 1;
      return acc;
    }, {});

    return Object.values(byUser)
      .map((item) => ({
        ...item,
        completionRate: item.total ? Math.round((item.completed / item.total) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.completionRate !== a.completionRate) return b.completionRate - a.completionRate;
        return b.total - a.total;
      })
      .slice(0, 5);
  }, [isAdmin, safeReports]);

  return (
    <PageWrapper title="Dashboard">
      <div className="space-y-5 rounded-xl bg-[#F4F7FB] p-4 text-[#2A2A2A] md:p-6">
        <section className="card border-[#E5EAF2] p-4 md:p-5">
          <h3 className="text-2xl font-semibold text-[#2A2A2A]">Welcome Back{profile?.name ? `, ${profile.name}` : ""}</h3>
          <p className="mt-1 text-sm text-slate-500">
            {isAdmin ? "Monitor organization-wide internship progress and manage report quality." : "Track your internship report activity in one place."}
          </p>
          {isAdmin ? (
            <div className="mt-3 inline-flex items-center rounded-full border border-[#D6E4FF] bg-[#EEF4FF] px-3 py-1 text-xs font-semibold text-[#2E5FCA]">
              Administrator View
            </div>
          ) : null}
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Total Reports</p>
            <p className="mt-2 text-2xl font-semibold">{totalReports}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Today&apos;s Reports</p>
            <p className="mt-2 text-2xl font-semibold">{todaysReports}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Completed</p>
            <p className="mt-2 text-2xl font-semibold">{completedReports}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Pending</p>
            <p className="mt-2 text-2xl font-semibold">{pendingReports}</p>
          </div>
        </section>

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h4 className="mb-4 text-lg font-semibold">Internship Progress</h4>
          <div className="rounded-xl border border-[#E5EAF2] bg-[#F8FAFF] p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-slate-600">Completed reports progress</span>
              <span className="font-semibold">{progress}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-slate-200">
              <div className="h-2.5 rounded-full bg-[#5B8DEF]" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-2 text-sm text-slate-500">{completedReports} of {totalReports} reports completed.</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <div className="card border-[#E5EAF2] bg-white p-4 md:p-5">
            <h4 className="mb-4 text-lg font-semibold">Recent Reports</h4>
            {loading ? <p className="text-sm text-slate-500">Loading reports...</p> : null}
            {!loading && recentReports.length === 0 ? <p className="text-sm text-slate-500">No recent reports available.</p> : null}
            <div className="space-y-3">
              {recentReports.map((report, index) => (
                <div key={report?.id || `recent-report-${index}`} className="rounded-lg border border-[#E5EAF2] p-3">
                  <p className="font-medium">{report?.task_title || "-"}</p>
                  <p className="text-sm text-slate-500">{formatShortDate(report?.report_date || report?.created_at)} - {report?.division || "-"}</p>
                  <span className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-medium ${statusBadgeClass(report?.work_status)}`}>{report?.work_status || "Pending"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card border-[#E5EAF2] bg-white p-4 md:p-5">
            <h4 className="mb-4 text-lg font-semibold">Recent Attachments</h4>
            {loading ? <p className="text-sm text-slate-500">Loading attachments...</p> : null}
            {!loading && recentAttachments.length === 0 ? <p className="text-sm text-slate-500">No recent attachments available.</p> : null}
            <div className="grid grid-cols-2 gap-3">
              {recentAttachments.map((report, index) => (
                <div key={report?.id || `recent-attachment-${index}`} className="overflow-hidden rounded-lg border border-[#E5EAF2]">
                  <img src={report?.attachment_url || ""} alt={report?.task_title || "Attachment"} className="h-28 w-full object-cover" />
                  <div className="p-2">
                    <p className="truncate text-sm font-medium">{report?.task_title || "-"}</p>
                    <p className="text-xs text-slate-500">{formatShortDate(report?.report_date || report?.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {isAdmin ? (
          <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h4 className="text-lg font-semibold">Top Performing Users</h4>
              <span className="text-xs text-slate-500">Completion % by user</span>
            </div>
            {loading ? <p className="text-sm text-slate-500">Loading user performance...</p> : null}
            {!loading && topPerformers.length === 0 ? <p className="text-sm text-slate-500">No user report data available yet.</p> : null}
            {!loading && topPerformers.length > 0 ? (
              <div className="space-y-3">
                {topPerformers.map((user, index) => (
                  <div key={`${user.userId || user.name}-${index}`} className="rounded-xl border border-[#E5EAF2] bg-[#FAFCFF] p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="font-medium text-[#2A2A2A]">{index + 1}. {user.name}</p>
                      <span className="rounded-full bg-[#EAF1FF] px-2 py-1 text-xs font-semibold text-[#2E5FCA]">{user.completionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-200">
                      <div className="h-2 rounded-full bg-[#5B8DEF]" style={{ width: `${user.completionRate}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">{user.completed} completed of {user.total} total reports</p>
                  </div>
                ))}
              </div>
            ) : null}
          </section>
        ) : null}

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h4 className="mb-4 text-lg font-semibold">Quick Actions</h4>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <button type="button" onClick={() => navigate("/reports")} className="rounded-lg bg-[#5B8DEF] px-4 py-3 text-sm font-semibold text-white hover:bg-[#4a7de3]">
              {isAdmin ? "Manage Reports" : "+ New Report"}
            </button>
            {isAdmin ? (
              <button type="button" onClick={() => navigate("/user-accounts")} className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm font-medium hover:bg-slate-50">
                Open User Accounts
              </button>
            ) : null}
            <button type="button" onClick={() => navigate("/analytics")} className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm font-medium hover:bg-slate-50">
              View Report History
            </button>
            <button type="button" onClick={() => navigate("/task-attachments")} className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm font-medium hover:bg-slate-50">
              Open Attachments
            </button>
            <button type="button" onClick={() => navigate("/profile")} className="rounded-lg border border-[#E5EAF2] px-4 py-3 text-sm font-medium hover:bg-slate-50">
              Edit Profile
            </button>
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

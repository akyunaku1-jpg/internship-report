import { useNotifications } from "../../hooks/useNotifications";

const SAMPLE_NOTIFICATIONS = [
  {
    id: "sample-report-submitted",
    type: "report_submission",
    title: "Report Submitted",
    message: "Your report 'Daily Report - March 5' has been submitted successfully.",
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    is_read: false,
  },
  {
    id: "sample-report-reviewed",
    type: "report_review",
    title: "Supervisor Review",
    message: "Your supervisor has reviewed your weekly report.",
    created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    is_read: false,
  },
  {
    id: "sample-attachment-added",
    type: "attachment_update",
    title: "Task Attachment Update",
    message: "A new attachment has been added to your task.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    is_read: true,
  },
  {
    id: "sample-reminder",
    type: "deadline_reminder",
    title: "Deadline Reminder",
    message: "Reminder: Submit today's report before 5 PM.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 7).toISOString(),
    is_read: false,
  },
  {
    id: "sample-system-announcement",
    type: "system_announcement",
    title: "System Announcement",
    message: "The internship reporting dashboard has been updated with a new attachment gallery.",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    is_read: true,
  },
];

function resolveType(notification) {
  const rawType = String(notification.type || "").toLowerCase();
  if (rawType) return rawType;

  const haystack = `${notification.title || ""} ${notification.message || ""}`.toLowerCase();
  if (haystack.includes("review")) return "report_review";
  if (haystack.includes("attachment")) return "attachment_update";
  if (haystack.includes("reminder") || haystack.includes("deadline")) return "deadline_reminder";
  if (haystack.includes("announcement")) return "system_announcement";
  return "report_submission";
}

function iconForType(type) {
  if (type === "report_review") return "✅";
  if (type === "attachment_update") return "📎";
  if (type === "deadline_reminder") return "⏰";
  if (type === "system_announcement") return "📢";
  return "📝";
}

function iconToneClass(type) {
  if (type === "report_review") return "bg-emerald-100 text-emerald-700";
  if (type === "attachment_update") return "bg-violet-100 text-violet-700";
  if (type === "deadline_reminder") return "bg-amber-100 text-amber-700";
  if (type === "system_announcement") return "bg-slate-100 text-slate-700";
  return "bg-blue-100 text-blue-700";
}

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  const diffMs = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.floor(diffMs / minute));
    return `${minutes}m ago`;
  }
  if (diffMs < day) {
    const hours = Math.floor(diffMs / hour);
    return `${hours}h ago`;
  }
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationPanel() {
  const { open, setOpen, items, markAllRead, markRead, remove } = useNotifications();
  if (!open) return null;

  const visibleItems = items.length > 0 ? items : SAMPLE_NOTIFICATIONS;
  const hasPersistedNotifications = items.length > 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-[1px]" onClick={() => setOpen(false)}>
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-md border-l border-[#E5EAF2] bg-[#F8FAFF] p-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 rounded-xl border border-[#E5EAF2] bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-semibold text-[#2A2A2A]">Notifications</h3>
              <p className="text-sm text-slate-500">Internship reporting updates and reminders.</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg border border-[#E5EAF2] px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
            <span>{visibleItems.filter((item) => !item.is_read).length} unread</span>
            <button
              type="button"
              onClick={markAllRead}
              disabled={!hasPersistedNotifications}
              className="rounded-md border border-[#E5EAF2] px-2 py-1 font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mark all as read
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-180px)] space-y-3 overflow-y-auto pr-1">
          {visibleItems.map((item) => {
            const resolvedType = resolveType(item);
            return (
              <article
                key={item.id}
                className={`rounded-xl border bg-white p-3 shadow-sm transition hover:shadow-md ${
                  item.is_read ? "border-[#E5EAF2]" : "border-[#D9E6FF]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-base ${iconToneClass(resolvedType)}`}>
                    <span aria-hidden>{iconForType(resolvedType)}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="truncate text-sm font-semibold text-[#2A2A2A]">{item.title || "Notification"}</h4>
                      {!item.is_read ? <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-blue-500" title="Unread" /> : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{item.message || "-"}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-400">{formatTimestamp(item.created_at)}</span>
                      {hasPersistedNotifications ? (
                        <div className="flex gap-2">
                          {!item.is_read ? (
                            <button
                              type="button"
                              onClick={() => markRead(item.id)}
                              className="rounded-md border border-[#E5EAF2] px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                            >
                              Mark read
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => remove(item.id)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}

          {!hasPersistedNotifications ? (
            <div className="rounded-xl border border-dashed border-[#D6E2F5] bg-white p-3 text-xs text-slate-500">
              Showing sample notifications preview. Real notifications will appear once system events are generated.
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}

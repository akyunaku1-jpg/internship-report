export function statusColor(status) {
  const map = {
    active: "bg-green-100 text-green-700",
    inactive: "bg-red-100 text-red-700",
    "on leave": "bg-yellow-100 text-yellow-700",
    lead: "bg-blue-100 text-blue-700",
    junior: "bg-gray-100 text-gray-600",
    senior: "bg-purple-100 text-purple-700",
  };
  return map[String(status || "").toLowerCase()] || "bg-slate-100 text-slate-700";
}

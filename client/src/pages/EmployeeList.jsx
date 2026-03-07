import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import { useEmployees } from "../hooks/useEmployees";
import { exportCsv } from "../utils/exportCsv";
import { formatDate } from "../utils/formatDate";

function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key] || "Other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(item);
    return acc;
  }, {});
}

export default function EmployeeList() {
  const [query, setQuery] = useState("");
  const [searchBy, setSearchBy] = useState("all");
  const [department, setDepartment] = useState("");
  const [page, setPage] = useState(1);
  const { employees, pagination, loading } = useEmployees({ search: query, searchBy, department, page, limit: 10, groupBy: "department" });
  const grouped = useMemo(() => groupBy(employees, "department"), [employees]);

  return (
    <PageWrapper title="User Accounts">
      <div className="card p-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">User Accounts</h2>
            <p className="text-sm text-slate-500">Administrator view: manage all user and admin accounts.</p>
          </div>
          <div className="flex gap-2">
            <select
              value={searchBy}
              onChange={(e) => {
                setSearchBy(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border px-3 py-2"
            >
              <option value="all">Name or Email</option>
              <option value="name">Name only</option>
              <option value="email">Email only</option>
            </select>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder={searchBy === "email" ? "Search by email" : searchBy === "name" ? "Search by name" : "Search by name or email"}
              className="rounded-lg border px-3 py-2"
            />
            <select value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-lg border px-3 py-2">
              <option value="">All Departments</option>
              <option>Engineering</option>
              <option>Design</option>
              <option>Marketing</option>
              <option>HR</option>
            </select>
            <button
              className="rounded-lg border px-3 py-2"
              onClick={() =>
                exportCsv(
                  "employees.csv",
                  employees.map((e) => ({ name: e.name, email: e.email, department: e.department, role: e.role }))
                )
              }
            >
              Export CSV
            </button>
            <Link to="/employees/new" className="rounded-lg bg-blue-600 px-3 py-2 text-white">
              + New Candidate
            </Link>
          </div>
        </div>
        {loading && <p>Loading...</p>}
        {!loading &&
          Object.entries(grouped).map(([section, rows]) => (
            <details key={section} open className="mb-4">
              <summary className="cursor-pointer rounded-lg bg-slate-100 px-3 py-2 font-semibold dark:bg-slate-700">
                {section} <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs">{rows.length}</span>
              </summary>
              <table className="mt-2 w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th className="py-2">Employee ID</th>
                    <th>Name</th>
                    <th>Account Role</th>
                    <th>Phone</th>
                    <th>Join Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((e, index) => (
                    <tr key={e.id} className={index % 2 ? "bg-slate-50 dark:bg-slate-800/50" : ""}>
                      <td className="py-2">{e.employee_id || "-"}</td>
                      <td>{e.name}</td>
                      <td>
                        <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${e.role === "admin" ? "bg-violet-100 text-violet-700" : "bg-blue-100 text-blue-700"}`}>
                          {e.role || "employee"}
                        </span>
                      </td>
                      <td>{e.phone || "-"}</td>
                      <td>{formatDate(e.join_date)}</td>
                      <td className="space-x-2">
                        <Link to={`/employees/${e.id}`} className="text-blue-600">
                          View
                        </Link>
                        <Link to={`/employees/${e.id}/edit`} className="text-green-600">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          ))}
        <div className="mt-3 flex items-center justify-end gap-2">
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="rounded border px-3 py-1">
            Prev
          </button>
          <span className="text-sm">
            Page {pagination.page || 1} of {pagination.totalPages || 1}
          </span>
          <button disabled={(pagination.page || 1) >= (pagination.totalPages || 1)} onClick={() => setPage((p) => p + 1)} className="rounded border px-3 py-1">
            Next
          </button>
        </div>
      </div>
    </PageWrapper>
  );
}

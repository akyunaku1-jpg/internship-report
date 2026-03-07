import { useMemo, useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import { useEmployees } from "../hooks/useEmployees";

function buildTeamMap(employees) {
  return employees.reduce((acc, employee) => {
    const teamName = String(employee.department || "").trim() || "Unassigned Team";
    if (!acc[teamName]) {
      acc[teamName] = {
        name: teamName,
        members: [],
      };
    }
    acc[teamName].members.push(employee);
    return acc;
  }, {});
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "U";
  return `${parts[0][0] || ""}${parts[1]?.[0] || ""}`.toUpperCase();
}

export default function Teams() {
  const [query, setQuery] = useState("");
  const [activeTeam, setActiveTeam] = useState("All Teams");
  const { employees, loading } = useEmployees({ page: 1, limit: 200 });

  const teamMap = useMemo(() => buildTeamMap(employees || []), [employees]);
  const teams = useMemo(() => Object.values(teamMap).sort((a, b) => a.name.localeCompare(b.name)), [teamMap]);

  const teamStats = useMemo(
    () =>
      teams.map((team) => ({
        ...team,
        activeCount: team.members.filter((member) => member.status === "active" || member.status === "Active").length,
      })),
    [teams]
  );

  const filteredMembers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const sourceMembers =
      activeTeam === "All Teams"
        ? teams.flatMap((team) => team.members.map((member) => ({ ...member, _teamName: team.name })))
        : (teamMap[activeTeam]?.members || []).map((member) => ({ ...member, _teamName: activeTeam }));

    if (!normalizedQuery) return sourceMembers;

    return sourceMembers.filter((member) => {
      return [member.name, member.email, member.position, member.phone, member.employee_id]
        .map((value) => String(value || "").toLowerCase())
        .some((value) => value.includes(normalizedQuery));
    });
  }, [activeTeam, query, teamMap, teams]);

  return (
    <PageWrapper title="Teams">
      <div className="space-y-5 rounded-xl bg-[#F4F7FB] p-4 text-[#2A2A2A] md:p-6">
        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h3 className="text-2xl font-semibold text-[#2A2A2A]">Teams & Team Members</h3>
          <p className="mt-1 text-sm text-slate-500">Manage team structure and view each member in one place.</p>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_220px]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search member name, email, role..."
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] placeholder:text-slate-400 focus:ring-2"
            />
            <select
              value={activeTeam}
              onChange={(event) => setActiveTeam(event.target.value)}
              className="rounded-lg border border-[#E5EAF2] bg-white px-3 py-2 text-sm outline-none ring-[#5B8DEF] focus:ring-2"
            >
              <option value="All Teams">All Teams</option>
              {teamStats.map((team) => (
                <option key={team.name} value={team.name}>
                  {team.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Total Teams</p>
            <p className="mt-2 text-2xl font-semibold">{teamStats.length}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Total Members</p>
            <p className="mt-2 text-2xl font-semibold">{employees.length}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Active Team</p>
            <p className="mt-2 text-2xl font-semibold">{activeTeam === "All Teams" ? "-" : activeTeam}</p>
          </div>
          <div className="card border-[#E5EAF2] bg-white p-4">
            <p className="text-sm text-slate-500">Shown Members</p>
            <p className="mt-2 text-2xl font-semibold">{filteredMembers.length}</p>
          </div>
        </section>

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h4 className="mb-4 text-lg font-semibold">Team Collections</h4>
          {loading ? <p className="text-sm text-slate-500">Loading teams...</p> : null}
          {!loading && teamStats.length === 0 ? <p className="text-sm text-slate-500">No teams available yet.</p> : null}
          {!loading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {teamStats.map((team) => (
                <button
                  type="button"
                  key={team.name}
                  onClick={() => setActiveTeam(team.name)}
                  className={`rounded-xl border p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                    activeTeam === team.name ? "border-[#5B8DEF] bg-[#F5F8FF]" : "border-[#E5EAF2] bg-white"
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="font-semibold text-[#2A2A2A]">{team.name}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">{team.members.length} members</span>
                  </div>
                  <p className="text-sm text-slate-500">{team.activeCount} active members</p>
                </button>
              ))}
            </div>
          ) : null}
        </section>

        <section className="card border-[#E5EAF2] bg-white p-4 md:p-5">
          <h4 className="mb-4 text-lg font-semibold">Team Member Display</h4>
          {loading ? <p className="text-sm text-slate-500">Loading members...</p> : null}
          {!loading && filteredMembers.length === 0 ? <p className="text-sm text-slate-500">No members match your current filter.</p> : null}
          {!loading && filteredMembers.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {filteredMembers.map((member) => (
                <article key={member.id} className="rounded-xl border border-[#E5EAF2] p-4 shadow-sm transition hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        member.status === "active" || member.status === "Active" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {member.status || "Active"}
                    </span>
                    <span className="text-xs text-slate-500">{member._teamName}</span>
                  </div>
                  <div className="mb-3 flex items-center gap-3">
                    {member.avatar_url ? (
                      <img src={member.avatar_url} alt={member.name || "Member"} className="h-12 w-12 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF1FF] text-sm font-semibold text-[#5B8DEF]">
                        {getInitials(member.name)}
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-[#2A2A2A]">{member.name || "Unknown Member"}</p>
                      <p className="text-xs text-slate-500">{member.position || member.role || "Team Member"}</p>
                    </div>
                  </div>
                  <div className="space-y-1 text-xs text-slate-500">
                    <p className="truncate">Email: {member.email || "-"}</p>
                    <p>Phone: {member.phone || "-"}</p>
                    <p>Employee ID: {member.employee_id || "-"}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </PageWrapper>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";

const defaultTasks = [
  { task_name: "Office Tour", completion_percentage: 100, is_completed: true },
  { task_name: "Management Introductory", completion_percentage: 20, is_completed: false },
  { task_name: "Work Tools", completion_percentage: 20, is_completed: false },
  { task_name: "Meet Your Colleagues", completion_percentage: 0, is_completed: false },
  { task_name: "Duties Journal", completion_percentage: 0, is_completed: false },
  { task_name: "Requests Handling", completion_percentage: 0, is_completed: false },
  { task_name: "Activity Tracking", completion_percentage: 0, is_completed: false },
];

export default function EmployeeOnboarding() {
  const { id } = useParams();
  const [tasks, setTasks] = useState(defaultTasks);

  useEffect(() => {
    api.get(`/api/employees/${id}/onboarding`).then((res) => setTasks(res.data.tasks.length ? res.data.tasks : defaultTasks)).catch(() => null);
  }, [id]);

  const completion = useMemo(
    () => Math.round(tasks.reduce((acc, t) => acc + Number(t.completion_percentage || 0), 0) / tasks.length),
    [tasks]
  );

  const toggle = async (task) => {
    const updated = tasks.map((t) =>
      t.task_name === task.task_name ? { ...t, is_completed: !t.is_completed, completion_percentage: t.is_completed ? 0 : 100 } : t
    );
    setTasks(updated);
    await api.put(`/api/employees/${id}/onboarding`, { tasks: updated });
  };

  return (
    <PageWrapper title="Employee Onboarding">
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card space-y-3 p-4">
          <div className="h-28 w-28 rounded-xl bg-slate-200" />
          <a className="text-sm text-blue-600">Change Profile Image</a>
          {["First Name", "Last Name", "Email", "Company", "Phone"].map((f) => (
            <input key={f} className="w-full rounded-lg border px-3 py-2" placeholder={f} readOnly={f === "Company"} />
          ))}
          <button className="w-full rounded-lg bg-blue-600 py-2 text-white">Save Changes</button>
          <button className="w-full rounded-lg border py-2">Cancel</button>
        </section>
        <section className="card space-y-3 p-4">
          <h3 className="font-semibold">Role & Team</h3>
          <select className="w-full rounded-lg border px-3 py-2">
            <option>Employee</option>
            <option>Manager</option>
            <option>Admin</option>
          </select>
          <div className="space-y-2">
            {["Alex", "Britt", "Casey"].map((n) => (
              <div key={n} className="flex items-center gap-2 rounded-lg border p-2">
                <div className="h-8 w-8 rounded-full bg-slate-200" />
                <span>{n}</span>
              </div>
            ))}
            <button className="rounded-lg border px-3 py-2">+ Add member</button>
          </div>
        </section>
        <section className="card space-y-3 p-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold">Onboarding</h3>
            <button className="rounded-lg border border-red-400 px-3 py-1 text-red-500">Delete</button>
          </div>
          <input type="date" className="w-full rounded-lg border px-3 py-2" />
          <div className="flex items-center justify-between">
            <span>Onboarding Required</span>
            <input type="checkbox" defaultChecked />
          </div>
          <select className="w-full rounded-lg border px-3 py-2">
            <option>Onboarding</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
          <p className="text-sm font-medium">Progress: {completion}%</p>
          <div className="h-2 rounded bg-slate-200">
            <div className="h-2 rounded bg-blue-600" style={{ width: `${completion}%` }} />
          </div>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.task_name}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={task.is_completed} onChange={() => toggle(task)} />
                    {task.task_name}
                  </label>
                  <span>{task.completion_percentage}%</span>
                </div>
                <div className="h-2 rounded bg-slate-200">
                  <div className="h-2 rounded bg-blue-600" style={{ width: `${task.completion_percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </PageWrapper>
  );
}

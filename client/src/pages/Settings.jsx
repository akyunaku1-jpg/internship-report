import { useContext, useEffect, useState } from "react";
import PageWrapper from "../components/layout/PageWrapper";
import api from "../lib/axios";
import { ThemeContext } from "../context/ThemeContext";

export default function Settings() {
  const { theme, setTheme } = useContext(ThemeContext);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notificationToggles, setNotificationToggles] = useState({
    payroll: true,
    attendance: true,
    security: true,
  });

  useEffect(() => {
    api.get("/api/settings").then((res) => {
      const map = Object.fromEntries((res.data.settings || []).map((s) => [s.key, s.value]));
      setNotificationToggles({
        payroll: map.notify_payroll !== "false",
        attendance: map.notify_attendance !== "false",
        security: map.notify_security !== "false",
      });
    });
  }, []);

  const save = async () => {
    const settings = [
      { key: "dark_mode", value: theme },
      { key: "notify_payroll", value: String(notificationToggles.payroll) },
      { key: "notify_attendance", value: String(notificationToggles.attendance) },
      { key: "notify_security", value: String(notificationToggles.security) },
    ];
    await api.put("/api/settings", { settings, email, password });
    alert("✓ Changes saved successfully.");
  };

  return (
    <PageWrapper title="Settings">
      <div className="space-y-4">
        <section className="card p-4">
          <h3 className="mb-3 text-lg font-semibold">Account</h3>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="rounded-lg border px-3 py-2" placeholder="Update email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <input className="rounded-lg border px-3 py-2" placeholder="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </section>
        <section className="card p-4">
          <h3 className="mb-3 text-lg font-semibold">Appearance</h3>
          <div className="flex gap-2">
            {["light", "dark", "auto"].map((mode) => (
              <button
                key={mode}
                onClick={() => setTheme(mode)}
                className={`rounded-lg px-3 py-2 capitalize ${theme === mode ? "bg-blue-600 text-white" : "border"}`}
              >
                {mode}
              </button>
            ))}
          </div>
        </section>
        <section className="card p-4">
          <h3 className="mb-3 text-lg font-semibold">Notifications</h3>
          {Object.entries(notificationToggles).map(([k, v]) => (
            <label key={k} className="mb-2 flex items-center justify-between">
              <span className="capitalize">{k}</span>
              <input type="checkbox" checked={v} onChange={() => setNotificationToggles((p) => ({ ...p, [k]: !p[k] }))} />
            </label>
          ))}
        </section>
        <section className="card p-4">
          <h3 className="mb-3 text-lg font-semibold">Security</h3>
          <label className="flex items-center justify-between">
            <span>Two-factor auth</span>
            <input type="checkbox" />
          </label>
        </section>
        <section className="card p-4">
          <h3 className="mb-3 text-lg font-semibold">About</h3>
          <p className="text-sm text-slate-500">App version v1.0 © 2026</p>
          <p className="text-sm text-slate-500">Terms | Privacy Policy</p>
        </section>
        <button className="rounded-lg bg-blue-600 px-4 py-2 text-white" onClick={save}>
          Save
        </button>
      </div>
    </PageWrapper>
  );
}

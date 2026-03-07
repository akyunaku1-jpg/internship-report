import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../../hooks/useAuth";

const userNavItems = [
  { label: "Dashboard", to: "/dashboard", icon: "🏠" },
  { label: "Submit Report", to: "/reports", icon: "📝" },
  { label: "Report History", to: "/analytics", icon: "📋" },
  { label: "Data Export", to: "/data-export", icon: "📤" },
  { label: "Task Attachments", to: "/task-attachments", icon: "📎" },
  { label: "Profile", to: "/profile", icon: "👤" },
];

const adminNavItems = [
  { label: "Dashboard", to: "/dashboard", icon: "🏠" },
  { label: "Teams", to: "/teams", icon: "👥" },
  { label: "User Accounts", to: "/user-accounts", icon: "🧑‍💼" },
  { label: "Report History", to: "/analytics", icon: "📋" },
  { label: "Data Export", to: "/data-export", icon: "📤" },
  { label: "Task Attachments", to: "/task-attachments", icon: "📎" },
  { label: "Profile", to: "/profile", icon: "👤" },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const { profile, signOut } = useAuth();
  const isAdmin = profile?.role === "admin";
  const navItems = isAdmin ? adminNavItems : userNavItems;
  return (
    <aside className={`${collapsed ? "w-20" : "w-64"} fixed left-0 top-0 h-full border-r border-slate-700/50 bg-gradient-to-b from-[#1b2741] to-[#131d33] text-slate-200 transition-all duration-300`}>
      <div className="flex items-center justify-between p-4">
        {!collapsed && <h1 className="text-lg font-semibold tracking-tight text-white">PKL System</h1>}
        <button onClick={() => setCollapsed((p) => !p)} className="rounded-lg bg-white/10 p-2 hover:bg-white/15">
          ≡
        </button>
      </div>
      <nav className="space-y-1 px-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${
                isActive ? "bg-[#3A6FE2] text-white shadow-[0_8px_18px_rgba(58,111,226,0.35)]" : "text-slate-300 hover:bg-white/10 hover:text-white"
              }`
            }
            title={item.label}
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/10 text-sm group-hover:bg-white/15">{item.icon}</span>
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>
      <div className="absolute bottom-0 w-full border-t border-slate-700/60 p-4">
        {!collapsed && (
          <div className="mb-3 rounded-xl bg-white/10 p-3">
            <p className="truncate text-sm font-semibold text-white">{profile?.name || "User"}</p>
            <p className="text-xs capitalize text-slate-300">{isAdmin ? "Administrator" : profile?.role || "employee"}</p>
          </div>
        )}
        <button onClick={signOut} className="w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-medium hover:bg-white/20">
          Logout
        </button>
      </div>
    </aside>
  );
}

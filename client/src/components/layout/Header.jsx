import { useNotifications } from "../../hooks/useNotifications";
import { useAuth } from "../../hooks/useAuth";

export default function Header({ title = "Overview" }) {
  const { unread, setOpen } = useNotifications();
  const { profile } = useAuth();
  const initial = String(profile?.name || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E6ECF8] bg-white/85 p-4 backdrop-blur-lg">
      <h2 className="text-xl font-semibold tracking-tight text-[#1E2C45]">{title}</h2>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-[#E3EAF8] bg-white px-3 py-2 md:flex">
          <span className="text-slate-400">🔍</span>
          <input placeholder="Search..." className="w-44 border-0 bg-transparent p-0 text-sm ring-0 focus:ring-0" />
        </div>
        <button className="relative rounded-xl border border-[#E3EAF8] bg-white p-2.5 hover:bg-slate-50" onClick={() => setOpen(true)}>
          🔔
          {unread > 0 && <span className="absolute -right-1 -top-1 rounded-full bg-blue-600 px-1 text-xs text-white">{unread}</span>}
        </button>
        <div className="flex items-center gap-2 rounded-xl border border-[#E3EAF8] bg-white px-2.5 py-1.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#EAF1FF] text-xs font-bold text-[#3A6FE2]">{initial}</div>
          <div className="text-right">
            <p className="max-w-[130px] truncate text-sm font-semibold text-[#1E2C45]">{profile?.name || "User"}</p>
            <p className="text-xs capitalize text-slate-500">{profile?.role || "employee"}</p>
          </div>
        </div>
      </div>
    </header>
  );
}

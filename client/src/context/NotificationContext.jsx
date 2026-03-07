import { createContext, useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { useAuth } from "../hooks/useAuth";

export const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!user) return;
    const res = await api.get("/api/notifications");
    setItems(res.data.notifications || []);
  };

  useEffect(() => {
    load().catch(() => null);
  }, [user]);

  const unread = items.filter((i) => !i.is_read).length;

  const value = useMemo(
    () => ({
      items,
      unread,
      open,
      setOpen,
      reload: load,
      markAllRead: async () => {
        await api.put("/api/notifications/read-all");
        await load();
      },
      markRead: async (id) => {
        await api.put(`/api/notifications/${id}/read`);
        await load();
      },
      remove: async (id) => {
        await api.delete(`/api/notifications/${id}`);
        await load();
      },
    }),
    [items, open, unread]
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

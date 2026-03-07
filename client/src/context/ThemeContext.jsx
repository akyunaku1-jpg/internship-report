import { createContext, useEffect, useMemo, useState } from "react";
import api from "../lib/axios";
import { useAuth } from "../hooks/useAuth";

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user } = useAuth();
  const [theme, setTheme] = useState(localStorage.getItem("dark_mode") || "light");

  useEffect(() => {
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("dark_mode", theme);
  }, [theme]);

  useEffect(() => {
    if (!user) return;
    api
      .get("/api/settings")
      .then((res) => {
        const mode = res.data?.settings?.find((s) => s.key === "dark_mode")?.value;
        if (mode && ["light", "dark", "auto"].includes(mode)) setTheme(mode === "auto" ? "light" : mode);
      })
      .catch(() => null);
  }, [user]);

  const updateTheme = async (value) => {
    setTheme(value);
    if (user) {
      await api.put("/api/settings", { settings: [{ key: "dark_mode", value }] });
    }
  };

  const value = useMemo(() => ({ theme, setTheme: updateTheme }), [theme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

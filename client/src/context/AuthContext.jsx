import { createContext, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import api from "../lib/axios";
import { clearLegacyReports, getLegacyReports } from "../utils/reportsStorage";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    };
    load();

    const { data } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user?.id) {
      setProfile(null);
      return;
    }
    const loadProfile = async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setProfile(data ?? null);
    };
    loadProfile();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const syncLocalReports = async () => {
      const legacyReports = getLegacyReports();
      if (!legacyReports.length) return;

      try {
        await api.post("/api/reports/sync", { reports: legacyReports });
        clearLegacyReports();
      } catch (_error) {
        // Keep local reports and retry next authenticated session.
      }
    };

    syncLocalReports();
  }, [user?.id]);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      signOut: () => supabase.auth.signOut(),
    }),
    [user, profile, session, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

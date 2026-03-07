import { useEffect, useState } from "react";
import api from "../lib/axios";

export function useEmployees(params = {}) {
  const [data, setData] = useState({ employees: [], pagination: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/api/employees", { params, signal: controller.signal });
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => controller.abort();
  }, [JSON.stringify(params)]);

  return { ...data, loading };
}

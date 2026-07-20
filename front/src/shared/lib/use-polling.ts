"use client";

import { useCallback, useEffect, useState } from "react";

export function usePolling<T>(url: string, intervalMs = 2000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed");
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
    const id = setInterval(fetchData, intervalMs);
    const onScenario = () => fetchData();
    window.addEventListener("scenario-changed", onScenario);
    return () => {
      clearInterval(id);
      window.removeEventListener("scenario-changed", onScenario);
    };
  }, [fetchData, intervalMs]);

  return { data, loading, error, refetch: fetchData };
}

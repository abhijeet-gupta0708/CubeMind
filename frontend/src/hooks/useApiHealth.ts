import { useCallback, useEffect, useState } from "react";
import { api, type HealthResponse } from "../lib/api";

export type ApiStatus = "loading" | "online" | "offline";

export interface ApiHealthState {
  status: ApiStatus;
  health: HealthResponse | null;
  error: string | null;
  checkedAt: number | null;
  refreshing: boolean;
  refresh: () => Promise<void>;
}

export function useApiHealth(pollMs = 60_000): ApiHealthState {
  const [status, setStatus] = useState<ApiStatus>("loading");
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checkedAt, setCheckedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await api.health();
      setHealth(data);
      setStatus(data.status === "ok" ? "online" : "offline");
      setError(data.status === "ok" ? null : "The API reported an unhealthy status.");
    } catch (caught) {
      setHealth(null);
      setStatus("offline");
      setError(caught instanceof Error ? caught.message : "Cannot reach the solver API.");
    } finally {
      setRefreshing(false);
      setCheckedAt(Date.now());
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => {
      void refresh();
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [pollMs, refresh]);

  return { status, health, error, checkedAt, refreshing, refresh };
}

export function relativeTime(timestamp: number | null): string {
  if (!timestamp) return "never";
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

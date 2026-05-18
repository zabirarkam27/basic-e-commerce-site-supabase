const ANALYTICS_SESSION_KEY = "noor_honey_analytics_session";

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return null;

  const existing = window.localStorage.getItem(ANALYTICS_SESSION_KEY);
  if (existing) return existing;

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  window.localStorage.setItem(ANALYTICS_SESSION_KEY, id);
  return id;
}

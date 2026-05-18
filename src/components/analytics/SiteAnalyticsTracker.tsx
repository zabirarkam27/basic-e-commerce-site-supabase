import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { saveAnalyticsSession } from "@/lib/analytics.functions";
import { getAnalyticsSessionId } from "@/lib/analytics-session";
import { trackPageView } from "@/lib/tracking-events";

function getLandingSlug(pathname: string) {
  const match = pathname.match(/^\/p\/([^/?#]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function SiteAnalyticsTracker() {
  const location = useLocation();
  const saveSession = useServerFn(saveAnalyticsSession);
  const sessionIdRef = useRef<string | null>(null);
  const path = location.pathname;
  const shouldTrack = !path.startsWith("/admin");
  const landingSlug = useMemo(() => getLandingSlug(path), [path]);

  useEffect(() => {
    sessionIdRef.current = getAnalyticsSessionId();
  }, []);

  useEffect(() => {
    if (!shouldTrack) return;

    trackPageView(path);

    const sendHeartbeat = () => {
      const sessionId = sessionIdRef.current;
      if (!sessionId || document.visibilityState === "hidden") return;

      saveSession({
        data: {
          session_id: sessionId,
          current_path: path,
          landing_page_slug: landingSlug,
          referrer: document.referrer || null,
          user_agent: navigator.userAgent || null,
        },
      }).catch(() => {});
    };

    sendHeartbeat();
    const interval = window.setInterval(sendHeartbeat, 15000);
    document.addEventListener("visibilitychange", sendHeartbeat);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", sendHeartbeat);
    };
  }, [landingSlug, path, saveSession, shouldTrack]);

  return null;
}

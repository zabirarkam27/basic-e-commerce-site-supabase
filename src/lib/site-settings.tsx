import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SiteSettings = {
  brand_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string; // hex e.g. #ff5733
  font_family: string;
  contact_phone: string;
  contact_email: string;
  contact_address: string;
  contact_location_url: string;
  ga_measurement_id: string;
  meta_pixel_id: string;
  google_ads_id: string;
  show_product_ratings: boolean;
  social_facebook: string;
  social_instagram: string;
  social_youtube: string;
  social_tiktok: string;
  social_twitter: string;
  social_linkedin: string;
  social_whatsapp: string;
  order_notification_email: string;
  order_notification_whatsapp: string;
};

export const DEFAULT_SETTINGS: SiteSettings = {
  brand_name: "Noor Honey",
  logo_url: "",
  favicon_url: "",
  primary_color: "#ef4444",
  font_family: "Inter",
  contact_phone: "",
  contact_email: "",
  contact_address: "",
  contact_location_url: "",
  ga_measurement_id: "",
  meta_pixel_id: "",
  google_ads_id: "",
  show_product_ratings: true,
  social_facebook: "",
  social_instagram: "",
  social_youtube: "",
  social_tiktok: "",
  social_twitter: "",
  social_linkedin: "",
  social_whatsapp: "",
  order_notification_email: "",
  order_notification_whatsapp: "",
};

const BOOLEAN_KEYS: Set<keyof SiteSettings> = new Set(["show_product_ratings"]);

export function mergeSettings(
  rows: { key: string; value: unknown }[] | null | undefined,
): SiteSettings {
  const map = new Map((rows ?? []).map((s) => [s.key, s.value]));
  const merged = { ...DEFAULT_SETTINGS } as Record<keyof SiteSettings, string | boolean>;
  (Object.keys(DEFAULT_SETTINGS) as (keyof SiteSettings)[]).forEach((k) => {
    const v = map.get(k);
    if (v === undefined || v === null) return;
    if (BOOLEAN_KEYS.has(k)) {
      merged[k] = v === true || v === "true" || v === 1 || v === "1";
    } else {
      merged[k] = String(v);
    }
  });
  return merged as SiteSettings;
}

export const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Roboto",
  "Manrope",
  "DM Sans",
  "Nunito",
  "Playfair Display",
  "Montserrat",
  "Lato",
];

const SiteCtx = createContext<{ settings: SiteSettings; loading: boolean }>({
  settings: DEFAULT_SETTINGS,
  loading: true,
});

export function useSiteSettings() {
  return useContext(SiteCtx);
}

function loadGoogleFont(family: string) {
  if (!family || typeof document === "undefined") return;
  const id = "site-font-link";
  const href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
    family,
  )}:wght@400;500;600;700;800&display=swap`;
  let link = document.getElementById(id) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }
  if (link.href !== href) link.href = href;
}

function setFavicon(url: string) {
  if (typeof document === "undefined" || !url) return;
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

function applyTheme(s: SiteSettings) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (s.primary_color) {
    root.style.setProperty("--primary", s.primary_color);
    root.style.setProperty("--ring", s.primary_color);
    root.style.setProperty("--destructive", s.primary_color);
  }
  if (s.font_family) {
    loadGoogleFont(s.font_family);
    root.style.setProperty(
      "--site-font",
      `"${s.font_family}", system-ui, -apple-system, sans-serif`,
    );
    document.body.style.fontFamily = `var(--site-font)`;
  }
  if (s.favicon_url) setFavicon(s.favicon_url);
  applyTracking(s);
}

function removeById(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (el) el.remove();
}

function injectScript(id: string, opts: { src?: string; async?: boolean; html?: string }) {
  removeById(id);
  const s = document.createElement("script");
  s.id = id;
  if (opts.async) s.async = true;
  if (opts.src) s.src = opts.src;
  if (opts.html) s.text = opts.html;
  document.head.appendChild(s);
}

function injectNoscript(id: string, html: string) {
  removeById(id);
  const n = document.createElement("noscript");
  n.id = id;
  n.innerHTML = html;
  document.body.appendChild(n);
}

export function applyTracking(
  s: Pick<SiteSettings, "ga_measurement_id" | "meta_pixel_id" | "google_ads_id">,
) {
  if (typeof document === "undefined") return;

  // Google Analytics (GA4) + Google Ads (gtag share one loader)
  const gaIds = (s.ga_measurement_id ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const adsIds = (s.google_ads_id ?? "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const gtagIds = [...gaIds, ...adsIds];

  ["gtag-loader", "gtag-init"].forEach(removeById);
  if (gtagIds.length > 0) {
    injectScript("gtag-loader", {
      src: `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gtagIds[0])}`,
      async: true,
    });
    const configs = gtagIds.map((id) => `gtag('config', '${id}');`).join("\n");
    injectScript("gtag-init", {
      html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
${configs}`,
    });
  }

  // Meta Pixel
  ["meta-pixel-init", "meta-pixel-noscript"].forEach(removeById);
  const pixelId = s.meta_pixel_id?.trim();
  if (pixelId) {
    injectScript("meta-pixel-init", {
      html: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`,
    });
    injectNoscript(
      "meta-pixel-noscript",
      `<img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1" alt="" />`,
    );
  }
}

export function SiteSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      if (!mounted) return;
      const merged = mergeSettings(data);
      setSettings(merged);
      applyTheme(merged);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return <SiteCtx.Provider value={{ settings, loading }}>{children}</SiteCtx.Provider>;
}

// Shared courier provider metadata — used by both admin UI and server functions.
export type CourierProvider = "steadfast" | "pathao" | "redx" | "paperfly" | "ecourier";

export type CourierProviderMeta = {
  id: CourierProvider;
  name: string;
  /** Bengali short tag shown on chips */
  shortBn: string;
  /** Hex accent (chip border/bg) */
  accent: string;
  website: string;
  /** True = full API push implemented. False = credentials stored, manual push only. */
  apiPushSupported: boolean;
  /** Public tracking URL builder (returns null when none) */
  trackingUrl?: (code: string) => string;
};

export const COURIER_PROVIDERS: CourierProviderMeta[] = [
  {
    id: "steadfast",
    name: "Steadfast Courier",
    shortBn: "স্টেডফাস্ট",
    accent: "#10b981",
    website: "https://steadfast.com.bd",
    apiPushSupported: true,
    trackingUrl: (c) => `https://steadfast.com.bd/t/${encodeURIComponent(c)}`,
  },
  {
    id: "pathao",
    name: "Pathao Courier",
    shortBn: "পাঠাও",
    accent: "#e11d48",
    website: "https://merchant.pathao.com",
    apiPushSupported: true,
    trackingUrl: (c) =>
      `https://merchant.pathao.com/tracking?consignment_id=${encodeURIComponent(c)}`,
  },
  {
    id: "redx",
    name: "RedX",
    shortBn: "রেডএক্স",
    accent: "#dc2626",
    website: "https://redx.com.bd",
    apiPushSupported: false,
    trackingUrl: (c) => `https://redx.com.bd/track-parcel/?trackingId=${encodeURIComponent(c)}`,
  },
  {
    id: "paperfly",
    name: "Paperfly",
    shortBn: "পেপারফ্লাই",
    accent: "#0891b2",
    website: "https://paperfly.com.bd",
    apiPushSupported: false,
    trackingUrl: (c) => `https://go.paperfly.com.bd/tracking/${encodeURIComponent(c)}`,
  },
  {
    id: "ecourier",
    name: "eCourier",
    shortBn: "ইকুরিয়ার",
    accent: "#7c3aed",
    website: "https://ecourier.com.bd",
    apiPushSupported: false,
    trackingUrl: (c) => `https://ecourier.com.bd/tracking?trackingId=${encodeURIComponent(c)}`,
  },
];

export const PROVIDER_BY_ID: Record<CourierProvider, CourierProviderMeta> =
  COURIER_PROVIDERS.reduce(
    (acc, p) => ({ ...acc, [p.id]: p }),
    {} as Record<CourierProvider, CourierProviderMeta>,
  );

export function providerLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return PROVIDER_BY_ID[id as CourierProvider]?.name ?? id;
}

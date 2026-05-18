import type { CartItem, ProductWithVariants, Variant } from "@/lib/store-types";
import { variantPrice } from "@/lib/store-types";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    fbq?: (...args: unknown[]) => void;
  }
}

function lineItem(product: ProductWithVariants, variant: Variant | null, quantity: number) {
  const price = variantPrice(product, variant);
  return {
    item_id: product.id,
    item_name: product.title,
    item_variant: [variant?.color_name, variant?.size_label].filter(Boolean).join(" • "),
    price,
    quantity,
  };
}

function cartItems(items: CartItem[]) {
  return items.map((item) => lineItem(item.product, item.variant, item.quantity));
}

type PurchaseRow = {
  product_id?: string | null;
  product_title: string;
  variant_label?: string | null;
  unit_price: number;
  quantity: number;
};

function orderItems(rows: PurchaseRow[]) {
  return rows.map((row) => ({
    item_id: row.product_id ?? row.product_title,
    item_name: row.product_title,
    item_variant: row.variant_label ?? undefined,
    price: row.unit_price,
    quantity: row.quantity,
  }));
}

function sendGoogle(event: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.gtag) return;
  window.gtag("event", event, params);
}

function sendMeta(event: string, params: Record<string, unknown>) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", event, params);
}

export function trackAddToCart(
  product: ProductWithVariants,
  variant: Variant | null,
  quantity = 1,
) {
  const item = lineItem(product, variant, quantity);
  sendGoogle("add_to_cart", {
    currency: "BDT",
    value: item.price * quantity,
    items: [item],
  });
  sendMeta("AddToCart", {
    currency: "BDT",
    value: item.price * quantity,
    content_ids: [product.id],
    content_name: product.title,
    content_type: "product",
  });
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;
  sendGoogle("page_view", {
    page_location: window.location.href,
    page_path: path,
    page_title: document.title,
  });
  sendMeta("PageView", {});
}

export function trackBeginCheckout(items: CartItem[], value: number) {
  sendGoogle("begin_checkout", {
    currency: "BDT",
    value,
    items: cartItems(items),
  });
  sendMeta("InitiateCheckout", {
    currency: "BDT",
    value,
    content_ids: items.map((item) => item.product.id),
    num_items: items.reduce((sum, item) => sum + item.quantity, 0),
  });
}

export function trackPurchase(rows: PurchaseRow[], value: number, transactionId: string) {
  sendGoogle("purchase", {
    currency: "BDT",
    transaction_id: transactionId,
    value,
    items: orderItems(rows),
  });
  sendMeta("Purchase", {
    currency: "BDT",
    value,
    content_ids: rows.map((row) => row.product_id ?? row.product_title),
    content_type: "product",
    order_id: transactionId,
  });
}

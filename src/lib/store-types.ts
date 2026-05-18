export type Product = {
  id: string;
  title: string;
  description: string;
  image_url: string;
  gallery: string[];
  regular_price: number;
  sale_price: number;
  rating: number;
  active: boolean;
  sort_order: number;
  featured: boolean;
  brand_id: string | null;
  category_id: string | null;
};

export type Brand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string;
  sort_order: number;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  image_url: string;
  sort_order: number;
};

export type Variant = {
  id: string;
  product_id: string;
  color_name: string | null;
  color_hex: string | null;
  size_label: string | null;
  price_override: number | null;
  image_url: string | null;
  sort_order: number;
};

export type ProductWithVariants = Product & { variants: Variant[] };

export type OrderStatus = "Pending" | "Confirmed" | "Shipped" | "Cancelled";

export type Order = {
  id: string;
  customer_name: string;
  mobile: string;
  address: string;
  area: string;
  delivery_charge: number;
  product_id: string | null;
  product_title: string;
  product_image: string | null;
  variant_label: string | null;
  unit_price: number;
  quantity: number;
  total: number;
  status: OrderStatus;
  created_at: string;
  landing_page_slug: string | null;
  courier_provider?: string | null;
  courier_consignment_id?: string | null;
  courier_tracking_code?: string | null;
  courier_status?: string | null;
  courier_pushed_at?: string | null;
  courier_note?: string | null;
};

export type CartItem = {
  /** Stable per-line key (product.id + variant.id) so we can dedupe / update. */
  key: string;
  product: ProductWithVariants;
  variant: Variant | null;
  quantity: number;
};

/** @deprecated kept for backwards compatibility — use CartItem[]. */
export type Selection = CartItem | null;

export const formatBDT = (n: number) => "৳" + Math.round(n).toLocaleString("en-BD");

export const variantPrice = (p: ProductWithVariants, v: Variant | null) =>
  v?.price_override ?? p.sale_price;

export const variantImage = (p: ProductWithVariants, v: Variant | null) =>
  v?.image_url ?? p.image_url;

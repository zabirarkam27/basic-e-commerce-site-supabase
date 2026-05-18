import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from "react";
import type { CartItem, ProductWithVariants, Variant } from "./store-types";

const lineKey = (productId: string, variantId: string | null) =>
  `${productId}::${variantId ?? "_"}`;

type Ctx = {
  items: CartItem[];
  /** Add (or merge with) a product line. Returns the resulting line key. */
  addItem: (p: ProductWithVariants, v?: Variant | null, qty?: number) => string;
  /** Set a specific line's quantity (1..99). */
  setItemQuantity: (key: string, q: number) => void;
  removeItem: (key: string) => void;
  clear: () => void;
  cartCount: number;
  /** Slug of the landing page this checkout originated from (null on main store). */
  landingSlug: string | null;
};

const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({
  children,
  landingSlug = null,
}: {
  children: ReactNode;
  landingSlug?: string | null;
}) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback((p: ProductWithVariants, v?: Variant | null, qty: number = 1) => {
    const variant = v ?? p.variants[0] ?? null;
    const key = lineKey(p.id, variant?.id ?? null);
    setItems((prev) => {
      const existing = prev.find((it) => it.key === key);
      if (existing) {
        return prev.map((it) =>
          it.key === key ? { ...it, quantity: Math.min(99, it.quantity + qty) } : it,
        );
      }
      return [...prev, { key, product: p, variant, quantity: Math.max(1, qty) }];
    });
    return key;
  }, []);

  const setItemQuantity = useCallback((key: string, q: number) => {
    setItems((prev) =>
      prev.map((it) => (it.key === key ? { ...it, quantity: Math.max(1, Math.min(99, q)) } : it)),
    );
  }, []);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const cartCount = useMemo(() => items.reduce((sum, it) => sum + it.quantity, 0), [items]);

  return (
    <StoreCtx.Provider
      value={{
        items,
        addItem,
        setItemQuantity,
        removeItem,
        clear,
        cartCount,
        landingSlug,
      }}
    >
      {children}
    </StoreCtx.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error("useStore must be inside StoreProvider");
  return ctx;
}

export function smoothScrollTo(id: string) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

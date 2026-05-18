import { useState } from "react";
import { Minus, Plus, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { useStore } from "@/lib/store-context";
import { formatBDT, variantPrice, variantImage } from "@/lib/store-types";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const OrderSchema = z.object({
  name: z.string().trim().min(2).max(100),
  mobile: z
    .string()
    .trim()
    .regex(/^[0-9+\- ]{10,15}$/),
  address: z.string().trim().min(8).max(500),
});

type Props = {
  deliveryInside: number;
  deliveryOutside: number;
};

export function CheckoutForm({ deliveryInside, deliveryOutside }: Props) {
  const { items, setItemQuantity, removeItem, clear, landingSlug } = useStore();
  const { t } = useI18n();
  const [area, setArea] = useState<"inside" | "outside">("inside");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const deliveryCharge = area === "inside" ? deliveryInside : deliveryOutside;
  const hasItems = items.length > 0;

  const subtotal = items.reduce(
    (sum, it) => sum + variantPrice(it.product, it.variant) * it.quantity,
    0,
  );
  const total = subtotal + (hasItems ? deliveryCharge : 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!hasItems) {
      toast.error(t("checkout.toast_select_first"));
      return;
    }
    const fd = new FormData(e.currentTarget);
    const parsed = OrderSchema.safeParse({
      name: fd.get("name"),
      mobile: fd.get("mobile"),
      address: fd.get("address"),
    });
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      const field = issue?.path[0];
      const msg =
        field === "name"
          ? t("checkout.err_name")
          : field === "mobile"
            ? t("checkout.err_mobile")
            : field === "address"
              ? t("checkout.err_address")
              : (issue?.message ?? "");
      toast.error(msg);
      return;
    }

    setSubmitting(true);

    // One order row per cart line; shipping is applied once to the first line
    // so the per-row totals add up to the grand total shown to the user.
    const rows = items.map((it, idx) => {
      const unit = variantPrice(it.product, it.variant);
      const lineSubtotal = unit * it.quantity;
      const lineDelivery = idx === 0 ? deliveryCharge : 0;
      return {
        customer_name: parsed.data.name,
        mobile: parsed.data.mobile,
        address: parsed.data.address,
        area: area === "inside" ? "Inside Dhaka" : "Outside Dhaka",
        delivery_charge: lineDelivery,
        product_id: it.product.id,
        product_title: it.product.title,
        product_image: variantImage(it.product, it.variant),
        variant_label:
          [it.variant?.color_name, it.variant?.size_label].filter(Boolean).join(" • ") || null,
        unit_price: unit,
        quantity: it.quantity,
        total: lineSubtotal + lineDelivery,
        landing_page_slug: landingSlug,
      };
    });

    const { error } = await supabase.from("orders").insert(rows);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(true);
    toast.success(t("checkout.toast_success"));
    setTimeout(() => {
      clear();
      setDone(false);
      (e.target as HTMLFormElement).reset();
    }, 3000);
  };

  return (
    <section id="checkout" className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("checkout.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("checkout.subtitle")}</p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
          {/* Cart items */}
          <div className="divide-y divide-border border-b border-border bg-background">
            {hasItems ? (
              items.map((it) => {
                const unit = variantPrice(it.product, it.variant);
                return (
                  <div key={it.key} className="flex items-center gap-4 p-5">
                    <img
                      src={variantImage(it.product, it.variant)}
                      alt={it.product.title}
                      className="h-20 w-20 flex-shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold">{it.product.title}</div>
                      {(it.variant?.color_name || it.variant?.size_label) && (
                        <div className="text-xs text-muted-foreground">
                          {[it.variant?.color_name, it.variant?.size_label]
                            .filter(Boolean)
                            .join(" • ")}
                        </div>
                      )}
                      <div className="mt-1 text-sm font-bold text-primary">
                        {formatBDT(unit * it.quantity)}
                        {it.quantity > 1 && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            ({formatBDT(unit)} × {it.quantity})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-1 rounded-full border border-border bg-card p-1">
                        <button
                          type="button"
                          onClick={() => setItemQuantity(it.key, it.quantity - 1)}
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                          aria-label={t("checkout.decrease")}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-6 text-center text-sm font-semibold">
                          {it.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setItemQuantity(it.key, it.quantity + 1)}
                          className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                          aria-label={t("checkout.increase")}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(it.key)}
                        className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-destructive"
                        aria-label={t("checkout.remove")}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> {t("checkout.remove")}
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {t("checkout.empty")}
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-8">
            <Field
              label={t("checkout.name")}
              name="name"
              placeholder={t("checkout.name_placeholder")}
              required
            />
            <Field
              label={t("checkout.mobile")}
              name="mobile"
              type="tel"
              placeholder="01XXXXXXXXX"
              required
            />
            <div>
              <label className="mb-1.5 block text-sm font-medium">{t("checkout.address")}</label>
              <textarea
                name="address"
                required
                rows={3}
                placeholder={t("checkout.address_placeholder")}
                className="w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-coral"
              />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">{t("checkout.area")}</div>
              <div className="grid gap-2 sm:grid-cols-2">
                <AreaOption
                  label={t("checkout.inside_dhaka")}
                  price={deliveryInside}
                  active={area === "inside"}
                  onClick={() => setArea("inside")}
                />
                <AreaOption
                  label={t("checkout.outside_dhaka")}
                  price={deliveryOutside}
                  active={area === "outside"}
                  onClick={() => setArea("outside")}
                />
              </div>
            </div>

            <div className="space-y-2 rounded-2xl bg-secondary/60 p-4 text-sm">
              <Row label={t("checkout.subtotal")} value={formatBDT(subtotal)} />
              <Row
                label={t("checkout.delivery")}
                value={hasItems ? formatBDT(deliveryCharge) : "—"}
              />
              <div className="my-1 h-px bg-border" />
              <Row
                label={<span className="text-base font-semibold">{t("checkout.total")}</span>}
                value={<span className="text-lg font-bold text-primary">{formatBDT(total)}</span>}
              />
            </div>

            <button
              type="submit"
              disabled={submitting || done || !hasItems}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold shadow-pop transition-all",
                done
                  ? "bg-success text-background"
                  : "bg-primary text-primary-foreground hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100",
              )}
            >
              {done ? (
                <>
                  <Check className="h-5 w-5" /> {t("checkout.confirmed")}
                </>
              ) : submitting ? (
                t("checkout.placing")
              ) : (
                t("checkout.confirm")
              )}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      <input
        {...props}
        className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-coral"
      />
    </div>
  );
}

function AreaOption({
  label,
  price,
  active,
  onClick,
}: {
  label: string;
  price: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-all",
        active
          ? "border-primary bg-accent ring-coral"
          : "border-border bg-card hover:border-primary/30",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "grid h-4 w-4 place-items-center rounded-full border-2",
            active ? "border-primary" : "border-muted-foreground",
          )}
        >
          {active && <span className="h-2 w-2 rounded-full bg-primary" />}
        </span>
        <span className="font-medium">{label}</span>
      </div>
      <span className="text-muted-foreground">{formatBDT(price)}</span>
    </button>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

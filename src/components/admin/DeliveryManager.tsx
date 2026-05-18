import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save, Truck, Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Order } from "@/lib/store-types";

export function DeliveryManager() {
  const [inside, setInside] = useState("60");
  const [outside, setOutside] = useState("120");
  const [savingDefaults, setSavingDefaults] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingRow, setSavingRow] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: settings }, { data: ords }] = await Promise.all([
        supabase
          .from("settings")
          .select("key,value")
          .in("key", ["delivery_inside", "delivery_outside"]),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(100),
      ]);
      const m = new Map((settings ?? []).map((s) => [s.key, s.value]));
      setInside(String(m.get("delivery_inside") ?? 60));
      setOutside(String(m.get("delivery_outside") ?? 120));
      setOrders((ords ?? []) as Order[]);
      setLoading(false);
    })();
  }, []);

  const saveDefaults = async () => {
    setSavingDefaults(true);
    try {
      const { error } = await supabase.from("settings").upsert([
        { key: "delivery_inside", value: Number(inside), updated_at: new Date().toISOString() },
        { key: "delivery_outside", value: Number(outside), updated_at: new Date().toISOString() },
      ]);
      if (error) throw error;
      toast.success("Default delivery charges updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingDefaults(false);
    }
  };

  const startEdit = (o: Order) => {
    setEditingId(o.id);
    setEditValue(String(o.delivery_charge ?? 0));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const saveRow = async (o: Order) => {
    const newCharge = Number(editValue);
    if (Number.isNaN(newCharge) || newCharge < 0) {
      toast.error("Invalid amount");
      return;
    }
    setSavingRow(o.id);
    try {
      const newTotal = Number(o.unit_price) * Number(o.quantity) + newCharge;
      const { error } = await supabase
        .from("orders")
        .update({ delivery_charge: newCharge, total: newTotal })
        .eq("id", o.id);
      if (error) throw error;
      setOrders((prev) =>
        prev.map((x) =>
          x.id === o.id ? { ...x, delivery_charge: newCharge, total: newTotal } : x,
        ),
      );
      toast.success("Delivery charge updated");
      cancelEdit();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setSavingRow(null);
    }
  };

  const insideCount = orders.filter((o) => Number(o.delivery_charge) === Number(inside)).length;
  const outsideCount = orders.filter((o) => Number(o.delivery_charge) === Number(outside)).length;
  const customCount = orders.length - insideCount - outsideCount;
  const totalCollected = orders.reduce((s, o) => s + Number(o.delivery_charge ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Defaults */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-4 flex items-center gap-2">
          <Truck className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold">Default Delivery Charges</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          চেকআউটে কাস্টমারের সিলেক্ট করা এরিয়ার ভিত্তিতে ডিফল্ট চার্জ প্রি-ফিল হবে।
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Inside Dhaka (৳)
            </span>
            <input
              type="number"
              min="0"
              value={inside}
              onChange={(e) => setInside(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted-foreground">
              Outside Dhaka (৳)
            </span>
            <input
              type="number"
              min="0"
              value={outside}
              onChange={(e) => setOutside(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
        </div>
        <button
          onClick={saveDefaults}
          disabled={savingDefaults}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingDefaults ? "Saving…" : "Save defaults"}
        </button>
      </div>

      {/* Summary */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Inside Dhaka orders" value={insideCount} />
        <Stat label="Outside Dhaka orders" value={outsideCount} />
        <Stat label="Custom charges" value={customCount} />
        <Stat label="Total collected (৳)" value={totalCollected.toLocaleString()} />
      </div>

      {/* Review & edit per-order */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent orders — review & edit</h2>
          <span className="text-xs text-muted-foreground">Showing latest {orders.length}</span>
        </div>
        {loading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : orders.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Customer</th>
                  <th className="py-2 pr-3">Area</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3 text-right">Delivery (৳)</th>
                  <th className="py-2 pr-3 text-right">Total (৳)</th>
                  <th className="py-2 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id} className="border-b border-border/60 hover:bg-secondary/30">
                    <td className="py-2 pr-3 text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-2 pr-3">{o.customer_name}</td>
                    <td className="py-2 pr-3 text-xs">{o.area}</td>
                    <td className="py-2 pr-3 text-xs">{o.status}</td>
                    <td className="py-2 pr-3 text-right">
                      {editingId === o.id ? (
                        <input
                          type="number"
                          min="0"
                          autoFocus
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="w-24 rounded-md border border-input bg-background px-2 py-1 text-right text-sm outline-none focus:border-primary"
                        />
                      ) : (
                        <span className="font-medium">
                          {Number(o.delivery_charge).toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-right font-semibold">
                      {Number(o.total).toLocaleString()}
                    </td>
                    <td className="py-2 text-right">
                      {editingId === o.id ? (
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => saveRow(o)}
                            disabled={savingRow === o.id}
                            className="rounded-md bg-primary p-1.5 text-primary-foreground disabled:opacity-60"
                            aria-label="Save"
                          >
                            <Check className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="rounded-md border border-border p-1.5 hover:bg-secondary"
                            aria-label="Cancel"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(o)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs hover:bg-secondary"
                        >
                          <Pencil className="h-3 w-3" /> Edit
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}

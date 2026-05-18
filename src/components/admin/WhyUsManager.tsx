import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Save,
  Trash2,
  GripVertical,
  Eye,
  EyeOff,
  Sparkles,
  Truck,
  ShieldCheck,
  RefreshCcw,
  Award,
  Heart,
  Leaf,
  Phone,
  Clock,
  Gift,
  Star,
  ThumbsUp,
  Zap,
  Package,
  CreditCard,
  Headphones,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const ICON_OPTIONS: { name: string; Icon: LucideIcon }[] = [
  { name: "Sparkles", Icon: Sparkles },
  { name: "Truck", Icon: Truck },
  { name: "ShieldCheck", Icon: ShieldCheck },
  { name: "RefreshCcw", Icon: RefreshCcw },
  { name: "Award", Icon: Award },
  { name: "Heart", Icon: Heart },
  { name: "Leaf", Icon: Leaf },
  { name: "Phone", Icon: Phone },
  { name: "Clock", Icon: Clock },
  { name: "Gift", Icon: Gift },
  { name: "Star", Icon: Star },
  { name: "ThumbsUp", Icon: ThumbsUp },
  { name: "Zap", Icon: Zap },
  { name: "Package", Icon: Package },
  { name: "CreditCard", Icon: CreditCard },
  { name: "Headphones", Icon: Headphones },
  { name: "MapPin", Icon: MapPin },
];

function iconFor(name: string): LucideIcon {
  return ICON_OPTIONS.find((i) => i.name === name)?.Icon ?? Sparkles;
}

type Item = {
  id: string;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
  active: boolean;
};

export function WhyUsManager() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newIcon, setNewIcon] = useState("Sparkles");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("why_us_items")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Item[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!newTitle.trim()) return toast.error("Title required");
    setCreating(true);
    try {
      const maxSort = items.reduce((m, f) => Math.max(m, f.sort_order), 0);
      const { error } = await supabase.from("why_us_items").insert({
        icon: newIcon,
        title: newTitle.trim(),
        description: newDesc.trim(),
        sort_order: maxSort + 1,
        active: true,
      });
      if (error) throw error;
      setNewTitle("");
      setNewDesc("");
      setNewIcon("Sparkles");
      toast.success("Benefit added");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, patch: Partial<Item>) => {
    setSavingId(id);
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const { error } = await supabase
      .from("why_us_items")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this benefit?")) return;
    const { error } = await supabase.from("why_us_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((f) => f.id !== id));
    toast.success("Deleted");
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((f) => f.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= items.length) return;
    const a = items[idx];
    const b = items[swapIdx];
    const next = [...items];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[swapIdx] = { ...a, sort_order: b.sort_order };
    setItems(next);
    await Promise.all([
      supabase
        .from("why_us_items")
        .update({ sort_order: b.sort_order, updated_at: new Date().toISOString() })
        .eq("id", a.id),
      supabase
        .from("why_us_items")
        .update({ sort_order: a.sort_order, updated_at: new Date().toISOString() })
        .eq("id", b.id),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add a "Why shop with us" benefit</h3>
        </div>
        <div className="grid gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">Icon</label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map(({ name, Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setNewIcon(name)}
                  title={name}
                  className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
                    newIcon === name
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Title (e.g. Cash on Delivery)"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Short description"
            className="min-h-[70px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={create}
            disabled={creating}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add benefit"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No benefits yet. Add your first card above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((f, idx) => {
            const Icon = iconFor(f.icon);
            return (
              <div key={f.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center gap-1 pt-1">
                    <button
                      onClick={() => move(f.id, -1)}
                      disabled={idx === 0}
                      className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <GripVertical className="h-4 w-4 rotate-90" />
                    </button>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-lg bg-accent text-primary">
                        <Icon className="h-4 w-4" />
                      </div>
                      <select
                        value={f.icon}
                        onChange={(e) => update(f.id, { icon: e.target.value })}
                        className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-primary"
                      >
                        {ICON_OPTIONS.map((o) => (
                          <option key={o.name} value={o.name}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <input
                      type="text"
                      value={f.title}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) => (x.id === f.id ? { ...x, title: e.target.value } : x)),
                        )
                      }
                      onBlur={(e) => update(f.id, { title: e.target.value })}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    />
                    <textarea
                      value={f.description}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((x) =>
                            x.id === f.id ? { ...x, description: e.target.value } : x,
                          ),
                        )
                      }
                      onBlur={(e) => update(f.id, { description: e.target.value })}
                      className="min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => update(f.id, { active: !f.active })}
                      className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
                      title={f.active ? "Active" : "Hidden"}
                    >
                      {f.active ? (
                        <>
                          <Eye className="h-3 w-3 text-primary" /> Live
                        </>
                      ) : (
                        <>
                          <EyeOff className="h-3 w-3 text-muted-foreground" /> Hidden
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => remove(f.id)}
                      className="rounded-full border border-border p-1.5 text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {savingId === f.id && (
                      <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                        <Save className="h-3 w-3" /> saving
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

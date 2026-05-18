import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Star, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { ImageInput } from "./ImageInput";

type Review = {
  id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
  avatar_url: string;
  sort_order: number;
  active: boolean;
};

export function ReviewsManager() {
  const [items, setItems] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    location: "",
    text: "",
    rating: 5,
    avatar_url: "",
  });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("reviews")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Review[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!draft.name.trim() || !draft.text.trim())
      return toast.error("Name and review text required");
    setCreating(true);
    try {
      const maxSort = items.reduce((m, f) => Math.max(m, f.sort_order), 0);
      const { error } = await supabase.from("reviews").insert({
        name: draft.name.trim(),
        location: draft.location.trim(),
        text: draft.text.trim(),
        rating: Math.max(1, Math.min(5, draft.rating)),
        avatar_url: draft.avatar_url.trim(),
        sort_order: maxSort + 1,
        active: true,
      });
      if (error) throw error;
      setDraft({ name: "", location: "", text: "", rating: 5, avatar_url: "" });
      toast.success("Review added");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, patch: Partial<Review>) => {
    setSavingId(id);
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const { error } = await supabase.from("reviews").update(patch).eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this review?")) return;
    const { error } = await supabase.from("reviews").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setItems((prev) => prev.filter((f) => f.id !== id));
    toast.success("Deleted");
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = items.findIndex((f) => f.id === id);
    const swap = idx + dir;
    if (idx < 0 || swap < 0 || swap >= items.length) return;
    const a = items[idx],
      b = items[swap];
    const next = [...items];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[swap] = { ...a, sort_order: b.sort_order };
    setItems(next);
    await Promise.all([
      supabase.from("reviews").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("reviews").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add a new review</h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={draft.name}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder="Customer name"
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={draft.location}
            onChange={(e) => setDraft({ ...draft, location: e.target.value })}
            placeholder="Location (e.g. Dhaka)"
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Avatar (optional)
            </label>
            <ImageInput
              value={draft.avatar_url}
              onChange={(url) => setDraft({ ...draft, avatar_url: url })}
              folder="reviews"
            />
          </div>
          <div className="flex items-center gap-2 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Rating:</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setDraft({ ...draft, rating: n })}
                className="p-0.5"
                aria-label={`${n} stars`}
              >
                <Star
                  className={cn(
                    "h-5 w-5",
                    n <= draft.rating ? "fill-warning text-warning" : "text-muted-foreground",
                  )}
                />
              </button>
            ))}
          </div>
          <textarea
            value={draft.text}
            onChange={(e) => setDraft({ ...draft, text: e.target.value })}
            placeholder="Review text"
            className="min-h-[80px] rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary sm:col-span-2"
          />
          <button
            onClick={create}
            disabled={creating}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add Review"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No reviews yet. Add the first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((r, idx) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => move(r.id, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <input
                      value={r.name}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)),
                        )
                      }
                      onBlur={(e) => update(r.id, { name: e.target.value })}
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    />
                    <input
                      value={r.location}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((x) => (x.id === r.id ? { ...x, location: e.target.value } : x)),
                        )
                      }
                      onBlur={(e) => update(r.id, { location: e.target.value })}
                      placeholder="Location"
                      className="rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <input
                    value={r.avatar_url}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x) => (x.id === r.id ? { ...x, avatar_url: e.target.value } : x)),
                      )
                    }
                    onBlur={(e) => update(r.id, { avatar_url: e.target.value })}
                    placeholder="Avatar URL"
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                  />
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => update(r.id, { rating: n })}
                        className="p-0.5"
                      >
                        <Star
                          className={cn(
                            "h-4 w-4",
                            n <= r.rating ? "fill-warning text-warning" : "text-muted-foreground",
                          )}
                        />
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={r.text}
                    onChange={(e) =>
                      setItems((p) =>
                        p.map((x) => (x.id === r.id ? { ...x, text: e.target.value } : x)),
                      )
                    }
                    onBlur={(e) => update(r.id, { text: e.target.value })}
                    className="min-h-[70px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => update(r.id, { active: !r.active })}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
                  >
                    {r.active ? (
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
                    onClick={() => remove(r.id)}
                    className="rounded-full border border-border p-1.5 text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {savingId === r.id && (
                    <span className="text-[10px] text-muted-foreground">saving…</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

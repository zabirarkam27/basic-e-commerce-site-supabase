import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Save, Trash2, GripVertical, Eye, EyeOff, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Faq = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
  active: boolean;
};

export function FaqsManager() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setFaqs((data ?? []) as Faq[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const createFaq = async () => {
    if (!newQ.trim() || !newA.trim()) return toast.error("Question and answer required");
    setCreating(true);
    try {
      const maxSort = faqs.reduce((m, f) => Math.max(m, f.sort_order), 0);
      const { error } = await supabase.from("faqs").insert({
        question: newQ.trim(),
        answer: newA.trim(),
        sort_order: maxSort + 1,
        active: true,
      });
      if (error) throw error;
      setNewQ("");
      setNewA("");
      toast.success("FAQ added");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setCreating(false);
    }
  };

  const updateFaq = async (id: string, patch: Partial<Faq>) => {
    setSavingId(id);
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const { error } = await supabase
      .from("faqs")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const removeFaq = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setFaqs((prev) => prev.filter((f) => f.id !== id));
    toast.success("Deleted");
  };

  const move = async (id: string, dir: -1 | 1) => {
    const idx = faqs.findIndex((f) => f.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= faqs.length) return;
    const a = faqs[idx];
    const b = faqs[swapIdx];
    const next = [...faqs];
    next[idx] = { ...b, sort_order: a.sort_order };
    next[swapIdx] = { ...a, sort_order: b.sort_order };
    setFaqs(next);
    await Promise.all([
      supabase
        .from("faqs")
        .update({ sort_order: b.sort_order, updated_at: new Date().toISOString() })
        .eq("id", a.id),
      supabase
        .from("faqs")
        .update({ sort_order: a.sort_order, updated_at: new Date().toISOString() })
        .eq("id", b.id),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <HelpCircle className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add a new FAQ</h3>
        </div>
        <div className="grid gap-3">
          <input
            type="text"
            value={newQ}
            onChange={(e) => setNewQ(e.target.value)}
            placeholder="Question (e.g. What is the delivery time?)"
            className="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <textarea
            value={newA}
            onChange={(e) => setNewA(e.target.value)}
            placeholder="Answer"
            className="min-h-[90px] w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <button
            onClick={createFaq}
            disabled={creating}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add FAQ"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      ) : faqs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No FAQs yet. Add your first question above.
        </div>
      ) : (
        <div className="space-y-3">
          {faqs.map((f, idx) => (
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
                  <input
                    type="text"
                    value={f.question}
                    onChange={(e) =>
                      setFaqs((prev) =>
                        prev.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)),
                      )
                    }
                    onBlur={(e) => updateFaq(f.id, { question: e.target.value })}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                  />
                  <textarea
                    value={f.answer}
                    onChange={(e) =>
                      setFaqs((prev) =>
                        prev.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)),
                      )
                    }
                    onBlur={(e) => updateFaq(f.id, { answer: e.target.value })}
                    className="min-h-[80px] w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => updateFaq(f.id, { active: !f.active })}
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
                    onClick={() => removeFaq(f.id)}
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
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ImageInput } from "./ImageInput";

type Video = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
  sort_order: number;
  active: boolean;
};

export function VideosManager() {
  const [items, setItems] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", video_url: "", thumbnail_url: "" });
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("videos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    else setItems((data ?? []) as Video[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    if (!draft.video_url.trim()) return toast.error("Video URL required");
    setCreating(true);
    try {
      const maxSort = items.reduce((m, f) => Math.max(m, f.sort_order), 0);
      const { error } = await supabase.from("videos").insert({
        title: draft.title.trim(),
        video_url: draft.video_url.trim(),
        thumbnail_url: draft.thumbnail_url.trim(),
        sort_order: maxSort + 1,
        active: true,
      });
      if (error) throw error;
      setDraft({ title: "", video_url: "", thumbnail_url: "" });
      toast.success("Video added");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setCreating(false);
    }
  };

  const update = async (id: string, patch: Partial<Video>) => {
    setSavingId(id);
    setItems((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
    const { error } = await supabase.from("videos").update(patch).eq("id", id);
    setSavingId(null);
    if (error) {
      toast.error(error.message);
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this video?")) return;
    const { error } = await supabase.from("videos").delete().eq("id", id);
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
      supabase.from("videos").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("videos").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-3 flex items-center gap-2">
          <VideoIcon className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Add a new video</h3>
        </div>
        <div className="grid gap-3">
          <input
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            placeholder="Title (optional)"
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <input
            value={draft.video_url}
            onChange={(e) => setDraft({ ...draft, video_url: e.target.value })}
            placeholder="YouTube / video URL (e.g. https://youtube.com/watch?v=...)"
            className="rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <div>
            <label className="mb-1 block text-xs font-medium text-muted-foreground">
              Thumbnail (optional — auto-detected for YouTube)
            </label>
            <ImageInput
              value={draft.thumbnail_url}
              onChange={(url) => setDraft({ ...draft, thumbnail_url: url })}
              folder="videos"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Supports YouTube, Vimeo, or direct MP4 URLs. Paste any standard YouTube link.
          </p>
          <button
            onClick={create}
            disabled={creating}
            className="inline-flex w-fit items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            <Plus className="h-4 w-4" /> {creating ? "Adding…" : "Add Video"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid place-items-center rounded-2xl border border-border bg-card py-12 text-sm text-muted-foreground">
          Loading…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-12 text-center text-sm text-muted-foreground">
          No videos yet. Add the first one above.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((v, idx) => (
            <div key={v.id} className="rounded-2xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-1">
                  <button
                    onClick={() => move(v.id, -1)}
                    disabled={idx === 0}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move up"
                  >
                    <GripVertical className="h-4 w-4 -rotate-90" />
                  </button>
                  <button
                    onClick={() => move(v.id, 1)}
                    disabled={idx === items.length - 1}
                    className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                    aria-label="Move down"
                  >
                    <GripVertical className="h-4 w-4 rotate-90" />
                  </button>
                </div>
                <div className="flex-1 space-y-2">
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Title
                    </label>
                    <input
                      value={v.title}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((x) => (x.id === v.id ? { ...x, title: e.target.value } : x)),
                        )
                      }
                      onBlur={(e) => update(v.id, { title: e.target.value })}
                      placeholder="Title"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Video URL
                    </label>
                    <input
                      value={v.video_url}
                      onChange={(e) =>
                        setItems((p) =>
                          p.map((x) => (x.id === v.id ? { ...x, video_url: e.target.value } : x)),
                        )
                      }
                      onBlur={(e) => update(v.id, { video_url: e.target.value })}
                      placeholder="YouTube / Vimeo / MP4 URL"
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 text-xs outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      Thumbnail
                    </label>
                    <ImageInput
                      value={v.thumbnail_url}
                      onChange={(url) => {
                        setItems((p) =>
                          p.map((x) => (x.id === v.id ? { ...x, thumbnail_url: url } : x)),
                        );
                        update(v.id, { thumbnail_url: url });
                      }}
                      folder="videos"
                    />
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <button
                    onClick={() => update(v.id, { active: !v.active })}
                    className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-xs"
                  >
                    {v.active ? (
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
                    onClick={() => remove(v.id)}
                    className="rounded-full border border-border p-1.5 text-destructive hover:bg-destructive/10"
                    title="Delete"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  {savingId === v.id && (
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

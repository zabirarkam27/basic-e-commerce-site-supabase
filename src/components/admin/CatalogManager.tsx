import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, X, Save, Tag, Building2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ImageInput } from "./ImageInput";

type Item = {
  id: string;
  name: string;
  slug: string;
  image_url?: string;
  logo_url?: string;
  sort_order: number;
};
type Kind = "brands" | "categories";

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export function CatalogManager() {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Section kind="categories" title="Categories" icon={Tag} imageField="image_url" />
      <Section kind="brands" title="Brands" icon={Building2} imageField="logo_url" />
    </div>
  );
}

function Section({
  kind,
  title,
  icon: Icon,
  imageField,
}: {
  kind: Kind;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  imageField: "image_url" | "logo_url";
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Partial<Item> | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from(kind).select("*").order("sort_order").order("name");
    setItems((data ?? []) as Item[]);
  }, [kind]);
  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!editing?.name?.trim()) return toast.error("Name is required");
    const name = editing.name.trim();
    const slug = (editing.slug?.trim() || slugify(name)).slice(0, 80);
    const sort_order = Number(editing.sort_order ?? 0);
    const imgVal = (editing as Record<string, string>)[imageField] ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const table: any = supabase.from(kind);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { name, slug, sort_order, [imageField]: imgVal };
    const q = editing.id
      ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (table as any).update(payload).eq("id", editing.id)
      : // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (table as any).insert(payload);
    const { error } = await q;
    if (error) return toast.error(error.message);
    toast.success("Saved");
    setEditing(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    const { error } = await supabase.from(kind).delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    load();
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <div className="inline-flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4" /> {title}
          <span className="text-xs font-normal text-muted-foreground">({items.length})</span>
        </div>
        <button
          onClick={() =>
            setEditing({
              name: "",
              slug: "",
              sort_order: items.length,
              [imageField]: "",
            } as Partial<Item>)
          }
          className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-pop"
        >
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      <ul className="divide-y divide-border">
        {items.length === 0 && (
          <li className="py-6 text-center text-xs text-muted-foreground">
            No {title.toLowerCase()} yet.
          </li>
        )}
        {items.map((it) => {
          const img = (it as unknown as Record<string, string>)[imageField];
          return (
            <li key={it.id} className="flex items-center gap-3 py-2">
              {img ? (
                <img
                  src={img}
                  alt=""
                  className="h-9 w-9 rounded-lg border border-border object-cover"
                />
              ) : (
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary text-xs font-bold text-muted-foreground">
                  {it.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{it.name}</div>
                <div className="truncate text-xs text-muted-foreground">/{it.slug}</div>
              </div>
              <button
                onClick={() => setEditing(it)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => remove(it.id)}
                className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          );
        })}
      </ul>

      {editing && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm"
          onClick={() => setEditing(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-card p-6 shadow-pop"
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold">
                {editing.id ? "Edit" : "Add"} {title.slice(0, -1)}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium">Name</label>
                <input
                  value={editing.name ?? ""}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      name: e.target.value,
                      slug: editing.slug || slugify(e.target.value),
                    })
                  }
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Slug</label>
                <input
                  value={editing.slug ?? ""}
                  onChange={(e) => setEditing({ ...editing, slug: e.target.value })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">
                  {imageField === "logo_url" ? "Logo" : "Image"}
                </label>
                <ImageInput
                  value={(editing as Record<string, string>)[imageField] ?? ""}
                  onChange={(url) => setEditing({ ...editing, [imageField]: url } as Partial<Item>)}
                  folder={kind}
                  placeholder="https://...  or upload"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium">Sort order</label>
                <input
                  type="number"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setEditing(null)}
                className="rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
              >
                Cancel
              </button>
              <button
                onClick={save}
                className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pop"
              >
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

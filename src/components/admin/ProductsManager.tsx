import { useEffect, useRef, useState } from "react";
import { Pencil, Trash2, Plus, X, Save, Download, Star, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Product, Variant, Brand, Category } from "@/lib/store-types";
import { formatBDT } from "@/lib/store-types";
import { cn } from "@/lib/utils";
import { exportRowsCSV, csvTimestamp } from "@/lib/csv-export";
import { ImageInput } from "./ImageInput";
import { uploadImageAsWebp } from "@/lib/image-upload";

type FullProduct = Product & { variants: Variant[] };

type Draft = {
  id?: string;
  title: string;
  description: string;
  image_url: string;
  gallery: string;
  regular_price: string;
  sale_price: string;
  active: boolean;
  featured: boolean;
  brand_id: string | null;
  category_id: string | null;
  variants: Array<{
    id?: string;
    color_name: string;
    color_hex: string;
    size_label: string;
    price_override: string;
    image_url: string;
  }>;
};

const EMPTY_DRAFT: Draft = {
  title: "",
  description: "",
  image_url: "",
  gallery: "",
  regular_price: "",
  sale_price: "",
  active: true,
  featured: false,
  brand_id: null,
  category_id: null,
  variants: [],
};

export function ProductsManager() {
  const [products, setProducts] = useState<FullProduct[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const load = async () => {
    const [{ data: prods }, { data: vars }, { data: brs }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("sort_order"),
      supabase.from("product_variants").select("*").order("sort_order"),
      supabase.from("brands").select("*").order("sort_order").order("name"),
      supabase.from("categories").select("*").order("sort_order").order("name"),
    ]);
    const byProd = new Map<string, Variant[]>();
    (vars ?? []).forEach((v) => {
      const arr = byProd.get(v.product_id) ?? [];
      arr.push(v);
      byProd.set(v.product_id, arr);
    });
    setProducts(
      (prods ?? []).map((p) => ({
        ...p,
        gallery: Array.isArray(p.gallery) ? (p.gallery as string[]) : [],
        variants: byProd.get(p.id) ?? [],
      })) as FullProduct[],
    );
    setBrands((brs ?? []) as Brand[]);
    setCategories((cats ?? []) as Category[]);
  };

  useEffect(() => {
    load();
  }, []);

  const openNew = () => setEditing({ ...EMPTY_DRAFT });
  const openEdit = (p: FullProduct) =>
    setEditing({
      id: p.id,
      title: p.title,
      description: p.description,
      image_url: p.image_url,
      gallery: p.gallery.join("\n"),
      regular_price: String(p.regular_price),
      sale_price: String(p.sale_price),
      active: p.active,
      featured: p.featured ?? false,
      brand_id: p.brand_id ?? null,
      category_id: p.category_id ?? null,
      variants: p.variants.map((v) => ({
        id: v.id,
        color_name: v.color_name ?? "",
        color_hex: v.color_hex ?? "",
        size_label: v.size_label ?? "",
        price_override: v.price_override != null ? String(v.price_override) : "",
        image_url: v.image_url ?? "",
      })),
    });

  const toggleFeatured = async (p: FullProduct) => {
    const next = !p.featured;
    setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: next } : x)));
    const { error } = await supabase.from("products").update({ featured: next }).eq("id", p.id);
    if (error) {
      toast.error(error.message);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? { ...x, featured: !next } : x)));
    } else {
      toast.success(next ? "Added to Featured" : "Removed from Featured");
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Product deleted");
    setConfirmDelete(null);
    load();
  };

  const handleSave = async () => {
    if (!editing) return;
    const payload = {
      title: editing.title.trim(),
      description: editing.description.trim(),
      image_url: editing.image_url.trim(),
      gallery: editing.gallery
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      regular_price: Number(editing.regular_price),
      sale_price: Number(editing.sale_price),
      active: editing.active,
      featured: editing.featured,
      brand_id: editing.brand_id,
      category_id: editing.category_id,
    };
    if (
      !payload.title ||
      !payload.image_url ||
      isNaN(payload.regular_price) ||
      isNaN(payload.sale_price)
    ) {
      toast.error("Title, image URL, and prices are required.");
      return;
    }

    let productId = editing.id;
    if (productId) {
      const { error } = await supabase.from("products").update(payload).eq("id", productId);
      if (error) return toast.error(error.message);
    } else {
      const { data, error } = await supabase.from("products").insert(payload).select("id").single();
      if (error || !data) return toast.error(error?.message ?? "Failed");
      productId = data.id;
    }

    // Replace variants
    await supabase.from("product_variants").delete().eq("product_id", productId!);
    const cleaned = editing.variants
      .filter((v) => v.color_name || v.size_label)
      .map((v, i) => ({
        product_id: productId!,
        color_name: v.color_name || null,
        color_hex: v.color_hex || null,
        size_label: v.size_label || null,
        price_override: v.price_override ? Number(v.price_override) : null,
        image_url: v.image_url || null,
        sort_order: i,
      }));
    if (cleaned.length) {
      const { error } = await supabase.from("product_variants").insert(cleaned);
      if (error) return toast.error(error.message);
    }

    toast.success("Saved");
    setEditing(null);
    load();
  };

  const exportProductsCSV = () => {
    const rows: (string | number | null)[][] = [];
    for (const p of products) {
      if (p.variants.length === 0) {
        rows.push([
          p.id,
          p.title,
          p.description,
          p.regular_price,
          p.sale_price,
          p.active ? "Active" : "Inactive",
          p.image_url,
          p.gallery.join(" | "),
          0,
          "",
          "",
          "",
          "",
          "",
        ]);
      } else {
        for (const v of p.variants) {
          rows.push([
            p.id,
            p.title,
            p.description,
            p.regular_price,
            p.sale_price,
            p.active ? "Active" : "Inactive",
            p.image_url,
            p.gallery.join(" | "),
            p.variants.length,
            v.color_name ?? "",
            v.color_hex ?? "",
            v.size_label ?? "",
            v.price_override ?? "",
            v.image_url ?? "",
          ]);
        }
      }
    }
    exportRowsCSV({
      filename: `products_${csvTimestamp()}.csv`,
      headers: [
        "Product ID",
        "Title",
        "Description",
        "Regular Price",
        "Sale Price",
        "Status",
        "Image URL",
        "Gallery",
        "Variant Count",
        "Variant Color",
        "Variant Color Hex",
        "Variant Size",
        "Variant Price Override",
        "Variant Image",
      ],
      rows,
      emptyMessage: "No products to export.",
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {products.length} product{products.length === 1 ? "" : "s"}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportProductsCSV}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pop hover:scale-[1.02]"
          >
            <Plus className="h-4 w-4" /> Add New Product
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
        <table className="w-full text-sm">
          <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left">Product</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-left">Variants</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-secondary/30">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <img src={p.image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                    <div className="font-medium">{p.title}</div>
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="font-semibold text-primary">{formatBDT(p.sale_price)}</div>
                  <div className="text-xs text-muted-foreground line-through">
                    {formatBDT(p.regular_price)}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {p.variants.length} variant{p.variants.length === 1 ? "" : "s"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      p.active ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.active ? "Active" : "Hidden"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => toggleFeatured(p)}
                      className={cn(
                        "grid h-8 w-8 place-items-center rounded-full hover:bg-secondary",
                        p.featured && "text-warning",
                      )}
                      aria-label={p.featured ? "Unfeature" : "Mark as featured"}
                      title={p.featured ? "Remove from Featured" : "Add to Featured"}
                    >
                      <Star className={cn("h-4 w-4", p.featured && "fill-warning")} />
                    </button>
                    <button
                      onClick={() => openEdit(p)}
                      className="grid h-8 w-8 place-items-center rounded-full hover:bg-secondary"
                      aria-label="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <EditorDialog
          draft={editing}
          setDraft={setEditing}
          onSave={handleSave}
          brands={brands}
          categories={categories}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          message="Delete this product? This action cannot be undone."
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}

function EditorDialog({
  draft,
  setDraft,
  onSave,
  brands,
  categories,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  onSave: () => void;
  brands: Brand[];
  categories: Category[];
}) {
  const upd = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });

  const addVariant = () =>
    upd({
      variants: [
        ...draft.variants,
        { color_name: "", color_hex: "", size_label: "", price_override: "", image_url: "" },
      ],
    });

  const updVariant = (i: number, patch: Partial<Draft["variants"][number]>) => {
    const next = [...draft.variants];
    next[i] = { ...next[i], ...patch };
    upd({ variants: next });
  };

  const rmVariant = (i: number) => upd({ variants: draft.variants.filter((_, idx) => idx !== i) });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={() => setDraft(null)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-card shadow-pop sm:rounded-3xl"
      >
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold">{draft.id ? "Edit product" : "Add new product"}</h3>
          <button
            onClick={() => setDraft(null)}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto p-6">
          <Field label="Title">
            <input
              value={draft.title}
              onChange={(e) => upd({ title: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Description">
            <textarea
              value={draft.description}
              onChange={(e) => upd({ description: e.target.value })}
              rows={3}
              className="input resize-none"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Regular Price (৳)">
              <input
                type="number"
                value={draft.regular_price}
                onChange={(e) => upd({ regular_price: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Sale Price (৳)">
              <input
                type="number"
                value={draft.sale_price}
                onChange={(e) => upd({ sale_price: e.target.value })}
                className="input"
              />
            </Field>
          </div>
          <Field label="Main image">
            <ImageInput
              value={draft.image_url}
              onChange={(url) => upd({ image_url: url })}
              folder="products"
            />
          </Field>
          <Field label="Gallery images">
            <GalleryEditor
              urls={draft.gallery
                .split("\n")
                .map((s) => s.trim())
                .filter(Boolean)}
              onChange={(urls) => upd({ gallery: urls.join("\n") })}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Category">
              <select
                value={draft.category_id ?? ""}
                onChange={(e) => upd({ category_id: e.target.value || null })}
                className="input"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Brand">
              <select
                value={draft.brand_id ?? ""}
                onChange={(e) => upd({ brand_id: e.target.value || null })}
                className="input"
              >
                <option value="">— None —</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => upd({ active: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              Active (visible in store)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={draft.featured}
                onChange={(e) => upd({ featured: e.target.checked })}
                className="h-4 w-4 accent-primary"
              />
              ⭐ Featured (show at top)
            </label>
          </div>

          <div className="space-y-2 rounded-2xl border border-border bg-secondary/40 p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">Variations</div>
              <button
                onClick={addVariant}
                type="button"
                className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background"
              >
                <Plus className="h-3 w-3" /> Add variation
              </button>
            </div>
            {draft.variants.length === 0 && (
              <div className="text-xs text-muted-foreground">
                No variations. Add colors or sizes/weights with optional pricing.
              </div>
            )}
            {draft.variants.map((v, i) => (
              <div key={i} className="space-y-2 rounded-xl border border-border bg-card p-3">
                <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_1fr_auto] sm:items-center">
                  <input
                    placeholder="Color name"
                    value={v.color_name}
                    onChange={(e) => updVariant(i, { color_name: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="#hex"
                    value={v.color_hex}
                    onChange={(e) => updVariant(i, { color_hex: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Size/Weight (e.g. 500g)"
                    value={v.size_label}
                    onChange={(e) => updVariant(i, { size_label: e.target.value })}
                    className="input"
                  />
                  <input
                    placeholder="Price override"
                    type="number"
                    value={v.price_override}
                    onChange={(e) => updVariant(i, { price_override: e.target.value })}
                    className="input"
                  />
                  <button
                    onClick={() => rmVariant(i)}
                    className="grid h-8 w-8 place-items-center rounded-full text-destructive hover:bg-destructive/10"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div>
                  <div className="mb-1 text-[11px] font-medium text-muted-foreground">
                    Variant image (optional)
                  </div>
                  <ImageInput
                    value={v.image_url}
                    onChange={(url) => updVariant(i, { image_url: url })}
                    folder="products/variants"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border px-6 py-4">
          <button
            onClick={() => setDraft(null)}
            className="rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop"
          >
            <Save className="h-4 w-4" /> Save
          </button>
        </div>
      </div>

      <style>{`.input { width:100%; border-radius: 0.75rem; border: 1px solid var(--color-input); background: var(--color-background); padding: 0.6rem 0.85rem; font-size: 0.875rem; outline: none; }
      .input:focus { border-color: var(--color-primary); box-shadow: 0 0 0 3px oklch(0.66 0.21 27 / 0.18); }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-pop">
        <p className="text-sm">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-full bg-destructive px-4 py-2 text-sm font-semibold text-destructive-foreground"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

function GalleryEditor({ urls, onChange }: { urls: string[]; onChange: (urls: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [text, setText] = useState("");

  const addUrl = () => {
    const v = text.trim();
    if (!v) return;
    onChange([...urls, v]);
    setText("");
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      const uploaded: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        const u = await uploadImageAsWebp(f, "products/gallery");
        uploaded.push(u);
      }
      if (uploaded.length) onChange([...urls, ...uploaded]);
      toast.success(`Uploaded ${uploaded.length} image${uploaded.length === 1 ? "" : "s"}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const remove = (i: number) => onChange(urls.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="Paste image URL and press Enter"
          className="input flex-1"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-xl border border-border bg-card px-3 text-xs font-medium hover:border-primary/40 hover:bg-secondary disabled:opacity-60"
        >
          <Upload className="h-3.5 w-3.5" />
          {busy ? "Uploading..." : "Upload"}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => pickFiles(e.target.files)}
        />
      </div>
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {urls.map((u, i) => (
            <div key={i} className="relative">
              <img
                src={u}
                alt=""
                className="h-16 w-16 rounded-lg border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow"
                aria-label="Remove"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

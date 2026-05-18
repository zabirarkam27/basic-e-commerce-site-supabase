import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Plus,
  Save,
  Trash2,
  Upload,
  ExternalLink,
  Image as ImageIcon,
  Power,
  Copy,
  Eye,
  Pencil,
  Monitor,
  Tablet,
  Smartphone,
  Download,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Product } from "@/lib/store-types";
import { LandingPagePreview } from "./LandingPagePreview";
import { exportRowsCSV, csvTimestamp } from "@/lib/csv-export";

type PreviewDevice = "desktop" | "tablet" | "mobile";
const DEVICE_WIDTHS: Record<PreviewDevice, number> = {
  desktop: 1280,
  tablet: 820,
  mobile: 390,
};

type LandingPage = {
  id: string;
  slug: string;
  title: string;
  hero_image: string;
  headline: string;
  subheadline: string;
  product_id: string | null;
  cta_text: string;
  cta_link: string;
  active: boolean;
  ga_measurement_id: string;
  meta_pixel_id: string;
  google_ads_id: string;
  created_at: string;
  updated_at: string;
};

const EMPTY: Omit<LandingPage, "id" | "created_at" | "updated_at"> = {
  slug: "",
  title: "",
  hero_image: "",
  headline: "",
  subheadline: "",
  product_id: null,
  cta_text: "Order Now",
  cta_link: "",
  active: true,
  ga_measurement_id: "",
  meta_pixel_id: "",
  google_ads_id: "",
};

const slugify = (s: string) =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export function LandingPagesManager() {
  const [pages, setPages] = useState<LandingPage[]>([]);
  const [products, setProducts] = useState<Pick<Product, "id" | "title">[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LandingPage | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: pagesData }, { data: productsData }] = await Promise.all([
      supabase.from("landing_pages").select("*").order("created_at", { ascending: false }),
      supabase.from("products").select("id,title").order("title"),
    ]);
    setPages((pagesData as LandingPage[]) ?? []);
    setProducts(productsData ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditing({ ...EMPTY, id: "", created_at: "", updated_at: "" });
    setCreating(true);
  };

  const openEdit = (p: LandingPage) => {
    setEditing(p);
    setCreating(false);
  };

  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this landing page? This cannot be undone.")) return;
    const { error } = await supabase.from("landing_pages").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Landing page deleted");
      load();
    }
  };

  const toggleActive = async (p: LandingPage) => {
    const { error } = await supabase
      .from("landing_pages")
      .update({ active: !p.active, updated_at: new Date().toISOString() })
      .eq("id", p.id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Page ${!p.active ? "activated" : "deactivated"}`);
      load();
    }
  };

  const copyUrl = (slug: string) => {
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success("URL copied");
  };

  const exportCSV = () => {
    exportRowsCSV({
      filename: `landing_pages_${csvTimestamp()}.csv`,
      headers: [
        "Slug",
        "Title",
        "Headline",
        "Subheadline",
        "Product",
        "CTA Text",
        "CTA Link",
        "Status",
        "GA4 ID",
        "Meta Pixel ID",
        "Google Ads ID",
        "Hero Image",
        "Public URL",
        "Created",
        "Updated",
      ],
      rows: pages.map((p) => [
        p.slug,
        p.title,
        p.headline,
        p.subheadline,
        products.find((x) => x.id === p.product_id)?.title ?? "",
        p.cta_text,
        p.cta_link,
        p.active ? "Live" : "Draft",
        p.ga_measurement_id,
        p.meta_pixel_id,
        p.google_ads_id,
        p.hero_image,
        `${window.location.origin}/p/${p.slug}`,
        p.created_at,
        p.updated_at,
      ]),
      emptyMessage: "No landing pages to export.",
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Landing Pages</h2>
          <p className="text-sm text-muted-foreground">
            Build custom URLs to promote a specific product. Pages live at{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs">/p/&lt;slug&gt;</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-2 text-xs font-medium hover:border-primary/40 hover:bg-secondary"
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </button>
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-pop"
          >
            <Plus className="h-4 w-4" /> New page
          </button>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading…
        </div>
      ) : pages.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No landing pages yet. Click <strong>New page</strong> to build your first one.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-[760px] w-full text-sm">
              <thead className="bg-secondary/40 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Title</th>
                  <th className="px-4 py-3 text-left">Slug</th>
                  <th className="px-4 py-3 text-left">Product</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {pages.map((p) => {
                  const productTitle = products.find((x) => x.id === p.product_id)?.title;
                  return (
                    <tr key={p.id} className="border-t border-border/60">
                      <td className="px-4 py-3 font-medium">{p.title}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        /p/{p.slug}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{productTitle ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span
                          className={
                            p.active
                              ? "rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success"
                              : "rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
                          }
                        >
                          {p.active ? "Live" : "Draft"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconBtn title="Copy URL" onClick={() => copyUrl(p.slug)}>
                            <Copy className="h-3.5 w-3.5" />
                          </IconBtn>
                          <Link
                            to="/p/$slug"
                            params={{ slug: p.slug }}
                            target="_blank"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary"
                            title="Open"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Link>
                          <IconBtn title="Toggle status" onClick={() => toggleActive(p)}>
                            <Power className="h-3.5 w-3.5" />
                          </IconBtn>
                          <IconBtn title="Edit" onClick={() => openEdit(p)}>
                            <span className="text-xs font-semibold">Edit</span>
                          </IconBtn>
                          <IconBtn title="Delete" onClick={() => remove(p.id)} danger>
                            <Trash2 className="h-3.5 w-3.5" />
                          </IconBtn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <EditorModal
          page={editing}
          creating={creating}
          products={products}
          onClose={close}
          onSaved={() => {
            close();
            load();
          }}
        />
      )}
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-lg p-1.5 hover:bg-secondary ${
        danger ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function EditorModal({
  page,
  creating,
  products,
  onClose,
  onSaved,
}: {
  page: LandingPage;
  creating: boolean;
  products: Pick<Product, "id" | "title">[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(page);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [device, setDevice] = useState<PreviewDevice>("desktop");
  const fileInput = useRef<HTMLInputElement | null>(null);

  const set = <K extends keyof LandingPage>(k: K, v: LandingPage[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onTitleChange = (val: string) => {
    set("title", val);
    if (creating && !form.slug) set("slug", slugify(val));
  };

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) return toast.error("Image must be under 10 MB");
    setUploading(true);
    try {
      const { uploadImageAsWebp } = await import("@/lib/image-upload");
      const url = await uploadImageAsWebp(f, "landing");
      set("hero_image", url);
      toast.success("Image uploaded");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const save = async () => {
    const slug = slugify(form.slug);
    if (!slug) return toast.error("Slug is required");
    if (!form.title.trim()) return toast.error("Page title is required");
    setSaving(true);
    try {
      const payload = {
        slug,
        title: form.title.trim(),
        hero_image: form.hero_image,
        headline: form.headline,
        subheadline: form.subheadline,
        product_id: form.product_id || null,
        cta_text: form.cta_text || "Order Now",
        cta_link: form.cta_link,
        active: form.active,
        ga_measurement_id: form.ga_measurement_id.trim(),
        meta_pixel_id: form.meta_pixel_id.trim(),
        google_ads_id: form.google_ads_id.trim(),
        updated_at: new Date().toISOString(),
      };
      if (creating) {
        const { error } = await supabase.from("landing_pages").insert(payload);
        if (error) throw error;
        toast.success("Landing page created");
      } else {
        const { error } = await supabase.from("landing_pages").update(payload).eq("id", page.id);
        if (error) throw error;
        toast.success("Landing page updated");
      }
      onSaved();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast.error(
        msg.includes("duplicate") || msg.includes("unique")
          ? "That slug is already in use"
          : msg.includes("landing_pages_slug_format")
            ? "Slug can only contain lowercase letters, numbers, and dashes"
            : msg,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-6 py-4">
          <h3 className="text-lg font-semibold">
            {creating ? "New landing page" : "Edit landing page"}
          </h3>
          <div className="flex items-center gap-3">
            <div className="inline-flex rounded-full border border-border bg-background p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode("edit")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
                  mode === "edit"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground"
                }`}
              >
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => setMode("preview")}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 ${
                  mode === "preview"
                    ? "bg-primary text-primary-foreground shadow-soft"
                    : "text-muted-foreground"
                }`}
              >
                <Eye className="h-3.5 w-3.5" /> Preview
              </button>
            </div>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="h-4 w-4 rounded border-border"
              />
              <span className="font-medium">Published</span>
            </label>
          </div>
        </div>

        {mode === "preview" ? (
          <div className="flex flex-1 flex-col overflow-hidden bg-secondary/30">
            <div className="flex items-center justify-center gap-1 border-b border-border bg-card px-4 py-2">
              {(["desktop", "tablet", "mobile"] as PreviewDevice[]).map((d) => {
                const Icon = d === "desktop" ? Monitor : d === "tablet" ? Tablet : Smartphone;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDevice(d)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium capitalize ${
                      device === d
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-secondary/60"
                    }`}
                    title={`${d} (${DEVICE_WIDTHS[d]}px)`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {d}
                  </button>
                );
              })}
              <span className="ml-2 text-[11px] text-muted-foreground">
                {DEVICE_WIDTHS[device]}px · live preview
              </span>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <div
                className="mx-auto overflow-hidden rounded-xl border border-border bg-background shadow-soft transition-all"
                style={{ width: "100%", maxWidth: DEVICE_WIDTHS[device] }}
              >
                <LandingPagePreview
                  data={{
                    slug: form.slug,
                    title: form.title,
                    hero_image: form.hero_image,
                    headline: form.headline,
                    subheadline: form.subheadline,
                    product_id: form.product_id,
                    cta_text: form.cta_text,
                    cta_link: form.cta_link,
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            <div className="space-y-4">
              <Field label="Page title">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  className="lp-input"
                  placeholder="Honey Promo — Summer Sale"
                />
              </Field>

              <Field label="Slug (URL)">
                <div className="flex items-center overflow-hidden rounded-xl border border-border bg-background focus-within:border-primary">
                  <span className="px-3 py-2 text-xs text-muted-foreground">/p/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => set("slug", slugify(e.target.value))}
                    className="w-full bg-transparent py-2 pr-3 text-sm outline-none"
                    placeholder="summer-sale"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Lowercase letters, numbers, and dashes only.
                </p>
              </Field>

              <Field label="Hero image">
                <div className="flex items-center gap-3">
                  <div className="grid h-20 w-32 place-items-center overflow-hidden rounded-xl border border-border bg-secondary/40">
                    {form.hero_image ? (
                      <img
                        src={form.hero_image}
                        alt="Hero"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <input
                      ref={fileInput}
                      type="file"
                      accept="image/*"
                      onChange={upload}
                      className="hidden"
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => fileInput.current?.click()}
                        disabled={uploading}
                        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
                      >
                        <Upload className="h-3.5 w-3.5" /> {uploading ? "Uploading…" : "Upload"}
                      </button>
                      {form.hero_image && (
                        <button
                          type="button"
                          onClick={() => set("hero_image", "")}
                          className="text-xs text-muted-foreground hover:text-destructive"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      value={form.hero_image}
                      onChange={(e) => set("hero_image", e.target.value)}
                      className="lp-input"
                      placeholder="Or paste image URL"
                    />
                  </div>
                </div>
              </Field>

              <Field label="Headline">
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => set("headline", e.target.value)}
                  className="lp-input"
                  placeholder="Pure raw honey, straight from the source"
                />
              </Field>

              <Field label="Subheadline">
                <textarea
                  value={form.subheadline}
                  onChange={(e) => set("subheadline", e.target.value)}
                  className="lp-input min-h-[80px]"
                  placeholder="Short supporting text shown under the headline"
                />
              </Field>

              <Field label="Featured product">
                <select
                  value={form.product_id ?? ""}
                  onChange={(e) => set("product_id", e.target.value || null)}
                  className="lp-input"
                >
                  <option value="">— No product —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="CTA button text">
                  <input
                    type="text"
                    value={form.cta_text}
                    onChange={(e) => set("cta_text", e.target.value)}
                    className="lp-input"
                    placeholder="Order Now"
                  />
                </Field>
                <Field label="CTA link (optional)">
                  <input
                    type="text"
                    value={form.cta_link}
                    onChange={(e) => set("cta_link", e.target.value)}
                    className="lp-input"
                    placeholder="https://… (leave blank to open product checkout)"
                  />
                </Field>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <div className="mb-3">
                  <div className="text-sm font-semibold">Marketing & Tracking</div>
                  <p className="text-xs text-muted-foreground">
                    Per-page tracking IDs. These load <strong>in addition to</strong> your site-wide
                    IDs so you can measure this landing page separately.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Google Analytics ID">
                    <input
                      type="text"
                      value={form.ga_measurement_id}
                      onChange={(e) => set("ga_measurement_id", e.target.value)}
                      className="lp-input"
                      placeholder="G-XXXXXXXXXX"
                    />
                  </Field>
                  <Field label="Meta Pixel ID">
                    <input
                      type="text"
                      value={form.meta_pixel_id}
                      onChange={(e) => set("meta_pixel_id", e.target.value)}
                      className="lp-input"
                      placeholder="1234567890"
                    />
                  </Field>
                  <Field label="Google Ads ID">
                    <input
                      type="text"
                      value={form.google_ads_id}
                      onChange={(e) => set("google_ads_id", e.target.value)}
                      className="lp-input"
                      placeholder="AW-XXXXXXXXX"
                    />
                  </Field>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
          >
            <Save className="h-4 w-4" />{" "}
            {saving ? "Saving…" : creating ? "Create page" : "Save changes"}
          </button>
        </div>

        <style>{`.lp-input{width:100%;border-radius:.75rem;border:1px solid var(--color-input);background:var(--color-background);padding:.6rem .85rem;font-size:.875rem;outline:none}
        .lp-input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary) 25%, transparent)}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
    </div>
  );
}

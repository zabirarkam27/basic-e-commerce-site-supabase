import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Save,
  Upload,
  Palette,
  Type,
  Image as ImageIcon,
  Phone,
  MapPin,
  Mail,
  Building2,
  LineChart,
  Truck,
  Eye,
  EyeOff,
  Share2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  DEFAULT_SETTINGS,
  FONT_OPTIONS,
  mergeSettings,
  type SiteSettings,
} from "@/lib/site-settings";
import { uploadImageAsWebp } from "@/lib/image-upload";

const SETTING_KEYS: (keyof SiteSettings)[] = [
  "brand_name",
  "logo_url",
  "favicon_url",
  "primary_color",
  "font_family",
  "contact_phone",
  "contact_email",
  "contact_address",
  "contact_location_url",
  "ga_measurement_id",
  "meta_pixel_id",
  "google_ads_id",
  "show_product_ratings",
  "social_facebook",
  "social_instagram",
  "social_youtube",
  "social_tiktok",
  "social_twitter",
  "social_linkedin",
  "social_whatsapp",
  "order_notification_email",
  "order_notification_whatsapp",
];

export function SettingsPanel() {
  const [inside, setInside] = useState("60");
  const [outside, setOutside] = useState("120");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [site, setSite] = useState<SiteSettings>(DEFAULT_SETTINGS);
  const [savingSite, setSavingSite] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const logoInput = useRef<HTMLInputElement | null>(null);
  const faviconInput = useRef<HTMLInputElement | null>(null);
  // Steadfast + BD Courier fraud
  const [steadfastApi, setSteadfastApi] = useState("");
  const [steadfastSecret, setSteadfastSecret] = useState("");
  const [bdCourierKey, setBdCourierKey] = useState("");
  // Pathao
  const [pathaoBase, setPathaoBase] = useState("https://api-hermes.pathao.com");
  const [pathaoClientId, setPathaoClientId] = useState("");
  const [pathaoClientSecret, setPathaoClientSecret] = useState("");
  const [pathaoUser, setPathaoUser] = useState("");
  const [pathaoPass, setPathaoPass] = useState("");
  const [pathaoStoreId, setPathaoStoreId] = useState("");
  // RedX / Paperfly / eCourier (credentials stored for future API push; today manual)
  const [redxToken, setRedxToken] = useState("");
  const [paperflyKey, setPaperflyKey] = useState("");
  const [paperflyUser, setPaperflyUser] = useState("");
  const [paperflyPass, setPaperflyPass] = useState("");
  const [ecourierUserId, setEcourierUserId] = useState("");
  const [ecourierSecret, setEcourierSecret] = useState("");
  const [ecourierKey, setEcourierKey] = useState("");

  const [showApi, setShowApi] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [showBdc, setShowBdc] = useState(false);
  const [savingCourier, setSavingCourier] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("settings").select("*");
      const m = new Map((data ?? []).map((s) => [s.key, s.value]));
      setInside(String(m.get("delivery_inside") ?? 60));
      setOutside(String(m.get("delivery_outside") ?? 120));
      setSite(mergeSettings(data));
    })();

    (async () => {
      const keys = [
        "steadfast_api_key",
        "steadfast_secret_key",
        "bdcourier_api_key",
        "pathao_base_url",
        "pathao_client_id",
        "pathao_client_secret",
        "pathao_username",
        "pathao_password",
        "pathao_store_id",
        "redx_api_token",
        "paperfly_api_key",
        "paperfly_user_name",
        "paperfly_user_password",
        "ecourier_user_id",
        "ecourier_user_secret",
        "ecourier_api_key",
      ];
      const { data } = await supabase.from("admin_secrets").select("key,value").in("key", keys);
      const sm = new Map((data ?? []).map((s) => [s.key, s.value]));
      const g = (k: string, d = "") => String(sm.get(k) ?? d);
      setSteadfastApi(g("steadfast_api_key"));
      setSteadfastSecret(g("steadfast_secret_key"));
      setBdCourierKey(g("bdcourier_api_key"));
      setPathaoBase(g("pathao_base_url", "https://api-hermes.pathao.com"));
      setPathaoClientId(g("pathao_client_id"));
      setPathaoClientSecret(g("pathao_client_secret"));
      setPathaoUser(g("pathao_username"));
      setPathaoPass(g("pathao_password"));
      setPathaoStoreId(g("pathao_store_id"));
      setRedxToken(g("redx_api_token"));
      setPaperflyKey(g("paperfly_api_key"));
      setPaperflyUser(g("paperfly_user_name"));
      setPaperflyPass(g("paperfly_user_password"));
      setEcourierUserId(g("ecourier_user_id"));
      setEcourierSecret(g("ecourier_user_secret"));
      setEcourierKey(g("ecourier_api_key"));
    })();
  }, []);

  const saveCourier = async () => {
    setSavingCourier(true);
    try {
      const ts = new Date().toISOString();
      const rows = [
        ["steadfast_api_key", steadfastApi],
        ["steadfast_secret_key", steadfastSecret],
        ["bdcourier_api_key", bdCourierKey],
        ["pathao_base_url", pathaoBase],
        ["pathao_client_id", pathaoClientId],
        ["pathao_client_secret", pathaoClientSecret],
        ["pathao_username", pathaoUser],
        ["pathao_password", pathaoPass],
        ["pathao_store_id", pathaoStoreId],
        ["redx_api_token", redxToken],
        ["paperfly_api_key", paperflyKey],
        ["paperfly_user_name", paperflyUser],
        ["paperfly_user_password", paperflyPass],
        ["ecourier_user_id", ecourierUserId],
        ["ecourier_user_secret", ecourierSecret],
        ["ecourier_api_key", ecourierKey],
      ].map(([key, value]) => ({ key, value: String(value ?? "").trim(), updated_at: ts }));
      const { error } = await supabase.from("admin_secrets").upsert(rows, { onConflict: "key" });
      if (error) throw error;
      toast.success("Courier & fraud-check credentials saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingCourier(false);
    }
  };

  const setField = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) =>
    setSite((s) => ({ ...s, [k]: v }));

  const saveDelivery = async () => {
    const { error } = await supabase.from("settings").upsert([
      { key: "delivery_inside", value: Number(inside), updated_at: new Date().toISOString() },
      { key: "delivery_outside", value: Number(outside), updated_at: new Date().toISOString() },
    ]);
    if (error) toast.error(error.message);
    else toast.success("Delivery charges updated");
  };

  const saveSite = async () => {
    setSavingSite(true);
    try {
      const rows = SETTING_KEYS.map((k) => ({
        key: k,
        value: typeof site[k] === "boolean" ? site[k] : (site[k] ?? ""),
        updated_at: new Date().toISOString(),
      }));
      const { error } = await supabase.from("settings").upsert(rows);
      if (error) throw error;
      toast.success("Site settings saved");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSavingSite(false);
    }
  };

  const onLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) return toast.error("Logo must be under 2 MB");
    setUploadingLogo(true);
    try {
      const url = await uploadImageAsWebp(f, "logo");
      setField("logo_url", url);
      toast.success("Logo uploaded. Click Save to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingLogo(false);
      if (logoInput.current) logoInput.current.value = "";
    }
  };

  const onFaviconChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 1 * 1024 * 1024) return toast.error("Favicon must be under 1 MB");
    setUploadingFavicon(true);
    try {
      const url = await uploadImageAsWebp(f, "favicon");
      setField("favicon_url", url);
      toast.success("Favicon uploaded. Click Save to apply.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingFavicon(false);
      if (faviconInput.current) faviconInput.current.value = "";
    }
  };

  const changePassword = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== pw2) return toast.error("Passwords do not match");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      setPw("");
      setPw2("");
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* Branding */}
      <Card title="Branding & Theme" icon={<Palette className="h-4 w-4" />} wide>
        <Field label="Website name">
          <input
            type="text"
            value={site.brand_name}
            onChange={(e) => setField("brand_name", e.target.value)}
            className="adm-input"
            placeholder="Your store name"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Logo">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-border bg-secondary/40">
                {site.logo_url ? (
                  <img src={site.logo_url} alt="Logo" className="h-full w-full object-contain" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <input
                ref={logoInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                onChange={onLogoChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => logoInput.current?.click()}
                disabled={uploadingLogo}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" /> {uploadingLogo ? "Uploading…" : "Upload"}
              </button>
              {site.logo_url && (
                <button
                  type="button"
                  onClick={() => setField("logo_url", "")}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
          </Field>

          <Field label="Favicon">
            <div className="flex items-center gap-3">
              <div className="grid h-14 w-14 place-items-center overflow-hidden rounded-xl border border-border bg-secondary/40">
                {site.favicon_url ? (
                  <img src={site.favicon_url} alt="Favicon" className="h-8 w-8 object-contain" />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <input
                ref={faviconInput}
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/vnd.microsoft.icon"
                onChange={onFaviconChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => faviconInput.current?.click()}
                disabled={uploadingFavicon}
                className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60"
              >
                <Upload className="h-3.5 w-3.5" /> {uploadingFavicon ? "Uploading…" : "Upload"}
              </button>
              {site.favicon_url && (
                <button
                  type="button"
                  onClick={() => setField("favicon_url", "")}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Remove
                </button>
              )}
            </div>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary / Accent color">
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={site.primary_color}
                onChange={(e) => setField("primary_color", e.target.value)}
                className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-background"
              />
              <input
                type="text"
                value={site.primary_color}
                onChange={(e) => setField("primary_color", e.target.value)}
                className="adm-input"
                placeholder="#ef4444"
              />
            </div>
          </Field>

          <Field
            label={
              <>
                <Type className="mr-1 inline h-3.5 w-3.5" />
                Font family
              </>
            }
          >
            <select
              value={site.font_family}
              onChange={(e) => setField("font_family", e.target.value)}
              className="adm-input"
              style={{ fontFamily: `"${site.font_family}", sans-serif` }}
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f} value={f} style={{ fontFamily: `"${f}", sans-serif` }}>
                  {f}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-border bg-secondary/30 p-3">
          <div>
            <div className="text-sm font-medium">Product card ratings</div>
            <div className="text-xs text-muted-foreground">
              সব প্রোডাক্ট কার্ডের স্টার রেটিং এক ক্লিকে অন/অফ করুন।
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={site.show_product_ratings}
            onClick={() => setField("show_product_ratings", !site.show_product_ratings)}
            className={`relative h-6 w-11 rounded-full transition ${site.show_product_ratings ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-background shadow transition ${site.show_product_ratings ? "left-5" : "left-0.5"}`}
            />
          </button>
        </div>

        <button
          onClick={saveSite}
          disabled={savingSite}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingSite ? "Saving…" : "Save branding"}
        </button>
      </Card>

      {/* Contact / Business info */}
      <Card title="Business Information" icon={<Building2 className="h-4 w-4" />} wide>
        <Field
          label={
            <>
              <Phone className="mr-1 inline h-3.5 w-3.5" />
              Phone number
            </>
          }
        >
          <input
            type="tel"
            value={site.contact_phone}
            onChange={(e) => setField("contact_phone", e.target.value)}
            className="adm-input"
            placeholder="+880 1700 000000"
          />
        </Field>
        <Field
          label={
            <>
              <Mail className="mr-1 inline h-3.5 w-3.5" />
              Email
            </>
          }
        >
          <input
            type="email"
            value={site.contact_email}
            onChange={(e) => setField("contact_email", e.target.value)}
            className="adm-input"
            placeholder="hello@yourstore.com"
          />
        </Field>
        <Field
          label={
            <>
              <MapPin className="mr-1 inline h-3.5 w-3.5" />
              Address
            </>
          }
        >
          <textarea
            value={site.contact_address}
            onChange={(e) => setField("contact_address", e.target.value)}
            className="adm-input min-h-[80px]"
            placeholder="Street, City, Country"
          />
        </Field>
        <Field label="Google Maps / Location URL">
          <input
            type="url"
            value={site.contact_location_url}
            onChange={(e) => setField("contact_location_url", e.target.value)}
            className="adm-input"
            placeholder="https://maps.google.com/?q=..."
          />
        </Field>
        <button
          onClick={saveSite}
          disabled={savingSite}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingSite ? "Saving…" : "Save business info"}
        </button>
      </Card>

      {/* Order notifications */}
      <Card title="Order Notifications" icon={<Mail className="h-4 w-4" />} wide>
        <Field
          label={
            <>
              <Mail className="mr-1 inline h-3.5 w-3.5" />
              Order notification email
            </>
          }
        >
          <input
            type="email"
            value={site.order_notification_email}
            onChange={(e) => setField("order_notification_email", e.target.value)}
            className="adm-input"
            placeholder="orders@yourstore.com"
          />
        </Field>
        <Field
          label={
            <>
              <Phone className="mr-1 inline h-3.5 w-3.5" />
              Order notification WhatsApp
            </>
          }
        >
          <input
            type="tel"
            value={site.order_notification_whatsapp}
            onChange={(e) => setField("order_notification_whatsapp", e.target.value)}
            className="adm-input"
            placeholder="+8801XXXXXXXXX"
          />
        </Field>
        <p className="text-xs text-muted-foreground sm:col-span-2">
          নতুন অর্ডার এলে এই ইমেইলে স্বয়ংক্রিয়ভাবে অর্ডার ডিটেইলস পাঠানো হবে (ইমেইল ডোমেইন সেটআপ
          করা থাকতে হবে)। WhatsApp নম্বর সেভ করলে অর্ডার প্যানেল থেকে এক ক্লিকে অর্ডার ফরোয়ার্ড করা
          যাবে।
        </p>
        <button
          onClick={saveSite}
          disabled={savingSite}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingSite ? "Saving…" : "Save notification settings"}
        </button>
      </Card>

      <Card title="Social Media Links" icon={<Share2 className="h-4 w-4" />} wide>
        <p className="text-xs text-muted-foreground">
          ফুটারে আইকন হিসেবে দেখাবে। কোনো ফিল্ড ফাঁকা রাখলে সেটা হাইড থাকবে।
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Facebook URL">
            <input
              type="url"
              value={site.social_facebook}
              onChange={(e) => setField("social_facebook", e.target.value.trim())}
              className="adm-input"
              placeholder="https://facebook.com/yourpage"
            />
          </Field>
          <Field label="Instagram URL">
            <input
              type="url"
              value={site.social_instagram}
              onChange={(e) => setField("social_instagram", e.target.value.trim())}
              className="adm-input"
              placeholder="https://instagram.com/yourhandle"
            />
          </Field>
          <Field label="YouTube URL">
            <input
              type="url"
              value={site.social_youtube}
              onChange={(e) => setField("social_youtube", e.target.value.trim())}
              className="adm-input"
              placeholder="https://youtube.com/@yourchannel"
            />
          </Field>
          <Field label="TikTok URL">
            <input
              type="url"
              value={site.social_tiktok}
              onChange={(e) => setField("social_tiktok", e.target.value.trim())}
              className="adm-input"
              placeholder="https://tiktok.com/@yourhandle"
            />
          </Field>
          <Field label="Twitter / X URL">
            <input
              type="url"
              value={site.social_twitter}
              onChange={(e) => setField("social_twitter", e.target.value.trim())}
              className="adm-input"
              placeholder="https://x.com/yourhandle"
            />
          </Field>
          <Field label="LinkedIn URL">
            <input
              type="url"
              value={site.social_linkedin}
              onChange={(e) => setField("social_linkedin", e.target.value.trim())}
              className="adm-input"
              placeholder="https://linkedin.com/company/yourbrand"
            />
          </Field>
          <Field label="WhatsApp (number or wa.me link)">
            <input
              type="text"
              value={site.social_whatsapp}
              onChange={(e) => setField("social_whatsapp", e.target.value.trim())}
              className="adm-input"
              placeholder="+8801700000000 or https://wa.me/8801700000000"
            />
          </Field>
        </div>
        <button
          onClick={saveSite}
          disabled={savingSite}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingSite ? "Saving…" : "Save social links"}
        </button>
      </Card>

      <Card title="Analytics & Tracking" icon={<LineChart className="h-4 w-4" />} wide>
        <p className="text-xs text-muted-foreground">
          Paste your tracking IDs below. Scripts are injected into every page automatically. Leave a
          field blank to disable it.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Google Analytics Measurement ID">
            <input
              type="text"
              value={site.ga_measurement_id}
              onChange={(e) => setField("ga_measurement_id", e.target.value.trim())}
              className="adm-input"
              placeholder="G-XXXXXXXXXX"
            />
          </Field>
          <Field label="Meta Pixel ID">
            <input
              type="text"
              value={site.meta_pixel_id}
              onChange={(e) => setField("meta_pixel_id", e.target.value.trim())}
              className="adm-input"
              placeholder="1234567890123456"
            />
          </Field>
          <Field label="Google Ads Conversion ID">
            <input
              type="text"
              value={site.google_ads_id}
              onChange={(e) => setField("google_ads_id", e.target.value.trim())}
              className="adm-input"
              placeholder="AW-123456789"
            />
          </Field>
        </div>
        <button
          onClick={saveSite}
          disabled={savingSite}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingSite ? "Saving" : "Save tracking IDs"}
        </button>
      </Card>

      <Card title="Delivery Charges">
        <Field label="Inside Dhaka (৳)">
          <input
            type="number"
            value={inside}
            onChange={(e) => setInside(e.target.value)}
            className="adm-input"
          />
        </Field>
        <Field label="Outside Dhaka (৳)">
          <input
            type="number"
            value={outside}
            onChange={(e) => setOutside(e.target.value)}
            className="adm-input"
          />
        </Field>
        <button
          onClick={saveDelivery}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop"
        >
          <Save className="h-4 w-4" /> Save
        </button>
      </Card>

      <Card title="Courier Integrations (Bangladesh)" icon={<Truck className="h-4 w-4" />} wide>
        <div className="mb-3 text-xs text-muted-foreground">
          বাংলাদেশের প্রচলিত কুরিয়ারগুলোর ক্রেডেনশিয়াল এখানে সংরক্ষণ করুন। অর্ডার ডিটেইলস থেকে
          যেকোনো প্রোভাইডারে পুশ করতে পারবেন।
          <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 font-medium text-emerald-700 dark:text-emerald-300">
            API: Steadfast, Pathao
          </span>
          <span className="ml-1 rounded-full bg-amber-500/10 px-2 py-0.5 font-medium text-amber-700 dark:text-amber-300">
            Manual: RedX, Paperfly, eCourier
          </span>
        </div>

        {/* Steadfast */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">স্টেডফাস্ট · Steadfast</div>
            <a
              href="https://steadfast.com.bd"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline"
            >
              steadfast.com.bd → Settings → API
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="API Key">
              <div className="relative">
                <input
                  type={showApi ? "text" : "password"}
                  value={steadfastApi}
                  onChange={(e) => setSteadfastApi(e.target.value)}
                  className="adm-input pr-10"
                  placeholder="xxxxxxxx-xxxx-xxxx"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowApi((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary"
                  aria-label="Toggle visibility"
                >
                  {showApi ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
            <Field label="Secret Key">
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  value={steadfastSecret}
                  onChange={(e) => setSteadfastSecret(e.target.value)}
                  className="adm-input pr-10"
                  placeholder="xxxxxxxxxxxxxxxxxxxxxxxx"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((v) => !v)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary"
                  aria-label="Toggle visibility"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </Field>
          </div>
        </div>

        {/* Pathao */}
        <div className="mt-4 rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-sm font-semibold">পাঠাও · Pathao Courier</div>
            <a
              href="https://merchant.pathao.com"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary underline"
            >
              merchant.pathao.com → Settings → API
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Client ID">
              <input
                type="text"
                value={pathaoClientId}
                onChange={(e) => setPathaoClientId(e.target.value)}
                className="adm-input"
                placeholder="abcd1234"
                autoComplete="off"
              />
            </Field>
            <Field label="Client Secret">
              <input
                type="password"
                value={pathaoClientSecret}
                onChange={(e) => setPathaoClientSecret(e.target.value)}
                className="adm-input"
                autoComplete="off"
              />
            </Field>
            <Field label="Username (merchant email)">
              <input
                type="text"
                value={pathaoUser}
                onChange={(e) => setPathaoUser(e.target.value)}
                className="adm-input"
                autoComplete="off"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                value={pathaoPass}
                onChange={(e) => setPathaoPass(e.target.value)}
                className="adm-input"
                autoComplete="off"
              />
            </Field>
            <Field label="Store ID">
              <input
                type="text"
                value={pathaoStoreId}
                onChange={(e) => setPathaoStoreId(e.target.value)}
                className="adm-input"
                placeholder="148"
              />
            </Field>
            <Field label="API Base URL">
              <input
                type="url"
                value={pathaoBase}
                onChange={(e) => setPathaoBase(e.target.value)}
                className="adm-input"
                placeholder="https://api-hermes.pathao.com"
              />
            </Field>
          </div>
        </div>

        {/* Manual providers */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">রেডএক্স · RedX</div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Manual
              </span>
            </div>
            <Field label="API Token (for future API push)">
              <input
                type="password"
                value={redxToken}
                onChange={(e) => setRedxToken(e.target.value)}
                className="adm-input"
                autoComplete="off"
              />
            </Field>
            <p className="mt-2 text-[10px] text-muted-foreground">
              RedX portal-এ বুক করে tracking ID অর্ডার ডিটেইলস-এ বসান।
            </p>
          </div>

          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">পেপারফ্লাই · Paperfly</div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Manual
              </span>
            </div>
            <Field label="API Key">
              <input
                type="password"
                value={paperflyKey}
                onChange={(e) => setPaperflyKey(e.target.value)}
                className="adm-input"
                autoComplete="off"
              />
            </Field>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label="User Name">
                <input
                  type="text"
                  value={paperflyUser}
                  onChange={(e) => setPaperflyUser(e.target.value)}
                  className="adm-input"
                  autoComplete="off"
                />
              </Field>
              <Field label="Password">
                <input
                  type="password"
                  value={paperflyPass}
                  onChange={(e) => setPaperflyPass(e.target.value)}
                  className="adm-input"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>

          <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">ইকুরিয়ার · eCourier</div>
              <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
                Manual
              </span>
            </div>
            <Field label="User ID">
              <input
                type="text"
                value={ecourierUserId}
                onChange={(e) => setEcourierUserId(e.target.value)}
                className="adm-input"
                autoComplete="off"
              />
            </Field>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label="User Secret">
                <input
                  type="password"
                  value={ecourierSecret}
                  onChange={(e) => setEcourierSecret(e.target.value)}
                  className="adm-input"
                  autoComplete="off"
                />
              </Field>
              <Field label="API Key">
                <input
                  type="password"
                  value={ecourierKey}
                  onChange={(e) => setEcourierKey(e.target.value)}
                  className="adm-input"
                  autoComplete="off"
                />
              </Field>
            </div>
          </div>
        </div>
        <div className="mt-5 border-t border-border pt-4">
          <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Fraud Check (BD Courier)
          </div>
          <div className="mb-3 text-xs text-muted-foreground">
            বাংলাদেশের সব কুরিয়ারে ফোনের পার্সেল হিস্টরি (delivered/cancelled) চেক করে ফ্রড অর্ডার
            আটকাতে সাহায্য করে। Token নিন{" "}
            <a
              href="https://bdcourier.com"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              bdcourier.com → API
            </a>{" "}
            থেকে।
          </div>
          <Field label="BD Courier API Token">
            <div className="relative">
              <input
                type={showBdc ? "text" : "password"}
                value={bdCourierKey}
                onChange={(e) => setBdCourierKey(e.target.value)}
                className="adm-input pr-10"
                placeholder="Bearer token from bdcourier.com"
                autoComplete="off"
              />
              <button
                type="button"
                onClick={() => setShowBdc((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-secondary"
                aria-label="Toggle visibility"
              >
                {showBdc ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </Field>
        </div>

        <button
          onClick={saveCourier}
          disabled={savingCourier}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-pop disabled:opacity-60"
        >
          <Save className="h-4 w-4" /> {savingCourier ? "Saving" : "Save courier credentials"}
        </button>
      </Card>

      <Card title="Change Admin Password">
        <Field label="New password">
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="adm-input"
            autoComplete="new-password"
          />
        </Field>
        <Field label="Confirm new password">
          <input
            type="password"
            value={pw2}
            onChange={(e) => setPw2(e.target.value)}
            className="adm-input"
            autoComplete="new-password"
          />
        </Field>
        <button
          onClick={changePassword}
          className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background"
        >
          Update password
        </button>
      </Card>

      <style>{`.adm-input{width:100%;border-radius:.75rem;border:1px solid var(--color-input);background:var(--color-background);padding:.6rem .85rem;font-size:.875rem;outline:none}
      .adm-input:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in oklab, var(--color-primary) 25%, transparent)}`}</style>
    </div>
  );
}

function Card({
  title,
  icon,
  children,
  wide,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={`space-y-4 rounded-2xl border border-border bg-card p-6 shadow-soft ${wide ? "lg:col-span-2" : ""}`}
    >
      <h3 className="flex items-center gap-2 text-base font-semibold">
        {icon} {title}
      </h3>
      {children}
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

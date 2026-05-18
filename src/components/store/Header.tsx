import { useEffect, useState } from "react";
import { ShoppingBag, Languages, Menu, X } from "lucide-react";
import { useStore, smoothScrollTo } from "@/lib/store-context";
import { useSiteSettings } from "@/lib/site-settings";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const NAV = [
  { id: "home", key: "nav.home" },
  { id: "products", key: "nav.products" },
  { id: "why-us", key: "nav.why_us" },
  { id: "reviews", key: "nav.reviews" },
] as const;

export function Header() {
  const { cartCount } = useStore();
  const { settings } = useSiteSettings();
  const { t, lang, toggle } = useI18n();
  const brand = settings.brand_name || "Store";
  const initial = brand.trim().charAt(0).toUpperCase() || "S";
  const [menuOpen, setMenuOpen] = useState(false);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!menuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [menuOpen]);

  const handleNav = (id: string) => {
    setMenuOpen(false);
    // Wait a tick so the menu closes before scrolling.
    setTimeout(() => smoothScrollTo(id), 10);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6">
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            handleNav("home");
          }}
          className="flex min-w-0 items-center gap-2"
        >
          {settings.logo_url ? (
            <img
              src={settings.logo_url}
              alt={brand}
              className="h-9 w-9 shrink-0 rounded-xl object-contain shadow-soft"
            />
          ) : (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground font-bold shadow-soft">
              {initial}
            </div>
          )}
          <span className="truncate text-base font-semibold tracking-tight">{brand}</span>
        </a>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNav(n.id);
              }}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              {t(n.key)}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={toggle}
            aria-label={t("lang.switch_aria")}
            title={t("lang.switch_aria")}
            className="inline-flex h-10 items-center gap-1.5 rounded-full border border-border bg-card px-2.5 text-xs font-semibold transition-colors hover:bg-secondary sm:px-3"
          >
            <Languages className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{lang === "bn" ? "BN" : "EN"}</span>
          </button>

          <button
            type="button"
            onClick={() => smoothScrollTo("checkout")}
            className={cn(
              "relative grid h-11 w-11 place-items-center rounded-full bg-foreground text-background transition-transform hover:scale-105",
            )}
            aria-label={t("nav.cart_aria")}
          >
            <ShoppingBag className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-xs font-bold text-primary-foreground shadow-pop">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="grid h-11 w-11 place-items-center rounded-full border border-border bg-card transition-colors hover:bg-secondary md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      <div
        id="mobile-nav"
        className={cn(
          "md:hidden overflow-hidden border-t border-border/60 bg-background/95 backdrop-blur-lg transition-[max-height,opacity] duration-300 ease-out",
          menuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-3 py-3 sm:px-6">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              onClick={(e) => {
                e.preventDefault();
                handleNav(n.id);
              }}
              className="rounded-xl px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
            >
              {t(n.key)}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

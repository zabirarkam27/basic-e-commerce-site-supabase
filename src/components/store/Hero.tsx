import { ArrowRight, Sparkles, User } from "lucide-react";
import { useEffect, useState } from "react";
import { smoothScrollTo } from "@/lib/store-context";
import { useI18n } from "@/lib/i18n";
import { ResponsiveImage } from "@/lib/responsive-image";
import { supabase } from "@/integrations/supabase/client";

export function Hero() {
  const { t } = useI18n();
  const [avatars, setAvatars] = useState<string[]>([]);
  useEffect(() => {
    supabase
      .from("reviews")
      .select("avatar_url")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .limit(8)
      .then(({ data }) => {
        const urls = (data ?? [])
          .map((r: { avatar_url: string | null }) => r.avatar_url?.trim())
          .filter((u): u is string => !!u)
          .slice(0, 4);
        setAvatars(urls);
      });
  }, []);
  const heroImage =
    "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=1920&q=80&fm=webp";
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 md:py-20 md:gap-12 items-center">
        <div className="flex flex-col gap-6">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            {t("hero.badge")}
          </span>
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl md:text-6xl">
            {t("hero.title_a")} <span className="text-primary">{t("hero.title_b")}</span>
            {t("hero.title_c")}
          </h1>
          <p className="max-w-md text-base text-muted-foreground sm:text-lg">
            {t("hero.subtitle")}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => smoothScrollTo("products")}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-pop transition-transform hover:scale-[1.02]"
            >
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <div className="flex -space-x-2">
                {(avatars.length > 0 ? avatars : [null, null, null]).map((src, i) => (
                  <div
                    key={i}
                    className="h-7 w-7 overflow-hidden rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-primary"
                  >
                    {src ? (
                      <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
                    ) : (
                      <User className="h-full w-full p-1 text-primary-foreground" />
                    )}
                  </div>
                ))}
              </div>
              <span className="ml-1">{t("hero.happy_customers")}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-6 -z-10 rounded-[3rem] bg-gradient-to-br from-primary/15 via-accent to-transparent blur-2xl" />
          <div className="aspect-[4/5] overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <ResponsiveImage
              src={heroImage}
              sizes="(max-width: 768px) 100vw, 50vw"
              width={800}
              height={1000}
              alt="Premium raw honey jar"
              className="h-full w-full object-cover"
              loading="eager"
              fetchPriority="high"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 rounded-2xl border border-border bg-card px-4 py-3 shadow-pop">
            <div className="text-xs text-muted-foreground">{t("hero.today_only")}</div>
            <div className="text-base font-bold text-primary">{t("hero.discount")}</div>
          </div>
        </div>
      </div>
    </section>
  );
}

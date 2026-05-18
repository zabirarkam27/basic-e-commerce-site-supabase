import { useEffect, useState } from "react";
import {
  Truck,
  ShieldCheck,
  RefreshCcw,
  Star,
  Sparkles,
  Award,
  Heart,
  Leaf,
  Phone,
  Clock,
  Gift,
  ThumbsUp,
  Zap,
  Package,
  CreditCard,
  Headphones,
  MapPin,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ResponsiveImage } from "@/lib/responsive-image";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { useRef } from "react";

const ICON_MAP: Record<string, LucideIcon> = {
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
};

type WhyItem = {
  id: string;
  icon: string;
  title: string;
  description: string;
};

type Review = {
  id: string;
  name: string;
  location: string;
  text: string;
  rating: number;
  avatar_url: string;
};

export function WhyShop() {
  const [items, setItems] = useState<WhyItem[]>([]);
  const { t } = useI18n();

  useEffect(() => {
    let mounted = true;
    const fetchItems = async () => {
      const { data } = await supabase
        .from("why_us_items")
        .select("id,icon,title,description")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (mounted) setItems((data ?? []) as WhyItem[]);
    };
    fetchItems();
    return () => {
      mounted = false;
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <section id="why-us" className="bg-secondary/40 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("why.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("why.subtitle")}</p>
        </div>
        <div
          className={`grid gap-4 ${items.length >= 3 ? "sm:grid-cols-3" : items.length === 2 ? "sm:grid-cols-2" : "sm:grid-cols-1"}`}
        >
          {items.map((b) => {
            const Icon = ICON_MAP[b.icon] ?? Sparkles;
            return (
              <div key={b.id} className="rounded-2xl border border-border bg-card p-6 shadow-soft">
                <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accent text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold">{b.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{b.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function TrustReviews() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const { t } = useI18n();
  const autoplay = useRef(
    Autoplay({ delay: 4500, stopOnInteraction: false, stopOnMouseEnter: true }),
  );

  useEffect(() => {
    let mounted = true;
    const fetchReviews = async () => {
      const { data } = await supabase
        .from("reviews")
        .select("id,name,location,text,rating,avatar_url")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (mounted) setReviews((data ?? []) as Review[]);
    };
    fetchReviews();
    return () => {
      mounted = false;
    };
  }, []);

  if (reviews.length === 0) return null;
  return (
    <section id="reviews" className="py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("reviews.title")}</h2>
          <p className="mt-2 text-muted-foreground">{t("reviews.subtitle")}</p>
        </div>
        <Carousel
          opts={{ align: "start", loop: reviews.length > 3 }}
          plugins={[autoplay.current]}
          className="relative"
        >
          <CarouselContent className="-ml-4">
            {reviews.map((r) => (
              <CarouselItem key={r.id} className="pl-4 basis-full sm:basis-1/2 md:basis-1/3">
                <div className="h-full rounded-2xl border border-border bg-card p-6 shadow-soft">
                  <div className="flex items-center gap-1 text-warning">
                    {Array.from({ length: Math.max(0, Math.min(5, r.rating)) }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-warning" />
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-foreground">"{r.text}"</p>
                  <div className="mt-5 flex items-center gap-3">
                    {r.avatar_url ? (
                      <ResponsiveImage
                        src={r.avatar_url}
                        alt={r.name}
                        sizes="40px"
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
                        {r.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="text-sm font-semibold">{r.name}</div>
                      {r.location && (
                        <div className="text-xs text-muted-foreground">{r.location}</div>
                      )}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden sm:flex -left-4" />
          <CarouselNext className="hidden sm:flex -right-4" />
        </Carousel>
      </div>
    </section>
  );
}

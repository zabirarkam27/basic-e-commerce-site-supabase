import { useEffect, useState } from "react";
import { ChevronDown, HelpCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Faq = { id: string; question: string; answer: string };

export function FaqSection() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("faqs")
        .select("id,question,answer")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      setFaqs((data ?? []) as Faq[]);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading || faqs.length === 0) return null;

  return (
    <section id="faq" className="border-t border-border bg-secondary/30 py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <HelpCircle className="h-3.5 w-3.5" /> {t("faq.badge")}
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">{t("faq.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("faq.subtitle")}</p>
        </div>

        <div className="space-y-2">
          {faqs.map((f) => {
            const open = openId === f.id;
            return (
              <div
                key={f.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft"
              >
                <button
                  type="button"
                  onClick={() => setOpenId(open ? null : f.id)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  aria-expanded={open}
                >
                  <span className="text-sm font-semibold sm:text-base">{f.question}</span>
                  <ChevronDown
                    className={cn(
                      "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "grid transition-all duration-300",
                    open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                  )}
                >
                  <div className="overflow-hidden">
                    <div className="whitespace-pre-line px-5 pb-5 text-sm leading-relaxed text-muted-foreground">
                      {f.answer}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

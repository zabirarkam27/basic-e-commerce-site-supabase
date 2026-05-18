import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "bn" | "en";

const STORAGE_KEY = "site_lang";

/* ------------------------------------------------------------------ */
/* Dictionary                                                          */
/* ------------------------------------------------------------------ */

// Flat key → { bn, en }. Keep keys short and grouped by prefix.
const DICT = {
  // Nav
  "nav.home": { bn: "হোম", en: "Home" },
  "nav.products": { bn: "প্রোডাক্ট", en: "Products" },
  "nav.why_us": { bn: "কেন আমরা", en: "Why Us" },
  "nav.reviews": { bn: "রিভিউ", en: "Reviews" },
  "nav.cart_aria": { bn: "কার্ট", en: "Cart" },

  // Language toggle
  "lang.bn": { bn: "বাংলা", en: "Bangla" },
  "lang.en": { bn: "ইংরেজি", en: "English" },
  "lang.switch_aria": { bn: "ভাষা পরিবর্তন করুন", en: "Switch language" },

  // Hero
  "hero.badge": { bn: "খাঁটি • প্রাকৃতিক • ১০০% বিশুদ্ধ", en: "Raw • Unfiltered • 100% Pure" },
  "hero.title_a": { bn: "সরাসরি", en: "Honey straight from the" },
  "hero.title_b": { bn: "সুন্দরবন", en: "Sundarbans" },
  "hero.title_c": { bn: "থেকে মধু।", en: "." },
  "hero.subtitle": {
    bn: "হাতে সংগ্রহ করা, ল্যাব-টেস্টেড এবং ৪৮ ঘন্টার মধ্যে বোতলজাত। ১৫০০ টাকার উপরে অর্ডারে ফ্রি ডেলিভারি। ক্যাশ অন ডেলিভারি।",
    en: "Hand-harvested, lab-tested, and bottled within 48 hours. Free delivery on orders above ৳1500. Cash on delivery available.",
  },
  "hero.cta": { bn: "অফার দেখুন", en: "View Offers" },
  "hero.happy_customers": { bn: "২,৪০০+ সন্তুষ্ট গ্রাহক", en: "2,400+ happy customers" },
  "hero.today_only": { bn: "শুধু আজকের জন্য", en: "Today only" },
  "hero.discount": { bn: "৩০% পর্যন্ত ছাড়", en: "Up to 30% OFF" },

  // Sections
  "section.offers.title": { bn: "🔥 অফার পণ্য", en: "🔥 Offer Products" },
  "section.offers.subtitle": {
    bn: "সীমিত সময়ের ছাড়, মিস করবেন না।",
    en: "Limited-time discounts you don't want to miss.",
  },
  "section.featured.title": { bn: "⭐ ফিচার্ড পণ্য", en: "⭐ Featured Products" },
  "section.featured.subtitle": {
    bn: "আপনার জন্য বাছাই করা সেরা পণ্য।",
    en: "Hand-picked favorites just for you.",
  },
  "section.all.title": { bn: "সকল পণ্য", en: "All Products" },
  "section.all.subtitle": {
    bn: "যত্নসহ সংগ্রহ ও বোতলজাত করা খাঁটি মধু।",
    en: "Pure honey, sourced and bottled with care.",
  },
  "section.filters.title": {
    bn: "ব্র্যান্ড ও ক্যাটাগরি অনুযায়ী খুঁজুন",
    en: "Browse by brand & category",
  },
  "filters.clear_all": { bn: "সব ক্লিয়ার করুন", en: "Clear all" },
  "filters.clear": { bn: "ফিল্টার ক্লিয়ার", en: "Clear filters" },
  "filters.brand": { bn: "ব্র্যান্ড", en: "Brand" },
  "filters.category": { bn: "ক্যাটাগরি", en: "Category" },
  "filters.all_brands": { bn: "সব ব্র্যান্ড", en: "All brands" },
  "filters.all_categories": { bn: "সব ক্যাটাগরি", en: "All categories" },

  // Empty state
  "empty.title": { bn: "কোনো পণ্য পাওয়া যায়নি", en: "No products found" },
  "empty.with_filters": {
    bn: "আপনার নির্বাচিত ব্র্যান্ড বা ক্যাটাগরিতে কোনো পণ্য নেই। সব দেখতে ফিল্টার ক্লিয়ার করুন।",
    en: "We couldn't find any products matching your selected brand or category. Try clearing the filters to see everything.",
  },
  "empty.no_products": {
    bn: "এই মুহূর্তে কোনো পণ্য উপলব্ধ নেই। শীঘ্রই আবার দেখুন।",
    en: "No products are available right now. Please check back soon.",
  },

  // Product card / QuickView
  "product.add_to_cart": { bn: "কার্টে যোগ করুন", en: "Add to cart" },
  "product.order_now": { bn: "অর্ডার করুন", en: "Order Now" },
  "product.quick_view": { bn: "কুইক ভিউ", en: "Quick view" },
  "product.color": { bn: "রঙ", en: "Color" },
  "product.size": { bn: "সাইজ", en: "Size" },
  "product.order_variant": { bn: "এই ভ্যারিয়েন্ট অর্ডার করুন", en: "Order This Variant" },
  "product.close": { bn: "বন্ধ করুন", en: "Close" },
  "product.prev_image": { bn: "আগের ছবি", en: "Previous image" },
  "product.next_image": { bn: "পরের ছবি", en: "Next image" },

  // Checkout
  "checkout.title": { bn: "দ্রুত চেকআউট", en: "Fast Checkout" },
  "checkout.subtitle": {
    bn: "কোনো অ্যাকাউন্ট লাগবে না। ক্যাশ অন ডেলিভারি।",
    en: "No account. No hassle. Cash on delivery.",
  },
  "checkout.empty": {
    bn: "অর্ডার শুরু করতে উপরে একটি পণ্য বাছাই করুন।",
    en: "Pick a product above to start your order.",
  },
  "checkout.name": { bn: "আপনার নাম", en: "Your Name" },
  "checkout.name_placeholder": { bn: "যেমন: তাহমিদ রহমান", en: "e.g. Tahmid Rahman" },
  "checkout.mobile": { bn: "মোবাইল নম্বর", en: "Mobile Number" },
  "checkout.address": { bn: "ডেলিভারি ঠিকানা", en: "Delivery Address" },
  "checkout.address_placeholder": { bn: "বাড়ি, রোড, এরিয়া, শহর", en: "House, road, area, city" },
  "checkout.area": { bn: "ডেলিভারি এরিয়া", en: "Delivery Area" },
  "checkout.inside_dhaka": { bn: "ঢাকার ভেতরে", en: "Inside Dhaka" },
  "checkout.outside_dhaka": { bn: "ঢাকার বাইরে", en: "Outside Dhaka" },
  "checkout.subtotal": { bn: "সাব-টোটাল", en: "Subtotal" },
  "checkout.delivery": { bn: "ডেলিভারি", en: "Delivery" },
  "checkout.total": { bn: "মোট", en: "Total" },
  "checkout.confirm": { bn: "অর্ডার কনফার্ম করুন", en: "Confirm Order" },
  "checkout.placing": { bn: "অর্ডার করা হচ্ছে...", en: "Placing order..." },
  "checkout.confirmed": { bn: "অর্ডার নিশ্চিত হয়েছে", en: "Order Confirmed" },
  "checkout.remove": { bn: "সরান", en: "Remove" },
  "checkout.decrease": { bn: "কমান", en: "Decrease" },
  "checkout.increase": { bn: "বাড়ান", en: "Increase" },
  "checkout.toast_select_first": {
    bn: "আগে একটি পণ্য যোগ করুন।",
    en: "Please add a product first.",
  },
  "checkout.toast_success": {
    bn: "অর্ডার নিশ্চিত! আমরা যাচাইয়ের জন্য আপনাকে কল করব।",
    en: "Order confirmed! We'll call you to verify.",
  },
  "checkout.err_name": { bn: "নাম খুব ছোট", en: "Name is too short" },
  "checkout.err_mobile": { bn: "সঠিক মোবাইল নম্বর দিন", en: "Enter a valid mobile number" },
  "checkout.err_address": { bn: "ঠিকানা খুব ছোট", en: "Address is too short" },

  // Why shop
  "why.title": { bn: "কেন আমাদের কাছে কিনবেন", en: "Why shop with us" },
  "why.subtitle": {
    bn: "ছোট ছোট বিষয়ই বড় পার্থক্য তৈরি করে।",
    en: "The little things that make a big difference.",
  },

  // Reviews
  "reviews.title": { bn: "বাংলাদেশজুড়ে প্রিয়", en: "Loved across Bangladesh" },
  "reviews.subtitle": {
    bn: "সত্যিকারের গ্রাহকদের সত্যিকারের কথা।",
    en: "Real words from real customers.",
  },

  // Videos
  "videos.badge": { bn: "ভিডিও", en: "Watch" },
  "videos.title": { bn: "আমাদের কাজ দেখুন", en: "See us in action" },
  "videos.subtitle": {
    bn: "সরাসরি উৎস থেকে সত্যিকারের গল্প।",
    en: "Real stories, real product — straight from the source.",
  },
  "videos.play": { bn: "ভিডিও চালান", en: "Play video" },
  "videos.watch": { bn: "ভিডিও দেখুন ↗", en: "Watch video ↗" },

  // FAQ
  "faq.badge": { bn: "FAQ", en: "FAQ" },
  "faq.title": { bn: "সাধারণ জিজ্ঞাসা", en: "Frequently Asked Questions" },
  "faq.subtitle": {
    bn: "যেকোনো প্রশ্নের উত্তর এখানে দেখুন",
    en: "Find answers to common questions here",
  },

  // Footer
  "footer.contact": { bn: "যোগাযোগ", en: "Contact" },
  "footer.rights": { bn: "সর্বস্বত্ব সংরক্ষিত।", en: "All rights reserved." },
  "footer.admin": { bn: "অ্যাডমিন", en: "Admin" },

  // Errors / generic
  "common.loading": { bn: "লোড হচ্ছে…", en: "Loading…" },
  "common.go_home": { bn: "হোমে যান", en: "Go home" },
  "common.try_again": { bn: "আবার চেষ্টা করুন", en: "Try again" },
  "common.page_not_found": { bn: "পেজ পাওয়া যায়নি", en: "Page not found" },
  "common.page_missing": {
    bn: "আপনি যে পেজটি খুঁজছেন সেটি আর নেই বা সরানো হয়েছে।",
    en: "The page you're looking for doesn't exist or has been moved.",
  },
  "common.didnt_load": { bn: "এই পেজটি লোড হয়নি", en: "This page didn't load" },
  "common.try_refresh": {
    bn: "কিছু একটা ভুল হয়েছে। রিফ্রেশ করুন অথবা হোমে ফিরে যান।",
    en: "Something went wrong on our end. You can try refreshing or head back home.",
  },
} as const;

export type TKey = keyof typeof DICT;

/* ------------------------------------------------------------------ */
/* Context                                                             */
/* ------------------------------------------------------------------ */

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (key: TKey) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

const DEFAULT_LANG: Lang = "en";

function readStored(): Lang {
  if (typeof window === "undefined") return DEFAULT_LANG;
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "en" || v === "bn" ? v : DEFAULT_LANG;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(DEFAULT_LANG);

  // Hydrate from localStorage after mount to keep SSR stable.
  useEffect(() => {
    setLangState(readStored());
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l === "bn" ? "bn" : "en";
    }
  }, []);

  const toggle = useCallback(() => {
    setLang(lang === "bn" ? "en" : "bn");
  }, [lang, setLang]);

  const t = useCallback(
    (key: TKey) => {
      const entry = DICT[key];
      if (!entry) return key;
      return entry[lang] ?? entry.en;
    },
    [lang],
  );

  const value = useMemo<Ctx>(() => ({ lang, setLang, toggle, t }), [lang, setLang, toggle, t]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

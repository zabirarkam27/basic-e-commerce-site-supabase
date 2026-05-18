import { useEffect, useState } from "react";
import { Play, Video as VideoIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { ResponsiveImage } from "@/lib/responsive-image";

type Video = {
  id: string;
  title: string;
  video_url: string;
  thumbnail_url: string;
};

function parseYouTubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) return u.pathname.slice(1) || null;
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname.startsWith("/embed/")) return u.pathname.split("/")[2] || null;
      if (u.pathname.startsWith("/shorts/")) return u.pathname.split("/")[2] || null;
      return u.searchParams.get("v");
    }
  } catch {
    return null;
  }
  return null;
}

function parseVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return /^\d+$/.test(id) ? id : null;
    }
  } catch {
    return null;
  }
  return null;
}

function getEmbedUrl(url: string): { embed: string; thumb: string } | null {
  const yt = parseYouTubeId(url);
  if (yt) {
    return {
      embed: `https://www.youtube.com/embed/${yt}?autoplay=1&rel=0`,
      thumb: `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`,
    };
  }
  const vm = parseVimeoId(url);
  if (vm) {
    return {
      embed: `https://player.vimeo.com/video/${vm}?autoplay=1`,
      thumb: "",
    };
  }
  if (/\.(mp4|webm|ogg)$/i.test(url)) {
    return { embed: url, thumb: "" };
  }
  return null;
}

function VideoCard({ v }: { v: Video }) {
  const [playing, setPlaying] = useState(false);
  const { t } = useI18n();
  const info = getEmbedUrl(v.video_url);
  const thumb = v.thumbnail_url || info?.thumb || "";
  const isDirect = info && /\.(mp4|webm|ogg)$/i.test(v.video_url);

  if (!info) {
    return (
      <a
        href={v.video_url}
        target="_blank"
        rel="noopener noreferrer"
        className="block overflow-hidden rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground shadow-soft hover:bg-secondary"
      >
        {t("videos.watch")}
      </a>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="relative aspect-video w-full bg-black">
        {playing ? (
          isDirect ? (
            <video src={info.embed} autoPlay controls className="h-full w-full object-cover" />
          ) : (
            <iframe
              src={info.embed}
              title={v.title || "Video"}
              allow="accelerated-2d-canvas; autoplay; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          )
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            className="group relative h-full w-full"
            aria-label={t("videos.play")}
          >
            {thumb ? (
              <ResponsiveImage
                src={thumb}
                alt={v.title || "Video"}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center bg-gradient-to-br from-primary/30 to-primary/5">
                <VideoIcon className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="absolute inset-0 grid place-items-center bg-black/30 transition group-hover:bg-black/40">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-primary shadow-pop transition group-hover:scale-110">
                <Play className="h-6 w-6 fill-current" />
              </div>
            </div>
          </button>
        )}
      </div>
      {v.title && (
        <div className="px-4 py-3">
          <div className="text-sm font-semibold">{v.title}</div>
        </div>
      )}
    </div>
  );
}

export function VideoSection() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useI18n();

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from("videos")
        .select("id,title,video_url,thumbnail_url")
        .eq("active", true)
        .order("sort_order", { ascending: true });
      if (!mounted) return;
      setVideos((data ?? []) as Video[]);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading || videos.length === 0) return null;

  return (
    <section id="videos" className="py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <VideoIcon className="h-3.5 w-3.5" /> {t("videos.badge")}
          </div>
          <h2 className="text-2xl font-bold sm:text-3xl">{t("videos.title")}</h2>
          <p className="mt-2 text-sm text-muted-foreground">{t("videos.subtitle")}</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {videos.map((v) => (
            <VideoCard key={v.id} v={v} />
          ))}
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState, type ReactNode } from "react";

type IdleWindow = Window &
  typeof globalThis & {
    requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
    cancelIdleCallback?: (handle: number) => void;
  };

/**
 * Mounts children only when the placeholder scrolls near the viewport,
 * or after the browser is idle. Lets below-the-fold sections (and their
 * lazy chunks) defer until they're actually needed.
 */
export function DeferRender({
  children,
  rootMargin = "400px",
  minHeight = 200,
}: {
  children: ReactNode;
  rootMargin?: string;
  minHeight?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (show || typeof window === "undefined") return;
    const el = ref.current;
    if (!el) return;

    if (!("IntersectionObserver" in window)) {
      setShow(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShow(true);
          io.disconnect();
        }
      },
      { rootMargin },
    );
    io.observe(el);

    // Fallback: mount after idle so search engines / non-scrolling users see content.
    const idleWindow = window as IdleWindow;
    const idle = idleWindow.requestIdleCallback
      ? idleWindow.requestIdleCallback(() => setShow(true), { timeout: 3000 })
      : window.setTimeout(() => setShow(true), 2000);

    return () => {
      io.disconnect();
      if (idleWindow.cancelIdleCallback) idleWindow.cancelIdleCallback(idle);
      else clearTimeout(idle);
    };
  }, [show, rootMargin]);

  return (
    <div ref={ref} style={!show ? { minHeight } : undefined}>
      {show ? children : null}
    </div>
  );
}

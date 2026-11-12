"use client";

import { type RefObject, useEffect, useState, useSyncExternalStore } from "react";

let webglCache: boolean | null = null;
function hasWebGL() {
  if (webglCache !== null) return webglCache;
  try {
    const c = document.createElement("canvas");
    webglCache = !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    webglCache = false;
  }
  return webglCache;
}

const noop = () => () => {};

function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

function useTabVisible() {
  return useSyncExternalStore(
    (cb) => {
      document.addEventListener("visibilitychange", cb);
      return () => document.removeEventListener("visibilitychange", cb);
    },
    () => document.visibilityState === "visible",
    () => true,
  );
}

/**
 * When to render a three.js scene (animation-performance + apple-design):
 * - only with WebGL;
 * - only while on screen and the tab is visible (frameloop "always"), else "never";
 * - under prefers-reduced-motion: one static frame ("demand"), no idle motion.
 */
export function useRenderPolicy(ref: RefObject<HTMLElement | null>) {
  const webgl = useSyncExternalStore(noop, hasWebGL, () => false);
  const reduced = useMedia("(prefers-reduced-motion: reduce)");
  const coarse = useMedia("(pointer: coarse)");
  const tabVisible = useTabVisible();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);

  const frameloop: "always" | "demand" | "never" = reduced ? "demand" : visible && tabVisible ? "always" : "never";
  return { webgl, reduced, coarse, frameloop, dpr: [1, coarse ? 1.5 : 1.75] as [number, number] };
}

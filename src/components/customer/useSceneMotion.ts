"use client";

import { useEffect, useRef, useState } from "react";

export function useSceneMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  useEffect(() => {
    const media = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    const onMotion = () => setReduced(media?.matches ?? true);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    onMotion(); onVisibility();
    media?.addEventListener?.("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = typeof IntersectionObserver === "function"
      ? new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 }) : null;
    if (observer && ref.current) observer.observe(ref.current);
    else setVisible(true);
    return () => { observer?.disconnect(); media?.removeEventListener?.("change", onMotion); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return { ref, active: visible && documentVisible, reduced };
}

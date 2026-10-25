"use client";

import { useEffect, useRef, useState } from "react";

export function useSceneMotion() {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [documentVisible, setDocumentVisible] = useState(true);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotion = () => setReduced(media.matches);
    const onVisibility = () => setDocumentVisible(!document.hidden);
    onMotion(); onVisibility();
    media.addEventListener("change", onMotion);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.05 });
    if (ref.current) observer.observe(ref.current);
    return () => { observer.disconnect(); media.removeEventListener("change", onMotion); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  return { ref, active: visible && documentVisible, reduced };
}

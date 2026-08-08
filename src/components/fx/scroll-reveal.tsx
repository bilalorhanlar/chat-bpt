"use client";

import { useEffect, useRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Kaydırma ile görünür olduğunda `.in-view` sınıfını ekler; içindeki `.reveal`
 * öğeleri CSS'te sırayla yükselir (globals.css).
 *
 * IntersectionObserver bir kez tetikleniyor ve kendini kapatıyor — kaydırma
 * dinleyicisi yok, her karede çalışan kod yok. Animasyonun kendisi saf CSS
 * transform/opacity geçişi.
 */
export function ScrollReveal({
  children,
  className,
  as: Tag = "section",
  threshold = 0.2,
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "li";
  threshold?: number;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.classList.add("in-view");
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in-view");
          observer.disconnect();
        }
      },
      { threshold, rootMargin: "0px 0px -8% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as any;
  return (
    <Component ref={ref} className={className}>
      {children}
    </Component>
  );
}

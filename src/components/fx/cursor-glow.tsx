"use client";

import { useEffect, useRef } from "react";

/**
 * İmleci takip eden çok soluk mor ışık.
 *
 * Tek bir rAF döngüsü var ve döngü yalnızca imleç kımıldadığında dönüyor;
 * hedefe varınca kendini durduruyor, yani boşta CPU harcamıyor.
 *
 * Dokunmatik cihazlarda ve `prefers-reduced-motion` açıkken hiç bağlanmıyor.
 */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const fine = window.matchMedia("(pointer: fine)").matches;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || calm) return;

    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight / 2;
    let x = targetX;
    let y = targetY;
    let raf = 0;
    let visible = false;

    const frame = () => {
      // Yumuşak takip: mesafenin %12'si kadar yaklaş.
      x += (targetX - x) * 0.12;
      y += (targetY - y) * 0.12;
      el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;

      if (Math.abs(targetX - x) > 0.4 || Math.abs(targetY - y) > 0.4) {
        raf = requestAnimationFrame(frame);
      } else {
        raf = 0;
      }
    };

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!visible) {
        visible = true;
        el.style.opacity = "1";
      }
      if (!raf) raf = requestAnimationFrame(frame);
    };

    const onLeave = () => {
      visible = false;
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden
      className="gpu pointer-events-none fixed left-0 top-0 -z-10 hidden h-[34rem] w-[34rem] rounded-full opacity-0 transition-opacity duration-500 sm:block"
      style={{
        background:
          "radial-gradient(circle at center, rgb(139 92 246 / 0.13) 0%, rgb(139 92 246 / 0) 62%)",
      }}
    />
  );
}

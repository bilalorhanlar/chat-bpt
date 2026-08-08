"use client";

import { useEffect, useState } from "react";
import { RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Tavla telefonda yatay oynanmak için tasarlandı; dikey tutulan küçük ekranda
 * bir kez "telefonu yan çevir" der. Kapatılabilir ve tercih oturum boyunca
 * hatırlanır; ekran çevrilince kendiliğinden gider.
 */
export function RotateHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("tavla-dikey-tamam") === "1") return;

    const query = window.matchMedia("(orientation: portrait) and (max-width: 700px)");
    const update = () => setShow(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-white/95 px-8 text-center backdrop-blur-sm">
      <RotateCw className="size-10 animate-[pulse-soft_2s_ease-in-out_infinite] text-brand-600" strokeWidth={1.4} aria-hidden />
      <p className="text-[1.3rem] font-bold leading-snug">Telefonu yan çevir</p>
      <p className="max-w-[16rem] text-[0.9rem] leading-relaxed text-ink-soft">
        Tavla tahtası yatay ekranda çok daha rahat. İstersen dikey de oynayabilirsin.
      </p>
      <Button
        variant="outline"
        onClick={() => {
          sessionStorage.setItem("tavla-dikey-tamam", "1");
          setShow(false);
        }}
      >
        Böyle devam et
      </Button>
    </div>
  );
}

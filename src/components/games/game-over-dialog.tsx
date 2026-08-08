"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Trophy } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button";

/** Oyun bitince açılan sonuç kutusu. Tavla ve satranç ortak kullanıyor. */
export function GameOverDialog({
  title,
  detail,
  playAgainHref,
}: {
  title: string;
  detail: string;
  playAgainHref: string;
}) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-900/30 p-6 backdrop-blur-sm"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm animate-[rise-in_.3s_var(--ease-out-soft)] rounded-card border border-line bg-surface p-7 text-center shadow-lift"
      >
        <Trophy className="mx-auto mb-3 size-8 text-accent-400" strokeWidth={1.4} aria-hidden />
        <h2 className="text-[1.6rem] leading-tight">{title}</h2>
        <p className="mt-2 text-[0.92rem] text-ink-soft">{detail}</p>

        <div className="mt-6 flex flex-col gap-2">
          <ButtonLink href={playAgainHref} size="lg">
            Yeni oyun
          </ButtonLink>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Tahtayı incele
          </Button>
          <Link
            href="/sampiyona"
            className="mt-1 text-[0.82rem] text-ink-faint underline-offset-4 hover:text-brand-700 hover:underline"
          >
            Şampiyona tablosuna bak
          </Link>
        </div>
      </div>
    </div>
  );
}

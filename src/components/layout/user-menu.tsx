"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, Settings } from "lucide-react";

export function UserMenu({ name, accent }: { name: string; accent: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Dışarı tıklama ve Esc ile kapan.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    await fetch("/api/cikis", { method: "POST" });
    router.replace("/kilit");
    router.refresh();
  }

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`${name} menüsü`}
        className="grid size-9 place-items-center rounded-full text-[0.8rem] font-semibold text-white shadow-soft transition-transform duration-200 hover:scale-105 active:scale-95"
        style={{ background: `radial-gradient(circle at 32% 28%, ${accent}, ${accent}aa)` }}
      >
        {name.slice(0, 1).toLocaleUpperCase("tr-TR")}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 w-48 origin-top-right animate-[rise-in_.18s_var(--ease-out-soft)] overflow-hidden rounded-2xl border border-line bg-surface shadow-lift"
        >
          <p className="border-b border-line px-4 py-2.5 text-[0.75rem] text-ink-faint">
            Giriş: <span className="font-medium text-ink">{name}</span>
          </p>
          <Link
            href="/ayarlar"
            role="menuitem"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-4 py-2.5 text-[0.88rem] text-ink transition-colors hover:bg-brand-50"
          >
            <Settings className="size-4 text-ink-soft" strokeWidth={1.6} aria-hidden />
            Ayarlar
          </Link>
          <button
            type="button"
            role="menuitem"
            onClick={signOut}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[0.88rem] text-ink transition-colors hover:bg-brand-50"
          >
            <LogOut className="size-4 text-ink-soft" strokeWidth={1.6} aria-hidden />
            Çıkış yap
          </button>
        </div>
      ) : null}
    </div>
  );
}

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

import { UserBadge } from "@/components/layout/user-badge";
import { cn } from "@/lib/utils";

/**
 * Ana sayfa dışındaki her ekranın çerçevesi.
 *
 * Ana sayfa bilerek bunu kullanmıyor: orada başlık çubuğu kahraman bölümü
 * bölerdi, gezinme zaten kart ızgarasında.
 */
export function PageShell({
  title,
  eyebrow,
  back = "/",
  actions,
  children,
  wide = false,
}: {
  title: string;
  eyebrow?: string;
  /** Geri okunun gideceği yer. */
  back?: string;
  actions?: ReactNode;
  children: ReactNode;
  /** Oyun tahtaları gibi geniş içerikler için sınırı gevşetir. */
  wide?: boolean;
}) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-line/70 bg-canvas/75 backdrop-blur-md">
        <div
          className={cn(
            "mx-auto flex h-16 w-full items-center gap-3 px-4 sm:px-6",
            wide ? "max-w-7xl" : "max-w-4xl",
          )}
        >
          <Link
            href={back}
            aria-label="Geri"
            className="grid size-10 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-700"
          >
            <ArrowLeft className="size-5" strokeWidth={1.7} aria-hidden />
          </Link>

          <div className="min-w-0 flex-1">
            {eyebrow ? (
              <p className="text-[0.65rem] font-medium uppercase tracking-[0.18em] text-brand-500">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="truncate font-display text-[1.15rem] leading-tight">{title}</h1>
          </div>

          {actions}
          <UserBadge />
        </div>
      </header>

      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 pb-24 pt-7 sm:px-6",
          wide ? "max-w-7xl" : "max-w-4xl",
        )}
      >
        {children}
      </main>
    </div>
  );
}

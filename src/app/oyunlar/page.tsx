import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { PageShell } from "@/components/layout/page-shell";
import { Icon } from "@/components/ui/icon";
import { NAV } from "@/config/nav";

export const metadata: Metadata = { title: "Oyunlar" };

export default function GamesPage() {
  const games = NAV.filter((item) => item.group === "oyun");

  return (
    <PageShell title="Oyunlar" eyebrow="bizim yerimiz">
      <div className="grid gap-3 sm:grid-cols-2">
        {games.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group relative overflow-hidden rounded-card border border-line bg-surface/85 p-5 shadow-soft backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift"
          >
            <span className="flex items-start gap-3.5">
              <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-100">
                <Icon name={item.icon} className="size-[1.35rem]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  <span className="font-display text-[1.2rem] leading-snug">{item.title}</span>
                  <ArrowUpRight
                    aria-hidden
                    strokeWidth={1.8}
                    className="size-4 shrink-0 -translate-x-1 text-brand-400 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </span>
                <span className="mt-1 block text-[0.86rem] leading-relaxed text-ink-soft">
                  {item.blurb}
                </span>
              </span>
            </span>
          </Link>
        ))}
      </div>
    </PageShell>
  );
}

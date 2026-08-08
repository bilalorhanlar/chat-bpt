import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";

import { ScrollReveal } from "@/components/fx/scroll-reveal";
import { Icon } from "@/components/ui/icon";
import { NAV } from "@/config/nav";

/**
 * Ana sayfanın kaydırma akışı — üç bölüm, üç ayrı karakter:
 *
 *  1. Oyunlar: dev numaralı editoryal liste. Satırın tamamı tıklanabilir,
 *     hover'da satır siyaha döner (invert) — Helvetica'nın hakkı.
 *  2. Listeler: yatay kaydırmalı kart rayı (scroll-snap). Her kart büyük
 *     numara + başlık; mobilde parmakla, masaüstünde kaydırma çubuğu.
 *  3. Bizden: sade üçlü ızgara.
 *
 * Hepsi ScrollReveal ile geldikçe beliriyor; animasyon saf CSS.
 */

const pad = (n: number) => String(n + 1).padStart(2, "0");

export function GamesIndex() {
  const games = NAV.filter((item) => item.group === "oyun");

  return (
    <ScrollReveal className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
      <div className="reveal mb-10 flex items-end justify-between gap-4">
        <h2 className="text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.9]">Oyunlar</h2>
        <p className="mb-2 hidden max-w-[16rem] text-right text-[0.85rem] leading-relaxed text-ink-soft sm:block">
          Skorlar kaydediliyor. Kaybeden çayı koyar.
        </p>
      </div>

      <ol className="reveal border-t border-ink/15">
        {games.map((game, i) => (
          <li key={game.href} className="border-b border-ink/15">
            <Link
              href={game.href}
              className="group grid grid-cols-[auto_1fr_auto] items-center gap-4 py-5 transition-colors duration-300 hover:bg-ink sm:gap-8 sm:py-7"
            >
              <span className="w-14 pl-2 font-display text-[1.1rem] tabular-nums text-ink-faint transition-colors duration-300 group-hover:text-white/50 sm:w-24 sm:pl-4 sm:text-[1.4rem]">
                {pad(i)}
              </span>

              <span className="min-w-0">
                <span className="block truncate font-display text-[clamp(1.5rem,4.5vw,2.75rem)] font-bold uppercase leading-none tracking-tight text-ink transition-colors duration-300 group-hover:text-white">
                  {game.title}
                </span>
                <span className="mt-1.5 block text-[0.82rem] text-ink-soft transition-colors duration-300 group-hover:text-white/60 sm:text-[0.9rem]">
                  {game.blurb}
                </span>
              </span>

              <span className="pr-2 sm:pr-4">
                <ArrowRight
                  aria-hidden
                  strokeWidth={1.5}
                  className="size-6 -translate-x-2 text-brand-600 opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-hover:text-white sm:size-8"
                />
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </ScrollReveal>
  );
}

export function ListsRail() {
  const lists = NAV.filter((item) => item.group === "liste");

  return (
    <ScrollReveal className="w-full overflow-hidden bg-[#0a0a0a] py-24 text-white sm:py-32">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div className="reveal mb-10 flex items-end justify-between gap-4">
          <h2 className="text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.9]">
            Yapacak<span className="text-brand-400">l</span>arımız
          </h2>
          <p className="mb-2 hidden text-right text-[0.85rem] text-white/50 sm:block">
            kaydır →
          </p>
        </div>
      </div>

      {/* Ray, kenardan kenara taşar; ilk kart içerik hizasından başlar. */}
      <div className="reveal">
        <ul
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-6 [scrollbar-width:none] sm:gap-6 [&::-webkit-scrollbar]:hidden"
          style={{ paddingLeft: "max(1.5rem, calc((100vw - 72rem) / 2 + 1.5rem))" }}
        >
          {lists.map((list, i) => (
            <li key={list.href} className="w-[78vw] max-w-[22rem] shrink-0 snap-start sm:w-[22rem]">
              <Link
                href={list.href}
                className="group flex h-[24rem] flex-col justify-between rounded-card border border-white/15 p-7 transition-[border-color,background-color] duration-300 hover:border-white/40 hover:bg-white/5"
              >
                <div className="flex items-start justify-between">
                  <span className="font-display text-[1.1rem] tabular-nums text-white/35">
                    {pad(i)}
                  </span>
                  <span className="grid size-10 place-items-center rounded-full border border-white/20 text-brand-300 transition-[transform,border-color] duration-300 group-hover:-rotate-45 group-hover:border-white/50">
                    <ArrowUpRight className="size-4 rotate-45" strokeWidth={1.7} aria-hidden />
                  </span>
                </div>

                <div>
                  <Icon name={list.icon} className="mb-4 size-7 text-brand-400" strokeWidth={1.4} />
                  <span className="block font-display text-[1.9rem] font-bold uppercase leading-[1.02] tracking-tight">
                    {list.title}
                  </span>
                  <span className="mt-2 block text-[0.88rem] leading-relaxed text-white/55">
                    {list.blurb}
                  </span>
                </div>
              </Link>
            </li>
          ))}
          {/* Rayın sonunda nefes payı */}
          <li aria-hidden className="w-2 shrink-0" />
        </ul>
      </div>
    </ScrollReveal>
  );
}

export function BizGrid() {
  const items = NAV.filter((item) => item.group === "biz");

  return (
    <ScrollReveal className="mx-auto w-full max-w-6xl px-6 py-24 sm:py-32">
      <h2 className="reveal mb-10 text-[clamp(2.4rem,7vw,4.5rem)] uppercase leading-[0.9]">
        Bizden
      </h2>

      <div className="grid gap-px overflow-hidden rounded-card border border-ink/15 bg-ink/15 sm:grid-cols-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group reveal flex items-start gap-4 bg-white p-6 transition-colors duration-300 hover:bg-[#fafafa] sm:p-8"
          >
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-ink/15 text-brand-600 transition-colors duration-300 group-hover:border-ink">
              <Icon name={item.icon} className="size-5" strokeWidth={1.5} />
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-display text-[1.25rem] font-bold tracking-tight">
                {item.title}
                <ArrowUpRight
                  aria-hidden
                  strokeWidth={1.8}
                  className="size-4 -translate-x-1 text-brand-500 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100"
                />
              </span>
              <span className="mt-1 block text-[0.86rem] leading-relaxed text-ink-soft">
                {item.blurb}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </ScrollReveal>
  );
}

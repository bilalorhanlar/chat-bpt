import { ChevronDown, Heart } from "lucide-react";

import { BirthdayBanner } from "@/components/home/birthday-banner";
import { ImageTrail } from "@/components/home/image-trail";
import { NavGrid } from "@/components/home/nav-grid";
import { TogetherCounter } from "@/components/home/together-counter";
import { PEOPLE } from "@/config/site";

export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <ImageTrail>
        <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-brand-100 bg-surface/70 py-1.5 pl-2.5 pr-4 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-brand-600 shadow-soft backdrop-blur-sm">
          <span className="relative grid size-5 place-items-center">
            <span
              aria-hidden
              className="absolute inset-0 rounded-full bg-accent-300"
              style={{ animation: "pulse-soft 2.6s var(--ease-in-out-soft) infinite" }}
            />
            <Heart className="relative size-3 fill-accent-400 text-accent-400" aria-hidden />
          </span>
          bizim yerimiz
        </span>

        <h1 className="text-balance-tr text-center font-display text-[clamp(2.7rem,11vw,5.6rem)] leading-[0.94] tracking-[-0.03em]">
          <span>{PEOPLE.bilal.name}</span>
          <span className="mx-2 bg-gradient-to-br from-brand-500 to-accent-400 bg-clip-text text-transparent sm:mx-3">
            &amp;
          </span>
          <span>{PEOPLE.partner.name}</span>
        </h1>

        <TogetherCounter />

        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className="mt-12 size-6 animate-bounce text-brand-300 [animation-duration:2.4s]"
        />
      </ImageTrail>

      <BirthdayBanner />
      <NavGrid />
    </main>
  );
}

import { ChevronDown } from "lucide-react";

import { BirthdayBanner } from "@/components/home/birthday-banner";
import { ImageTrail } from "@/components/home/image-trail";
import { BizGrid, GamesIndex, ListsRail } from "@/components/home/sections";
import { TogetherCounter } from "@/components/home/together-counter";
import { getPeople, getTogetherSince } from "@/lib/people";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [people, togetherSince] = await Promise.all([getPeople(), getTogetherSince()]);

  return (
    <main className="flex flex-1 flex-col">
      <ImageTrail
        background={
          <div aria-hidden className="absolute inset-0 -z-10">
            <picture>
              <source srcSet="/image/hero.avif" type="image/avif" />
              {/* Kullanıcının seçtiği kare: karda beyaz ördek, "LIVE THE FLOW".
                  Kadraj yukarıda ki görseldeki yazı üst bantta kalsın; bizim
                  başlık alta oturuyor. */}
              <img
                src="/image/hero.webp"
                alt=""
                className="size-full object-cover object-[center_78%]"
              />
            </picture>
            {/* Alt yarıda beyaz yıkama: başlık fotoğrafla yarışmadan okunur. */}
            <div className="absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-white via-white/80 to-transparent" />
          </div>
        }
      >
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="font-display text-[clamp(2.8rem,9vw,5.5rem)] font-bold uppercase leading-[0.88] tracking-[-0.04em]">
            {people.bilal.name}
            <span className="text-brand-600"> &amp;</span>
            <br />
            {people.partner.name}
          </h1>

          <TogetherCounter since={togetherSince} />
        </div>

        <ChevronDown
          aria-hidden
          strokeWidth={1.5}
          className="mt-10 size-6 animate-bounce text-ink/40 [animation-duration:2.4s]"
        />
      </ImageTrail>

      <BirthdayBanner people={Object.values(people)} />

      <GamesIndex />
      <ListsRail />
      <BizGrid />

      <footer className="border-t border-ink/10 py-10 text-center text-[0.78rem] text-ink-faint">
        {people.bilal.name} &amp; {people.partner.name} · sadece ikimiz için
      </footer>
    </main>
  );
}

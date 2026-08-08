import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { GROUP_LABELS, GROUP_ORDER, NAV, type NavGroup, type NavItem } from "@/config/nav";

/**
 * Üç sütunlu ızgarada gruplar 5, 4, 4 öğeli — hiçbiri satırı tam doldurmuyor ve
 * sağ altta boşluk kalıyor. Eksik hücre kadar kartı iki sütuna yayınca satırlar
 * tam kapanıyor; sonuç tırtıklı değil, ritimli görünüyor.
 *
 * n=5 → 1 kart geniş (ilk)   ·   n=4 → 2 kart geniş (ilk ve son)
 */
function wideIndexes(n: number): Set<number> {
  const need = (3 - (n % 3)) % 3;
  const picks = new Set<number>();
  if (need >= 1) picks.add(0);
  if (need >= 2) picks.add(n - 1);
  return picks;
}

export function NavGrid() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 pb-28">
      {GROUP_ORDER.map((group) => (
        <NavSection key={group} group={group} />
      ))}
    </div>
  );
}

function NavSection({ group }: { group: NavGroup }) {
  const items = NAV.filter((item) => item.group === group);
  const wide = wideIndexes(items.length);

  return (
    <section className="mb-14 last:mb-0">
      <h2 className="mb-4 flex items-center gap-3 text-[0.72rem] font-medium uppercase tracking-[0.2em] text-brand-500">
        {GROUP_LABELS[group]}
        <span className="h-px flex-1 bg-gradient-to-r from-line-strong to-transparent" />
      </h2>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item, i) => (
          <NavCard key={item.href} item={item} wide={wide.has(i)} />
        ))}
      </div>
    </section>
  );
}

function NavCard({ item, wide }: { item: NavItem; wide: boolean }) {
  return (
    <Link
      href={item.href}
      className={`group relative overflow-hidden rounded-card border border-line bg-surface/80 p-5 shadow-soft backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift ${
        wide ? "lg:col-span-2" : ""
      }`}
    >
      {/* Köşeden akan mor yıkama — yalnızca opaklığı değişiyor, düzen hesabı yok. */}
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50/80 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      <span className="relative flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-[13px] bg-brand-50 text-brand-600 transition-colors duration-300 group-hover:bg-brand-100 group-hover:text-brand-700">
          <Icon name={item.icon} className="size-[1.35rem]" />
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <span className="font-display text-[1.2rem] leading-snug text-ink">{item.title}</span>
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
  );
}

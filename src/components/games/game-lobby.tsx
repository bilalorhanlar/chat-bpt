"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Play, Smartphone, Wifi } from "lucide-react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/**
 * Oyun açılış ekranı — tavla ve satranç ortak kullanıyor.
 *
 * İki mod: aynı cihazda sırayla, ya da ikisi kendi telefonundan online.
 * Yarım kalmış maç varsa en üstte "devam et" çıkıyor; iki kişilik bir sitede
 * maç listesi tutmaya gerek yok, en son maç yeter.
 */
export function GameLobby({
  icon,
  title,
  blurb,
  rules,
  openMatch,
  basePath,
  createMatch,
  partnerName,
}: {
  icon: string;
  title: string;
  blurb: string;
  rules: string[];
  /** Devam edilebilecek ya da rakip bekleyen maç. */
  openMatch: { id: string; mode: string; status: string } | null;
  /** `/oyunlar/tavla` gibi. */
  basePath: string;
  createMatch: (mode: "ONLINE" | "LOCAL") => Promise<string>;
  partnerName: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"ONLINE" | "LOCAL" | null>(null);

  async function start(mode: "ONLINE" | "LOCAL") {
    if (busy) return;
    setBusy(mode);
    try {
      const id = await createMatch(mode);
      router.push(`${basePath}/${id}`);
    } catch {
      setBusy(null);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="mb-8 text-center">
        <span className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-600">
          <Icon name={icon} className="size-8" strokeWidth={1.4} />
        </span>
        <h2 className="text-[1.9rem] leading-tight">{title}</h2>
        <p className="mt-2 text-[0.95rem] text-ink-soft">{blurb}</p>
      </div>

      {openMatch ? (
        <Link
          href={`${basePath}/${openMatch.id}`}
          className="mb-4 flex items-center gap-3 rounded-card border border-ink bg-white px-5 py-4 shadow-soft transition-[transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <Play className="size-5 shrink-0 text-brand-600" strokeWidth={1.8} aria-hidden />
          <span className="flex-1">
            <span className="block font-medium text-ink">
              {openMatch.status === "WAITING" ? "Açık davetin var" : "Yarım kalan maç var"}
            </span>
            <span className="block text-[0.82rem] text-ink-soft">
              {openMatch.status === "WAITING"
                ? `${partnerName} bekleniyor · odaya dön`
                : `${openMatch.mode === "LOCAL" ? "Aynı cihazda" : "Online"} · devam et`}
            </span>
          </span>
        </Link>
      ) : null}

      <div className="grid gap-3">
        <ModeCard
          icon={<Wifi className="size-5" strokeWidth={1.7} aria-hidden />}
          title="Online oyna"
          detail={`Sen kendi telefonundan, ${partnerName} kendi telefonundan. Hamleler anında gider.`}
          loading={busy === "ONLINE"}
          disabled={busy !== null}
          onClick={() => start("ONLINE")}
        />
        <ModeCard
          icon={<Smartphone className="size-5" strokeWidth={1.7} aria-hidden />}
          title="Aynı cihazda"
          detail="Tek telefonu sırayla uzatarak oynayın. Yan yanayken en pratiği."
          loading={busy === "LOCAL"}
          disabled={busy !== null}
          onClick={() => start("LOCAL")}
        />
      </div>

      <ul className="mt-8 space-y-2">
        {rules.map((rule) => (
          <li key={rule} className="flex gap-2.5 text-[0.85rem] leading-relaxed text-ink-soft">
            <span aria-hidden className="mt-1.5 size-1 shrink-0 rounded-full bg-brand-300" />
            {rule}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ModeCard({
  icon,
  title,
  detail,
  onClick,
  loading,
  disabled,
}: {
  icon: React.ReactNode;
  title: string;
  detail: string;
  onClick: () => void;
  loading: boolean;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex items-center gap-4 rounded-card border border-line bg-surface/85 px-5 py-4 text-left shadow-soft backdrop-blur-sm transition-[transform,box-shadow,border-color] duration-300 ease-[var(--ease-out-soft)]",
        !disabled && "hover:-translate-y-1 hover:border-brand-200 hover:shadow-lift",
        disabled && "opacity-60",
      )}
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
        {loading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : icon}
      </span>
      <span className="min-w-0">
        <span className="block font-display text-[1.15rem] leading-snug">{title}</span>
        <span className="mt-0.5 block text-[0.83rem] leading-relaxed text-ink-soft">{detail}</span>
      </span>
    </button>
  );
}

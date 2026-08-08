"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Loader2 } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { useMatchChannel } from "@/lib/use-match-channel";

/**
 * Online maçta rakip beklenen ekran.
 *
 * Maç `WAITING` durumundayken tahta hiç açılmıyor — eskiden herkes kendi
 * odasında tek başına oynayabiliyordu. Karşı taraf aynı oyunda "Online oyna"ya
 * bastığında sunucu bu odaya katıp `match:started` yayınlıyor; burada
 * `router.refresh()` ile sayfa yenileniyor ve tahta açılıyor.
 *
 * Soket kopuk olsa bile takılıp kalmasın diye 5 saniyede bir yedek yoklama var.
 */
export function WaitingRoom({
  matchId,
  gameTitle,
  partnerName,
  backHref,
}: {
  matchId: string;
  gameTitle: string;
  partnerName: string;
  backHref: string;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const { online } = useMatchChannel<unknown>(
    matchId,
    () => router.refresh(),
    () => router.refresh(),
  );

  // Yedek yoklama: soket kurulamadıysa da maç başlangıcı fark edilsin.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [router]);

  const partnerHere = Object.values(online).some(Boolean);

  async function copyLink() {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-2 py-16 text-center">
      <Loader2 className="mb-5 size-8 animate-spin text-brand-600" strokeWidth={1.5} aria-hidden />

      <h2 className="text-[1.7rem] font-bold leading-tight">{partnerName} bekleniyor</h2>
      <p className="mt-2 text-[0.95rem] leading-relaxed text-ink-soft">
        {partnerName} de <span className="font-medium text-ink">{gameTitle}</span> sayfasından
        &quot;Online oyna&quot;ya bastığında maç kendiliğinden başlayacak.
      </p>

      <p className="mt-5 flex items-center gap-2 rounded-full border border-line px-4 py-1.5 text-[0.8rem] text-ink-soft">
        <span
          className={`size-2 rounded-full ${partnerHere ? "bg-good" : "bg-ink-faint/50"}`}
          aria-hidden
        />
        {partnerHere ? "Odaya girdi, başlıyor…" : "Henüz gelmedi"}
      </p>

      <div className="mt-8 flex w-full flex-col gap-2">
        <button
          type="button"
          onClick={copyLink}
          className="flex items-center justify-center gap-2 rounded-btn border border-line-strong py-3 text-[0.9rem] font-medium transition-colors hover:border-ink"
        >
          {copied ? (
            <>
              <Check className="size-4 text-good" strokeWidth={2.2} aria-hidden />
              Kopyalandı
            </>
          ) : (
            <>
              <Copy className="size-4" strokeWidth={1.8} aria-hidden />
              Maç bağlantısını kopyala
            </>
          )}
        </button>

        <ButtonLink href={backHref} variant="ghost">
          Vazgeç
        </ButtonLink>
      </div>
    </div>
  );
}

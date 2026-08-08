import type { Metadata } from "next";

import { LockForm } from "@/components/auth/lock-form";
import { SITE } from "@/config/site";

export const metadata: Metadata = { title: "Giriş" };

export default async function LockPage({
  searchParams,
}: {
  searchParams: Promise<{ devam?: string }>;
}) {
  const { devam } = await searchParams;
  // Açık yönlendirmeyi engelle: yalnızca site içi göreli yollar kabul edilir.
  const next = devam?.startsWith("/") && !devam.startsWith("//") ? devam : "/";

  return (
    <main className="flex flex-1 items-center justify-center px-6 py-14">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="font-display text-[2.1rem] leading-tight">{SITE.name}</h1>
          <p className="mt-1.5 text-[0.9rem] text-ink-soft">{SITE.description}</p>
        </div>
        <LockForm next={next} />
      </div>
    </main>
  );
}

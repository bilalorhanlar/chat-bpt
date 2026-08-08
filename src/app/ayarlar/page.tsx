import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { SettingsForm } from "@/components/settings/settings-form";
import { getPeople, getTogetherSince } from "@/lib/people";

export const metadata: Metadata = { title: "Ayarlar" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [people, togetherSince] = await Promise.all([getPeople(), getTogetherSince()]);

  return (
    <PageShell title="Ayarlar">
      <SettingsForm people={people} togetherSince={togetherSince} />
    </PageShell>
  );
}

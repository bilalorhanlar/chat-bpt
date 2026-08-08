import type { Metadata } from "next";

import { PageShell } from "@/components/layout/page-shell";
import { VaultBoard } from "@/components/vault/vault-board";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/session";
import type { CredentialView } from "./actions";

export const metadata: Metadata = { title: "Şifreler" };
export const dynamic = "force-dynamic";

export default async function VaultPage() {
  await requireSession();

  // Parola alanı bilerek seçilmiyor: listeye şifreli hâli bile inmiyor.
  const rows = await db.credential.findMany({
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      username: true,
      note: true,
      createdById: true,
      updatedAt: true,
    },
  });

  const items: CredentialView[] = rows.map((row) => ({
    ...row,
    updatedAt: row.updatedAt.toISOString(),
  }));

  return (
    <PageShell title="Şifreler" eyebrow="bizden">
      <VaultBoard initialItems={items} />
    </PageShell>
  );
}

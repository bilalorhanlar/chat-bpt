import { UserMenu } from "@/components/layout/user-menu";
import { getPeople } from "@/lib/people";
import { getSession } from "@/lib/session";

/**
 * Oturumu okuyup istemci menüsüne veri geçen ince sunucu sarmalayıcı.
 *
 * Misafir oturumunda kimlik yok: rozet "M" gösteriyor ve menüde yalnızca
 * çıkış var — ayarlar misafire kapalı.
 */
export async function UserBadge() {
  const session = await getSession();
  if (!session) return null;

  if (session.kind === "misafir") {
    return <UserMenu name="Misafir" accent="#6b6478" guest />;
  }

  const people = await getPeople();
  const person = people[session.user];
  return <UserMenu name={person.name} accent={person.accent} />;
}

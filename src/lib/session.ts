import { cookies } from "next/headers";

import type { PersonKey } from "@/config/site";
import { SESSION_COOKIE, isGuest, readSessionToken, type Session } from "@/lib/auth";
import { getPeople, partnerOf } from "@/lib/people";

/** Sunucu bileşenlerinde ve route handler'larda oturumu okur. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Oturum zorunlu olan yerlerde kullanılır.
 *
 * Proxy zaten korumasız istekleri `/kilit`'e yönlendiriyor; buraya oturumsuz
 * gelinmesi bir yapılandırma hatası demektir, sessizce geçmek yerine
 * patlaması daha iyi.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Oturum yok — proxy matcher'ını kontrol edin.");
  return session;
}

/**
 * Kişi oturumu zorunlu olan yerler (listeler, mektuplar, ayarlar…).
 * Misafir buralara proxy'den geçemiyor; yine de tip düzeyinde garanti veriyor.
 */
export async function requirePerson(): Promise<PersonKey> {
  const session = await requireSession();
  if (session.kind !== "kisi") throw new Error("Bu sayfa misafire kapalı.");
  return session.user;
}

/** Oturumdaki kişinin profil bilgisi (isim, doğum günü, renk). */
export async function currentPerson() {
  const [user, people] = await Promise.all([requirePerson(), getPeople()]);
  return people[user];
}

/** Karşı taraf — "rakip" ve "sana yazdı" gibi yerler için. */
export async function otherPerson(user: PersonKey) {
  const people = await getPeople();
  return people[partnerOf(user)];
}

export { isGuest };

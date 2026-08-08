import { cookies } from "next/headers";

import { SESSION_COOKIE, readSessionToken, type Session } from "@/lib/auth";
import { getPeople, partnerOf } from "@/lib/people";

/** Sunucu bileşenlerinde ve route handler'larda oturumu okur. */
export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  return readSessionToken(jar.get(SESSION_COOKIE)?.value);
}

/**
 * Oturum zorunlu olan yerlerde kullanılır.
 *
 * Middleware zaten korumasız istekleri `/kilit`'e yönlendiriyor; buraya
 * oturumsuz gelinmesi bir yapılandırma hatası demektir, sessizce geçmek yerine
 * patlaması daha iyi.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new Error("Oturum yok — middleware matcher'ı kontrol edin.");
  return session;
}

/** Oturumdaki kişinin profil bilgisi (isim, doğum günü, renk). */
export async function currentPerson() {
  const [session, people] = await Promise.all([requireSession(), getPeople()]);
  return people[session.user];
}

/** Karşı taraf — "rakip" ve "sana yazdı" gibi yerler için. */
export async function otherPerson(user: Session["user"]) {
  const people = await getPeople();
  return people[partnerOf(user)];
}

import { UserMenu } from "@/components/layout/user-menu";
import { currentPerson } from "@/lib/session";

/** Oturumu okuyup istemci menüsüne veri geçen ince sunucu sarmalayıcı. */
export async function UserBadge() {
  const person = await currentPerson();
  return <UserMenu name={person.name} accent={person.accent} />;
}

import {
  CalendarCheck,
  Clapperboard,
  Crown,
  Dices,
  Gem,
  Grid2x2,
  Heart,
  Home,
  KeyRound,
  Mail,
  MapPin,
  MessageCircle,
  Timer,
  Trophy,
  Type,
  type LucideIcon,
} from "lucide-react";

/**
 * `nav.ts` metin olarak ikon adı tutuyor (sunucu/istemci sınırından geçebilsin
 * diye); eşleme burada. Listede olmayan bir ad kalp ikonuna düşer.
 */
const ICONS: Record<string, LucideIcon> = {
  dice: Dices,
  crown: Crown,
  type: Type,
  grid: Grid2x2,
  trophy: Trophy,
  "calendar-check": CalendarCheck,
  home: Home,
  "map-pin": MapPin,
  clapperboard: Clapperboard,
  timer: Timer,
  "message-circle": MessageCircle,
  mail: Mail,
  gem: Gem,
  key: KeyRound,
  heart: Heart,
};

export function Icon({
  name,
  className,
  strokeWidth = 1.6,
}: {
  name: string;
  className?: string;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name] ?? Heart;
  return <Cmp className={className} strokeWidth={strokeWidth} aria-hidden />;
}

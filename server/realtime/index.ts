import type { Server, Socket } from "socket.io";

import type { PersonKey } from "@/config/site";
import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import { matchRoom, setIoServer } from "@/lib/realtime";

/** Kimliği doğrulanmış soket — `data.user` her zaman doludur. */
export type GameSocket = Socket & { data: { user: PersonKey } };

/** `a=1; b=2` → { a: "1", b: "2" } */
function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    out[part.slice(0, eq).trim()] = decodeURIComponent(part.slice(eq + 1).trim());
  }
  return out;
}

/**
 * Soket katmanı bilerek "aptal": oyun kuralı bilmiyor, durum değiştirmiyor.
 * Tek işi maç odalarına üyelik ve varlık (kimin bağlı olduğu) bildirimi.
 * Bütün kural doğrulaması sunucu eylemlerinde (`src/app/oyunlar/**`) yapılıyor
 * ve yeni durum `emitMatchState` ile buradan yayınlanıyor.
 */
export function registerRealtime(io: Server) {
  setIoServer(io);

  io.use(async (socket, nextFn) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const session = await readSessionToken(cookies[SESSION_COOKIE]);
    if (!session) return nextFn(new Error("yetkisiz"));
    socket.data.user = session.user;
    nextFn();
  });

  io.on("connection", (socket) => {
    const s = socket as GameSocket;
    void s.join(`user:${s.data.user}`);

    s.on("match:join", (matchId: unknown) => {
      if (typeof matchId !== "string" || matchId.length === 0) return;
      void s.join(matchRoom(matchId));
      // Karşı tarafa "buradayım" de — arayüz çevrimiçi rozetini buna göre yakar.
      s.to(matchRoom(matchId)).emit("match:presence", { user: s.data.user, online: true });
    });

    s.on("match:leave", (matchId: unknown) => {
      if (typeof matchId !== "string") return;
      void s.leave(matchRoom(matchId));
      s.to(matchRoom(matchId)).emit("match:presence", { user: s.data.user, online: false });
    });

    /** Karşı taraf odaya girdiğinde ona "ben de buradayım" diye cevap verilir. */
    s.on("match:ping", (matchId: unknown) => {
      if (typeof matchId !== "string") return;
      s.to(matchRoom(matchId)).emit("match:presence", { user: s.data.user, online: true });
    });

    s.on("disconnecting", () => {
      for (const room of s.rooms) {
        if (room.startsWith("match:")) {
          s.to(room).emit("match:presence", { user: s.data.user, online: false });
        }
      }
    });
  });
}

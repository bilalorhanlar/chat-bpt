import type { Server, Socket } from "socket.io";

import { SESSION_COOKIE, readSessionToken } from "@/lib/auth";
import type { PersonKey } from "@/config/site";

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

export function registerRealtime(io: Server) {
  // Bağlantı kurulmadan kimlik doğrula. Aynı JWT çerezini HTTP tarafındaki
  // middleware de okuyor; soket için ayrı bir jeton mekanizması yok.
  io.use(async (socket, nextFn) => {
    const cookies = parseCookies(socket.handshake.headers.cookie);
    const session = await readSessionToken(cookies[SESSION_COOKIE]);
    if (!session) return nextFn(new Error("yetkisiz"));
    socket.data.user = session.user;
    nextFn();
  });

  io.on("connection", (socket) => {
    const s = socket as GameSocket;

    // Herkes kendi kişisel odasına girer: "sıra sende" gibi bildirimler
    // maç odasından bağımsız olarak buraya gönderilebiliyor.
    void s.join(`user:${s.data.user}`);

    // Maç işleyicileri Faz 3'te bağlanacak (tavla), Faz 4'te satranç.
    registerMatchHandlers(io, s);
  });
}

/** Faz 3'te dolacak: maça katılma, hamle, saat. */
function registerMatchHandlers(_io: Server, socket: GameSocket) {
  socket.on("ping:test", (cb?: (payload: unknown) => void) => {
    cb?.({ ok: true, user: socket.data.user, at: Date.now() });
  });
}

"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import type { PersonKey } from "@/config/site";

/**
 * Maç odasına bağlanır ve sunucudan gelen durumu iletir.
 *
 * Kural doğrulaması sunucu eylemlerinde; buradan yalnızca **sonuç** geliyor.
 * Yani soket koparsa oyun çalışmaya devam eder — sadece karşı tarafın hamlesi
 * kendiliğinden düşmez, sayfa yenilendiğinde görünür. Bu bilinçli: tek bir
 * kopuk bağlantı oyunu kilitlemesin.
 *
 * `onState` her karede değişen bir kapanış olabildiği için ref'te tutuluyor;
 * bağımlılığa koymak her render'da yeniden bağlanmaya yol açardı.
 */
export function useMatchChannel<T>(matchId: string, onState: (state: T) => void) {
  const [online, setOnline] = useState<Partial<Record<PersonKey, boolean>>>({});
  const [connected, setConnected] = useState(false);
  const handler = useRef(onState);
  handler.current = onState;

  useEffect(() => {
    if (!matchId) return;

    const socket: Socket = io({ path: "/socket.io", transports: ["websocket", "polling"] });

    socket.on("connect", () => {
      setConnected(true);
      socket.emit("match:join", matchId);
    });
    socket.on("disconnect", () => setConnected(false));

    socket.on("match:state", (state: T) => handler.current(state));

    socket.on("match:presence", (payload: { user: PersonKey; online: boolean }) => {
      setOnline((current) => ({ ...current, [payload.user]: payload.online }));
      // Karşı taraf yeni katıldıysa ona da burada olduğumuzu bildir.
      if (payload.online) socket.emit("match:ping", matchId);
    });

    return () => {
      socket.emit("match:leave", matchId);
      socket.disconnect();
    };
  }, [matchId]);

  return { online, connected };
}

"use client";
import { useEffect, useRef, useState } from "react";
import PartySocket from "partysocket";
import { GameSnapshot } from "@/lib/game/bigtwos";

export interface LobbyPlayer { name: string; ready: boolean; }

export function useGame(room: string, pid: string, name: string) {
  const [lobby, setLobby] = useState<LobbyPlayer[]>([]);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [hand, setHand] = useState<number[]>([]);
  const sockRef = useRef<PartySocket | null>(null);

  useEffect(() => {
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
    const sock = new PartySocket({ host, room });
    sockRef.current = sock;
    sock.addEventListener("open", () => sock.send(JSON.stringify({ type: "join", pid, name })));
    sock.addEventListener("message", e => {
      const m = JSON.parse(e.data);
      if (m.type === "lobby") setLobby(m.players);
      else if (m.type === "state") {
        setSnapshot(m.snapshot);
        setHand(m.hand || []);
      }
    });
    return () => sock.close();
  }, [room, pid, name]);

  const send = (m: any) => sockRef.current?.send(JSON.stringify(m));
  return {
    lobby,
    snapshot,
    hand,
    ready: () => send({ type: "ready" }),
    move: (cards: number[]) => send({ type: "move", cards }),
    pass: () => send({ type: "pass" }),
    restart: () => send({ type: "restart" })
  };
}

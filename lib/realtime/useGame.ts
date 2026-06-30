"use client";
import { useEffect, useRef, useState } from "react";
import { GameSnapshot } from "@/lib/game/bigtwos";

export interface LobbyPlayer { name: string; ready: boolean; }

export function useGame(room: string, pid: string, name: string) {
  const [lobby, setLobby] = useState<LobbyPlayer[]>([]);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [hand, setHand] = useState<number[]>([]);
  const [endVotes, setEndVotes] = useState<{ votes: number; total: number }>({ votes: 0, total: 0 });
  const [youReady, setYouReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const sockRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const host = process.env.NEXT_PUBLIC_PARTYKIT_HOST || "127.0.0.1:1999";
    const proto = host.startsWith("localhost") || host.startsWith("127.") ? "ws" : "wss";
    let closedByUs = false;
    let pingTimer: ReturnType<typeof setInterval> | undefined;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      const sock = new WebSocket(`${proto}://${host}/?room=${encodeURIComponent(room)}`);
      sockRef.current = sock;
      sock.addEventListener("open", () => {
        setConnected(true);
        sock.send(JSON.stringify({ type: "join", pid, name }));
        // heartbeat keeps the connection (and hibernated DO socket) alive
        pingTimer = setInterval(() => {
          try { if (sock.readyState === 1) sock.send("ping"); } catch { /* noop */ }
        }, 25000);
      });
      sock.addEventListener("message", e => {
        let m: any;
        try { m = JSON.parse(e.data); } catch { return; } // ignore "pong"
        if (m.type === "lobby") { setLobby(m.players); setYouReady(!!m.youReady); setSnapshot(null); setHand([]); }
        else if (m.type === "state") {
          setSnapshot(m.snapshot);
          setHand(m.hand || []);
          setEndVotes({ votes: m.endVotes || 0, total: m.totalPlayers || 0 });
        }
      });
      sock.addEventListener("close", () => {
        setConnected(false);
        if (pingTimer) clearInterval(pingTimer);
        // auto-reconnect; on rejoin the server pushes the persisted game state
        if (!closedByUs) reconnectTimer = setTimeout(connect, 1500);
      });
    };
    connect();

    return () => {
      closedByUs = true;
      if (pingTimer) clearInterval(pingTimer);
      if (reconnectTimer) clearTimeout(reconnectTimer);
      sockRef.current?.close();
    };
  }, [room, pid, name]);

  const send = (m: any) => sockRef.current?.readyState === 1 && sockRef.current.send(JSON.stringify(m));
  return {
    lobby,
    snapshot,
    hand,
    endVotes,
    youReady,
    connected,
    ready: () => send({ type: "ready" }),
    move: (cards: number[]) => send({ type: "move", cards }),
    pass: () => send({ type: "pass" }),
    endVote: () => send({ type: "endVote" }),
    restart: () => send({ type: "restart" })
  };
}

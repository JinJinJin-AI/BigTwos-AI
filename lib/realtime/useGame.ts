"use client";
import { useEffect, useRef, useState } from "react";
import { GameSnapshot } from "@/lib/game/bigtwos";

export type Election = "none" | "observer" | "player";
export interface LobbyPlayer { name: string; election: Election; anyway: boolean; }
export interface Countdown { kind: "auto" | "anyway"; secondsLeft: number; }
export interface BeginAnyway { eligible: boolean; votes: number; need: number; }

export function useGame(room: string, pid: string, name: string) {
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([]);
  const [youElection, setYouElection] = useState<Election>("none");
  const [youAnyway, setYouAnyway] = useState(false);
  const [countdown, setCountdown] = useState<Countdown | null>(null);
  const [beginAnyway, setBeginAnyway] = useState<BeginAnyway>({ eligible: false, votes: 0, need: 0 });

  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [hand, setHand] = useState<number[]>([]);
  const [endVotes, setEndVotes] = useState<{ votes: number; total: number }>({ votes: 0, total: 0 });
  const [observers, setObservers] = useState<{ name: string }[]>([]);
  const [isObserver, setIsObserver] = useState(false);
  const [idleSeconds, setIdleSeconds] = useState<number | null>(null);

  const [chats, setChats] = useState<{ id: number; name: string; text: string; x: number; y: number }[]>([]);
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
        pingTimer = setInterval(() => {
          try { if (sock.readyState === 1) sock.send("ping"); } catch { /* noop */ }
        }, 25000);
      });
      sock.addEventListener("message", e => {
        let m: any;
        try { m = JSON.parse(e.data); } catch { return; }
        if (m.type === "lobby") {
          setLobbyPlayers(m.players || []);
          setYouElection(m.you?.election ?? "none");
          setYouAnyway(!!m.you?.anyway);
          setCountdown(m.countdown || null);
          setBeginAnyway(m.beginAnyway || { eligible: false, votes: 0, need: 0 });
          setSnapshot(null); setHand([]); setIdleSeconds(null);
        } else if (m.type === "state") {
          setSnapshot(m.snapshot);
          setHand(m.hand || []);
          setEndVotes({ votes: m.endVotes || 0, total: m.totalPlayers || 0 });
          setObservers(m.observers || []);
          setIsObserver(!!m.youAreObserver);
          setIdleSeconds(typeof m.idleSecondsLeft === "number" ? m.idleSecondsLeft : null);
        } else if (m.type === "idle") {
          setIdleSeconds(m.secondsLeft);
        } else if (m.type === "idleCleared") {
          setIdleSeconds(null);
        } else if (m.type === "chat") {
          const id = Date.now() + Math.random();
          const x = 12 + Math.random() * 60;
          const y = 14 + Math.random() * 22;
          setChats(cs => [...cs, { id, name: m.name, text: m.text, x, y }]);
          setTimeout(() => setChats(cs => cs.filter(c => c.id !== id)), 10000);
        }
      });
      sock.addEventListener("close", () => {
        setConnected(false);
        if (pingTimer) clearInterval(pingTimer);
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

  // Local 1s tickers so countdowns visibly decrease between server messages.
  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => (c ? { ...c, secondsLeft: Math.max(0, c.secondsLeft - 1) } : c));
      setIdleSeconds(s => (s === null ? s : Math.max(0, s - 1)));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const send = (m: any) => sockRef.current?.readyState === 1 && sockRef.current.send(JSON.stringify(m));
  return {
    lobbyPlayers,
    youElection,
    youAnyway,
    countdown,
    beginAnyway,
    snapshot,
    hand,
    endVotes,
    observers,
    isObserver,
    idleSeconds,
    chats,
    connected,
    elect: (choice: Election) => send({ type: "elect", choice }),
    toggleAnyway: () => send({ type: "beginAnyway" }),
    stillHere: () => send({ type: "stillHere" }),
    move: (cards: number[]) => send({ type: "move", cards }),
    pass: () => send({ type: "pass" }),
    endVote: () => send({ type: "endVote" }),
    restart: () => send({ type: "restart" }),
    sendChat: (text: string) => send({ type: "chat", text })
  };
}

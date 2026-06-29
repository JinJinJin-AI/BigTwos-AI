"use client";
import { useState } from "react";
import { useGame } from "@/lib/realtime/useGame";
import { PlayingCard } from "@/components/PlayingCard";
import { fromId, toId } from "@/lib/game/constants";
import { sort, checkValidHand } from "@/lib/game/engine";
import { Spinner } from "@/components/Spinner";

export default function GameClient({ pid, name }: { pid: string; name: string }) {
  const g = useGame("main", pid, name);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 5) next.add(id);
    setSelected(next);
  };

  const snap = g.snapshot;
  const myTurn = snap?.currentPlayer === pid;
  const selectedCards = [...selected].map(fromId);
  const [name_] = checkValidHand(selectedCards);
  const playable = selectedCards.length > 0 && name_ && name_ !== "invalid";

  if (!snap) {
    return (
      <div style={{ padding: 40, color: "#fff", textAlign: "center" }}>
        <h2>Waiting Room</h2>
        {g.lobby.length === 0 ? (
          <Spinner label="Connecting…" />
        ) : (
          <ul style={{ listStyle: "none" }}>{g.lobby.map((p, i) => <li key={i}>{p.name} {p.ready ? "✅" : "…"}</li>)}</ul>
        )}
        <button onClick={g.ready}>I&apos;m ready</button>
      </div>
    );
  }

  const hand = [...g.hand].map(fromId).sort(sort);
  const board = snap.board.map(fromId);

  return (
    <div style={{ minHeight: "100vh", padding: 20, color: "#fff" }}>
      <h2>{snap.gameOver ? `🏆 ${snap.winner === pid ? "You win!" : "Game over"}` : myTurn ? "Your turn" : "Waiting…"}</h2>
      <p style={{ minHeight: 20, opacity: 0.8 }}>{name_ && name_ !== "invalid" ? `Selected: ${name_}` : "\u00a0"}</p>
      <div style={{ display: "flex", gap: 6, minHeight: 140, justifyContent: "center", alignItems: "center", background: "#0002", borderRadius: 12, margin: "12px 0" }}>
        {board.length ? board.map((c, i) => <PlayingCard key={i} card={c} />) : <span>No cards on the board</span>}
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
        {hand.map(c => {
          const id = toId(c);
          return <PlayingCard key={id} card={c} selected={selected.has(id)} onClick={() => toggle(id)} />;
        })}
      </div>
      <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center" }}>
        <button disabled={!myTurn || !playable} onClick={() => { g.move([...selected]); setSelected(new Set()); }}>Move</button>
        <button disabled={!myTurn || !snap.firstMoveMade} onClick={() => { g.pass(); setSelected(new Set()); }}>Pass</button>
        {snap.gameOver && <button onClick={g.restart}>Restart</button>}
      </div>
    </div>
  );
}

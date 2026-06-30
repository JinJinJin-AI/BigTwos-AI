"use client";
import { useState, useEffect } from "react";
import { LayoutGroup } from "framer-motion";
import { useGame } from "@/lib/realtime/useGame";
import { PlayingCard } from "@/components/PlayingCard";
import { fromId, toId } from "@/lib/game/constants";
import { sort, evaluateHand } from "@/lib/game/engine";
import { Spinner } from "@/components/Spinner";
import { ChatOverlay } from "@/components/ChatOverlay";

function ChatBar({ onSend }: { onSend: (t: string) => void }) {
  const [text, setText] = useState("");
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (t) { onSend(t); setText(""); }
  };
  return (
    <form onSubmit={submit} style={{ position: "fixed", bottom: 14, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 6, zIndex: 60 }}>
      <input
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={200}
        placeholder="Say something…"
        style={{ width: 220, background: "#F7ECD3", color: "#5C1A1A" }}
      />
      <button type="submit">Send</button>
    </form>
  );
}

export default function GameClient({ pid, name }: { pid: string; name: string }) {
  // Dev and prod never share a room, so local play can never join a live prod game.
  const room = process.env.NODE_ENV === "production" ? "main" : "dev";
  const g = useGame(room, pid, name);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Sliding session: keep the 1h token fresh while this tab is open so an
  // ongoing game is never interrupted by token expiry.
  useEffect(() => {
    const refresh = () => fetch("/api/auth/refresh", { method: "POST" }).catch(() => {});
    refresh();
    const t = setInterval(refresh, 15 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const toggle = (id: number) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else if (next.size < 5) next.add(id);
    setSelected(next);
  };

  const snap = g.snapshot;
  const myTurn = snap?.currentPlayer === pid;
  const selectedCards = [...selected].map(fromId);
  const [name_, score_, suit_, isPoker_] = evaluateHand(selectedCards);
  const validType = selectedCards.length > 0 && name_ && name_ !== "invalid";

  const boardCards = (snap?.board || []).map(fromId);
  const [bName, bScore, bSuit] = boardCards.length ? evaluateHand(boardCards) : [undefined, 0, -1];
  const boardIsPoker = boardCards.length >= 4;
  const beatsBoard =
    boardCards.length === 0 ||
    (isPoker_ && boardIsPoker
      ? (score_ as number) > (bScore as number)
      : selectedCards.length === boardCards.length &&
      (bName === undefined || name_ == bName) &&
      ((score_ as number) > (bScore as number) ||
        ((score_ as number) === (bScore as number) && (suit_ as number) > (bSuit as number))));
  const playable = validType && beatsBoard;

  if (!snap) {
    const isPlayer = g.youElection === "player";
    const isObs = g.youElection === "observer";
    return (
      <>
        <ChatOverlay chats={g.chats} />
        <ChatBar onSend={g.sendChat} />
        <div style={{ minHeight: "100vh", backgroundImage: "url(/images/title.png)", backgroundSize: "cover", backgroundPosition: "center", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", paddingBottom: "20vh", color: "#F7ECD3" }}>
          <div style={{ background: "#5C1A1Acc", border: "3px solid #E9A6A6", borderRadius: 14, padding: "20px 32px", textAlign: "center", minWidth: 360, fontSize: "1.1em" }}>
            <h2 style={{ marginBottom: 10 }}>Waiting Room</h2>
            {g.lobbyPlayers.length === 0 ? (
              <Spinner label="Connecting…" />
            ) : (
              <ul style={{ listStyle: "none", marginBottom: 12, display: "grid", gap: 4 }}>
                {g.lobbyPlayers.map((p, i) => (
                  <li key={i}>
                    {p.name} — {p.election === "player" ? "✋ Player" : p.election === "observer" ? "👁 Spectator" : "…undecided"}
                    {p.election === "player" && p.anyway ? " ⚡" : ""}
                  </li>
                ))}
              </ul>
            )}

            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 10 }}>
              <button onClick={() => g.elect(isPlayer ? "none" : "player")}
                style={{ background: isPlayer ? "#C0392B" : "#F7ECD3", color: isPlayer ? "#fff" : "#5C1A1A", border: "3px solid #E9A6A6" }}>
                {isPlayer ? "✓ Playing" : "Play"}
              </button>
              <button onClick={() => g.elect(isObs ? "none" : "observer")}
                style={{ background: isObs ? "#C0392B" : "#F7ECD3", color: isObs ? "#fff" : "#5C1A1A", border: "3px solid #E9A6A6" }}>
                {isObs ? "✓ Spectating" : "Spectate"}
              </button>
            </div>

            {g.countdown && (
              <p style={{ fontWeight: 800, fontSize: "1.2em" }}>
                Starting in {g.countdown.secondsLeft}s…
                <span style={{ opacity: 0.7, fontSize: "0.7em" }}> ({g.countdown.kind === "auto" ? "everyone chose" : "begin anyway"})</span>
              </p>
            )}

            {g.beginAnyway.eligible && isPlayer && !g.countdown && (
              <button onClick={g.toggleAnyway}
                style={{ background: g.youAnyway ? "#C0392B" : "#F7ECD3", color: g.youAnyway ? "#fff" : "#5C1A1A", border: "3px solid #E9A6A6" }}>
                {g.youAnyway ? "Cancel" : "Begin anyway"} ({g.beginAnyway.votes}/{g.beginAnyway.need})
              </button>
            )}
          </div>
        </div>
      </>
    );
  }

  const hand = [...g.hand].map(fromId).sort(sort);
  const board = snap.board.map(fromId);

  return (
    <LayoutGroup>
      <ChatOverlay chats={g.chats} />
      <ChatBar onSend={g.sendChat} />
      <div style={{ minHeight: "100vh", padding: "20px 20px 76px", color: "#fff" }}>
        {!g.connected && (
          <div style={{ position: "fixed", top: 0, left: 0, right: 0, background: "#C0392B", color: "#fff", textAlign: "center", padding: 6, zIndex: 50 }}>
            Reconnecting…
          </div>
        )}
        {g.idleSeconds !== null && !snap.gameOver && (
          <div style={{ position: "fixed", inset: 0, background: "#000000aa", zIndex: 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: "#5C1A1A", border: "3px solid #E9A6A6", borderRadius: 16, padding: "28px 36px", textAlign: "center", color: "#F7ECD3", maxWidth: 380 }}>
              <h2 style={{ marginBottom: 8 }}>Still there?</h2>
              <p style={{ marginBottom: 14 }}>This game will end from inactivity in <b style={{ fontSize: "1.4em", color: "#ffd166" }}>{g.idleSeconds}</b>s.</p>
              <button onClick={g.stillHere} style={{ background: "#F7ECD3", color: "#5C1A1A", border: "3px solid #E9A6A6", fontSize: "1.1em", padding: "10px 24px" }}>
                I&apos;m still here
              </button>
            </div>
          </div>
        )}
        <h2>{snap.gameOver ? `🏆 ${snap.winner === pid ? "You win!" : "Game over"}` : g.isObserver ? "👁 Observing" : myTurn ? "Your turn" : "Waiting…"}</h2>
        <p style={{ minHeight: 20, opacity: 0.8 }}>{name_ && name_ !== "invalid" ? `Selected: ${name_}` : "\u00a0"}</p>
        <div style={{ display: "flex", gap: 6, minHeight: 140, justifyContent: "center", alignItems: "center", background: "#0002", borderRadius: 12, margin: "12px 0" }}>
          {board.length ? board.map(c => <PlayingCard key={toId(c)} layoutId={`c-${toId(c)}`} card={c} />) : <span>No cards on the board</span>}
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          {hand.map(c => {
            const id = toId(c);
            return <PlayingCard key={id} layoutId={`c-${id}`} card={c} selected={selected.has(id)} onClick={() => toggle(id)} />;
          })}
        </div>
        <div style={{ marginTop: 16, display: "flex", gap: 8, justifyContent: "center", alignItems: "center" }}>
          <button disabled={!playable} onClick={() => {
            if (!myTurn) return alert("Not your turn yet.");
            if (!snap.firstMoveMade && ![...selected].some(id => id === 41)) return alert("First move must include the 3 of diamonds.");
            g.move([...selected]); setSelected(new Set());
          }}>Move</button>
          <button disabled={!myTurn} onClick={() => {
            if (!snap.firstMoveMade) return alert("Can't pass on the opening move — play the 3 of diamonds.");
            g.pass(); setSelected(new Set());
          }}>Pass</button>
          {snap.gameOver && <button onClick={g.restart}>Restart</button>}
          {!g.isObserver && (
            <button
              onClick={g.endVote}
              style={{ marginLeft: "auto", background: "#d40000", color: "#fff" }}
              title="Vote to end the game and return to the waiting room"
            >
              End Game {g.endVotes.votes > 0 ? `(${g.endVotes.votes}/${g.endVotes.total})` : ""}
            </button>
          )}
        </div>

        <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "center" }}>
          {snap.players.map((p, i) => {
            const isTurn = p.pid === snap.currentPlayer;
            const isMe = p.pid === pid;
            return (
              <div
                key={p.pid}
                style={{
                  position: "relative",
                  minWidth: 132,
                  padding: "14px 18px",
                  borderRadius: 14,
                  textAlign: "center",
                  background: isTurn ? "#F7ECD3" : "#5C1A1A99",
                  color: isTurn ? "#5C1A1A" : "#F7ECD3",
                  border: `3px solid ${isTurn ? "#C0392B" : "#E9A6A655"}`,
                  boxShadow: isTurn ? "0 0 18px #C0392B" : "none",
                  transition: "all 0.25s"
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.7 }}>#{i + 1}{i < snap.players.length - 1 ? " →" : " ↺"}</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>
                  {isTurn ? "▸ " : ""}{p.name}{isMe ? " (you)" : ""}
                </div>
                <div style={{ marginTop: 6, fontSize: 22, fontWeight: 800 }}>
                  🂠 {p.cardsLeft}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7 }}>{p.cardsLeft === 1 ? "card" : "cards"} left</div>
              </div>
            );
          })}
        </div>

        {g.observers.length > 0 && (
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center", alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.6, letterSpacing: 1, textTransform: "uppercase" }}>Spectators</span>
            {g.observers.map((o, i) => (
              <div
                key={i}
                style={{
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: "#00000033",
                  border: "1px solid #E9A6A655",
                  fontSize: 13,
                  opacity: 0.85
                }}
              >
                👁 {o.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </LayoutGroup>
  );
}

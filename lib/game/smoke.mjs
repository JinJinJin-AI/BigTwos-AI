// Smoke test: two players join, ready, play, verify state sync. Run against partykit dev.
import PartySocket from "partysocket";

function mk(pid, name) {
  const s = new PartySocket({ host: "127.0.0.1:1999", room: "smoke" });
  s.last = null;
  s.addEventListener("open", () => s.send(JSON.stringify({ type: "join", pid, name })));
  s.addEventListener("message", e => { s.last = JSON.parse(e.data); });
  return s;
}
const wait = ms => new Promise(r => setTimeout(r, ms));

const a = mk("A", "Alice"), b = mk("B", "Bob");
await wait(1500);
a.send(JSON.stringify({ type: "ready" }));
b.send(JSON.stringify({ type: "ready" }));
await wait(1500);

const ok = (n, c) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);
ok("game started", a.last?.type === "state");
ok("hands dealt", (a.last?.hand?.length || 0) > 0 && (b.last?.hand?.length || 0) > 0);
ok("board empty", a.last?.snapshot.board.length === 0);
ok("turn assigned", !!a.last?.snapshot.currentPlayer);
const total = a.last.snapshot.players.reduce((s, p) => s + p.cardsLeft, 0);
ok("2-player deal=42", total === 42);
process.exit(0);

import PartySocket from "partysocket";
function mk(pid, name) {
  const s = new PartySocket({ host: "127.0.0.1:1999", room: "play" });
  s.last = null;
  s.addEventListener("open", () => s.send(JSON.stringify({ type: "join", pid, name })));
  s.addEventListener("message", e => { s.last = JSON.parse(e.data); });
  return s;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const a = mk("A", "Alice"), b = mk("B", "Bob");
await wait(1200);
a.send(JSON.stringify({ type: "ready" })); b.send(JSON.stringify({ type: "ready" }));
await wait(1200);
const cur = a.last.snapshot.currentPlayer;
const mover = cur === "A" ? a : b;
// first move must contain 3 of diamonds = 41
mover.send(JSON.stringify({ type: "move", cards: [41] }));
await wait(800);
const ok = (n, c) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);
ok("3D move accepted -> board=[41]", JSON.stringify(a.last.snapshot.board) === "[41]");
ok("turn advanced", a.last.snapshot.currentPlayer !== cur);
process.exit(0);

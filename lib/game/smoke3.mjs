import PartySocket from "partysocket";
function mk(pid, name) {
  const s = new PartySocket({ host: "127.0.0.1:1999", room: "vote" });
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
const ok = (n, c) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);
ok("started", a.last?.type === "state");
a.send(JSON.stringify({ type: "endVote" }));
await wait(600);
ok("1 vote not enough (2 players)", a.last?.type === "state" && a.last.endVotes === 1);
b.send(JSON.stringify({ type: "endVote" }));
await wait(800);
ok("both votes -> back to lobby", a.last?.type === "lobby");
process.exit(0);

// prod smoke: two WS clients vs party.big-twos.com
const WS = (await import("ws")).default;
function mk(pid, name) {
  const s = new WS("wss://party.big-twos.com");
  s.last = null;
  s.on("open", () => s.send(JSON.stringify({ type: "join", pid, name })));
  s.on("message", d => { s.last = JSON.parse(d.toString()); });
  return s;
}
const wait = ms => new Promise(r => setTimeout(r, ms));
const a = mk("A", "Alice"), b = mk("B", "Bob");
await wait(2000);
a.send(JSON.stringify({ type: "ready" })); b.send(JSON.stringify({ type: "ready" }));
await wait(2000);
const ok = (n, c) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);
ok("game started", a.last?.type === "state");
ok("hands dealt 42", a.last?.snapshot.players.reduce((s,p)=>s+p.cardsLeft,0) === 42);
process.exit(0);

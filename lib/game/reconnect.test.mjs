const WS = (await import("ws")).default;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ok = (n, c) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);
function mk(pid, name, store) {
  return new Promise(res => {
    const s = new WS("ws://127.0.0.1:1999/?room=test");
    s.on("message", d => { try { store.last = JSON.parse(d.toString()); } catch {} });
    s.on("open", () => { s.send(JSON.stringify({ type: "join", pid, name })); res(s); });
  });
}

const A = {}, B = {};
const a = await mk("A", "Alice", A);
const b = await mk("B", "Bob", B);
await wait(800);
a.send(JSON.stringify({ type: "ready" })); b.send(JSON.stringify({ type: "ready" }));
await wait(1200);
ok("game started", A.last?.type === "state");
const cur = A.last.snapshot.currentPlayer;
(cur === "A" ? a : b).send(JSON.stringify({ type: "move", cards: [41] }));
await wait(1000);
ok("3D played -> board=[41]", JSON.stringify(A.last.snapshot.board) === "[41]");

a.close();
await wait(800);
const A2 = {};
await mk("A", "Alice", A2);
await wait(1200);
ok("reconnect resumes game (state, not lobby)", A2.last?.type === "state");
ok("reconnect sees board=[41]", JSON.stringify(A2.last?.snapshot.board) === "[41]");
ok("reconnect restores A's hand", Array.isArray(A2.last?.hand) && A2.last.hand.length > 0);
process.exit(0);

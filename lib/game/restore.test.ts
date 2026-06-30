import { BigTwos } from "./bigtwos";

const ok = (n: string, c: boolean) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);

const g = new BigTwos([{ pid: "A", name: "Alice" }, { pid: "B", name: "Bob" }]);
// play the opening 3 of diamonds
const first = g.currentPlayer;
g.makeMove(first, [41], false);

const state = g.toState();
const round = BigTwos.restore(state);

ok("restore keeps current player", round.currentPlayer === g.currentPlayer);
ok("restore keeps board", JSON.stringify(round.board()) === JSON.stringify(g.board()));
ok("restore keeps firstMoveMade", round.firstMoveMade === g.firstMoveMade);
ok("restore keeps hands A", JSON.stringify(round.playerCards("A")) === JSON.stringify(g.playerCards("A")));
ok("restore keeps hands B", JSON.stringify(round.playerCards("B")) === JSON.stringify(g.playerCards("B")));
ok("restore snapshot equal", JSON.stringify(round.snapshot()) === JSON.stringify(g.snapshot()));
// JSON serializable (DO storage uses structured clone, but this proves no cycles leak)
ok("state is JSON-serializable", typeof JSON.stringify(state) === "string");

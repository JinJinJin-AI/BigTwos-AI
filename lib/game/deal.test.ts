import { BigTwos } from "./bigtwos";
let fail = 0;
for (let i = 0; i < 2000; i++) {
  const g = new BigTwos([{ pid: "A", name: "A" }, { pid: "B", name: "B" }]);
  const a = g.playerCards("A") || [];
  const b = g.playerCards("B") || [];
  if (!a.includes(41) && !b.includes(41)) fail++;
  // first player must be the one holding the 3 of diamonds
  if (!(g.playerCards(g.currentPlayer) || []).includes(41)) fail++;
}
console.log(fail === 0 ? "PASS all 2000 games have 3D dealt" : `FAIL ${fail} missing 3D`);

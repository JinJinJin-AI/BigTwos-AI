import { BigTwos } from "./bigtwos";
import { checkValidHand } from "./engine";
import { fromId } from "./constants";

const ok = (n: string, c: boolean) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);

// board = single
const g = new BigTwos([{ pid: "A", name: "A" }, { pid: "B", name: "B" }]);
(g as any).firstMoveMade = true;
(g as any).boardHand = new Set([41]); (g as any).boardName = "singles"; (g as any).boardScore = 1; (g as any).boardHigh = 0;
ok("5-card straight rejected vs single", g.validate([0, 1, 2, 16, 30]) === false);
ok("pair rejected vs single (count)", g.validate([5, 18]) === false);

// four of a kind should beat a poker hand on the board (count exception)
const ids4 = [0, 13, 26, 39]; // four aces
const [n4] = checkValidHand(ids4.map(fromId));
ok("four of a kind detected", n4 === "four of a kind");
const straight = [0, 1, 2, 16, 30];
const [ns] = checkValidHand(straight.map(fromId));
(g as any).boardHand = new Set(straight); (g as any).boardName = ns; (g as any).boardScore = 5; (g as any).boardHigh = 3;
ok("4-of-a-kind beats straight (poker)", g.validate(ids4) === true);

// straight flush should beat four of a kind; 4-kind cannot beat straight flush
const sf = [0, 1, 2, 3, 4]; // 5 spades in a row = straight flush
const [, sfScore] = checkValidHand(sf.map(fromId));
const [, fkScore] = checkValidHand(ids4.map(fromId));
(g as any).boardHand = new Set(ids4); (g as any).boardName = "four of a kind"; (g as any).boardScore = fkScore; (g as any).boardHigh = 3;
ok("straight flush beats 4-of-a-kind", g.validate(sf) === true);
(g as any).boardHand = new Set(sf); (g as any).boardName = "straight flush"; (g as any).boardScore = sfScore; (g as any).boardHigh = 0;
ok("4-of-a-kind cannot beat straight flush", g.validate(ids4) === false);

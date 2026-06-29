import { checkValidHand } from "./engine";
import { fromId, toId, CardData } from "./constants";

// minimal sanity tests for the preserved engine
const C = (rank: number, suit: any): CardData => ({ rank, suit });

function eq(name: string, got: any, want: any) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}: got=${JSON.stringify(got)} want=${JSON.stringify(want)}`);
  if (!ok) process.exitCode = 1;
}

// single 5 of spades
eq("single5 name", checkValidHand([C(5, "spades")])[0], "singles");
// pair of 7s
eq("pair name", checkValidHand([C(7, "spades"), C(7, "hearts")])[0], "doubles");
// straight 3-4-5-6-7
eq("straight", checkValidHand([C(3, "spades"), C(4, "spades"), C(5, "hearts"), C(6, "clubs"), C(7, "diamonds")])[0], "straight");
// flush
eq("flush", checkValidHand([C(3, "spades"), C(5, "spades"), C(8, "spades"), C(10, "spades"), C(12, "spades")])[0], "flush");
// id round trip 3 of diamonds = 41
eq("3D id", toId(C(3, "diamonds")), 41);
eq("fromId 41", fromId(41), C(3, "diamonds"));
eq("has3D", checkValidHand([C(3, "diamonds")])[4], true);

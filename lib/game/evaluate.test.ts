import { evaluateHand, checkValidHand } from "./engine";
const C = (rank: number, suit: any) => ({ rank, suit });
const ok = (n: string, c: boolean) => console.log(`${c ? "PASS" : "FAIL"} ${n}`);

// the reported bug + variants must be invalid
ok("6,6,7,7,8 invalid", evaluateHand([C(6,"spades"),C(6,"hearts"),C(7,"clubs"),C(7,"diamonds"),C(8,"spades")])[0] === "invalid");
ok("6,6,7,8,9 invalid", evaluateHand([C(6,"spades"),C(6,"hearts"),C(7,"clubs"),C(8,"diamonds"),C(9,"spades")])[0] === "invalid");
ok("5,5,5,5,9 invalid (not full house)", evaluateHand([C(5,"spades"),C(5,"hearts"),C(5,"clubs"),C(5,"diamonds"),C(9,"spades")])[0] === "invalid");

// real hands must still pass unchanged
ok("real straight 4-8 still straight", evaluateHand([C(4,"spades"),C(5,"hearts"),C(6,"clubs"),C(7,"diamonds"),C(8,"spades")])[0] === "straight");
ok("flush still flush", evaluateHand([C(3,"spades"),C(5,"spades"),C(8,"spades"),C(10,"spades"),C(12,"spades")])[0] === "flush");
ok("full house 2,2,3,3,3 still full house", evaluateHand([C(2,"spades"),C(2,"hearts"),C(3,"clubs"),C(3,"diamonds"),C(3,"spades")])[0] === "full house");
ok("single unaffected", evaluateHand([C(9,"spades")])[0] === "singles");
ok("pair unaffected", evaluateHand([C(9,"spades"),C(9,"hearts")])[0] === "doubles");
ok("four of a kind (4 cards) unaffected", evaluateHand([C(1,"spades"),C(1,"hearts"),C(1,"clubs"),C(1,"diamonds")])[0] === "four of a kind");

// checkValidHand itself is untouched (still has the legacy behavior)
ok("checkValidHand verbatim (still calls straight)", checkValidHand([C(6,"spades"),C(6,"hearts"),C(7,"clubs"),C(7,"diamonds"),C(8,"spades")])[0] === "straight");

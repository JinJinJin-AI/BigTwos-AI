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

// double suit comparison must use the HIGHEST suit, order-independent
const pairSpadeDiamond = evaluateHand([C(6,"spades"),C(6,"diamonds")])[2];
const pairDiamondSpade = evaluateHand([C(6,"diamonds"),C(6,"spades")])[2];
ok("6d6s pair suit = spades(3)", pairSpadeDiamond === 3);
ok("pair suit order-independent", pairSpadeDiamond === pairDiamondSpade);
const pairHeartClub = evaluateHand([C(6,"hearts"),C(6,"clubs")])[2];
ok("6h6c pair suit = hearts(2)", pairHeartClub === 2);
ok("6d6s (3) beats 6h6c (2)", (pairSpadeDiamond as number) > (pairHeartClub as number));
// single still uses its own suit
ok("single 6c suit = clubs(1)", evaluateHand([C(6,"clubs")])[2] === 1);

// full house ranked by TRIPLE rank (2 highest), not the pair / max number
const fh222 = evaluateHand([C(2,"spades"),C(2,"hearts"),C(2,"clubs"),C(8,"diamonds"),C(8,"spades")])[1] as number;
const fhKKK = evaluateHand([C(13,"spades"),C(13,"hearts"),C(13,"clubs"),C(5,"diamonds"),C(5,"spades")])[1] as number;
const fh333 = evaluateHand([C(3,"spades"),C(3,"hearts"),C(3,"clubs"),C(13,"diamonds"),C(13,"spades")])[1] as number;
ok("2-triple FH beats K-triple FH", fh222 > fhKKK);
ok("K-triple FH beats 3-triple FH", fhKKK > fh333);
ok("triple rank decides, pair ignored", fh222 > fh333);

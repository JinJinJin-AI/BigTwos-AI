import { checkValidHand, evaluateHand } from "./engine";
const C = (r: number, s: any) => ({ rank: r, suit: s });
console.log("RAW 2,2,2,8,8 =>", checkValidHand([C(2,"spades"),C(2,"hearts"),C(2,"clubs"),C(8,"diamonds"),C(8,"spades")]));
console.log("RAW K,K,K,5,5 =>", checkValidHand([C(13,"spades"),C(13,"hearts"),C(13,"clubs"),C(5,"diamonds"),C(5,"spades")]));
console.log("EVAL 2,2,2,8,8 =>", evaluateHand([C(2,"spades"),C(2,"hearts"),C(2,"clubs"),C(8,"diamonds"),C(8,"spades")]));
console.log("EVAL K,K,K,5,5 =>", evaluateHand([C(13,"spades"),C(13,"hearts"),C(13,"clubs"),C(5,"diamonds"),C(5,"spades")]));

import { handTypes, CardData } from "./constants";

/**
 * Preserved verbatim from legacy/static/index.js (the nostalgic core).
 * Only the per-card extraction was adapted from DOM classList to CardData so the
 * exact same scoring/validation runs on both client and server. Algorithm and
 * comments are otherwise untouched.
 *
 * @param {CardData[]} hand The set of cards we are checking validity of.
 * @returns The [hand name, hand score, hand's highest suit, isPoker, has3ofDiamonds]
 */
export function checkValidHand(
  hand: CardData[]
): [string | undefined, number, number | undefined, boolean, boolean] {
  let code;
  let name, multiplier, highCard, highSuit, highCardSuit;
  let has3D = false;

  // flags for Straight, Flush, and Royal
  let [S, F, R] = [true, true, true];

  // set to find cards in a full house and detect duplicates ranks; stores the card ranks currently selected
  let findFH = new Set();

  // set to track what suits are selected
  let suits = new Set(["diamonds", "clubs", "hearts", "spades"]);

  // set to track which royal cards are selected
  let royals = new Set([1, 13, 12, 11]); // A, K, Q, J (i think)

  // status flags for determining if there's a straight
  let [flag1, flag2, flag3, flag4, flag10, flag11, flag12, flag13] = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  ];
  let max = 13;
  let min = 1;
  let isConsecutive = true;

  // loop to set flags for determining the current selected hand
  for (let item of hand) {
    let suit = item.suit;
    let rank = item.rank;
    if (rank == 3 && suit == "diamonds") has3D = true;

    // update the current highest card (by number)
    if (
      highCard === undefined ||
      rank == 2 ||
      (highCard != 2 && rank == 1) ||
      highCard < rank
    ) {
      highCard = rank;
    }

    let suitValue =
      suit == "diamonds" ? 0 : suit == "clubs" ? 1 : suit == "hearts" ? 2 : 3;
    if (highSuit === undefined || suitValue > highSuit) {
      highSuit = suitValue;
    }
    if (rank == highCard) highCardSuit = suitValue;

    // all ranks need to fall within the range which narrows as we go on.
    if (rank < min || rank > max) isConsecutive = false;

    // narrow the range to 5
    // compare possible straight lowerbound and upperbound to current possible range
    if (max - min > 4) {
      let lowerBound = rank - 4;
      let upperBound = rank + 4;
      if (lowerBound > min) {
        min = lowerBound;
      }
      if (upperBound < max) {
        max = upperBound;
      }
    }

    // set straight flags
    if (rank == 1) flag1 = true;
    if (rank == 2) flag2 = true;
    if (rank == 3) flag3 = true;
    if (rank == 4) flag4 = true;
    if (rank == 10) flag10 = true;
    if (rank == 11) flag11 = true;
    if (rank == 12) flag12 = true;
    if (rank == 13) flag13 = true;

    // update the sets
    findFH.add(rank);
    royals.delete(rank);
    suits.delete(suit);
  }

  let isPoker = false;
  // assign multiplier and name
  if (hand.length < 5) {
    if (findFH.size == 1) {
      [name, multiplier] = handTypes[hand.length];
      if (hand.length == 4) isPoker = true;
    }
  } else {
    isPoker = true;
    // console.log("size = 5")
    if (findFH.size == 2) {
      code = 3;
    } else {
      /* Determine if it was a Straight
       * casesWith13: if theres a 13 and it includes a 3 or 4 it's invalid.
       *              Also handles all edge cases that include a 13.
       * If casesWith13 is true, we do not need to check if it's consecutive.
       * Otherwise, we need to check if it was consecutive.
       */
      let casesWith13 =
        flag13 &&
        !flag3 &&
        !flag4 &&
        flag1 &&
        flag11 &&
        flag12 &&
        (flag10 || flag2);
      S = casesWith13 || isConsecutive;

      // if (prevRank == 3 || prevRank == 4) [S, F] = [false, false]; what was this lol?
      F = F && suits.size === 3;
      R = royals.size === 0;
      if (!F && !S) {
        code = 0;
      } else if (!F && S) {
        // if straight, high suit is high card's suit
        code = 1;
      } else if (F && !S) {
        code = 2;
      } else if (!R) {
        code = 4;
      } else {
        code = 5;
      }
    }
    [name, multiplier] = handTypes[5][code as number];
    // console.log("length 5 code:",name, " multiplier:",multiplier)
  }
  let score =
    highCard! < 3 ? (highCard! + 13) * multiplier : (highCard! - 2) * multiplier;
  if (!score) score = 0;
  if (S) highSuit = highCardSuit;
  return [name, score, highSuit, isPoker, has3D];
}

// sort for hand display: 2 highest, then A, then numeric
export function sort(a: CardData, b: CardData) {
  let sub = a.rank - b.rank;
  if (a.rank == 2) return 1;
  if (b.rank == 2) return -1;
  if (a.rank == 1) return 1;
  if (b.rank == 1) return -1;
  return sub; // maybe sort by suit later
}

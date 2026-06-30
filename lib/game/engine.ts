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

/**
 * Wraps the preserved checkValidHand to guard a known false-positive: its straight
 * detection only checks ranks fit a 5-window, so hands with duplicate ranks like
 * 6,6,7,7,8 or 6,6,7,8,9 are wrongly reported as "straight". A real 5-card hand is
 * EITHER a full house (rank counts {3,2}) OR has 5 distinct ranks (straight/flush/
 * straight flush/royal). Anything else is invalid. checkValidHand itself is untouched.
 */
export function evaluateHand(
  cards: CardData[]
): [string | undefined, number, number | undefined, boolean, boolean] {
  const res = checkValidHand(cards);
  const name = res[0];
  if (cards.length === 5 && name && name !== "invalid") {
    const counts: Record<number, number> = {};
    for (const c of cards) counts[c.rank] = (counts[c.rank] || 0) + 1;
    const dist = Object.values(counts).sort();
    const isFullHouse = dist.length === 2 && dist[0] === 2 && dist[1] === 3;
    const fiveDistinct = dist.length === 5;
    const valid = name === "full house" ? isFullHouse : fiveDistinct;
    if (!valid) return ["invalid", 0, res[2], res[3], res[4]];
    // A full house is ranked by its TRIPLE's rank (2 highest). checkValidHand scores
    // it off `highCard`, which gets polluted by the pair (e.g. 2,2,2,8,8 scores as 8),
    // so recompute the score from the triple using the same Big-Two formula/multiplier.
    if (name === "full house") {
      const tripleRank = Number(Object.keys(counts).find(r => counts[Number(r)] === 3));
      const bt = (r: number) => (r < 3 ? r + 13 : r - 2); // 3..K => 1..11, A => 14, 2 => 15
      return [name, bt(tripleRank) * 183, res[2], res[3], res[4]];
    }
  }
  // For singles/doubles/triples/four-of-a-kind the comparison suit is the HIGHEST
  // suit among the cards. checkValidHand's `if (S) highSuit = highCardSuit` makes it
  // click-order dependent for these (S defaults true), so override with the max suit.
  if (cards.length < 5 && name && name !== "invalid") {
    const sv = (s: string) => (s === "diamonds" ? 0 : s === "clubs" ? 1 : s === "hearts" ? 2 : 3);
    const maxSuit = Math.max(...cards.map(c => sv(c.suit)));
    return [res[0], res[1], maxSuit, res[3], res[4]];
  }
  return res;
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

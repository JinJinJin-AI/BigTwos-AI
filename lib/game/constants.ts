// Preserved verbatim from legacy/static/constants.js (the nostalgic scoring table)
export const handTypes: Record<number, any> = {
  1: ["singles", 1],
  2: ["doubles", 1],
  3: ["triples", 1],
  4: ["four of a kind", 2380],
  5: {
    0: ["invalid", 0],
    1: ["straight", 1],
    2: ["flush", 14],
    3: ["full house", 183],
    4: ["straight flush", 30941],
    5: ["royal flush", 402234]
  }
};

export type Suit = "spades" | "hearts" | "clubs" | "diamonds";

/** A card as data: rank 1-13 (A..K) and a suit. */
export interface CardData {
  rank: number;
  suit: Suit;
}

/** Numerical id -> CardData. 0-12 Spades, 13-25 Hearts, 26-38 Clubs, 39-51 Diamonds. */
export function fromId(id: number): CardData {
  const suits: Suit[] = ["spades", "hearts", "clubs", "diamonds"];
  return { rank: (id % 13) + 1, suit: suits[Math.floor(id / 13)] };
}

/** CardData -> numerical id (matches deployment branch: 3 of diamonds = 41). */
export function toId(card: CardData): number {
  const mult =
    card.suit === "spades" ? 0 : card.suit === "hearts" ? 1 : card.suit === "clubs" ? 2 : 3;
  return mult * 13 + card.rank - 1;
}

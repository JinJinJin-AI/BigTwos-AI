"use client";
import { motion } from "framer-motion";
import { CardData } from "@/lib/game/constants";

const SUIT_INDEX: Record<string, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };

export function PlayingCard({
  card,
  selected,
  onClick,
  faceDown
}: {
  card: CardData;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
}) {
  const face = `/faces/${SUIT_INDEX[card.suit]}_${card.rank}.svg`;
  return (
    <motion.button
      layout
      onClick={onClick}
      whileHover={onClick ? { y: -16 } : undefined}
      animate={{ y: selected ? -28 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{
        width: 90,
        height: 126,
        borderRadius: 8,
        border: selected ? "3px solid #ffd166" : "1px solid #0003",
        background: faceDown ? "#1b3a2b url(/faces/back.png) center/cover" : `#fff url('${face}') center/cover`,
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        boxShadow: "0 4px 10px #0004"
      }}
      aria-label={`${card.rank} of ${card.suit}`}
    />
  );
}

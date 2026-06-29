"use client";
import { motion } from "framer-motion";
import { CardData } from "@/lib/game/constants";

const SUIT_INDEX: Record<string, number> = { spades: 0, hearts: 1, clubs: 2, diamonds: 3 };
const SYMBOL: Record<string, string> = { spades: "♠", hearts: "♥", clubs: "♣", diamonds: "♦" };
const RANK: Record<number, string> = { 1: "A", 11: "J", 12: "Q", 13: "K" };
const label = (r: number) => RANK[r] || String(r);

export function PlayingCard({
  card,
  selected,
  onClick,
  faceDown,
  layoutId
}: {
  card: CardData;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  layoutId?: string;
}) {
  const red = card.suit === "hearts" || card.suit === "diamonds";
  const art = `/faces/${SUIT_INDEX[card.suit]}_${card.rank}.svg`;
  const corner = (rot: boolean) => (
    <div
      style={{
        position: "absolute",
        left: rot ? "auto" : 5,
        right: rot ? 5 : "auto",
        top: rot ? "auto" : 3,
        bottom: rot ? 3 : "auto",
        transform: rot ? "rotate(180deg)" : "none",
        lineHeight: 1,
        textAlign: "center",
        fontWeight: 700,
        color: red ? "#d40000" : "#111"
      }}
    >
      <div style={{ fontSize: 16 }}>{label(card.rank)}</div>
      <div style={{ fontSize: 14 }}>{SYMBOL[card.suit]}</div>
    </div>
  );
  return (
    <motion.button
      layout
      layoutId={layoutId}
      onClick={onClick}
      whileHover={onClick ? { y: -16 } : undefined}
      animate={{ y: selected ? -28 : 0 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      style={{
        position: "relative",
        width: 84,
        height: 120,
        borderRadius: 8,
        border: selected ? "3px solid #ffd166" : "1px solid #0003",
        background: faceDown ? "#1b3a2b url(/faces/back.png) center/cover" : "#fff",
        cursor: onClick ? "pointer" : "default",
        padding: 0,
        boxShadow: "0 4px 10px #0004",
        overflow: "hidden"
      }}
      aria-label={`${label(card.rank)} of ${card.suit}`}
    >
      {!faceDown && (
        <>
          <img
            src={art}
            alt=""
            style={{ position: "absolute", inset: "22px 8px 8px", width: "calc(100% - 16px)", height: "calc(100% - 30px)", objectFit: "contain" }}
          />
          {corner(false)}
          {corner(true)}
        </>
      )}
    </motion.button>
  );
}

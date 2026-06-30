"use client";

export interface Bubble { id: number; name: string; text: string; x: number; y: number; }

/**
 * Renders ephemeral chat bubbles on their own top z-layer. The overlay never
 * intercepts pointer events; each bubble floats upward and fades over 10s, then
 * the parent removes it from state.
 */
export function ChatOverlay({ chats }: { chats: Bubble[] }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        pointerEvents: "none",
        overflow: "hidden"
      }}
    >
      {chats.map(c => (
        <div
          key={c.id}
          style={{
            position: "absolute",
            left: `${c.x}%`,
            bottom: `${c.y}%`,
            transform: "translateX(-50%)",
            animation: "btFloatUp 10s ease-out forwards",
            maxWidth: "32vw"
          }}
        >
          <div
            style={{
              background: "#F7ECD3",
              color: "#5C1A1A",
              padding: "8px 14px",
              borderRadius: 16,
              border: "2px solid #E9A6A6",
              boxShadow: "0 4px 12px #0005",
              fontSize: 15,
              lineHeight: 1.3,
              wordBreak: "break-word"
            }}
          >
            <b style={{ color: "#C0392B" }}>{c.name}</b> {c.text}
          </div>
        </div>
      ))}
      <style>{`
        @keyframes btFloatUp {
          0%   { transform: translate(-50%, 0) scale(0.9); opacity: 0; }
          8%   { transform: translate(-50%, -6px) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translate(-50%, -280px) scale(1); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

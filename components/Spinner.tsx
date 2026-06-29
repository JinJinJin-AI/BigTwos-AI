export function Spinner({ label }: { label?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: 24, color: "#fff" }}>
      <div
        style={{
          width: 36,
          height: 36,
          border: "4px solid #ffffff44",
          borderTopColor: "#ffd166",
          borderRadius: "50%",
          animation: "spin 0.8s linear infinite"
        }}
      />
      {label && <span>{label}</span>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

import { getSession } from "@/lib/auth";
import Link from "next/link";

export default async function Home() {
  const s = await getSession();
  return (
    <main
      style={{
        minHeight: "100vh",
        backgroundImage: "url(/images/title.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center"
      }}
    >
      <div style={{ paddingBottom: "8vh", display: "grid", gap: 10, justifyItems: "center" }}>
        <Link
          href={s ? "/game" : "/login"}
          style={{
            background: "#F7ECD3",
            color: "#5C1A1A",
            border: "3px solid #E9A6A6",
            borderRadius: 12,
            padding: "12px 48px",
            fontSize: 26,
            fontWeight: 800,
            letterSpacing: 4,
            textDecoration: "none",
            boxShadow: "0 6px 0 #C0392B"
          }}
        >
          {s ? "PLAY" : "START"}
        </Link>
        {s && <span style={{ color: "#F7ECD3" }}>Welcome back, {s.name}</span>}
      </div>
    </main>
  );
}

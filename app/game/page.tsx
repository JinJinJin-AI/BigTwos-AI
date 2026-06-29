import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import GameClient from "@/components/GameClient";

export default async function GamePage() {
  const s = await getSession();
  if (!s) redirect("/login");
  return <GameClient pid={s.uid} name={s.name} />;
}

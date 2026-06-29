import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const s = await getSession();
  redirect(s ? "/game" : "/login");
}

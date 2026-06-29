import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "./client";

export default async function AdminPage() {
  const s = await getSession();
  if (!s?.isAdmin) redirect("/login");
  return <AdminClient />;
}

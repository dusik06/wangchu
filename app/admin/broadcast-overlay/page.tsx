import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import db from "@/lib/db";
import BroadcastOverlayTool from "./broadcast-overlay-tool";

export default async function BroadcastOverlayPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) redirect("/");

  const [rows]: any = await db.query(
    "SELECT role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!rows.length || rows[0].role !== "admin") redirect("/");

  return <BroadcastOverlayTool />;
}

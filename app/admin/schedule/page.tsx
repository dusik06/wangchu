import db from "@/lib/db";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ScheduleAdminClient from "./ScheduleAdminClient";

export const dynamic = "force-dynamic";

function formatDate(value: any) {
  if (!value) return "";

  if (typeof value === "string") {
    return value.slice(0, 10);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default async function AdminSchedulePage() {
  const session = await getServerSession();

  if (!session?.user?.email) {
    redirect("/");
  }

  const [admins]: any = await db.query(
    "SELECT id, role FROM users WHERE email = ? LIMIT 1",
    [session.user.email]
  );

  if (!admins.length || admins[0].role !== "admin") {
    redirect("/");
  }

  const [rows]: any = await db.query(`
    SELECT
      id,
      schedule_date,
      schedule_time,
      title,
      description,
      is_important,
      is_offday
    FROM broadcast_schedules
    ORDER BY schedule_date ASC, schedule_time ASC, id ASC
  `);

  const schedules = rows.map((item: any) => ({
    id: Number(item.id),
    schedule_date: formatDate(item.schedule_date),
    schedule_time: item.schedule_time || "",
    title: item.title || "",
    description: item.description || "",
    is_important: Number(item.is_important) === 1,
    is_offday: Number(item.is_offday) === 1,
  }));

  return <ScheduleAdminClient schedules={schedules} />;
}
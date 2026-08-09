import db from "@/lib/db";
import { getServerSession } from "next-auth";
import ShopCart from "./ShopCart";

export const dynamic = "force-dynamic";

export default async function ShopPage() {
  const session = await getServerSession();

  const [items]: any = await db.query(
    `
    SELECT *
    FROM shop_items
    WHERE is_active = 1
    ORDER BY price ASC, id DESC
    `
  );

  let dotori: number | null = null;

  if (session?.user?.email) {
    const [users]: any = await db.query(
      "SELECT dotori FROM users WHERE email = ? LIMIT 1",
      [session.user.email]
    );

    if (users[0]) {
      dotori = Number(users[0].dotori) || 0;
    }
  }

  const shopItems = items.map((item: any) => ({
    id: Number(item.id),
    item_name: String(item.item_name || ""),
    item_type: String(item.item_type || "normal"),
    price: Number(item.price) || 0,
    item_image: item.item_image ? String(item.item_image) : null,
    item_audio: item.item_audio ? String(item.item_audio) : null,
  }));

  return <ShopCart items={shopItems} initialDotori={dotori} />;
}
